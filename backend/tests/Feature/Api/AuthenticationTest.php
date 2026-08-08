<?php

use App\Models\User;

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
        ->assertJson([
            'id' => $user->id,
            'email' => $user->email,
        ]);
});

it('versions api routes under v1', function () {
    // The apiPrefix in bootstrap/app.php is easy to lose in a merge, and every
    // frontend call depends on it. Assert the unversioned path is gone.
    $this->getJson('/api/user')->assertNotFound();
});
