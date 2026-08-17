<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\ApplicationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Only `company_id` and `title` are required. Logging an application has to
     * take under 30 seconds, so everything else is optional and editable later.
     *
     * `status` is accepted here even though it is not mass-assignable: creation
     * is the first transition, and the controller hands it to CreateApplication
     * explicitly rather than letting it reach `fill()`.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'title' => ['required', 'string', 'max:255'],
            'status' => ['sometimes', Rule::enum(ApplicationStatus::class)],
            // Not `before_or_equal:today` -- a date typed while offline and
            // synced later is not worth rejecting. Nothing depends on it
            // being in the past.
            'applied_at' => ['nullable', 'date'],
            // Job ad URLs routinely carry tracking parameters past 255.
            'source_url' => ['nullable', 'string', 'url', 'max:2048'],
            'notes' => ['nullable', 'string'],
            // Why it was opened at this stage, recorded on the first audit row.
            'note' => ['nullable', 'string'],
        ];
    }

    /**
     * The opening stage, defaulting to the start of the pipeline.
     */
    public function status(): ApplicationStatus
    {
        return $this->enum('status', ApplicationStatus::class) ?? ApplicationStatus::Wishlist;
    }

    /**
     * The fillable attributes, with the two that are handled explicitly removed.
     *
     * @return array<string, mixed>
     */
    public function applicationAttributes(): array
    {
        return $this->safe()->except(['status', 'note']);
    }
}
