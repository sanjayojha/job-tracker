<?php

use App\Actions\CreateApplication;
use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\Company;
use App\Models\User;

it('requires authentication on every application route', function (string $method, string $uri) {
    $this->json($method, $uri)->assertUnauthorized();
})->with([
    ['get', '/api/v1/applications'],
    ['post', '/api/v1/applications'],
    ['get', '/api/v1/applications/1'],
    ['patch', '/api/v1/applications/1'],
    ['delete', '/api/v1/applications/1'],
    ['post', '/api/v1/applications/1/status'],
]);

describe('index', function () {
    it('returns only the authenticated user\'s applications', function () {
        $user = User::factory()->create();
        $mine = Application::factory()->for($user)->create();
        Application::factory()->create(); // another user's

        $response = $this->actingAs($user)->getJson('/api/v1/applications')->assertOk();

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.id'))->toBe($mine->id);
    });

    it('embeds the company so the list needs no second request', function () {
        $user = User::factory()->create();
        $company = Company::factory()->create(['name' => 'Acme Ltd']);
        Application::factory()->for($user)->for($company)->create();

        $this->actingAs($user)->getJson('/api/v1/applications')
            ->assertOk()
            ->assertJsonPath('data.0.company.name', 'Acme Ltd');
    });

    it('reports when the status last moved', function () {
        // Built through the action, not the factory: the factory writes the row
        // directly, so it has no audit trail and nothing to report.
        $user = User::factory()->create();
        app(CreateApplication::class)->handle($user, [
            'company_id' => Company::factory()->create()->id,
            'title' => 'Backend Engineer',
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/applications');

        expect($response->json('data.0.status_changed_at'))->not->toBeNull();
    });

    it('paginates', function () {
        $user = User::factory()->create();
        Application::factory()->count(3)->for($user)->create();

        $response = $this->actingAs($user)
            ->getJson('/api/v1/applications?per_page=2')
            ->assertOk();

        expect($response->json('data'))->toHaveCount(2)
            ->and($response->json('meta.total'))->toBe(3);
    });

    it('filters by status', function () {
        $user = User::factory()->create();
        Application::factory()->for($user)->status(ApplicationStatus::Offer)->create();
        Application::factory()->for($user)->status(ApplicationStatus::Rejected)->create();

        $response = $this->actingAs($user)->getJson('/api/v1/applications?status=offer');

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.status'))->toBe('offer');
    });

    it('filters by company', function () {
        $user = User::factory()->create();
        $acme = Company::factory()->create();
        Application::factory()->for($user)->for($acme)->create();
        Application::factory()->for($user)->create();

        $response = $this->actingAs($user)->getJson("/api/v1/applications?company_id={$acme->id}");

        expect($response->json('data'))->toHaveCount(1);
    });

    it('searches titles case-insensitively', function () {
        // ILIKE, because PostgreSQL's LIKE is case-sensitive and this would
        // silently return nothing on the engine we deploy on.
        $user = User::factory()->create();
        Application::factory()->for($user)->create(['title' => 'Senior Backend Engineer']);
        Application::factory()->for($user)->create(['title' => 'Designer']);

        $response = $this->actingAs($user)->getJson('/api/v1/applications?search=backend');

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.title'))->toBe('Senior Backend Engineer');
    });

    it('treats wildcards in the search term as literal characters', function () {
        $user = User::factory()->create();
        Application::factory()->for($user)->create(['title' => 'Engineer']);

        $response = $this->actingAs($user)->getJson('/api/v1/applications?search=%');

        expect($response->json('data'))->toHaveCount(0);
    });

    it('sorts by status in pipeline order, not alphabetically', function () {
        // Alphabetically these would be applied, offer, wishlist. Pipeline
        // order is wishlist, applied, offer -- the only order that means
        // anything to someone reading the list.
        $user = User::factory()->create();
        Application::factory()->for($user)->status(ApplicationStatus::Offer)->create();
        Application::factory()->for($user)->status(ApplicationStatus::Wishlist)->create();
        Application::factory()->for($user)->status(ApplicationStatus::Applied)->create();

        $response = $this->actingAs($user)
            ->getJson('/api/v1/applications?sort=status&direction=asc');

        expect($response->json('data.*.status'))->toBe(['wishlist', 'applied', 'offer']);
    });

    it('sorts by applied date', function () {
        $user = User::factory()->create();
        Application::factory()->for($user)->create(['applied_at' => '2026-01-01', 'title' => 'Older']);
        Application::factory()->for($user)->create(['applied_at' => '2026-06-01', 'title' => 'Newer']);

        $response = $this->actingAs($user)
            ->getJson('/api/v1/applications?sort=applied_at&direction=desc');

        expect($response->json('data.*.title'))->toBe(['Newer', 'Older']);
    });

    it('rejects a sort column that is not allow-listed', function () {
        // `sort` reaches an orderBy, so it has to be a closed set.
        $this->actingAs(User::factory()->create())
            ->getJson('/api/v1/applications?sort=user_id')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('sort');
    });

    it('rejects an unknown status filter', function () {
        $this->actingAs(User::factory()->create())
            ->getJson('/api/v1/applications?status=nonsense')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    });
});

describe('store', function () {
    it('creates an application from a company and title alone', function () {
        // The 30-second constraint: two required fields, nothing else.
        $user = User::factory()->create();
        $company = Company::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/applications', [
            'company_id' => $company->id,
            'title' => 'Backend Engineer',
        ])
            ->assertCreated()
            ->assertJson(['data' => [
                'title' => 'Backend Engineer',
                'status' => 'wishlist',
            ]]);

        $this->assertDatabaseHas('applications', [
            'title' => 'Backend Engineer',
            'user_id' => $user->id,
        ]);
    });

    it('opens the audit trail with a null from_status', function () {
        $user = User::factory()->create();
        $company = Company::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/applications', [
            'company_id' => $company->id,
            'title' => 'Backend Engineer',
            'status' => 'applied',
            'note' => 'Applied via referral',
        ])->assertCreated();

        $this->assertDatabaseHas('application_status_histories', [
            'application_id' => $response->json('data.id'),
            'from_status' => null,
            'to_status' => 'applied',
            'note' => 'Applied via referral',
        ]);
    });

    it('ignores a user_id in the body and uses the authenticated user', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $company = Company::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/applications', [
            'company_id' => $company->id,
            'title' => 'Backend Engineer',
            'user_id' => $other->id,
        ])->assertCreated();

        $this->assertDatabaseHas('applications', [
            'id' => $response->json('data.id'),
            'user_id' => $user->id,
        ]);
    });

    it('rejects invalid input', function (array $payload, string $field) {
        $company = Company::factory()->create();

        $this->actingAs(User::factory()->create())
            ->postJson('/api/v1/applications', [...$payload, 'company_id' => $payload['company_id'] ?? $company->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field);
    })->with([
        'missing title' => [[], 'title'],
        'unknown company' => [['title' => 'Dev', 'company_id' => 999999], 'company_id'],
        'unknown status' => [['title' => 'Dev', 'status' => 'nonsense'], 'status'],
        'malformed url' => [['title' => 'Dev', 'source_url' => 'not-a-url'], 'source_url'],
        'malformed date' => [['title' => 'Dev', 'applied_at' => 'someday'], 'applied_at'],
    ]);
});

