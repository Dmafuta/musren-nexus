<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ApiKey extends Model
{
    use HasUuids;

    protected $table = 'developer_api_keys';

    protected $fillable = [
        'user_id',
        'name',
        'key_hash',
        'key_prefix',
        'active',
        'last_used_at',
    ];

    protected $casts = [
        'active'       => 'boolean',
        'last_used_at' => 'datetime',
    ];
}
