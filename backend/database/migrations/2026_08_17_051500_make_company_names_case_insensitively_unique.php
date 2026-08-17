<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PostgreSQL compares strings case-sensitively, so the plain unique index on
 * `name` happily accepted "Acme" alongside "acme". In a tool whose whole job is
 * scanning a list, the same employer appearing twice under different casing is
 * a real defect rather than a technicality.
 *
 * A functional index is what makes this enforceable in the database rather than
 * only in a Form Request -- see App\Rules\UniqueCompanyName, which mirrors it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropUnique('companies_name_unique');
        });

        // No Blueprint equivalent: functional indexes are raw SQL in Laravel.
        DB::statement('CREATE UNIQUE INDEX companies_name_lower_unique ON companies (lower(name))');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX companies_name_lower_unique');

        Schema::table('companies', function (Blueprint $table) {
            $table->unique('name');
        });
    }
};
