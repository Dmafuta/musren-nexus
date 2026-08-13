<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AffiliateRewardRule extends Model
{
    protected $table = 'affiliate_reward_rules';

    protected $fillable = [
        'product_slug', 'click_points', 'signup_points', 'purchase_points',
        'revenue_share_bps', 'max_daily_points', 'active',
    ];

    protected $casts = ['active' => 'boolean'];
}
