<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AffiliatePromotion extends Model
{
    protected $table = 'affiliate_promotions';

    protected $fillable = [
        'name', 'description', 'multiplier', 'starts_at', 'ends_at',
        'active', 'public_visible',
    ];

    protected $casts = [
        'active'         => 'boolean',
        'public_visible' => 'boolean',
        'starts_at'      => 'datetime',
        'ends_at'        => 'datetime',
    ];
}
