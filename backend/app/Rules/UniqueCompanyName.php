<?php

namespace App\Rules;

use App\Models\Company;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rejects a company name that already exists in any casing.
 *
 * Laravel's built-in `unique` rule cannot express this: it compares the raw
 * attribute value with `=`, which PostgreSQL evaluates case-sensitively, so it
 * would let "acme" through when "Acme" is already stored. This mirrors the
 * `companies_name_lower_unique` functional index, and exists so the client gets
 * a 422 rather than the database raising a 500.
 *
 * The stored value keeps whatever casing was typed -- only the comparison is
 * case-insensitive.
 */
class UniqueCompanyName implements ValidationRule
{
    /**
     * @param  int|null  $ignoreId  the company being edited, which may keep its own name
     */
    public function __construct(private readonly ?int $ignoreId = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        $taken = Company::query()
            ->whereRaw('lower(name) = lower(?)', [$value])
            ->when($this->ignoreId, fn ($query, $id) => $query->whereKeyNot($id))
            ->exists();

        if ($taken) {
            $fail('A company with this name already exists.');
        }
    }
}
