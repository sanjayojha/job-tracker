<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Application
 */
class ApplicationResource extends JsonResource
{
    /**
     * `company` and `status_history` appear only when the controller eager
     * loaded them, so the list does not pay for a trail nobody asked for and
     * `whenLoaded` keeps an N+1 from hiding behind the resource.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'status' => $this->status->value,
            'applied_at' => $this->applied_at?->toDateString(),
            'source_url' => $this->source_url,
            'notes' => $this->notes,
            'company' => CompanyResource::make($this->whenLoaded('company')),
            // When the status last moved, which is what staleness is measured
            // from. The list needs it; loading the whole trail to get it would not.
            'status_changed_at' => $this->whenLoaded(
                'latestStatusChange',
                fn () => $this->latestStatusChange?->created_at,
            ),
            'status_history' => ApplicationStatusHistoryResource::collection(
                $this->whenLoaded('statusHistories'),
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
