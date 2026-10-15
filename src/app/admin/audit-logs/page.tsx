
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./audit-logs.module.css";

type AuditRow = {
  id: string;
  institute_id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  module: string;
  record_id: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "VIEW", "EXPORT"];
const MODULES = [
  "students", "batches", "families", "attendance", "tuition-fees",
  "income-expense", "staff", "enquiries", "exams", "other",
];

function dateLabel(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function titleCase(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actionBadgeClass(action: string) {
  switch (action.toUpperCase()) {
    case "CREATE": return styles.create;
    case "UPDATE": return styles.update;
    case "DELETE": return styles.delete;
    case "LOGIN":
    case "LOGOUT": return styles.login;
    case "VIEW": return styles.view;
    case "EXPORT": return styles.export;
    default: return styles.neutral;
  }
}

export default function AuditLogsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("ALL");
  const [moduleName, setModuleName] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Please sign in again to view audit logs.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.institute_id) {
        throw new Error(
          "Your profile does not have an institute assigned."
        );
      }

      const { data, error } = await supabase
        .from("audit_logs")
        .select(
          "id,institute_id,actor_id,actor_email,action,module,record_id,summary,details,created_at"
        )
        .eq("institute_id", profile.institute_id)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      setRows((data ?? []) as AuditRow[]);
    } catch (error: unknown) {
      console.error("[Audit Logs] Load failed:", error);

      let message = "Unable to load audit logs.";

      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === "object") {
        const value = error as {
          message?: unknown;
          details?: unknown;
          hint?: unknown;
          code?: unknown;
        };

        const parts = [
          value.message,
          value.details,
          value.hint,
        ]
          .filter(
            (part) => typeof part === "string" && part.trim()
          )
          .map(String);

        message = parts.length
          ? parts.join(" — ")
          : JSON.stringify(value);

        if (value.code) {
          message = `[${String(value.code)}] ${message}`;
        }
      } else if (typeof error === "string" && error.trim()) {
        message = error;
      }

      setLoadError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const searchable = [
        row.actor_email,
        row.action,
        row.module,
        row.summary,
        row.record_id,
        JSON.stringify(row.details ?? {}),
      ]
        .join(" ")
        .toLowerCase();

      if (q && !searchable.includes(q)) return false;
      if (action !== "ALL" && row.action !== action) return false;
      if (moduleName !== "ALL" && row.module !== moduleName) {
        return false;
      }

      const day = row.created_at?.slice(0, 10) ?? "";

      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;

      return true;
    });
  }, [rows, query, action, moduleName, fromDate, toDate]);

  const exportCsv = () => {
    const headers = [
      "Date",
      "User",
      "Action",
      "Module",
      "Record ID",
      "Summary",
    ];

    const lines = filtered.map((row) => [
      row.created_at,
      row.actor_email ?? "",
      row.action,
      row.module,
      row.record_id ?? "",
      row.summary,
    ]);

    const csv = [headers, ...lines]
      .map((line) =>
        line
          .map(
            (cell) =>
              `"${String(cell ?? "").replaceAll('"', '""')}"`
          )
          .join(",")
      )
      .join("\r\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      })
    );

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-logs-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            SECURITY &amp; COMPLIANCE
          </span>
          <h1 className={styles.heading}>Audit Logs</h1>
          <p className={styles.subtitle}>
            Review important activity across your institute.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.button}
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>

          <button
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            Export CSV
          </button>
        </div>
      </header>

      {loadError && (
        <div role="alert" className={styles.error}>
          <strong>Audit Logs load nahi hue.</strong>
          <div style={{ marginTop: 5 }}>{loadError}</div>
          <small style={{ display: "block", marginTop: 8 }}>
            Check the exact error above. Confirm the audit_logs
            table columns, profiles.institute_id value, and
            SELECT RLS policy.
          </small>
        </div>
      )}

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>◷</div>
          <p className={styles.metricLabel}>Total Events</p>
          <strong className={styles.metricValue}>{rows.length}</strong>
          <p className={styles.metricDescription}>Stored events</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>⌕</div>
          <p className={styles.metricLabel}>Filtered Events</p>
          <strong className={styles.metricValue}>
            {filtered.length}
          </strong>
          <p className={styles.metricDescription}>Current filter</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>＋</div>
          <p className={styles.metricLabel}>Creates</p>
          <strong className={styles.metricValue}>
            {rows.filter((row) => row.action === "CREATE").length}
          </strong>
          <p className={styles.metricDescription}>New records</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>↻</div>
          <p className={styles.metricLabel}>Updates / Deletes</p>
          <strong className={styles.metricValue}>
            {
              rows.filter(
                (row) =>
                  row.action === "UPDATE" ||
                  row.action === "DELETE"
              ).length
            }
          </strong>
          <p className={styles.metricDescription}>Record changes</p>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div
            style={{
              width: "100%",
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <input
              className={styles.search}
              aria-label="Search audit logs"
              placeholder="Search user, action, module or details..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <select
              className={styles.select}
              aria-label="Filter by action"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              <option value="ALL">All actions</option>
              {ACTIONS.map((value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ))}
            </select>

            <select
              className={styles.select}
              aria-label="Filter by module"
              value={moduleName}
              onChange={(event) => setModuleName(event.target.value)}
            >
              <option value="ALL">All modules</option>
              {MODULES.map((value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ))}
            </select>

            <input
              className={styles.dateInput}
              aria-label="From date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />

            <input
              className={styles.dateInput}
              aria-label="To date"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => setToDate(event.target.value)}
            />

            <button
              className={styles.button}
              onClick={() => {
                setQuery("");
                setAction("ALL");
                setModuleName("ALL");
                setFromDate("");
                setToDate("");
              }}
            >
              Clear filters
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 850,
            }}
          >
            <thead>
              <tr>
                {[
                  "Date & time",
                  "User",
                  "Action",
                  "Module",
                  "Summary",
                  "Details",
                ].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.loading}>
                    Loading audit activity…
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className={styles.primaryText}>
                        {dateLabel(row.created_at)}
                      </span>
                    </td>

                    <td>
                      <span className={styles.primaryText}>
                        {row.actor_email ||
                          (row.actor_id
                            ? `${row.actor_id.slice(0, 8)}…`
                            : "System")}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`${styles.badge} ${actionBadgeClass(
                          row.action
                        )}`}
                      >
                        {titleCase(row.action)}
                      </span>
                    </td>

                    <td>{titleCase(row.module)}</td>

                    <td>
                      <span className={styles.primaryText}>
                        {row.summary || "—"}
                      </span>
                    </td>

                    <td>
                      <button
                        className={styles.button}
                        onClick={() => setSelected(row)}
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    <div className={styles.emptyIcon}>⌕</div>
                    <strong className={styles.emptyTitle}>
                      {loadError
                        ? "Could not load activity"
                        : "No audit events found"}
                    </strong>
                    <p className={styles.emptyDescription}>
                      {loadError
                        ? "Fix the message above and refresh."
                        : "Events will appear after application actions are connected to the audit logger."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Audit event details"
          className={styles.modalBackdrop}
          onClick={() => setSelected(null)}
        >
          <section
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span>AUDIT EVENT</span>
                <h3 className={styles.modalTitle}>
                  {titleCase(selected.action)} ·{" "}
                  {titleCase(selected.module)}
                </h3>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setSelected(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>User</span>
                <span className={styles.detailValue}>
                  {selected.actor_email ||
                    selected.actor_id ||
                    "System"}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Date &amp; time</span>
                <span className={styles.detailValue}>
                  {dateLabel(selected.created_at)}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Record ID</span>
                <span className={styles.detailValue}>
                  {selected.record_id || "—"}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Institute ID</span>
                <span className={styles.detailValue}>
                  {selected.institute_id}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Summary</span>
                <span className={styles.detailValue}>
                  {selected.summary || "—"}
                </span>
              </div>

              <pre className={styles.jsonBlock}>
                {JSON.stringify(selected.details ?? {}, null, 2)}
              </pre>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
