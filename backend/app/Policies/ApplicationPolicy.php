<?php

namespace App\Policies;

use App\Models\Application;
use App\Models\User;

/**
 * Applications are user-owned, unlike companies.
 *
 * There is only one user today, so in practice this never denies anything. It
 * exists because `applications.user_id` exists: the moment ownership is a
 * column, "the API returns whatever ID you ask for" is a data leak waiting for
 * a second account, and a check added later has to be remembered in five
 * places at once.
 */
class ApplicationPolicy
{
    public function view(User $user, Application $application): bool
    {
        return $this->owns($user, $application);
    }

    public function update(User $user, Application $application): bool
    {
        return $this->owns($user, $application);
    }

    public function delete(User $user, Application $application): bool
    {
        return $this->owns($user, $application);
    }

    private function owns(User $user, Application $application): bool
    {
        return $application->user_id === $user->id;
    }
}
