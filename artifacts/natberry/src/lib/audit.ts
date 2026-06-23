import { supabase } from "./supabase";

type AuditAction = "INSERT" | "UPDATE" | "DELETE";

type AuditParams = {
  userId: string | undefined;
  userEmail: string | undefined;
  tableName: string;
  recordId?: string;
  action: AuditAction;
  description: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
};

export async function logAudit(params: AuditParams) {
  try {
    await supabase.from("audit_log").insert({
      user_id: params.userId ?? null,
      user_email: params.userEmail ?? null,
      table_name: params.tableName,
      record_id: params.recordId ?? null,
      action: params.action,
      description: params.description,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
    });
  } catch {
    // Audit failures must never break the main operation
  }
}
