<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDeveloperKeyRequest;
use App\Models\Project;
use App\Models\User;
use App\Services\ApiKeyService;
use App\Services\TurnstileService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Random\RandomException;

class DeveloperKeyController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct(
        protected ApiKeyService $apiKeyService,
        protected TurnstileService $turnstileService
    ) {}

    /**
     * Create a free developer key for a new user.
     *
     * @throws RandomException
     */
    public function store(StoreDeveloperKeyRequest $request): JsonResponse
    {
        if (! $request->verifyTurnstile($this->turnstileService)) {
            return response()->json([
                'message' => 'Turnstile verification failed.',
            ], 422);
        }

        $email = Str::lower($request->validated('email'));

        if (User::query()->where('email', $email)->exists()) {
            return response()->json([
                'message' => 'That email already has an account. Sign in to create or manage developer keys.',
                'login_url' => route('login'),
            ], 409);
        }

        /** @var array{user: User, project: Project} $created */
        $created = DB::transaction(function () use ($email): array {
            $user = User::create([
                'name' => $this->defaultNameFromEmail($email),
                'email' => $email,
                'password' => Str::password(32),
            ]);

            $project = Project::create([
                'user_id' => $user->id,
                'name' => 'My First Project',
                'description' => 'Created automatically from the free developer key flow.',
            ]);

            return [
                'user' => $user,
                'project' => $project,
            ];
        });

        event(new Registered($created['user']));

        $result = $this->apiKeyService->generate(
            user: $created['user'],
            name: 'Website developer key',
            projectId: $created['project']->id
        );

        return response()->json([
            'plain_text_key' => $result['plain_text_key'],
            'project_name' => $created['project']->name,
            'claim_url' => route('password.request'),
            'message' => 'Your free developer key is ready. Copy it now, then set a password later to claim and manage the account.',
        ], 201);
    }

    /**
     * Build a default user name from an email address.
     */
    protected function defaultNameFromEmail(string $email): string
    {
        $localPart = Str::before($email, '@');
        $normalized = str_replace(['.', '_', '-'], ' ', $localPart);
        $name = Str::title(trim($normalized));

        return $name !== '' ? $name : 'PoofMQ Developer';
    }
}
