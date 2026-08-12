<?php

namespace Database\Factories;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * Defaults to a sent application rather than the column default, because
     * that is the row most tests are about. Use `wishlist()` for the other case.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'company_id' => Company::factory(),
            'title' => fake()->jobTitle(),
            'status' => ApplicationStatus::Applied,
            'applied_at' => fake()->dateTimeBetween('-3 months'),
            'source_url' => fake()->url(),
            'notes' => null,
        ];
    }

    /**
     * Indicate that the application is at a particular stage.
     */
    public function status(ApplicationStatus $status): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => $status,
        ]);
    }

    /**
     * Indicate that the application has been noted but not sent.
     */
    public function wishlist(): static
    {
        return $this->status(ApplicationStatus::Wishlist)
            ->state(fn (array $attributes) => [
                'applied_at' => null,
            ]);
    }
}
