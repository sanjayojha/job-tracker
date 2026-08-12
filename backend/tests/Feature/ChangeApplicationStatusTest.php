<?php

use App\Actions\ChangeApplicationStatus;
use App\Actions\CreateApplication;
use App\Enums\ApplicationStatus;
use App\Events\ApplicationStatusChanged;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    $this->action = app(ChangeApplicationStatus::class);
});

it('moves the application and records the transition', function () {
    $application = Application::factory()->create(['status' => ApplicationStatus::Screening]);

    $this->action->handle($application, ApplicationStatus::Interview, 'Second round booked');

    expect($application->fresh()->status)->toBe(ApplicationStatus::Interview);

    $history = $application->statusHistories()->sole();

    expect($history->from_status)->toBe(ApplicationStatus::Screening)
        ->and($history->to_status)->toBe(ApplicationStatus::Interview)
        ->and($history->note)->toBe('Second round booked');
});

it('fires ApplicationStatusChanged carrying both stages', function () {
    Event::fake();

    $application = Application::factory()->create(['status' => ApplicationStatus::Applied]);

    $this->action->handle($application, ApplicationStatus::Rejected);

    Event::assertDispatched(
        ApplicationStatusChanged::class,
        fn (ApplicationStatusChanged $event) => $event->application->is($application)
            && $event->from === ApplicationStatus::Applied
            && $event->to === ApplicationStatus::Rejected
    );
});

it('refuses a move to the stage it is already at', function () {
    $application = Application::factory()->create(['status' => ApplicationStatus::Offer]);

    expect(fn () => $this->action->handle($application, ApplicationStatus::Offer))
        ->toThrow(RuntimeException::class);

    // Nothing recorded: history should only ever say something happened.
    expect($application->statusHistories()->count())->toBe(0);
});

it('allows any stage to follow any other, including backwards', function () {
    $application = Application::factory()->create(['status' => ApplicationStatus::Rejected]);

    $this->action->handle($application, ApplicationStatus::Interview);

    expect($application->fresh()->status)->toBe(ApplicationStatus::Interview);
});

it('accumulates a trail in order across several moves', function () {
    $application = Application::factory()->create(['status' => ApplicationStatus::Wishlist]);

    foreach ([ApplicationStatus::Applied, ApplicationStatus::Screening, ApplicationStatus::Offer] as $status) {
        $this->action->handle($application, $status);
    }

    expect($application->statusHistories()->orderBy('id')->pluck('to_status')->all())
        ->toBe([ApplicationStatus::Applied, ApplicationStatus::Screening, ApplicationStatus::Offer]);

    expect($application->latestStatusChange->to_status)->toBe(ApplicationStatus::Offer);
});

it('does not persist the status when the history write fails', function () {
    $application = Application::factory()->create(['status' => ApplicationStatus::Applied]);

    // Fail the history insert from inside the transaction. The status update
    // has already been written at that point, so this is what proves the two
    // roll back together -- a status change with no trail behind it is exactly
    // the state the audit log must never reach.
    ApplicationStatusHistory::creating(fn () => throw new RuntimeException('history write failed'));

    expect(fn () => $this->action->handle($application, ApplicationStatus::Offer))
        ->toThrow(RuntimeException::class, 'history write failed');

    expect($application->fresh()->status)->toBe(ApplicationStatus::Applied)
        ->and(ApplicationStatusHistory::count())->toBe(0);
});

it('opens the history when an application is created', function () {
    $user = User::factory()->create();
    $company = Company::factory()->create();

    $application = app(CreateApplication::class)->handle(
        $user,
        ['company_id' => $company->id, 'title' => 'Backend Engineer'],
        ApplicationStatus::Applied,
    );

    expect($application->user_id)->toBe($user->id)
        ->and($application->status)->toBe(ApplicationStatus::Applied);

    $history = $application->statusHistories()->sole();

    expect($history->from_status)->toBeNull()
        ->and($history->to_status)->toBe(ApplicationStatus::Applied);
});

it('defaults a created application to the wishlist stage', function () {
    $application = app(CreateApplication::class)->handle(
        User::factory()->create(),
        ['company_id' => Company::factory()->create()->id, 'title' => 'Platform Engineer'],
    );

    expect($application->status)->toBe(ApplicationStatus::Wishlist)
        ->and($application->statusHistories()->sole()->to_status)->toBe(ApplicationStatus::Wishlist);
});

it('deletes the trail when the application is deleted', function () {
    $application = Application::factory()->create(['status' => ApplicationStatus::Applied]);
    $this->action->handle($application, ApplicationStatus::Screening);

    $application->delete();

    expect(ApplicationStatusHistory::count())->toBe(0);
});
