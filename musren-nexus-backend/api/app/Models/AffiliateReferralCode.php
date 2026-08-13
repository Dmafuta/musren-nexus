<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AffiliateReferralCode extends Model
{
    protected $table = 'affiliate_referral_codes';

    protected $fillable = ['user_id', 'code', 'product_slug', 'active'];

    protected $casts = ['active' => 'boolean'];
}
