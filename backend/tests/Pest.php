<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature tests hit a real PostgreSQL `test` database rather than SQLite
| in-memory (see phpunit.xml), so they exercise the engine we deploy on.
| RefreshDatabase wraps each test in a transaction and rolls it back, which
| keeps tests isolated without re-migrating between them.
|
| Unit tests deliberately do not extend TestCase -- they should not need a
| framework boot or a database. If a "unit" test needs either, it is a
| feature test and belongs in tests/Feature.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');
