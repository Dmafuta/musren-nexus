<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WalletLedger extends Model
{
    use HasUuids;

    protected $table = 'wallet_ledger';
    protected $fillable = ['user_id', 'amount_cents', 'kind', 'description', 'ref'];
}
