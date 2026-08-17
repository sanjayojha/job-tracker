<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\ChangeApplicationStatus;
use App\Actions\CreateApplication;
use App\Enums\ApplicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ChangeApplicationStatusRequest;
use App\Http\Requests\Api\V1\IndexApplicationRequest;
use App\Http\Requests\Api\V1\StoreApplicationRequest;
use App\Http\Requests\Api\V1\UpdateApplicationRequest;
use App\Http\Resources\Api\V1\ApplicationResource;
use App\Models\Application;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Symfony\Component\HttpFoundation\Response;

class ApplicationController extends Controller implements HasMiddleware
{
    /**
     * Ownership is checked by ApplicationPolicy on every action that takes a
     * bound model. `index` and `store` take none, so they scope to the
     * authenticated user directly instead.
     *
     * @return array<int, Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('can:view,application', only: ['show']),
            new Middleware('can:update,application', only: ['update', 'changeStatus']),
            new Middleware('can:delete,application', only: ['destroy']),
        ];
    }

    public function index(IndexApplicationRequest $request): AnonymousResourceCollection
    {
        $filters = $request->safe();

        $applications = Application::query()
            ->whereBelongsTo($request->user())
            // latestStatusChange feeds the staleness column. Both are eager
            // loaded because a page of 25 rows is 50 extra queries otherwise.
            ->with(['company', 'latestStatusChange'])
            ->when(
                $filters['status'] ?? null,
                fn (Builder $query, string $status) => $query->where('status', $status),
            )
            ->when(
                $filters['company_id'] ?? null,
                fn (Builder $query, int $companyId) => $query->where('company_id', $companyId),
            )
            ->when(
                $filters['search'] ?? null,
                // ILIKE, not LIKE: PostgreSQL's LIKE is case-sensitive, and
                // nobody searching their own applications types exact casing.
                // The wildcards in the term itself are escaped so a literal `%`
                // does not match everything.
                fn (Builder $query, string $search) => $query->where(
                    'title',
                    'ILIKE',
                    '%'.addcslashes($search, '%_\\').'%',
                ),
            );

        $this->applySort(
            $applications,
            $filters['sort'] ?? 'applied_at',
            $filters['direction'] ?? 'desc',
        );

        return ApplicationResource::collection(
            $applications->paginate($filters['per_page'] ?? 25)->withQueryString(),
        );
    }

    public function store(StoreApplicationRequest $request, CreateApplication $createApplication): JsonResponse
    {
        // Never `Application::create()` -- creation is the first transition and
        // opens the audit trail, which only the action does.
        $application = $createApplication->handle(
            $request->user(),
            $request->applicationAttributes(),
            $request->status(),
            $request->input('note'),
        );

        return ApplicationResource::make($application->load('company'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Application $application): ApplicationResource
    {
        // The full trail, oldest first -- this is the audit view.
        return ApplicationResource::make($application->load([
            'company',
            'statusHistories' => fn ($query) => $query->oldest(),
        ]));
    }

    public function update(UpdateApplicationRequest $request, Application $application): ApplicationResource
    {
        $application->update($request->validated());

        return ApplicationResource::make($application->load('company'));
    }

    /**
     * The only way to move an application's status over HTTP.
     *
     * A separate endpoint rather than a `status` key on the resource PATCH: the
     * single-funnel rule is far easier to keep when it is visible in the URL
     * space, and a transition carries a note that a field edit has nowhere to put.
     */
    public function changeStatus(
        ChangeApplicationStatusRequest $request,
        Application $application,
        ChangeApplicationStatus $changeStatus,
    ): ApplicationResource {
        // Throws ApplicationAlreadyAtStatus for a no-op move, which renders
        // itself as a 422 keyed to `status`.
        $changeStatus->handle($application, $request->status(), $request->input('note'));

        return ApplicationResource::make($application->load([
            'company',
            'statusHistories' => fn ($query) => $query->oldest(),
        ]));
    }

    public function destroy(Application $application): JsonResponse
    {
        // The status history cascades with it, by design: deleting an
        // application is the user saying it never belonged in the pipeline.
        $application->delete();

        return response()->json(status: Response::HTTP_NO_CONTENT);
    }

    /**
     * Orders the query, translating a `status` sort into pipeline order.
     *
     * Sorting on the column itself would order the enum's backing values
     * alphabetically -- applied, interview, offer, rejected, screening,
     * wishlist -- which is not an order that means anything. The enum declares
     * its cases in pipeline order, so that is what this reproduces.
     *
     * Every sort gets `id` as a tiebreaker: `applied_at` is a date and nullable,
     * so ties are common, and an unstable sort silently repeats or skips rows
     * across pages.
     *
     * @param  Builder<Application>  $query
     */
    private function applySort(Builder $query, string $sort, string $direction): void
    {
        if ($sort !== 'status') {
            $query->orderBy($sort, $direction)->orderBy('id', $direction);

            return;
        }

        $cases = [];
        $bindings = [];

        foreach (ApplicationStatus::cases() as $position => $status) {
            $cases[] = 'WHEN ? THEN '.$position;
            $bindings[] = $status->value;
        }

        $query->orderByRaw(
            'CASE status '.implode(' ', $cases).' END '.($direction === 'asc' ? 'ASC' : 'DESC'),
            $bindings,
        )->orderBy('id', $direction);
    }
}
