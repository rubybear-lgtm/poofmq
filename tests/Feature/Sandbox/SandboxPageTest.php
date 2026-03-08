<?php

use function Pest\Laravel\get;

test('start page can be viewed without authentication', function () {
    get(route('start.index'))
        ->assertOk();
});
