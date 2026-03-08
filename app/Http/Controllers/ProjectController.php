<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
use App\Services\ApiKeyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Display a listing of the user's projects.
     */
    public function index(Request $request): Response
    {
        $projects = Project::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('archived_at')
            ->withCount('apiKeys')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'api_keys_count' => $project->api_keys_count,
                'created_at' => $project->created_at->toIso8601String(),
                'updated_at' => $project->updated_at->toIso8601String(),
            ]);

        return Inertia::render('projects/index', [
            'projects' => $projects,
        ]);
    }

    /**
     * Store a newly created project in storage.
     */
    public function store(StoreProjectRequest $request): JsonResponse
    {
        $this->authorize('create', Project::class);

        $project = Project::create([
            'user_id' => $request->user()->id,
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
        ]);

        return response()->json([
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'api_keys_count' => 0,
                'created_at' => $project->created_at->toIso8601String(),
                'updated_at' => $project->updated_at->toIso8601String(),
            ],
            'message' => 'Project created successfully.',
        ], 201);
    }

    /**
     * Generate a new API key for the specified project.
     */
    public function storeApiKey(Request $request, Project $project, ApiKeyService $apiKeyService): JsonResponse
    {
        $this->authorize('update', $project);

        if ($project->isArchived()) {
            return response()->json([
                'message' => 'Archived projects cannot generate API keys.',
            ], 422);
        }

        $apiKeyNumber = $project->apiKeys()->count() + 1;
        $apiKeyName = $apiKeyNumber === 1
            ? "{$project->name} API Key"
            : "{$project->name} API Key {$apiKeyNumber}";

        $result = $apiKeyService->generate(
            user: $request->user(),
            name: $apiKeyName,
            expiresAt: null,
            projectId: $project->id,
        );

        $result['api_key']->load('project:id,name');

        return response()->json([
            'api_key' => [
                'id' => $result['api_key']->id,
                'name' => $result['api_key']->name,
                'key_prefix' => $result['api_key']->key_prefix,
                'project_id' => $result['api_key']->project_id,
                'project_name' => $result['api_key']->project?->name,
                'expires_at' => $result['api_key']->expires_at?->toIso8601String(),
                'created_at' => $result['api_key']->created_at->toIso8601String(),
            ],
            'plain_text_key' => $result['plain_text_key'],
            'message' => 'Make sure to copy your API key now. You won\'t be able to see it again!',
        ], 201);
    }

    /**
     * Update the specified project in storage.
     */
    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $project->update($request->validated());

        return response()->json([
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'archived_at' => $project->archived_at?->toIso8601String(),
                'api_keys_count' => $project->apiKeys()->count(),
                'created_at' => $project->created_at->toIso8601String(),
                'updated_at' => $project->updated_at->toIso8601String(),
            ],
            'message' => 'Project updated successfully.',
        ]);
    }

    /**
     * Archive the specified project.
     */
    public function destroy(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorize('delete', $project);

        $project->archive();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Project archived successfully.',
            ]);
        }

        return back()->with('status', 'Project archived successfully.');
    }
}
