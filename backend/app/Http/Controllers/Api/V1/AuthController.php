<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Resources\Api\V1\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Log in via the session, not a token. Sanctum's SPA mode authenticates
     * the browser with Laravel's own session cookie, so this deliberately
     * uses the `web` guard rather than issuing a personal access token.
     */
    public function login(LoginRequest $request): UserResource
    {
        $credentials = $request->safe()->only(['email', 'password']);

        if (! Auth::guard('web')->attempt($credentials, $request->boolean('remember'))) {
            // Attach the failure to `email` so the SPA can surface it against
            // the form rather than as a bare banner. Never says which of the
            // two fields was wrong -- that would confirm account existence.
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        // Assigns a fresh session ID now that the privilege level has changed,
        // which is what closes session fixation.
        $request->session()->regenerate();

        return new UserResource($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        // Both are required: invalidate drops the session data, regenerating
        // the CSRF token stops the old one being replayed against the next
        // session.
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }

    public function user(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}
