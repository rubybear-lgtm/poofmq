<?php

test('quickstart documentation includes shared sdk structure and queue operations', function () {
    $contents = file_get_contents(base_path('docs/quickstart.md'));

    expect($contents)
        ->toContain('START INSTANTLY')
        ->toContain('GET FREE DEV KEY')
        ->toContain('## Shared SDK Guide')
        ->toContain('### Node SDK Quickstart')
        ->toContain('### Python SDK Quickstart')
        ->toContain('npm install @poofmq/node')
        ->toContain('pip install poofmq')
        ->toContain('### Client-side Encryption')
        ->toContain('### API Reference')
        ->toContain('/v1/queues/{queue_id}/messages')
        ->toContain('/v1/queues/{queue_id}/messages:pop');
});
