<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class AffiliateWallet extends Model
{
    use HasUuids;

    protected $table = 'affiliate_wallets';

    protected $fillable = [
        'user_id', 'balance_points', 'pending_points',
        'lifetime_points', 'balance_cash_cents',
    ];

    protected $casts = [
        'balance_points'    => 'integer',
        'pending_points'    => 'integer',
        'lifetime_points'   => 'integer',
        'balance_cash_cents'=> 'integer',
    ];
}
