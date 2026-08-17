<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Company
 */
class CompanyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'website' => $this->website,
            'notes' => $this->notes,
            // Only present when the controller asked for it. The list needs
            // the count to show how much is riding on a company; `show` after
            // a write does not, and would pay for a subquery to say zero.
            'applications_count' => $this->whenCounted('applications'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
