<?php

use App\Http\Controllers\Api\V1\ApplicationController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CompanyController;
use Illuminate\Support\Facades\Route;

/*
| Routes are prefixed with /api/v1 by `apiPrefix` in bootstrap/app.php.
| Everything the SPA can do must be reachable here without a browser.
*/

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:6,1')
    ->name('login');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/user', [AuthController::class, 'user'])->name('user');

    // No `create`/`edit` -- those serve HTML forms, and this API has no views.
    Route::apiResource('companies', CompanyController::class);

    // Transitions get their own endpoint; the resource PATCH refuses `status`
    // so the audit trail cannot be bypassed by a field edit.
    Route::post('/applications/{application}/status', [ApplicationController::class, 'changeStatus'])
        ->name('applications.status');

    Route::apiResource('applications', ApplicationController::class);
});
