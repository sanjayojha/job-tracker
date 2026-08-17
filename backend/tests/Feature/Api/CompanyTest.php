<?php

use App\Models\Application;
use App\Models\Company;
use App\Models\User;

it('requires authentication on every company route', function (string $method, string $uri) {
    $this->json($method, $uri)->assertUnauthorized();
})->with([
    ['get', '/api/v1/companies'],
    ['post', '/api/v1/companies'],
    ['get', '/api/v1/companies/1'],
    ['patch', '/api/v1/companies/1'],
    ['delete', '/api/v1/companies/1'],
]);

describe('index', function () {
    it('lists companies alphabetically with their application counts', function () {
        $user = User::factory()->create();
        Company::factory()->create(['name' => 'Zeta Corp']);
        $acme = Company::factory()->create(['name' => 'Acme Ltd']);
        Application::factory()->count(2)->for($user)->for($acme)->create();

        $response = $this->actingAs($user)->getJson('/api/v1/companies')->assertOk();

        expect($response->json('data.*.name'))->toBe(['Acme Ltd', 'Zeta Corp'])
            ->and($response->json('data.0.applications_count'))->toBe(2)
            ->and($response->json('data.1.applications_count'))->toBe(0);
    });

    it('sorts by name rather than insertion order', function () {
        // PostgreSQL orders case-sensitively, so this is asserting the column
        // we sort on, not a particular collation.
        $user = User::factory()->create();
        Company::factory()->create(['name' => 'Beta']);
        Company::factory()->create(['name' => 'Alpha']);

        $response = $this->actingAs($user)->getJson('/api/v1/companies');

        expect($response->json('data.*.name'))->toBe(['Alpha', 'Beta']);
    });
});

describe('store', function () {
    it('creates a company and returns 201', function () {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/companies', [
            'name' => 'Acme Ltd',
            'website' => 'https://acme.test',
        ])
            ->assertCreated()
            ->assertJson(['data' => [
                'name' => 'Acme Ltd',
                'website' => 'https://acme.test',
                'notes' => null,
            ]]);

        $this->assertDatabaseHas('companies', ['name' => 'Acme Ltd']);
    });

    it('accepts a name alone', function () {
        // The 30-second logging constraint: name is the only required field.
        $this->actingAs(User::factory()->create())
            ->postJson('/api/v1/companies', ['name' => 'Minimal Ltd'])
            ->assertCreated();
    });

    it('rejects a duplicate name', function () {
        $user = User::factory()->create();
        Company::factory()->create(['name' => 'Acme Ltd']);

        $this->actingAs($user)
            ->postJson('/api/v1/companies', ['name' => 'Acme Ltd'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    });

    it('rejects a duplicate name in a different case', function (string $attempt) {
        // A 422, not the 500 the functional index would otherwise produce.
        $user = User::factory()->create();
        Company::factory()->create(['name' => 'Acme Ltd']);

        $this->actingAs($user)
            ->postJson('/api/v1/companies', ['name' => $attempt])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    })->with(['ACME LTD', 'acme ltd', 'AcMe LtD']);

    it('stores the name with the casing that was typed', function () {
        // Only the comparison is case-insensitive; the display value is not
        // normalised, because "IBM" must not become "Ibm".
        $this->actingAs(User::factory()->create())
            ->postJson('/api/v1/companies', ['name' => 'IBM'])
            ->assertCreated()
            ->assertJson(['data' => ['name' => 'IBM']]);

        $this->assertDatabaseHas('companies', ['name' => 'IBM']);
    });

    it('rejects invalid input', function (array $payload, string $field) {
        $this->actingAs(User::factory()->create())
            ->postJson('/api/v1/companies', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field);
    })->with([
        'missing name' => [[], 'name'],
        'blank name' => [['name' => ''], 'name'],
        'overlong name' => [['name' => str_repeat('a', 256)], 'name'],
        'malformed website' => [['name' => 'Acme', 'website' => 'not-a-url'], 'website'],
    ]);
});

