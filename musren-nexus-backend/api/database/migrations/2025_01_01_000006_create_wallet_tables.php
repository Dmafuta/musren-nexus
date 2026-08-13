<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affiliate_wallets', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id')->unique();
            $table->bigInteger('balance_points')->default(0);
            $table->bigInteger('pending_points')->default(0);
            $table->bigInteger('lifetime_points')->default(0);
            $table->bigInteger('balance_cash_cents')->default(0);
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('wallet_ledger', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->bigInteger('amount_cents');   // positive = credit, negative = debit
            $table->string('kind', 50);            // topup | withdrawal | reward | adjustment
            $table->string('description', 255)->nullable();
            $table->string('ref', 100)->nullable(); // payment order id or other ref
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('withdrawal_requests', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('method', 30);           // mpesa | airtime | data
            $table->bigInteger('amount_points');
            $table->bigInteger('amount_value');     // cents for cash, MB for data
            $table->string('phone', 20)->nullable();
            $table->string('status', 20)->default('pending'); // pending|processing|paid|rejected
            $table->string('payout_ref', 100)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('loyalty_exchange_rates', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('kind', 30);             // cash | airtime | data
            $table->bigInteger('points');
            $table->bigInteger('value_amount');     // cents for cash/airtime, MB for data
            $table->string('label', 100)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('consent_records', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('type', 50);             // marketing | analytics | terms
            $table->boolean('consented')->default(true);
            $table->timestamp('consented_at');
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consent_records');
        Schema::dropIfExists('loyalty_exchange_rates');
        Schema::dropIfExists('withdrawal_requests');
        Schema::dropIfExists('wallet_ledger');
        Schema::dropIfExists('affiliate_wallets');
    }
};
