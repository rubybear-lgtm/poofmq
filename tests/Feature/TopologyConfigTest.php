<?php

it('declares env ownership using known services', function () {
    $topology = config('topology');

    expect($topology)
        ->toBeArray()
        ->toHaveKeys(['services', 'env_ownership', 'deployment_targets']);

    $services = array_keys($topology['services']);

    foreach ($topology['env_ownership'] as $key => $metadata) {
        expect($key)->toBeString();
        expect($metadata)->toHaveKeys(['owner', 'consumers']);
        expect($metadata['owner'])->toBeIn($services);
        expect($metadata['consumers'])->toBeArray()->not->toBeEmpty();

        foreach ($metadata['consumers'] as $consumer) {
            expect($consumer)->toBeIn($services);
        }
    }
});

it('keeps deployment target mappings inside the service boundary list', function () {
    $topology = config('topology');
    $services = array_keys($topology['services']);

    foreach ($topology['deployment_targets'] as $provider => $mapping) {
        expect($provider)->toBeString();
        expect($mapping)->toBeArray()->not->toBeEmpty();

        foreach ($mapping as $service => $notes) {
            expect($service)->toBeIn($services);
            expect($notes)->toBeString()->not->toBeEmpty();
        }
    }
});
