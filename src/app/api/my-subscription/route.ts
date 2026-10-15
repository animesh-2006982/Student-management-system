import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_LIMITS: Record<string, { name: string; months: number; students: number; staff: number }> = {
  "monthly-standard": { name: "Monthly Standard", months: 1, students: 200, staff: 10 },
  "monthly-professional": { name: "Monthly Professional", months: 1, students: 500, staff: 30 },
  "six-month-standard": { name: "6-Month Standard", months: 6, students: 200, staff: 10 },
  "six-month-professional": { name: "6-Month Professional", months: 6, students: 500, staff: 30 },
  "yearly-standard": { name: "Yearly Standard", months: 12, students: 200, staff: 10 },
  "yearly-professional": { name: "Yearly Professional", months: 12, students: 500, staff: 30 },
};

function addMonths(dateValue: string, months: number) {
  const date = new Date(dateValue);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
    }

    const authClient = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Route handlers may not allow cookie writes in some contexts.
          }
        },
      },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json({ error: "Please sign in to view your subscription." }, { status: 401 });
    }

    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin
      .from("subscription_payment_requests")
      .select("plan_id,plan_name,status,reviewed_at,payment_submitted_at,email")
      .eq("email", user.email.toLowerCase())
      .eq("status", "confirmed")
      .order("reviewed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Subscription overview query failed:", error);
      return NextResponse.json({ error: "Could not load your confirmed subscription." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({
        subscription: { planName: "", status: "not-found", expiresAt: null, studentLimit: null, staffLimit: null },
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const plan = PLAN_LIMITS[String(data.plan_id)] || null;
    if (!plan) {
      return NextResponse.json({
        subscription: { planName: data.plan_name || "Confirmed plan", status: "confirmed", expiresAt: null, studentLimit: null, staffLimit: null },
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    // The admin review timestamp is the activation date for manually confirmed payments.
    const activationValue = data.reviewed_at || data.payment_submitted_at;
    const expiresAt = activationValue ? addMonths(String(activationValue), plan.months) : null;
    return NextResponse.json({
      subscription: {
        planName: data.plan_name || plan.name,
        status: "confirmed",
        expiresAt,
        studentLimit: plan.students,
        staffLimit: plan.staff,
      },
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("My subscription API failed:", error);
    return NextResponse.json({ error: "Unexpected server error while loading subscription." }, { status: 500 });
  }
}
