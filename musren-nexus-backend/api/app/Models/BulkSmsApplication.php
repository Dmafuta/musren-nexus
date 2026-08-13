<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class BulkSmsApplication extends Model
{
    use HasUuids;

    protected $table = 'bulk_sms_applications';

    protected $fillable = [
        'company_name',
        'box_address',
        'director_names',
        'sender_id',
        'purpose',
        'preferred_shortcode',
        'phone',
        'email',
        'status',
    ];
}
