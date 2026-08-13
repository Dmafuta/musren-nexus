<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AffiliateShare extends Model
{
    protected $table = 'affiliate_shares';

    protected $fillable = ['user_id', 'code', 'product_slug', 'channel'];
}
