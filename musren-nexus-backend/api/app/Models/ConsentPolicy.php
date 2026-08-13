<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsentPolicy extends Model
{
    protected $table = 'consent_policies';

    protected $fillable = ['kind', 'version', 'summary', 'content_url', 'effective_at', 'active'];

    protected $casts = ['active' => 'boolean', 'effective_at' => 'datetime'];
}
