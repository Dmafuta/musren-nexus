<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add starts_at / ends_at to loyalty_exchange_rates
        Schema::table('loyalty_exchange_rates', function (Blueprint $table) {
            $table->timestamp('starts_at')->nullable()->after('active');
            $table->timestamp('ends_at')->nullable()->after('starts_at');
        });

        // Add read_at to affiliate_notifications (replaces boolean 'read')
        Schema::table('affiliate_notifications', function (Blueprint $table) {
            $table->timestamp('read_at')->nullable()->after('body');
        });
    }

    public function down(): void
    {
        Schema::table('affiliate_notifications', function (Blueprint $table) {
            $table->dropColumn('read_at');
        });

        Schema::table('loyalty_exchange_rates', function (Blueprint $table) {
            $table->dropColumn(['starts_at', 'ends_at']);
        });
    }
};
