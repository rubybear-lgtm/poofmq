<?php

it('defines the canonical poofmq proto contract for mvp queue operations', function () {
    $contractPath = dirname(__DIR__, 2).'/proto/poofmq/v1/poofmq.proto';

    expect($contractPath)->toBeFile();

    $contract = file_get_contents($contractPath);

    expect($contract)->not->toBeFalse()
        ->and($contract)->toContain('syntax = "proto3";')
        ->and($contract)->toContain('package poofmq.v1;')
        ->and($contract)->toContain('service QueueService')
        ->and($contract)->toContain('rpc Push(PushMessageRequest) returns (PushMessageResponse)')
        ->and($contract)->toContain('rpc Pop(PopMessageRequest) returns (PopMessageResponse)')
        ->and($contract)->toContain('google.protobuf.Struct payload = 2;')
        ->and($contract)->toContain('string event_type = 1;')
        ->and($contract)->toContain('map<string, string> metadata = 3;')
        ->and($contract)->toContain('ENCRYPTION_MODE_EDGE_ENCRYPTED')
        ->and($contract)->toContain('ENCRYPTION_MODE_CLIENT_ENCRYPTED')
        ->and($contract)->toContain('MVP encryption field matrix')
        ->and($contract)->toContain('post: "/v1/queues/{queue_id}/messages"')
        ->and($contract)->toContain('post: "/v1/queues/{queue_id}/messages:pop"');
});
