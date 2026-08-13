<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AffiliateEvent extends Model
{
    protected $table = 'affiliate_events';

    protected $fillable = [
        'user_id', 'kind', 'product_slug', 'points_awarded',
        'multiplier_applied', 'channel', 'occurred_at',
    ];

    protected $casts = ['occurred_at' => 'datetime'];
}
