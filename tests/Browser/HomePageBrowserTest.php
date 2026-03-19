<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('renders the home page ko-fi tip call to action without javascript errors', function () {
    config()->set('services.donations.donation_url', 'https://ko-fi.com/poofmq');

    visit('/')
        ->assertSee('Use Cases')
        ->assertSee('Event buffering')
        ->assertSee('Leave a tip on Ko-fi')
        ->assertDontSee('Support me on Ko-fi')
        ->assertNoJavaScriptErrors();
});

it('shows the local turnstile bypass state in the developer key dialog', function () {
    visit('/')
        ->click('Get free dev key')
        ->assertSee('Local development bypass active')
        ->assertSee('Turnstile is skipped on local')
        ->assertNoJavaScriptErrors();
});
