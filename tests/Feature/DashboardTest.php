<?php

use App\Models\ApiKey;
use App\Models\Project;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    config()->set('services.donations.donation_url', 'https://ko-fi.com/poofmq');

    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('donationUrl', 'https://ko-fi.com/poofmq')
            ->where('admin', null)
            ->etc());

    expect($response->inertiaProps())->toHaveKey('donationUrl', 'https://ko-fi.com/poofmq')
        ->not->toHaveKey('funding')
        ->not->toHaveKey('billing');
});

test('dashboard includes onboarding progress and recent activity', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create([
        'name' => 'Production Queue',
        'description' => 'Handles background jobs.',
        'created_at' => now()->subHour(),
        'updated_at' => now()->subMinutes(10),
    ]);
    $apiKey = ApiKey::factory()->for($user)->for($project)->create([
        'name' => 'Production Queue API Key',
        'created_at' => now()->subMinutes(5),
        'updated_at' => now()->subMinutes(5),
    ]);

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('onboarding.projectCount', 1)
            ->where('onboarding.apiKeyCount', 1)
            ->has('recentActivity', 2)
            ->where('recentActivity.0.type', 'api_key_created')
            ->where('recentActivity.0.title', 'Generated Production Queue API Key')
            ->where('recentActivity.1.type', 'project_updated')
            ->where('recentActivity.1.title', 'Updated Production Queue')
            ->etc());

    expect($response->inertiaProps('recentActivity.0.id'))->toBe("api-key:{$apiKey->id}");
});
