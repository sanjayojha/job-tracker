<?php

use App\Enums\ApplicationStatus;
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
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('status')->default(ApplicationStatus::Wishlist->value);
            // Null until it is actually sent: a wishlist entry has no applied date.
            $table->date('applied_at')->nullable();
            // Job ad URLs routinely carry tracking parameters past the usual 255.
            $table->string('source_url', 2048)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // The dashboard counts per status for one user; the list sorts by date.
            // PostgreSQL does not index foreign keys automatically, so company_id
            // needs its own or every company delete does a sequential scan.
            $table->index(['user_id', 'status']);
            $table->index('company_id');
            $table->index('applied_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
