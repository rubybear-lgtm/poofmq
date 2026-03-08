<?php

use function Pest\Laravel\get;

test('quickstart page can be viewed without authentication', function () {
    get('/docs/quickstart')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('docs/quickstart'));
});
