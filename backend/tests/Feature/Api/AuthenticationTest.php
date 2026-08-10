<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('rejects unauthenticated requests with a json 401', function () {
    // Not just the status: the API must return JSON rather than redirecting to
    // a login route, because the SPA consumes it. bootstrap/app.php configures
    // shouldRenderJsonWhen for api/*, and this is what proves it.
    $this->getJson('/api/v1/user')
        ->assertUnauthorized()
        ->assertJson(['message' => 'Unauthenticated.']);
});

it('returns the authenticated user', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/user')
        ->assertOk()
        ->assertJson(['data' => [
            'id' => $user->id,
            'email' => $user->email,
        ]]);
});

it('versions api routes under v1', function () {
    // The apiPrefix in bootstrap/app.php is easy to lose in a merge, and every
    // frontend call depends on it. Assert the unversioned path is gone.
    $this->getJson('/api/user')->assertNotFound();
});

it('never exposes the password hash', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/user');

    expect($response->json('data'))->toHaveKeys(['id', 'name', 'email'])
        ->and($response->json('data'))->not->toHaveKey('password')
        ->and($response->json('data'))->not->toHaveKey('remember_token');
});

describe('login', function () {
    it('authenticates with correct credentials and starts a session', function () {
        $user = User::factory()->create([
            'email' => 'dev@job-tracker.test',
            'password' => Hash::make('correct-horse'),
        ]);

        $this->withHeaders(fromSpa())->postJson('/api/v1/login', [
            'email' => 'dev@job-tracker.test',
            'password' => 'correct-horse',
        ])
            ->assertOk()
            ->assertJson(['data' => ['email' => 'dev@job-tracker.test']]);

        $this->assertAuthenticatedAs($user);
    });

    it('rejects a wrong password with a 422 keyed to email', function () {
        User::factory()->create([
            'email' => 'dev@job-tracker.test',
            'password' => Hash::make('correct-horse'),
        ]);

        $this->withHeaders(fromSpa())->postJson('/api/v1/login', [
            'email' => 'dev@job-tracker.test',
            'password' => 'wrong',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertGuest();
    });

    it('does not reveal whether an account exists', function () {
        // An unknown email and a wrong password must be indistinguishable,
        // or the endpoint becomes an account-enumeration oracle.
        User::factory()->create([
            'email' => 'real@job-tracker.test',
            'password' => Hash::make('correct-horse'),
        ]);

        $unknown = $this->withHeaders(fromSpa())->postJson('/api/v1/login', [
            'email' => 'nobody@job-tracker.test',
            'password' => 'whatever',
        ]);

        $wrongPassword = $this->withHeaders(fromSpa())->postJson('/api/v1/login', [
            'email' => 'real@job-tracker.test',
            'password' => 'whatever',
        ]);

        expect($unknown->json('errors'))->toBe($wrongPassword->json('errors'));
    });

    it('validates required fields', function () {
        $this->withHeaders(fromSpa())->postJson('/api/v1/login', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    });

    it('throttles repeated failed attempts', function () {
        // Route is limited to 6/minute. Without this, the login endpoint is a
        // free password-guessing oracle.
        foreach (range(1, 6) as $ignored) {
            $this->withHeaders(fromSpa())->postJson('/api/v1/login', [
                'email' => 'dev@job-tracker.test',
                'password' => 'wrong',
            ]);
        }

        $this->withHeaders(fromSpa())->postJson('/api/v1/login', [
            'email' => 'dev@job-tracker.test',
            'password' => 'wrong',
        ])->assertStatus(429);
    });
});

describe('logout', function () {
    it('ends the session', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withHeaders(fromSpa())
            ->postJson('/api/v1/logout')
            ->assertOk();

        // Specifically the `web` guard: `auth:sanctum` calls shouldUse('sanctum'),
        // so a bare assertGuest() would inspect the sanctum guard, which still
        // holds the in-memory user resolved earlier in the request. The session
        // guard is the one logout actually clears.
        $this->assertGuest('web');
    });

    it('requires authentication', function () {
        $this->postJson('/api/v1/logout')->assertUnauthorized();
    });
});

it('issues a csrf cookie for the spa', function () {
    // The SPA calls this before logging in; without it there is no XSRF-TOKEN
    // to echo back in the X-XSRF-TOKEN header.
    $this->get('/sanctum/csrf-cookie')
        ->assertNoContent()
        ->assertCookie('XSRF-TOKEN');
});
