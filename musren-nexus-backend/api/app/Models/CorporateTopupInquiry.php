<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CorporateTopupInquiry extends Model
{
    protected $table = 'corporate_topup_inquiries';

    protected $fillable = [
        'company', 'industry', 'contact_name', 'email', 'phone', 'role',
        'network', 'estimated_volume', 'frequency', 'use_cases',
        'preferred_contact', 'notes', 'status', 'status_notes',
        'contacted_at', 'qualified_at',
    ];

    protected $casts = [
        'use_cases'    => 'array',
        'contacted_at' => 'datetime',
        'qualified_at' => 'datetime',
    ];
}
