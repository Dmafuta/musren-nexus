<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, HasUuids, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'phone', 'email_verified_at'];
    protected $hidden   = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    public function roles()
    {
        return $this->hasMany(UserRole::class);
    }

    public function roleNames(): array
    {
        return $this->roles()->pluck('role')->toArray();
    }

    public function wallet()
    {
        return $this->hasOne(AffiliateWallet::class);
    }
}
