<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WithdrawalRequest extends Model
{
    use HasUuids;

    protected $table = 'withdrawal_requests';
    protected $fillable = [
        'user_id', 'method', 'amount_points', 'amount_value',
        'phone', 'status', 'payout_ref', 'notes',
    ];
}
