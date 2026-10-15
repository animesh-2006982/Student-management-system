
import { createClient } from "@/lib/supabase/server";
import type {
  ModuleKey,
  PermissionAction,
} from "@/lib/permissions/modules";

type PermissionColumn =
  | "can_view"
  | "can_add"
  | "can_edit"
  | "can_delete";

const ACTION_COLUMN: Record<PermissionAction, PermissionColumn> = {
  view: "can_view",
  add: "can_add",
  edit: "can_edit",
  delete: "can_delete",
};

type PermissionCheckResult = {
  allowed: boolean;
  reason: string;
  instituteId?: string;
};

export async function checkPermission(
  moduleKey: ModuleKey,
  action: PermissionAction
): Promise<PermissionCheckResult> {
  try {
    const supabase = await createClient();

    // 1. Verify the logged-in user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        allowed: false,
        reason: "unauthenticated",
      };
    }

    // 2. Fetch the user's institute profile
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id, institute_id, role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        allowed: false,
        reason: "profile_not_found",
      };
    }

    // 3. Check account status
    if (profile.status !== "active") {
      return {
        allowed: false,
        reason: "inactive_account",
      };
    }

    // 4. Ensure the user belongs to an institute
    if (!profile.institute_id) {
      return {
        allowed: false,
        reason: "missing_institute",
      };
    }

    // 5. Institute admins have full access within their institute
    if (profile.role?.toLowerCase() === "admin") {
      return {
        allowed: true,
        reason: "institute_admin",
        instituteId: profile.institute_id,
      };
    }

    if (!profile.role) {
      return {
        allowed: false,
        reason: "missing_role",
      };
    }

    // 6. Find the user's role for this institute
    const {
      data: role,
      error: roleError,
    } = await supabase
      .from("app_roles")
      .select("id")
      .eq("institute_id", profile.institute_id)
      .eq("role_key", profile.role.toLowerCase())
      .maybeSingle();

    if (roleError || !role) {
      return {
        allowed: false,
        reason: "role_not_configured",
      };
    }

    // 7. Fetch permissions for the requested module
    // Select fixed columns to avoid dynamic Supabase select typing errors.
    const {
      data: permission,
      error: permissionError,
    } = await supabase
      .from("app_role_permissions")
      .select("can_view, can_add, can_edit, can_delete")
      .eq("institute_id", profile.institute_id)
      .eq("role_id", role.id)
      .eq("module_key", moduleKey)
      .maybeSingle();

    if (permissionError || !permission) {
      return {
        allowed: false,
        reason: "permission_not_granted",
      };
    }

    // 8. Check the requested action
    const column: PermissionColumn = ACTION_COLUMN[action];
    const allowed = permission[column] === true;

    return {
      allowed,
      reason: allowed
        ? "granted"
        : "permission_not_granted",
      instituteId: profile.institute_id,
    };
  } catch (error) {
    // Deny access if an unexpected error occurs.
    console.error("Permission check failed:", error);

    return {
      allowed: false,
      reason: "permission_check_failed",
    };
  }
}
