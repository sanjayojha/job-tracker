<?php

namespace App\Events;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * The seam between a status change and everything that reacts to one:
 * dashboard cache invalidation, reminder rescheduling, notifications.
 *
 * Dispatched after commit, so a listener can never act on a transition that
 * was rolled back -- an invalidated cache or a sent email cannot be undone by
 * the database.
 *
 * `$from` is null when the application was just created, since there was no
 * previous stage.
 */
class ApplicationStatusChanged implements ShouldDispatchAfterCommit
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Application $application,
        public ?ApplicationStatus $from,
        public ApplicationStatus $to,
    ) {}
}
