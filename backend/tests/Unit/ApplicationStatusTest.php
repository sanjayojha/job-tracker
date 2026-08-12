<?php

use App\Enums\ApplicationStatus;

/**
 * The SPA keeps its own copy of the status list, because it needs the values at
 * module scope to build label and colour maps. Two copies means they can drift,
 * and a drifted value renders as an unstyled, unlabelled badge. This test is the
 * thing that stops that -- it reads the TypeScript and compares.
 */
it('matches the status list the frontend renders', function () {
    $path = dirname(__DIR__, 3).'/frontend/src/features/applications/status.ts';

    expect($path)->toBeReadableFile();

    preg_match(
        '/APPLICATION_STATUSES = \[(.*?)\]/s',
        (string) file_get_contents($path),
        $block
    );

    expect($block)->not->toBeEmpty('APPLICATION_STATUSES was not found in status.ts');

    preg_match_all("/'([a-z]+)'/", $block[1], $statuses);

    // Order matters as well as membership: it is the pipeline order both sides
    // present stages in.
    expect($statuses[1])->toBe(ApplicationStatus::values());
});

it('exposes its backing values in pipeline order', function () {
    expect(ApplicationStatus::values())->toBe([
        'wishlist',
        'applied',
        'screening',
        'interview',
        'offer',
        'rejected',
        'withdrawn',
    ]);
});
