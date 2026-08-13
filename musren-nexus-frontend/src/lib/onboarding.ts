import { api, setToken } from "@/lib/api-client";
import type { AuthUser, AppRole } from "@/hooks/use-auth";

export type ProfileRole = "customer" | "affiliate" | "merchant" | "developer";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: ProfileRole | null;
  role_selected: boolean;
  auth_verified: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export const roleLabels: Record<ProfileRole, string> = {
  customer: "Customer",
  affiliate: "Affiliate",
  merchant: "Merchant",
  developer: "Developer",
};

export const dashboardForRole = (role?: ProfileRole | null) => {
  if (role === "affiliate") return "/affiliates/dashboard";
  if (role === "developer") return "/developers/dashboard";
  if (role === "merchant") return "/merchant/dashboard";
  if (role === "customer") return "/customer/dashboard";
  return "/customer/dashboard";
};

export const dashboardForAccess = (profile?: UserProfile | null, roles: string[] = []) => {
  if (roles.includes("superadmin")) return "/admin/users";
  if (roles.some((role) => role === "admin" || role === "staff")) return "/admin/dashboard";
  if (roles.includes("affiliate")) return "/affiliates/dashboard";
  if (roles.includes("developer")) return "/developers/dashboard";
  if (roles.includes("merchant")) return "/merchant/dashboard";
  if (roles.includes("customer")) return "/customer/dashboard";
  return dashboardForRole(profile?.role);
};

export function isRoleAssigned(roles: AppRole[]): boolean {
  return roles.some((r) => ["customer", "affiliate", "merchant", "developer"].includes(r));
}

export function isOnboardingComplete(profile: UserProfile | null): boolean {
  return profile?.onboarding_completed ?? false;
}

export async function resolvePostAuthRedirect(user: AuthUser, roles: AppRole[]) {
  const privilegedTarget = dashboardForAccess(null, roles);
  if (privilegedTarget.startsWith("/admin")) {
    return { profile: null, roles, target: privilegedTarget };
  }

  if (isRoleAssigned(roles)) {
    const target = dashboardForAccess(null, roles);
    return { profile: null, roles, target };
  }

  return { profile: null, roles, target: "/select-role" };
}

export async function completeUserOnboarding(
  user: AuthUser,
  role: ProfileRole,
): Promise<UserProfile> {
  const res = await api.post<{ token: string }>("/api/roles/select", { role });
  if (res.token) setToken(res.token);
  return {
    id: user.id,
    user_id: user.id,
    email: user.email,
    role,
    role_selected: true,
    auth_verified: true,
    onboarding_completed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Legacy compat — kept so existing callers don't break
export async function fetchUserProfile(_userId: string): Promise<UserProfile | null> {
  return null;
}

export async function getUserRoles(_userId: string): Promise<string[]> {
  try {
    const data = await api.get<{ roles: string[] }>("/api/auth/me");
    return data.roles ?? [];
  } catch {
    return [];
  }
}
