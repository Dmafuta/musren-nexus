<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductAsset extends Model
{
    protected $table = 'product_assets';

    protected $fillable = ['product_slug', 'kind', 'title', 'file_url', 'body_text', 'notes', 'active'];

    protected $casts = ['active' => 'boolean'];
}
