<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bulk_sms_applications', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('company_name', 200);
            $table->string('box_address', 200)->nullable();
            $table->string('director_names', 300);
            $table->string('sender_id', 11);
            $table->text('purpose');
            $table->string('preferred_shortcode', 20)->nullable();
            $table->string('phone', 20);
            $table->string('email', 255);
            $table->string('status', 20)->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bulk_sms_applications');
    }
};
