<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\ApplicationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexApplicationRequest extends FormRequest
{
    /**
     * Columns the list may be sorted by.
     *
     * An allow-list, not free text: `sort` reaches an `orderBy`, and anything
     * that reaches an `orderBy` from a query string has to be closed.
     */
    public const SORTABLE = ['applied_at', 'status', 'title', 'created_at', 'updated_at'];

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
            'status' => ['sometimes', Rule::enum(ApplicationStatus::class)],
            'company_id' => ['sometimes', 'integer', 'exists:companies,id'],
            'search' => ['sometimes', 'string', 'max:255'],
            'sort' => ['sometimes', Rule::in(self::SORTABLE)],
            'direction' => ['sometimes', Rule::in(['asc', 'desc'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
