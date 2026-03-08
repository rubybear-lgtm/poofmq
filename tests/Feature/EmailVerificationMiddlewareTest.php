<?php

use App\Models\User;

test('unverified users may access verified routes when email verification is disabled', function () {
    config(['fortify.email_verification_required' => false]);

    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk();
});

test('unverified users are redirected to the verification notice when email verification is enabled', function () {
    config(['fortify.email_verification_required' => true]);

    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertRedirect(route('verification.notice'));
});
