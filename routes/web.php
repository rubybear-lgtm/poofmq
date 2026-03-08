<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::inertia('start', 'start/index')->name('start.index');
Route::inertia('docs/quickstart', 'docs/quickstart')->name('docs.quickstart');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/api-keys.php';
require __DIR__.'/projects.php';
require __DIR__.'/developers.php';
