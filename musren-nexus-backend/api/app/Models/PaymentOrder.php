<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PaymentOrder extends Model
{
    use HasUuids;

    protected $table = 'payment_orders';

    protected $fillable = [
        'user_id',
        'amount',
        'currency',
        'provider',
        'provider_ref',
        'status',
        'phone',
        'description',
        'metadata',
    ];

    protected $casts = [
        'amount'   => 'decimal:2',
        'metadata' => 'array',
    ];
}
