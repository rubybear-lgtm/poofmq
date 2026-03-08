<?php

namespace App\Http\Requests;

use App\Services\TurnstileService;
use Illuminate\Foundation\Http\FormRequest;

class StoreDeveloperKeyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email:rfc,dns', 'max:255'],
            'turnstile_token' => ['required', 'string'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => 'Your email address is required.',
            'email.email' => 'Enter a valid email address.',
            'email.max' => 'Email addresses must be 255 characters or fewer.',
            'turnstile_token.required' => 'Complete Turnstile verification to get your key.',
            'turnstile_token.string' => 'The Turnstile token must be a valid string.',
        ];
    }

    /**
     * Verify the Turnstile token.
     */
    public function verifyTurnstile(TurnstileService $turnstileService): bool
    {
        return $turnstileService->verify(
            token: $this->validated('turnstile_token'),
            clientIp: $this->ip()
        );
    }
}
