<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserConsent extends Model
{
    protected $table = 'user_consents';

    protected $fillable = ['user_id', 'category', 'granted', 'policy_version', 'source'];

    protected $casts = ['granted' => 'boolean'];
}
