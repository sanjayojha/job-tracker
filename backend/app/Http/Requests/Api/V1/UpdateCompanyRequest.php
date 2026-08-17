<?php

namespace App\Http\Requests\Api\V1;

use App\Models\Company;
use App\Rules\UniqueCompanyName;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Every field is `sometimes`: this is a PATCH, so an absent key means
     * "leave it alone" and an explicit null means "clear it". Marking them
     * `required` would turn every edit into a full replacement.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                // Ignores the row being edited, or renaming only the casing --
                // or touching another field entirely -- would collide with itself.
                new UniqueCompanyName($this->company()->getKey()),
            ],
            'website' => ['sometimes', 'nullable', 'string', 'url', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }

    /**
     * The bound company. Route model binding has already resolved it -- a
     * missing one would have 404ed long before validation runs.
     */
    private function company(): Company
    {
        /** @var Company */
        return $this->route('company');
    }
}
