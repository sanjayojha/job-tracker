<?php

namespace App\Enums;

/**
 * The stages an application moves through.
 *
 * Declaration order is pipeline order: the first five are the forward path, the
 * last two are the ways it ends. Cases are listed here rather than as free text
 * on the column so the set is closed and exhaustive `match` stays possible.
 *
 * These values must stay identical to `APPLICATION_STATUSES` in
 * `frontend/src/features/applications/status.ts`, which drives the SPA's labels
 * and colours. `ApplicationStatusParityTest` enforces that.
 */
enum ApplicationStatus: string
{
    case Wishlist = 'wishlist';
    case Applied = 'applied';
    case Screening = 'screening';
    case Interview = 'interview';
    case Offer = 'offer';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';

    /**
     * The backing values, in pipeline order.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
