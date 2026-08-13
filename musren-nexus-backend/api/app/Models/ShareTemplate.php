<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShareTemplate extends Model
{
    protected $table = 'share_templates';

    protected $fillable = ['product_slug', 'channel', 'body', 'cta', 'active'];

    protected $casts = ['active' => 'boolean'];
}
