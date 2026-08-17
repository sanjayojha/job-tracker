<?php

namespace App\Http\Resources\Api\V1;

use App\Models\ApplicationStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApplicationStatusHistory
 */
class ApplicationStatusHistoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // Null on the opening row: nothing preceded the application's creation.
            'from_status' => $this->from_status?->value,
            'to_status' => $this->to_status->value,
            'note' => $this->note,
            'created_at' => $this->created_at,
        ];
    }
}
