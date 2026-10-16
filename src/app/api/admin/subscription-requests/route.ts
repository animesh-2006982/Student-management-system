
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Trusted server-side plan configuration.
 * Never trust plan price or limits sent by the browser.
 */
const PLANS: Record<
  string,
  {
    name: string;
    amount: number;
    months: number;
    students: number;
    staff: number;
  }
> = {
  "free-demo": {
    name: "Free Demo",
    amount: 0,
    months: 0,
    students: 5,
    staff: 2,
  },

  "monthly-standard": {
    name: "Monthly Standard",
    amount: 1499,
    months: 1,
    students: 200,
    staff: 10,
  },

  "monthly-professional": {
    name: "Monthly Professional",
    amount: 2999,
    months: 1,
    students: 500,
    staff: 30,
  },

  "six-month-standard": {
    name: "6-Month Standard",
    amount: 7999,
    months: 6,
    students: 200,
    staff: 10,
  },

  "six-month-professional": {
    name: "6-Month Professional",
    amount: 16499,
    months: 6,
    students: 500,
    staff: 30,
  },

  "yearly-standard": {
    name: "Yearly Standard",
    amount: 15499,
    months: 12,
    students: 200,
    staff: 10,
  },

  "yearly-professional": {
    name: "Yearly Professional",
    amount: 30999,
    months: 12,
    students: 500,
    staff: 30,
  },
};

function authorized(request: Request): boolean {
  const expected = process.env.SUBSCRIPTION_ADMIN_CODE || "";
  const supplied = request.headers.get("x-admin-code") || "";

  if (!expected || !supplied) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);

  return a.length === b.length && timingSafeEqual(a, b);
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server environment is not configured.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Adds calendar months while avoiding date overflow.
 * Example: January 31 + 1 month becomes February's last day.
 */
function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDay = new Date(
    Date.UTC(
      result.getUTCFullYear(),
      result.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDay));

  return result;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Invalid admin access code." },
      { status: 401 }
    );
  }

  try {
    const { data, error } = await db()
      .from("subscription_payment_requests")
      .select(
        [
          "id",
          "full_name",
          "email",
          "institute_name",
          "plan_id",
          "plan_name",
          "amount_inr",
          "transaction_ref",
          "status",
          "payment_submitted_at",
          "reviewed_at",
          "reviewed_by",
          "activated_at",
          "expires_at",
          "student_limit",
          "staff_limit",
          "admin_note",
        ].join(",")
      )
      .order("payment_submitted_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      { requests: data || [] },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      }
    );
  } catch (error) {
    console.error("Admin payment request fetch failed", error);

    return NextResponse.json(
      {
        error: "Could not fetch requests. Check Supabase setup.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Invalid admin access code." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const id = String(body.id || "").trim();
    const status = body.status;
    const adminNote = String(body.adminNote || "").trim();

    if (
      !id ||
      !["confirmed", "rejected"].includes(status) ||
      adminNote.length > 500
    ) {
      return NextResponse.json(
        { error: "Invalid review details." },
        { status: 400 }
      );
    }

    const supabase = db();

    // Only pending requests can be reviewed.
    const { data: existing, error: fetchError } = await supabase
      .from("subscription_payment_requests")
      .select(
        "id,plan_id,plan_name,amount_inr,status,activated_at,expires_at"
      )
      .eq("id", id)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing) {
      return NextResponse.json(
        { error: "Request not found or already reviewed." },
        { status: 409 }
      );
    }

    const reviewedAt = new Date();

    const updateData: Record<string, unknown> = {
      status,
      admin_note: adminNote || null,
      reviewed_at: reviewedAt.toISOString(),
    };

    if (status === "confirmed") {
      const plan = PLANS[existing.plan_id];

      if (!plan) {
        return NextResponse.json(
          {
            error:
              "This request has an unknown plan ID. Update the server plan configuration before confirming it.",
          },
          { status: 400 }
        );
      }

      // Never activate a paid package if its stored amount differs
      // from the trusted server-side price.
      if (Number(existing.amount_inr) !== plan.amount) {
        return NextResponse.json(
          {
            error:
              "The recorded amount does not match the configured plan price. Review the request before confirming payment.",
          },
          { status: 409 }
        );
      }

      const activatedAt = reviewedAt;
      const expiresAt =
        plan.months > 0
          ? addCalendarMonths(activatedAt, plan.months)
          : null;

      updateData.plan_name = plan.name;
      updateData.amount_inr = plan.amount;
      updateData.activated_at = activatedAt.toISOString();
      updateData.expires_at = expiresAt?.toISOString() ?? null;
      updateData.student_limit = plan.students;
      updateData.staff_limit = plan.staff;
    }

    // Keep the pending condition to avoid confirming the same
    // request twice if another admin action races with this one.
    const { data: updated, error: updateError } = await supabase
      .from("subscription_payment_requests")
      .update(updateData)
      .eq("id", id)
      .eq("status", "pending")
      .select("id,status,activated_at,expires_at,student_limit,staff_limit")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      return NextResponse.json(
        { error: "Request was already reviewed. Refresh the page." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      request: updated,
    });
  } catch (error) {
    console.error("Admin payment review failed", error);

    return NextResponse.json(
      {
        error: "Could not update request. Check Supabase setup.",
      },
      { status: 500 }
    );
  }
}
