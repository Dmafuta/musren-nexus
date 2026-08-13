<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Role requests ────────────────────────────────────────────────────────
        Schema::create('role_requests', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('requested_role', 30); // developer | affiliate
            $table->string('status', 20)->default('pending'); // pending | approved | rejected
            $table->text('message')->nullable();
            $table->text('reviewer_notes')->nullable();
            $table->uuid('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'requested_role']);
            $table->index('status');
        });

        // ── Corporate topup inquiries ────────────────────────────────────────────
        Schema::create('corporate_topup_inquiries', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('company', 120);
            $table->string('industry', 80)->nullable();
            $table->string('contact_name', 100);
            $table->string('email', 255);
            $table->string('phone', 20);
            $table->string('role', 80)->nullable();
            $table->string('network', 60);
            $table->string('estimated_volume', 80);
            $table->string('frequency', 60);
            $table->jsonb('use_cases')->default('[]');
            $table->string('preferred_contact', 30); // Email | Phone call | WhatsApp
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('new'); // new | contacted | qualified | rejected
            $table->text('status_notes')->nullable();
            $table->timestamp('contacted_at')->nullable();
            $table->timestamp('qualified_at')->nullable();
            $table->timestamps();
            $table->index('status');
            $table->index('created_at');
        });

        // ── Consent policies ─────────────────────────────────────────────────────
        Schema::create('consent_policies', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('kind', 20);    // privacy | terms | cookies
            $table->string('version', 20);
            $table->string('summary', 500)->nullable();
            $table->string('content_url', 500)->nullable();
            $table->timestamp('effective_at')->useCurrent();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // ── Consent settings (singleton row id=1) ────────────────────────────────
        Schema::create('consent_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('active_policy_version', 20)->default('1.0');
            $table->boolean('default_analytics')->default(false);
            $table->boolean('default_marketing')->default(false);
            $table->boolean('default_personalization')->default(false);
            $table->boolean('reprompt_on_version_change')->default(true);
            $table->timestamps();
        });
        // Seed the singleton
        DB::table('consent_settings')->insert([
            'id' => 1,
            'active_policy_version' => '1.0',
            'default_analytics' => false,
            'default_marketing' => false,
            'default_personalization' => false,
            'reprompt_on_version_change' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ── User consents (ODPC audit log) ───────────────────────────────────────
        Schema::create('user_consents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('category', 30);   // necessary | analytics | marketing | personalization
            $table->boolean('granted')->default(true);
            $table->string('policy_version', 20)->default('1.0');
            $table->string('source', 60)->default('banner'); // banner | privacy-center | api
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'created_at']);
        });

        // ── Affiliate referral codes ─────────────────────────────────────────────
        Schema::create('affiliate_referral_codes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('code', 64)->unique();
            $table->string('product_slug', 80)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'active']);
        });

        // ── Affiliate events ─────────────────────────────────────────────────────
        Schema::create('affiliate_events', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('kind', 30);    // click | signup | purchase
            $table->string('product_slug', 80)->nullable();
            $table->bigInteger('points_awarded')->default(0);
            $table->decimal('multiplier_applied', 5, 2)->nullable();
            $table->string('channel', 30)->nullable();
            $table->timestamp('occurred_at')->useCurrent();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'occurred_at']);
        });

        // ── Affiliate promotions ─────────────────────────────────────────────────
        Schema::create('affiliate_promotions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->decimal('multiplier', 5, 2)->default(1.00);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('public_visible')->default(true);
            $table->timestamps();
        });

        // ── Affiliate notifications ──────────────────────────────────────────────
        Schema::create('affiliate_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('title', 120);
            $table->text('body')->nullable();
            $table->boolean('read')->default(false);
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'created_at']);
        });

        // ── Affiliate reward rules ───────────────────────────────────────────────
        Schema::create('affiliate_reward_rules', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('product_slug', 80)->unique();
            $table->bigInteger('click_points')->default(1);
            $table->bigInteger('signup_points')->default(10);
            $table->bigInteger('purchase_points')->default(50);
            $table->bigInteger('revenue_share_bps')->default(0); // basis points
            $table->bigInteger('max_daily_points')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // ── Affiliate shares (tracking) ──────────────────────────────────────────
        Schema::create('affiliate_shares', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('code', 64);
            $table->string('product_slug', 80)->nullable();
            $table->string('channel', 30);
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        // ── Product assets ───────────────────────────────────────────────────────
        Schema::create('product_assets', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('product_slug', 80);
            $table->string('kind', 30);       // poster | logo | video | copy
            $table->string('title', 120);
            $table->string('file_url', 500)->nullable();
            $table->text('body_text')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index(['product_slug', 'active']);
        });

        // ── Share templates ──────────────────────────────────────────────────────
        Schema::create('share_templates', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('product_slug', 80);
            $table->string('channel', 30);    // whatsapp | sms | email | etc.
            $table->text('body');
            $table->string('cta', 120)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index(['product_slug', 'channel']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('share_templates');
        Schema::dropIfExists('product_assets');
        Schema::dropIfExists('affiliate_shares');
        Schema::dropIfExists('affiliate_reward_rules');
        Schema::dropIfExists('affiliate_notifications');
        Schema::dropIfExists('affiliate_promotions');
        Schema::dropIfExists('affiliate_events');
        Schema::dropIfExists('affiliate_referral_codes');
        Schema::dropIfExists('user_consents');
        Schema::dropIfExists('consent_settings');
        Schema::dropIfExists('consent_policies');
        Schema::dropIfExists('corporate_topup_inquiries');
        Schema::dropIfExists('role_requests');
    }
};
