
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const allowedRoles = [
  "admin",
  "staff",
  "teacher",
  "accountant",
  "receptionist",
];

const allowedStatuses = ["active", "inactive"];

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function authorizeAdmin() {
  const sessionClient = await createClient();

  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    return {
      response: NextResponse.json(
        { error: "Your session has expired. Please log in again." },
        { status: 401 }
      ),
    };
  }

  const adminClient = getAdminClient();

  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("id, institute_id, full_name, email, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      response: NextResponse.json(
        { error: `Profile lookup failed: ${error.message}` },
        { status: 500 }
      ),
    };
  }

  if (!profile) {
    return {
      response: NextResponse.json(
        {
          error:
            `No profile matches the logged-in account (${user.email ?? user.id}). ` +
            "Check that profiles.id matches auth.users.id.",
        },
        { status: 403 }
      ),
    };
  }

  if (profile.role !== "admin" || profile.status !== "active") {
    return {
      response: NextResponse.json(
        { error: "Only active admins can manage users." },
        { status: 403 }
      ),
    };
  }

  if (!profile.institute_id) {
    return {
      response: NextResponse.json(
        {
          error:
            "Your admin profile has no institute_id. Link it to your institute before managing users.",
        },
        { status: 403 }
      ),
    };
  }

  return { user, profile, adminClient };
}

// GET: List users for the current institute.
export async function GET() {
  try {
    const auth = await authorizeAdmin();
    if ("response" in auth) return auth.response;

    const { data, error } = await auth.adminClient
      .from("profiles")
      .select(
        "id, institute_id, full_name, email, role, status, created_at"
      )
      .eq("institute_id", auth.profile.institute_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Could not load users: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error." },
      { status: 500 }
    );
  }
}

// POST: Create a login account and link it to this institute.
export async function POST(request: Request) {
  try {
    const auth = await authorizeAdmin();
    if ("response" in auth) return auth.response;

    const body = await request.json();

    const fullName = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = String(body.role ?? "staff");

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role selected." },
        { status: 400 }
      );
    }

    const { data: created, error: createError } =
      await auth.adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: fullName },
      });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Could not create account." },
        { status: 400 }
      );
    }

    const newUser = created.user;

    // The auth trigger may already have created this profile.
    // Upsert ensures it is linked to the current institute.
    const { error: profileError } = await auth.adminClient
      .from("profiles")
      .upsert(
        {
          id: newUser.id,
          institute_id: auth.profile.institute_id,
          full_name: fullName,
          email,
          role,
          status: "active",
        },
        { onConflict: "id" }
      );

    if (profileError) {
      await auth.adminClient.auth.admin.deleteUser(newUser.id);

      return NextResponse.json(
        { error: `Profile setup failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "User created successfully.", userId: newUser.id },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error." },
      { status: 500 }
    );
  }
}

// PATCH: Edit name, role or status for another user in this institute.
export async function PATCH(request: Request) {
  try {
    const auth = await authorizeAdmin();
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const userId = String(body.id ?? "");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: "You cannot edit your own account from this page." },
        { status: 400 }
      );
    }

    const updates: Record<string, string> = {};

    if (body.full_name !== undefined) {
      const name = String(body.full_name).trim();

      if (!name) {
        return NextResponse.json(
          { error: "Name cannot be empty." },
          { status: 400 }
        );
      }

      updates.full_name = name;
    }

    if (body.role !== undefined) {
      const role = String(body.role);

      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: "Invalid role selected." },
          { status: 400 }
        );
      }

      updates.role = role;
    }

    if (body.status !== undefined) {
      const status = String(body.status);

      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Status must be active or inactive." },
          { status: 400 }
        );
      }

      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No changes were provided." },
        { status: 400 }
      );
    }

    const { data, error } = await auth.adminClient
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .eq("institute_id", auth.profile.institute_id)
      .select("id, institute_id, full_name, email, role, status")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: `Could not update user: ${error.message}` },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "User not found in your institute." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "User updated successfully.",
      user: data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error." },
      { status: 500 }
    );
  }
}
