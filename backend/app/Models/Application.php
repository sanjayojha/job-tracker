<?php

namespace App\Models;

use App\Enums\ApplicationStatus;
use Database\Factories\ApplicationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * `status` and `user_id` are deliberately absent from the fillable list.
 * Status moves through a single transition action so the audit trail stays
 * trustworthy, and ownership comes from the authenticated user rather than the
 * request body. Both are set explicitly; neither is ever mass-assigned.
 */
#[Fillable(['company_id', 'title', 'applied_at', 'source_url', 'notes'])]
class Application extends Model
{
    /** @use HasFactory<ApplicationFactory> */
    use HasFactory;

    /**
     * Mirrors the column default so an unsaved instance reads the same as a
     * saved one.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => ApplicationStatus::Wishlist->value,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ApplicationStatus::class,
            'applied_at' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * The full audit trail, oldest first.
     *
     * @return HasMany<ApplicationStatusHistory, $this>
     */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(ApplicationStatusHistory::class);
    }

    /**
     * The most recent transition, which is what staleness is measured from.
     *
     * Derived rather than denormalised onto a column: there is exactly one
     * source of truth for when a status last moved, so nothing can drift.
     *
     * @return HasOne<ApplicationStatusHistory, $this>
     */
    public function latestStatusChange(): HasOne
    {
        return $this->statusHistories()->one()->latestOfMany();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
