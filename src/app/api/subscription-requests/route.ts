
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLANS = {
  "free-demo": { name: "Free Demo", amount: 0, months: 0, students: 5, staff: 2, free: true },
  "monthly-standard": { name: "Monthly Standard", amount: 1499, months: 1, students: 200, staff: 10, free: false },
  "monthly-professional": { name: "Monthly Professional", amount: 2999, months: 1, students: 500, staff: 30, free: false },
  "six-month-standard": { name: "6-Month Standard", amount: 7999, months: 6, students: 200, staff: 10, free: false },
  "six-month-professional": { name: "6-Month Professional", amount: 16499, months: 6, students: 500, staff: 30, free: false },
  "yearly-standard": { name: "Yearly Standard", amount: 15499, months: 12, students: 200, staff: 10, free: false },
  "yearly-professional": { name: "Yearly Professional", amount: 30999, months: 12, students: 500, staff: 30, free: false },
} as const;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const instituteName = String(body.instituteName ?? "").trim();
    const transactionRef = String(body.transactionRef ?? "").trim();
    const planId = String(body.planId ?? "") as keyof typeof PLANS;
    const plan = PLANS[planId];

    if (!fullName || fullName.length > 120) {
      return NextResponse.json({ error: "Enter your name (maximum 120 characters)." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!instituteName || instituteName.length > 180) {
      return NextResponse.json({ error: "Enter your institute name (maximum 180 characters)." }, { status: 400 });
    }
    if (!plan) {
      return NextResponse.json({ error: "Invalid subscription plan. Please select a plan again." }, { status: 400 });
    }
    if (transactionRef.length > 150) {
      return NextResponse.json({ error: "Transaction/reference ID must be 150 characters or fewer." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("subscription_payment_requests")
      .insert({
        full_name: fullName,
        email,
        institute_name: instituteName,
        plan_id: planId,
        plan_name: plan.name,
        amount_inr: plan.amount,
        transaction_ref: transactionRef || null,
        status: plan.free ? "confirmed" : "pending",
        ...(plan.free ? { reviewed_at: new Date().toISOString(), admin_note: "Free Demo activated automatically." } : {}),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Subscription request insert failed:", error);
      return NextResponse.json(
        { error: "Could not save your request to Supabase. Check that the subscription_payment_requests SQL table exists and server environment variables are set." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: true, id: data.id, status: plan.free ? "confirmed" : "pending", planName: plan.name, amount: plan.amount },
      { status: 201, headers: { "Cache-Control": "no-store, private" } },
    );
  } catch (error) {
    console.error("Subscription request API failed:", error);
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