describe('show', function () {
    it('returns one company with its application count', function () {
        $user = User::factory()->create();
        $company = Company::factory()->create(['name' => 'Acme Ltd']);
        Application::factory()->for($user)->for($company)->create();

        $this->actingAs($user)->getJson("/api/v1/companies/{$company->id}")
            ->assertOk()
            ->assertJson(['data' => [
                'id' => $company->id,
                'name' => 'Acme Ltd',
                'applications_count' => 1,
            ]]);
    });

    it('404s for a company that does not exist', function () {
        $this->actingAs(User::factory()->create())
            ->getJson('/api/v1/companies/999999')
            ->assertNotFound();
    });
});

describe('update', function () {
    it('patches only the fields sent', function () {
        $user = User::factory()->create();
        $company = Company::factory()->create([
            'name' => 'Acme Ltd',
            'website' => 'https://acme.test',
            'notes' => 'Referred by Priya',
        ]);

        $this->actingAs($user)
            ->patchJson("/api/v1/companies/{$company->id}", ['name' => 'Acme International'])
            ->assertOk()
            ->assertJson(['data' => [
                'name' => 'Acme International',
                'website' => 'https://acme.test',
                'notes' => 'Referred by Priya',
            ]]);
    });

    it('clears a field when it is explicitly null', function () {
        $user = User::factory()->create();
        $company = Company::factory()->create(['website' => 'https://acme.test']);

        $this->actingAs($user)
            ->patchJson("/api/v1/companies/{$company->id}", ['website' => null])
            ->assertOk()
            ->assertJson(['data' => ['website' => null]]);
    });

    it('lets a company keep its own name', function () {
        // The unique rule must ignore the row being edited, or every edit that
        // touches another field alongside an unchanged name would 422.
        $user = User::factory()->create();
        $company = Company::factory()->create(['name' => 'Acme Ltd']);

        $this->actingAs($user)
            ->patchJson("/api/v1/companies/{$company->id}", [
                'name' => 'Acme Ltd',
                'notes' => 'Still the same company',
            ])
            ->assertOk();
    });

    it('lets a company change only the casing of its own name', function () {
        // Fixing "acme ltd" to "Acme Ltd" must not collide with itself.
        $user = User::factory()->create();
        $company = Company::factory()->create(['name' => 'acme ltd']);

        $this->actingAs($user)
            ->patchJson("/api/v1/companies/{$company->id}", ['name' => 'Acme Ltd'])
            ->assertOk()
            ->assertJson(['data' => ['name' => 'Acme Ltd']]);
    });

    it('rejects a name another company already holds in a different case', function () {
        $user = User::factory()->create();
        Company::factory()->create(['name' => 'Acme Ltd']);
        $other = Company::factory()->create(['name' => 'Zeta Corp']);

        $this->actingAs($user)
            ->patchJson("/api/v1/companies/{$other->id}", ['name' => 'ACME LTD'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    });

    it('rejects a name another company already holds', function () {
        $user = User::factory()->create();
        Company::factory()->create(['name' => 'Acme Ltd']);
        $other = Company::factory()->create(['name' => 'Zeta Corp']);

        $this->actingAs($user)
            ->patchJson("/api/v1/companies/{$other->id}", ['name' => 'Acme Ltd'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    });
});

describe('destroy', function () {
    it('deletes a company with no applications', function () {
        $user = User::factory()->create();
        $company = Company::factory()->create();

        $this->actingAs($user)
            ->deleteJson("/api/v1/companies/{$company->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('companies', ['id' => $company->id]);
    });

    it('refuses to delete a company that still has applications', function () {
        // The foreign key cascades. Without the guard this request would take
        // the applications and their audit trails with it.
        $user = User::factory()->create();
        $company = Company::factory()->create();
        $application = Application::factory()->for($user)->for($company)->create();

        $this->actingAs($user)
            ->deleteJson("/api/v1/companies/{$company->id}")
            ->assertConflict()
            ->assertJson(['applications_count' => 1]);

        $this->assertDatabaseHas('companies', ['id' => $company->id]);
        $this->assertDatabaseHas('applications', ['id' => $application->id]);
    });
});
