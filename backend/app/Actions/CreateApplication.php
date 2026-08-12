<?php

namespace App\Actions;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Create an application at a given opening stage.
 *
 * Exists because `status` and `user_id` are not mass-assignable and creation
 * counts as the first transition: the row has to be written and the history
 * opened together, or an application exists with no trail behind it.
 */
class CreateApplication
{
    public function __construct(
        private readonly ChangeApplicationStatus $changeStatus,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes  fillable application attributes
     */
    public function handle(
        User $user,
        array $attributes,
        ApplicationStatus $status = ApplicationStatus::Wishlist,
        ?string $note = null,
    ): Application {
        return DB::transaction(function () use ($user, $attributes, $status, $note) {
            $application = $user->applications()->make($attributes);
            $application->status = $status;
            $application->save();

            return $this->changeStatus->recordInitial($application, $note);
        });
    }
}
