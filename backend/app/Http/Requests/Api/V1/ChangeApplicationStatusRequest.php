<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\ApplicationStatus;
use App\Exceptions\ApplicationAlreadyAtStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangeApplicationStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validates only that the target is a real stage. Whether the move itself
     * is allowed is the action's business -- see
     * {@see ApplicationAlreadyAtStatus} for why the no-op check
     * is not duplicated here.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(ApplicationStatus::class)],
            'note' => ['nullable', 'string'],
        ];
    }

    public function status(): ApplicationStatus
    {
        return $this->enum('status', ApplicationStatus::class);
    }
}
