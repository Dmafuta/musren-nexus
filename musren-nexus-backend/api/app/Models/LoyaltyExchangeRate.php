<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class LoyaltyExchangeRate extends Model
{
    use HasUuids;

    protected $table = 'loyalty_exchange_rates';
    protected $fillable = ['kind', 'points', 'value_amount', 'label', 'active'];
    protected $casts = ['active' => 'boolean'];
}
