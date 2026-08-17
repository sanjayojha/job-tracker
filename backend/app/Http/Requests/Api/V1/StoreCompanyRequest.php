<?php

namespace App\Http\Requests\Api\V1;

use App\Rules\UniqueCompanyName;
use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            // Mirrors the companies_name_lower_unique functional index rather
            // than using `unique:`, which would compare case-sensitively.
            'name' => ['required', 'string', 'max:255', new UniqueCompanyName],
            'website' => ['nullable', 'string', 'url', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
