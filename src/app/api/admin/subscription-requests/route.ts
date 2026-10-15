import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";
function authorized(request: Request) {
  const expected = process.env.SUBSCRIPTION_ADMIN_CODE || "";
  const supplied = request.headers.get("x-admin-code") || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected); const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Invalid admin access code." }, { status: 401 });
  try {
    const { data, error } = await db().from("subscription_payment_requests").select("id,full_name,email,institute_name,plan_id,plan_name,amount_inr,transaction_ref,status,payment_submitted_at,reviewed_at,admin_note").order("payment_submitted_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ requests: data || [] }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (e) { console.error("Admin payment request fetch failed", e); return NextResponse.json({ error: "Could not fetch requests. Check Supabase setup." }, { status: 500 }); }
}
export async function PATCH(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Invalid admin access code." }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id || ""); const status = body.status;
    const adminNote = String(body.adminNote || "").trim();
    if (!id || !["confirmed", "rejected"].includes(status) || adminNote.length > 500) return NextResponse.json({ error: "Invalid review details." }, { status: 400 });
    const { data, error } = await db().from("subscription_payment_requests").update({ status, admin_note: adminNote || null, reviewed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending").select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Request not found or already reviewed." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (e) { console.error("Admin payment review failed", e); return NextResponse.json({ error: "Could not update request. Check Supabase setup." }, { status: 500 }); }
}
