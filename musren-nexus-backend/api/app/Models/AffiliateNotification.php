<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AffiliateNotification extends Model
{
    protected $table = 'affiliate_notifications';

    protected $fillable = ['user_id', 'title', 'body', 'read'];

    protected $casts = ['read' => 'boolean'];
}
