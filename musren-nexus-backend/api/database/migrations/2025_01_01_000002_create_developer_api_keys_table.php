<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('developer_api_keys', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('name', 100);
            $table->string('key_hash', 64)->unique();
            $table->string('key_prefix', 20);
            $table->boolean('active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index(['key_hash', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('developer_api_keys');
    }
};