describe('show', function () {
    it('returns the application with its full trail, oldest first', function () {
        // Created through the endpoint so the opening row exists, then moved --
        // two rows, which is what makes the ordering assertion meaningful.
        $user = User::factory()->create();

        $id = $this->actingAs($user)->postJson('/api/v1/applications', [
            'company_id' => Company::factory()->create()->id,
            'title' => 'Backend Engineer',
        ])->assertCreated()->json('data.id');

        $this->actingAs($user)->postJson("/api/v1/applications/{$id}/status", [
            'status' => 'applied',
        ])->assertOk();

        $response = $this->actingAs($user)
            ->getJson("/api/v1/applications/{$id}")
            ->assertOk();

        expect($response->json('data.status_history.*.to_status'))->toBe(['wishlist', 'applied'])
            ->and($response->json('data.status_history.0.from_status'))->toBeNull();
    });

    it('403s on another user\'s application', function () {
        $application = Application::factory()->create();

        $this->actingAs(User::factory()->create())
            ->getJson("/api/v1/applications/{$application->id}")
            ->assertForbidden();
    });

    it('404s for an application that does not exist', function () {
        $this->actingAs(User::factory()->create())
            ->getJson('/api/v1/applications/999999')
            ->assertNotFound();
    });
});

describe('update', function () {
    it('patches only the fields sent', function () {
        $user = User::factory()->create();
        $application = Application::factory()->for($user)->create([
            'title' => 'Backend Engineer',
            'notes' => 'Referred by Priya',
        ]);

        $this->actingAs($user)
            ->patchJson("/api/v1/applications/{$application->id}", ['title' => 'Senior Backend Engineer'])
            ->assertOk()
            ->assertJson(['data' => [
                'title' => 'Senior Backend Engineer',
                'notes' => 'Referred by Priya',
            ]]);
    });

    it('refuses to change status and says where to do it', function () {
        // Silently dropping `status` would return a 200 that reads as a
        // successful move, and the audit trail would never know.
        $user = User::factory()->create();
        $application = Application::factory()->for($user)->status(ApplicationStatus::Applied)->create();

        $this->actingAs($user)
            ->patchJson("/api/v1/applications/{$application->id}", ['status' => 'offer'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        expect($application->refresh()->status)->toBe(ApplicationStatus::Applied);
    });

    it('403s on another user\'s application', function () {
        $application = Application::factory()->create(['title' => 'Untouched']);

        $this->actingAs(User::factory()->create())
            ->patchJson("/api/v1/applications/{$application->id}", ['title' => 'Hijacked'])
            ->assertForbidden();

        expect($application->refresh()->title)->toBe('Untouched');
    });
});

describe('status changes', function () {
    it('moves the application and records the transition', function () {
        $user = User::factory()->create();
        $application = Application::factory()->for($user)->status(ApplicationStatus::Applied)->create();

        $this->actingAs($user)
            ->postJson("/api/v1/applications/{$application->id}/status", [
                'status' => 'interview',
                'note' => 'Phone screen booked',
            ])
            ->assertOk()
            ->assertJson(['data' => ['status' => 'interview']]);

        $this->assertDatabaseHas('application_status_histories', [
            'application_id' => $application->id,
            'from_status' => 'applied',
            'to_status' => 'interview',
            'note' => 'Phone screen booked',
        ]);
    });

    it('answers 422, not 500, when the application is already at that stage', function () {
        // The gap this endpoint was built to close. ChangeApplicationStatus
        // throws for a no-op move; that is a client error, and it must not
        // surface as a server fault.
        $user = User::factory()->create();
        $application = Application::factory()->for($user)->status(ApplicationStatus::Offer)->create();

        $this->actingAs($user)
            ->postJson("/api/v1/applications/{$application->id}/status", ['status' => 'offer'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    });

    it('records nothing for a refused no-op', function () {
        $user = User::factory()->create();
        $application = Application::factory()->for($user)->status(ApplicationStatus::Offer)->create();

        $this->actingAs($user)
            ->postJson("/api/v1/applications/{$application->id}/status", ['status' => 'offer'])
            ->assertUnprocessable();

        expect($application->statusHistories()->count())->toBe(0);
    });

    it('allows moving backwards through the pipeline', function () {
        // A real search is not a state machine -- people get re-approached
        // after a rejection.
        $user = User::factory()->create();
        $application = Application::factory()->for($user)->status(ApplicationStatus::Rejected)->create();

        $this->actingAs($user)
            ->postJson("/api/v1/applications/{$application->id}/status", ['status' => 'interview'])
            ->assertOk()
            ->assertJson(['data' => ['status' => 'interview']]);
    });

    it('rejects an unknown status', function () {
        $user = User::factory()->create();
        $application = Application::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson("/api/v1/applications/{$application->id}/status", ['status' => 'promoted'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    });

    it('403s on another user\'s application', function () {
        $application = Application::factory()->status(ApplicationStatus::Applied)->create();

        $this->actingAs(User::factory()->create())
            ->postJson("/api/v1/applications/{$application->id}/status", ['status' => 'offer'])
            ->assertForbidden();

        expect($application->refresh()->status)->toBe(ApplicationStatus::Applied);
    });
});

describe('destroy', function () {
    it('deletes the application and its trail', function () {
        $user = User::factory()->create();
        $application = Application::factory()->for($user)->create();
        $application->statusHistories()->create([
            'from_status' => null,
            'to_status' => ApplicationStatus::Applied,
            'note' => null,
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/v1/applications/{$application->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('applications', ['id' => $application->id]);
        $this->assertDatabaseMissing('application_status_histories', [
            'application_id' => $application->id,
        ]);
    });

    it('403s on another user\'s application', function () {
        $application = Application::factory()->create();

        $this->actingAs(User::factory()->create())
            ->deleteJson("/api/v1/applications/{$application->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('applications', ['id' => $application->id]);
    });
});
