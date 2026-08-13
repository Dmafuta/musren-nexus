<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_orders', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('KES');
            $table->string('provider', 30);       // mpesa_stk | mpesa_b2c
            $table->string('provider_ref', 100)->nullable();
            $table->string('status', 20)->default('pending'); // pending|completed|failed|timeout
            $table->string('phone', 20)->nullable();
            $table->string('description', 255)->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('provider_ref');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_orders');
    }
};
