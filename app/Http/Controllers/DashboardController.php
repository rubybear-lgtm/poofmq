<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use App\Models\Project;
use App\Services\CapacityLimitService;
use App\Services\ObservabilityService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct(
        public CapacityLimitService $capacityLimitService,
        public ObservabilityService $observabilityService
    ) {}

    /**
     * Display the dashboard page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user?->isAdmin() ?? false;

        $projectCount = Project::query()
            ->whereBelongsTo($user)
            ->notArchived()
            ->count();

        $apiKeyCount = ApiKey::query()
            ->whereBelongsTo($user)
            ->active()
            ->count();

        $recentProjectActivity = Project::query()
            ->whereBelongsTo($user)
            ->notArchived()
            ->latest('updated_at')
            ->limit(4)
            ->get()
            ->map(function (Project $project): array {
                $wasUpdated = $project->updated_at->gt($project->created_at);
                $activityAt = $wasUpdated
                    ? $project->updated_at
                    : $project->created_at;

                return [
                    'id' => "project:{$project->id}",
                    'type' => $wasUpdated ? 'project_updated' : 'project_created',
                    'title' => $wasUpdated
                        ? "Updated {$project->name}"
                        : "Created {$project->name}",
                    'description' => $project->description
                        ?? 'Scoped work to a new project.',
                    'href' => route('projects.index', absolute: false),
                    'occurred_at' => $activityAt->toIso8601String(),
                ];
            });

        $recentApiKeyActivity = ApiKey::query()
            ->whereBelongsTo($user)
            ->with('project:id,name')
            ->latest()
            ->limit(4)
            ->get()
            ->map(function (ApiKey $apiKey): array {
                $projectName = $apiKey->project?->name ?? 'an unscoped project';

                return [
                    'id' => "api-key:{$apiKey->id}",
                    'type' => 'api_key_created',
                    'title' => "Generated {$apiKey->name}",
                    'description' => "Project scope: {$projectName}",
                    'href' => route('api-keys.index', absolute: false),
                    'occurred_at' => $apiKey->created_at->toIso8601String(),
                ];
            });

        $recentActivity = $recentProjectActivity
            ->concat($recentApiKeyActivity)
            ->sortByDesc('occurred_at')
            ->take(6)
            ->values();

        return Inertia::render('dashboard', [
            'onboarding' => [
                'projectCount' => $projectCount,
                'apiKeyCount' => $apiKeyCount,
            ],
            'recentActivity' => $recentActivity,
            'admin' => $isAdmin ? [
                'capacity' => $this->capacityLimitService->resolveGlobalLimit(),
                'observability' => $this->observabilityService->collect(),
            ] : null,
        ]);
    }
}
