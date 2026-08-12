<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('application_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            // Null on the row written when the application is created: there was
            // no previous stage to come from.
            $table->string('from_status')->nullable();
            $table->string('to_status');
            // Why it moved, captured at the moment it moved -- which is the only
            // time the reason is actually known.
            $table->text('note')->nullable();
            // An audit row is never edited, so there is no updated_at to keep.
            $table->timestamp('created_at')->nullable();

            // Staleness reads the newest row per application; the audit view
            // reads them all in order. Both are this index.
            $table->index(['application_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('application_status_histories');
    }
};
