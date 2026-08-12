<?php

namespace App\Actions;

use App\Enums\ApplicationStatus;
use App\Events\ApplicationStatusChanged;
use App\Models\Application;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * The single funnel every status change goes through.
 *
 * Nothing else may write `Application::$status` -- the attribute is guarded
 * against mass assignment specifically so this cannot be bypassed. Everything
 * downstream (the audit trail, staleness, reminders, dashboard invalidation)
 * assumes that one row is written here for every transition, and that
 * assumption is only as good as the funnel.
 *
 * Any stage may follow any other. A real search is not a state machine: people
 * get re-approached after a rejection, or withdraw and re-engage. The only
 * refusal is a move to the stage the application is already in, which would
 * record history that says nothing happened.
 */
class ChangeApplicationStatus
{
    /**
     * Move an application to a new stage and record it.
     *
     * @throws RuntimeException when the application is already at that stage
     */
    public function handle(
        Application $application,
        ApplicationStatus $to,
        ?string $note = null,
    ): Application {
        $from = $application->status;

        if ($from === $to) {
            throw new RuntimeException(
                "Application {$application->id} is already at status {$to->value}."
            );
        }

        return DB::transaction(function () use ($application, $from, $to, $note) {
            $application->status = $to;
            $application->save();

            $application->statusHistories()->create([
                'from_status' => $from,
                'to_status' => $to,
                'note' => $note,
            ]);

            ApplicationStatusChanged::dispatch($application, $from, $to);

            return $application;
        });
    }

    /**
     * Record the opening stage of a newly created application.
     *
     * Creation is the first transition, so it gets a history row too -- with a
     * null `from_status`. Without it, "when did this enter the pipeline" would
     * need a special case for applications that have never moved.
     *
     * @internal Call {@see CreateApplication} rather than this directly.
     */
    public function recordInitial(Application $application, ?string $note = null): Application
    {
        $to = $application->status;

        return DB::transaction(function () use ($application, $to, $note) {
            $application->statusHistories()->create([
                'from_status' => null,
                'to_status' => $to,
                'note' => $note,
            ]);

            ApplicationStatusChanged::dispatch($application, null, $to);

            return $application;
        });
    }
}
