<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * This is a single-user application with no public sign-up, so the one
     * account is seeded rather than registered. Credentials are development
     * only; production sets them through the environment.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => env('SEED_USER_EMAIL', 'dev@job-tracker.test')],
            [
                'name' => env('SEED_USER_NAME', 'Sanjay Ojha'),
                'password' => Hash::make(env('SEED_USER_PASSWORD', 'password')),
                'email_verified_at' => now(),
            ]
        );
    }
}
