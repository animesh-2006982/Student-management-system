import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/permissions/modules";

export const dynamic = "force-dynamic";

async function getAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { response: NextResponse.json(
      { error: "Please log in." },
      { status: 401 }
    ) };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, institute_id, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.status !== "active") {
    return { response: NextResponse.json(
      { error: "Active profile required." },
      { status: 403 }
    ) };
  }

  if (profile.role !== "admin" || !profile.institute_id) {
    return { response: NextResponse.json(
      { error: "Only institute admins can manage roles." },
      { status: 403 }
    ) };
  }

  return { supabase, profile };
}

export async function GET() {
  try {
    const auth = await getAdmin();
    if ("response" in auth) return auth.response;

    const { data: roles, error: rolesError } = await auth.supabase
      .from("app_roles")
      .select("id, role_key, role_name, description, is_system, created_at")
      .eq("institute_id", auth.profile.institute_id)
      .order("role_name");

    if (rolesError) {
      return NextResponse.json(
        { error: rolesError.message },
        { status: 400 }
      );
    }

    const { data: permissions, error: permissionError } =
      await auth.supabase
        .from("app_role_permissions")
        .select(
          "id, role_id, module_key, can_view, can_add, can_edit, can_delete"
        )
        .eq("institute_id", auth.profile.institute_id);

    if (permissionError) {
      return NextResponse.json(
        { error: permissionError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      roles: roles ?? [],
      permissions: permissions ?? [],
      modules: MODULES,
    });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAdmin();
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const roleName = String(body.role_name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const permissions = body.permissions;

    if (!roleName) {
      return NextResponse.json(
        { error: "Role name is required." },
        { status: 400 }
      );
    }

    if (roleName.length > 60) {
      return NextResponse.json(
        { error: "Role name must be 60 characters or fewer." },
        { status: 400 }
      );
    }

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Permissions must be an array." },
        { status: 400 }
      );
    }

    const roleKey = roleName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!roleKey) {
      return NextResponse.json(
        { error: "Enter a valid role name." },
        { status: 400 }
      );
    }

    const validModuleKeys = new Set<string>(
      MODULES.map((module) => module.key)
    );

    const seen = new Set<string>();

    for (const item of permissions) {
      if (
        !item ||
        typeof item.module_key !== "string" ||
        !validModuleKeys.has(item.module_key) ||
        seen.has(item.module_key) ||
        ["can_view", "can_add", "can_edit", "can_delete"].some(
          (key) => typeof item[key] !== "boolean"
        )
      ) {
        return NextResponse.json(
          { error: "Invalid or duplicate module permission." },
          { status: 400 }
        );
      }

      seen.add(item.module_key);
    }

    const { data: role, error: roleError } = await auth.supabase
      .from("app_roles")
      .insert({
        institute_id: auth.profile.institute_id,
        role_key: roleKey,
        role_name: roleName,
        description: description || null,
        is_system: false,
      })
      .select("id, role_key, role_name, description, is_system")
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        {
          error: roleError?.message ?? "Could not create role.",
        },
        { status: 400 }
      );
    }

    if (permissions.length > 0) {
      const rows = permissions.map((item: {
        module_key: string;
        can_view: boolean;
        can_add: boolean;
        can_edit: boolean;
        can_delete: boolean;
      }) => ({
        institute_id: auth.profile.institute_id,
        role_id: role.id,
        module_key: item.module_key,
        can_view: item.can_view,
        can_add: item.can_add,
        can_edit: item.can_edit,
        can_delete: item.can_delete,
      }));

      const { error: saveError } = await auth.supabase
        .from("app_role_permissions")
        .insert(rows);

      if (saveError) {
        await auth.supabase
          .from("app_roles")
          .delete()
          .eq("id", role.id)
          .eq("institute_id", auth.profile.institute_id);

        return NextResponse.json(
          { error: `Could not save permissions: ${saveError.message}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { message: "Role created successfully.", role },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAdmin();
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const roleId = String(body.role_id ?? "");
    const permissions = body.permissions;

    if (!roleId || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Role and permissions are required." },
        { status: 400 }
      );
    }

    const { data: role, error: roleError } = await auth.supabase
      .from("app_roles")
      .select("id, is_system")
      .eq("id", roleId)
      .eq("institute_id", auth.profile.institute_id)
      .maybeSingle();

    if (roleError || !role) {
      return NextResponse.json(
        { error: "Role not found in your institute." },
        { status: 404 }
      );
    }

    const validModuleKeys = new Set<string>(
      MODULES.map((module) => module.key)
    );
    const seen = new Set<string>();

    for (const item of permissions) {
      if (
        !item ||
        !validModuleKeys.has(item.module_key) ||
        seen.has(item.module_key) ||
        ["can_view", "can_add", "can_edit", "can_delete"].some(
          (key) => typeof item[key] !== "boolean"
        )
      ) {
        return NextResponse.json(
          { error: "Invalid or duplicate module permission." },
          { status: 400 }
        );
      }

      seen.add(item.module_key);
    }

    const rows = permissions.map((item: {
      module_key: string;
      can_view: boolean;
      can_add: boolean;
      can_edit: boolean;
      can_delete: boolean;
    }) => ({
      institute_id: auth.profile.institute_id,
      role_id: roleId,
      module_key: item.module_key,
      can_view: item.can_view,
      can_add: item.can_add,
      can_edit: item.can_edit,
      can_delete: item.can_delete,
    }));

    // Replace the role's existing permission matrix.
    const { error: deleteError } = await auth.supabase
      .from("app_role_permissions")
      .delete()
      .eq("institute_id", auth.profile.institute_id)
      .eq("role_id", roleId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }

    if (rows.length > 0) {
      const { error: insertError } = await auth.supabase
        .from("app_role_permissions")
        .insert(rows);

      if (insertError) {
        return NextResponse.json(
          {
            error:
              `Permissions could not be saved: ${insertError.message}. ` +
              "Please reopen this role and review its permissions.",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      message: "Permissions updated successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}