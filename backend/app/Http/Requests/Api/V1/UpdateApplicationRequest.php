<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Every field is `sometimes`: an absent key means "leave it alone", an
     * explicit null means "clear it".
     *
     * `status` is absent by design -- transitions go through
     * POST /applications/{id}/status so they cannot bypass the audit trail.
     * See {@see self::withValidator()}, which says so out loud rather than
     * ignoring it.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'company_id' => ['sometimes', 'required', 'integer', 'exists:companies,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'applied_at' => ['sometimes', 'nullable', 'date'],
            'source_url' => ['sometimes', 'nullable', 'string', 'url', 'max:2048'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }

    /**
     * Rejects a `status` key outright instead of silently dropping it.
     *
     * Silently ignoring it is the dangerous option: the caller gets a 200, sees
     * the other fields updated, and reasonably concludes the status moved too.
     * A 422 naming the right endpoint costs one round trip and cannot be
     * misread.
     */
    protected function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->has('status')) {
                $validator->errors()->add(
                    'status',
                    'Status cannot be changed here. Use POST /api/v1/applications/{id}/status.',
                );
            }
        });
    }
}
