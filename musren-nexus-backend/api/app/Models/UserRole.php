<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class UserRole extends Model
{
    use HasUuids;

    protected $table = 'user_roles';
    protected $fillable = ['user_id', 'role'];
}
