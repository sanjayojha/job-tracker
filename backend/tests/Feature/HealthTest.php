<?php

it('serves the health check endpoint', function () {
    $this->get('/up')->assertOk();
});

it('runs migrations against postgresql, not sqlite', function () {
    // Guards the phpunit.xml database config. If someone reverts it to SQLite
    // in-memory, the suite silently stops testing the engine we deploy on --
    // and Postgres-specific behaviour (enums, case-sensitivity, JSONB) goes
    // uncovered. Cheap assertion, catches a whole class of false confidence.
    expect(DB::connection()->getDriverName())->toBe('pgsql');
    expect(DB::connection()->getDatabaseName())->toBe('test');
});
