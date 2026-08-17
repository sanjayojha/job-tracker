<?php

namespace App\Exceptions;

use App\Enums\ApplicationStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Asking an application to move to the stage it already holds.
 *
 * This is a client error, not a server fault: the transition action refuses it
 * because recording it would put a row in the audit trail saying nothing
 * happened. Rendering itself as a 422 is what stops that refusal surfacing as a
 * 500 -- see {@see self::render()} for why the check lives here rather than in
 * a Form Request.
 */
class ApplicationAlreadyAtStatus extends RuntimeException
{
    public function __construct(public readonly ApplicationStatus $status)
    {
        parent::__construct("Application is already at status {$status->value}.");
    }

    /**
     * Renders in the same shape as a validation failure, keyed to `status`, so
     * the SPA surfaces it against the field it came from and needs no special
     * case for this one endpoint.
     *
     * The rule is enforced here rather than as a Form Request rule on purpose.
     * A validator would have to re-read the application's current status and
     * compare it, duplicating the action's own check -- two copies that can
     * drift, and a gap between the check and the write. Keeping it inside the
     * funnel means every caller is bound by it, HTTP or not, and the HTTP layer
     * only translates.
     */
    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'errors' => ['status' => [$this->getMessage()]],
        ], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
