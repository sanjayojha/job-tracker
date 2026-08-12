<?php

namespace Database\Factories;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApplicationStatusHistory>
 */
class ApplicationStatusHistoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'application_id' => Application::factory(),
            'from_status' => ApplicationStatus::Wishlist,
            'to_status' => ApplicationStatus::Applied,
            'note' => null,
        ];
    }

    /**
     * Indicate that this is the row written when the application was created.
     */
    public function initial(): static
    {
        return $this->state(fn (array $attributes) => [
            'from_status' => null,
            'to_status' => ApplicationStatus::Wishlist,
        ]);
    }
}
