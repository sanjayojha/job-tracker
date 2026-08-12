<?php

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;

it('persists an application and resolves its relationships', function () {
    $user = User::factory()->create();
    $company = Company::factory()->create(['name' => 'Acme']);

    $application = Application::factory()
        ->for($user)
        ->for($company)
        ->create(['title' => 'Backend Engineer']);

    $application->refresh();

    expect($application->title)->toBe('Backend Engineer')
        ->and($application->company->name)->toBe('Acme')
        ->and($application->user->is($user))->toBeTrue()
        ->and($company->applications)->toHaveCount(1);
});

it('casts status to the enum and applied_at to a date', function () {
    $application = Application::factory()->create([
        'applied_at' => '2026-08-01',
    ]);

    $application->refresh();

    expect($application->status)->toBe(ApplicationStatus::Applied)
        ->and($application->applied_at)->toBeInstanceOf(Carbon::class)
        ->and($application->applied_at->toDateString())->toBe('2026-08-01');
});

it('starts at wishlist when no status is given', function () {
    $application = new Application;

    expect($application->status)->toBe(ApplicationStatus::Wishlist);

    // The column carries the same default, so a direct insert agrees with the
    // model rather than writing an empty string.
    $application->user_id = User::factory()->create()->id;
    $application->company_id = Company::factory()->create()->id;
    $application->title = 'Platform Engineer';
    $application->save();

    expect($application->fresh()->status)->toBe(ApplicationStatus::Wishlist);
});

it('leaves a wishlist entry without an applied date', function () {
    $application = Application::factory()->wishlist()->create();

    expect($application->status)->toBe(ApplicationStatus::Wishlist)
        ->and($application->applied_at)->toBeNull();
});

it('does not let status or ownership be mass assigned', function () {
    $application = Application::factory()->create();
    $owner = $application->user_id;

    $application->fill([
        'title' => 'Staff Engineer',
        'status' => ApplicationStatus::Offer,
        'user_id' => User::factory()->create()->id,
    ]);

    // Title moves; the two guarded attributes do not. Status only ever changes
    // through the transition action, and ownership comes from the session.
    expect($application->title)->toBe('Staff Engineer')
        ->and($application->status)->toBe(ApplicationStatus::Applied)
        ->and($application->user_id)->toBe($owner);
});

it('deletes an application when its company is deleted', function () {
    $company = Company::factory()->create();
    $application = Application::factory()->for($company)->create();

    $company->delete();

    expect(Application::whereKey($application->id)->exists())->toBeFalse();
});

it('requires company names to be unique', function () {
    Company::factory()->create(['name' => 'Acme']);

    expect(fn () => Company::factory()->create(['name' => 'Acme']))
        ->toThrow(QueryException::class);
});
