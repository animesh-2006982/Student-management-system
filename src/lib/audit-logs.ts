import { createClient } from "@/lib/supabase/client";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "VIEW"
  | "EXPORT";

export type AuditLogInput = {
  action: AuditAction;
  module: string;
  summary: string;
  recordId?: string | null;
  details?: Record<string, unknown>;
};

/**
 * Browser-side audit helper.
 * Call this after a successful operation. It never blocks the main operation:
 * errors are logged to the console so they can be diagnosed.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const supabase = createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) throw new Error("No signed-in user for audit event.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", auth.user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile?.institute_id) throw new Error("No institute_id on user profile.");

    const { error } = await supabase.from("audit_logs").insert({
      institute_id: profile.institute_id,
      actor_id: auth.user.id,
      actor_email: auth.user.email ?? null,
      action: input.action,
      module: input.module,
      record_id: input.recordId ?? null,
      summary: input.summary,
      details: input.details ?? {},
    });

    if (error) throw error;
  } catch (error) {
    console.error("[Audit Logs] Failed to save event:", error);
  }
}
