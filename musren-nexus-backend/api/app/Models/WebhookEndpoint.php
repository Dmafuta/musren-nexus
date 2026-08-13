<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebhookEndpoint extends Model
{
    use HasUuids;

    protected $table = 'webhook_endpoints';

    protected $fillable = [
        'user_id',
        'url',
        'events',
        'secret',
        'active',
    ];

    protected $casts = [
        'events' => 'array',
        'active' => 'boolean',
    ];
}
