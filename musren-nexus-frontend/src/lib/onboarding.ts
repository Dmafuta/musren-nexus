import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

export async function getUserRoles(userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.role as string);
}

export async function fetchUserProfile(userId: string) {
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as UserProfile | null;
}

export async function ensureUserProfile(user: User) {
  const { data, error } = await (supabase as any).rpc("ensure_user_profile", {
    _email: user.email ?? "",
  });

  if (error) throw error;
  return data as UserProfile;
}

export async function completeUserOnboarding(user: User, role: ProfileRole) {
  const { data, error } = await (supabase as any).rpc("complete_onboarding", {
    _role: role,
    _email: user.email ?? "",
  });

  if (error) throw error;
  return data as UserProfile;
}

export const isRoleAssigned = (profile?: UserProfile | null) => !!profile?.role;

export const isOnboardingComplete = isRoleAssigned;

export async function resolvePostAuthRedirect(user: User) {
  console.info("[auth] session created", { userId: user.id, email: user.email });

  const roles = await getUserRoles(user.id);
  const privilegedTarget = dashboardForAccess(null, roles);
  if (privilegedTarget.startsWith("/admin")) {
    console.info("[auth] role detected", { roles, redirectTarget: privilegedTarget });
    return { profile: null, roles, target: privilegedTarget };
  }

  const profile = await ensureUserProfile(user);
  const target = isRoleAssigned(profile) ? dashboardForRole(profile.role) : "/select-role";
  console.info("[auth] role detected", { role: profile?.role ?? null, roles, redirectTarget: target });
  return { profile, roles, target };
}