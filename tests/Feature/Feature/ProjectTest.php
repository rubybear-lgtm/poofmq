<?php

use App\Jobs\SyncApiKeyToRedis;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Bus;

uses(Illuminate\Foundation\Testing\RefreshDatabase::class);

// Index Tests
test('unauthenticated users cannot view projects index', function () {
    $response = $this->get(route('projects.index'));

    $response->assertRedirect(route('login'));
});

test('users can view their projects index', function () {
    $user = User::factory()->create();
    Project::factory()->count(3)->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->get(route('projects.index'));

    $response->assertOk();
    expect($response->inertiaProps('projects'))->toHaveCount(3);
});

test('projects index includes api key counts', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);
    $project->apiKeys()->create([
        'user_id' => $user->id,
        'name' => 'Worker Key',
        'key_prefix' => 'worker01',
        'key_hash' => hash('sha256', 'worker-key'),
    ]);

    $response = $this->actingAs($user)->get(route('projects.index'));

    $response->assertOk();
    expect($response->inertiaProps('projects.0.api_keys_count'))->toBe(1);
});

test('users cannot view other users projects in list', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    Project::factory()->count(3)->create(['user_id' => $otherUser->id]);

    $response = $this->actingAs($user)->get(route('projects.index'));

    $response->assertOk();
    // Verify the user sees no projects from other users
    expect($response->inertiaProps('projects'))->toHaveCount(0);
});

test('archived projects are not shown in index', function () {
    $user = User::factory()->create();
    Project::factory()->create(['user_id' => $user->id, 'name' => 'Active Project']);
    Project::factory()->archived()->create(['user_id' => $user->id, 'name' => 'Archived Project']);

    $response = $this->actingAs($user)->get(route('projects.index'));

    $response->assertOk();
    $projects = $response->inertiaProps('projects');
    expect($projects)->toHaveCount(1);
    expect($projects[0]['name'])->toBe('Active Project');
});

// Store Tests
test('users can create a project', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson(route('projects.store'), [
        'name' => 'Test Project',
        'description' => 'A test project description',
    ]);

    $response->assertCreated();
    $response->assertJsonStructure([
        'project' => ['id', 'name', 'description', 'api_keys_count', 'created_at', 'updated_at'],
        'message',
    ]);
    $response->assertJsonPath('project.name', 'Test Project');
    $response->assertJsonPath('project.description', 'A test project description');
    $response->assertJsonPath('project.api_keys_count', 0);

    $this->assertDatabaseHas('projects', [
        'user_id' => $user->id,
        'name' => 'Test Project',
        'description' => 'A test project description',
    ]);
});

test('users can create a project without description', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson(route('projects.store'), [
        'name' => 'Minimal Project',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('project.name', 'Minimal Project');
    $response->assertJsonPath('project.description', null);
    $response->assertJsonPath('project.api_keys_count', 0);

    $this->assertDatabaseHas('projects', [
        'user_id' => $user->id,
        'name' => 'Minimal Project',
        'description' => null,
    ]);
});

test('users can generate an api key for their project', function () {
    Bus::fake();

    $user = User::factory()->create();
    $project = Project::factory()->create([
        'user_id' => $user->id,
        'name' => 'Production API',
    ]);

    $response = $this->actingAs($user)->postJson(route('projects.api-keys.store', $project));

    $response->assertCreated();
    $response->assertJsonPath('api_key.project_id', $project->id);
    $response->assertJsonPath('api_key.project_name', 'Production API');
    $response->assertJsonPath('api_key.name', 'Production API API Key');

    expect($response->json('plain_text_key'))->toStartWith('poofmq_');

    $this->assertDatabaseHas('api_keys', [
        'user_id' => $user->id,
        'project_id' => $project->id,
        'name' => 'Production API API Key',
    ]);

    Bus::assertDispatched(SyncApiKeyToRedis::class);
});

test('users cannot generate an api key for another users project', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $otherUser->id]);

    $response = $this->actingAs($user)->postJson(route('projects.api-keys.store', $project));

    $response->assertForbidden();

    $this->assertDatabaseCount('api_keys', 0);
});

test('users cannot generate an api key for an archived project', function () {
    Bus::fake();

    $user = User::factory()->create();
    $project = Project::factory()->archived()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson(route('projects.api-keys.store', $project));

    $response->assertUnprocessable();
    $response->assertJson([
        'message' => 'Archived projects cannot generate API keys.',
    ]);

    $this->assertDatabaseCount('api_keys', 0);
    Bus::assertNotDispatched(SyncApiKeyToRedis::class);
});

test('project validation requires name', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson(route('projects.store'), []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['name']);
});

test('project name must be under 255 characters', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson(route('projects.store'), [
        'name' => str_repeat('a', 256),
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['name']);
});

test('project description must be under 1000 characters', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson(route('projects.store'), [
        'name' => 'Test Project',
        'description' => str_repeat('a', 1001),
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['description']);
});

