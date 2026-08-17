<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCompanyRequest;
use App\Http\Requests\Api\V1\UpdateCompanyRequest;
use App\Http\Resources\Api\V1\CompanyResource;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

/**
 * Companies are shared reference data, not user-owned rows -- there is one
 * user, and the table carries no `user_id`. So there is no ownership scope
 * here; authentication alone is the gate.
 */
class CompanyController extends Controller
{
    /**
     * Deliberately unpaginated. Logging an application has to take under 30
     * seconds, and the SPA's company picker needs the whole list at once to
     * filter it client-side. A single job search does not produce enough
     * companies for that to be a problem.
     */
    public function index(): AnonymousResourceCollection
    {
        $companies = Company::query()
            ->withCount('applications')
            ->orderBy('name')
            ->get();

        return CompanyResource::collection($companies);
    }

    public function store(StoreCompanyRequest $request): JsonResponse
    {
        $company = Company::create($request->validated());

        return CompanyResource::make($company)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Company $company): CompanyResource
    {
        return CompanyResource::make($company->loadCount('applications'));
    }

    public function update(UpdateCompanyRequest $request, Company $company): CompanyResource
    {
        $company->update($request->validated());

        return CompanyResource::make($company);
    }

    /**
     * Refuses while applications still reference the company.
     *
     * The foreign key cascades, so without this check deleting a company would
     * silently take its applications and their audit trails with it. Losing
     * typed-once history to a single click is exactly what the tool must not
     * do; the client is told what is in the way and deletes or reassigns those
     * applications first.
     */
    public function destroy(Company $company): JsonResponse
    {
        $applicationCount = $company->applications()->count();

        if ($applicationCount > 0) {
            return response()->json([
                'message' => "This company still has {$applicationCount} application(s). Delete or move them first.",
                'applications_count' => $applicationCount,
            ], Response::HTTP_CONFLICT);
        }

        $company->delete();

        return response()->json(status: Response::HTTP_NO_CONTENT);
    }
}