// Update Tests
test('users can update their project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->patchJson(route('projects.update', $project), [
        'name' => 'Updated Project',
        'description' => 'Updated description',
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('project.name', 'Updated Project');
    $response->assertJsonPath('project.description', 'Updated description');
    $response->assertJsonPath('project.api_keys_count', 0);

    $project->refresh();
    expect($project->name)->toBe('Updated Project');
    expect($project->description)->toBe('Updated description');
});

test('users can update project name only', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'user_id' => $user->id,
        'name' => 'Original Name',
        'description' => 'Original description',
    ]);

    $response = $this->actingAs($user)->patchJson(route('projects.update', $project), [
        'name' => 'New Name',
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('project.name', 'New Name');

    $project->refresh();
    expect($project->name)->toBe('New Name');
    expect($project->description)->toBe('Original description');
});

test('users cannot update other users projects', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $otherUser->id]);

    $response = $this->actingAs($user)->patchJson(route('projects.update', $project), [
        'name' => 'Hacked Project',
    ]);

    $response->assertForbidden();

    $project->refresh();
    expect($project->name)->not->toBe('Hacked Project');
});

// Destroy (Archive) Tests
test('users can archive their project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    expect($project->isArchived())->toBeFalse();

    $response = $this->actingAs($user)->delete(route('projects.destroy', $project));

    $response->assertRedirect();
    $response->assertSessionHas('status', 'Project archived successfully.');

    $project->refresh();
    expect($project->isArchived())->toBeTrue();
});

test('users can archive their project with a json response', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->deleteJson(route('projects.destroy', $project));

    $response->assertOk();
    $response->assertJson([
        'message' => 'Project archived successfully.',
    ]);

    $project->refresh();
    expect($project->isArchived())->toBeTrue();
});

test('users cannot archive other users projects', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $otherUser->id]);

    $response = $this->actingAs($user)->delete(route('projects.destroy', $project));

    $response->assertForbidden();

    $project->refresh();
    expect($project->isArchived())->toBeFalse();
});

// Model Tests
test('project uses ulid primary key', function () {
    $project = Project::factory()->create();

    expect($project->id)->toBeString();
    expect(strlen($project->id))->toBe(26); // ULID length
});

test('project belongs to user', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    expect($project->user->id)->toBe($user->id);
});

test('project can have many api keys', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    $apiKey = $project->apiKeys()->create([
        'user_id' => $user->id,
        'name' => 'Test Key',
        'key_prefix' => 'test1234',
        'key_hash' => hash('sha256', 'test_key'),
    ]);

    expect($project->apiKeys)->toHaveCount(1);
    expect($project->apiKeys->first()->id)->toBe($apiKey->id);
});

test('project is archived check works', function () {
    $activeProject = Project::factory()->create();
    $archivedProject = Project::factory()->archived()->create();

    expect($activeProject->isArchived())->toBeFalse();
    expect($archivedProject->isArchived())->toBeTrue();
});

test('project archive method works', function () {
    $project = Project::factory()->create();

    expect($project->isArchived())->toBeFalse();

    $project->archive();

    expect($project->isArchived())->toBeTrue();
});

test('project unarchive method works', function () {
    $project = Project::factory()->archived()->create();

    expect($project->isArchived())->toBeTrue();

    $project->unarchive();

    expect($project->isArchived())->toBeFalse();
});

test('project not archived scope works', function () {
    $user = User::factory()->create();
    Project::factory()->count(2)->create(['user_id' => $user->id]);
    Project::factory()->archived()->create(['user_id' => $user->id]);

    $activeProjects = Project::notArchived()->where('user_id', $user->id)->get();

    expect($activeProjects)->toHaveCount(2);
});

test('project archived scope works', function () {
    $user = User::factory()->create();
    Project::factory()->count(2)->create(['user_id' => $user->id]);
    Project::factory()->archived()->create(['user_id' => $user->id]);

    $archivedProjects = Project::archived()->where('user_id', $user->id)->get();

    expect($archivedProjects)->toHaveCount(1);
});

// User Relationship Tests
test('user has many projects', function () {
    $user = User::factory()->create();
    Project::factory()->count(3)->create(['user_id' => $user->id]);

    expect($user->projects)->toHaveCount(3);
});

// ApiKey Project Relationship Tests
test('api key belongs to project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);
    $apiKey = $project->apiKeys()->create([
        'user_id' => $user->id,
        'name' => 'Test Key',
        'key_prefix' => 'test1234',
        'key_hash' => hash('sha256', 'test_key'),
    ]);

    expect($apiKey->project->id)->toBe($project->id);
});

test('api key project_id is nullable', function () {
    $user = User::factory()->create();
    $apiKey = $user->apiKeys()->create([
        'name' => 'Test Key',
        'key_prefix' => 'test1234',
        'key_hash' => hash('sha256', 'test_key'),
    ]);

    expect($apiKey->project_id)->toBeNull();
});
