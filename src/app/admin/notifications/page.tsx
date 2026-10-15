
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./notifications.module.css";

type Status = "Draft" | "Sent" | "Scheduled" | "Archived";

type Notification = {
  id: string;
  institute_id: string;
  title: string;
  message: string;
  audience: string;
  status: Status;
  scheduled_at: string | null;
  created_at: string;
};

type FormData = {
  title: string;
  message: string;
  audience: string;
  status: Status;
  scheduled_at: string;
};

const supabase = createClient();

const emptyForm: FormData = {
  title: "",
  message: "",
  audience: "All",
  status: "Draft",
  scheduled_at: "",
};

const statuses: Status[] = [
  "Draft",
  "Sent",
  "Scheduled",
  "Archived",
];

export default function NotificationsPage() {
  const [rows, setRows] = useState<Notification[]>([]);
  const [instituteId, setInstituteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData.user) {
        throw new Error("Please sign in again.");
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("institute_id")
          .eq("id", authData.user.id)
          .single();

      if (profileError) throw profileError;
      if (!profile?.institute_id) {
        throw new Error("Your profile has no institute_id.");
      }

      setInstituteId(profile.institute_id);

      const { data, error: queryError } = await supabase
        .from("notifications")
        .select(
          "id,institute_id,title,message,audience,status,scheduled_at,created_at"
        )
        .eq("institute_id", profile.institute_id)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      setRows((data ?? []) as Notification[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesStatus =
        filter === "All" || item.status === filter;

      const matchesSearch =
        !term ||
        `${item.title} ${item.message} ${item.audience}`
          .toLowerCase()
          .includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [rows, filter, query]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      sent: rows.filter((item) => item.status === "Sent").length,
      scheduled: rows.filter(
        (item) => item.status === "Scheduled"
      ).length,
      drafts: rows.filter((item) => item.status === "Draft").length,
    }),
    [rows]
  );

  function createNotification() {
    setEditing(null);
    setForm({ ...emptyForm });
    setError("");
    setShowForm(true);
  }

  function editNotification(item: Notification) {
    setEditing(item.id);
    setForm({
      title: item.title,
      message: item.message,
      audience: item.audience,
      status: item.status,
      scheduled_at: item.scheduled_at
        ? new Date(item.scheduled_at).toISOString().slice(0, 16)
        : "",
    });
    setError("");
    setShowForm(true);
  }

  async function saveNotification(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!instituteId) {
      setError("Institute is not loaded. Refresh and try again.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        institute_id: instituteId,
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience,
        status: form.status,
        scheduled_at: form.scheduled_at
          ? new Date(form.scheduled_at).toISOString()
          : null,
      };

      const result = editing
        ? await supabase
            .from("notifications")
            .update(payload)
            .eq("id", editing)
            .eq("institute_id", instituteId)
        : await supabase
            .from("notifications")
            .insert(payload);

      if (result.error) throw result.error;

      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyForm });

      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteNotification(item: Notification) {
    if (!instituteId) return;

    const confirmed = window.confirm(
      `Delete notification "${item.title}"?`
    );

    if (!confirmed) return;

    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("id", item.id)
        .eq("institute_id", instituteId);

      if (deleteError) throw deleteError;

      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            SYSTEM &amp; INSTITUTE UPDATES
          </div>
          <h1>Notifications</h1>
          <p>
            Create and manage announcements for your institute.
          </p>
        </div>

        <button
          type="button"
          className={styles.primary}
          onClick={createNotification}
        >
          <span aria-hidden="true">＋</span> Create Notification
        </button>
      </header>

      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <button
            type="button"
            className={styles.closeError}
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <section className={styles.stats} aria-label="Notification totals">
        <article className={styles.statCard}>
          <span>Total notifications</span>
          <strong>{counts.total}</strong>
        </article>
        <article className={styles.statCard}>
          <span>Sent</span>
          <strong>{counts.sent}</strong>
        </article>
        <article className={styles.statCard}>
          <span>Scheduled</span>
          <strong>{counts.scheduled}</strong>
        </article>
        <article className={styles.statCard}>
          <span>Drafts</span>
          <strong>{counts.drafts}</strong>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notifications..."
            aria-label="Search notifications"
          />

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="All">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={styles.secondary}
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {loading ? (
          <div className={styles.empty}>
            <span className={styles.spinner} />
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </div>
            <h2>
              {query || filter !== "All"
                ? "No matching notifications"
                : "No notifications yet"}
            </h2>
            <p>
              {query || filter !== "All"
                ? "Try another search term or status filter."
                : "Create your first notification to get started."}
            </p>
            {!query && filter === "All" && (
              <button
                type="button"
                className={styles.primary}
                onClick={createNotification}
              >
                ＋ Create Notification
              </button>
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((item) => (
              <article className={styles.card} key={item.id}>
                <div className={styles.cardTop}>
                  <span
                    className={`${styles.badge} ${
                      styles[item.status.toLowerCase()]
                    }`}
                  >
                    {item.status}
                  </span>
                  <span className={styles.audience}>
                    {item.audience}
                  </span>
                </div>

                <h2>{item.title}</h2>
                <p className={styles.message}>{item.message}</p>

                <small className={styles.date}>
                  {item.scheduled_at
                    ? `Scheduled: ${new Date(
                        item.scheduled_at
                      ).toLocaleString("en-IN")}`
                    : `Created: ${new Date(
                        item.created_at
                      ).toLocaleString("en-IN")}`}
                </small>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => editNotification(item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.danger}
                    onClick={() => void deleteNotification(item)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false);
            }
          }}
        >
          <form
            className={styles.modal}
            onSubmit={saveNotification}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>NOTIFICATIONS</span>
                <h2>
                  {editing
                    ? "Edit Notification"
                    : "Create Notification"}
                </h2>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <label className={styles.field}>
              <span>Title *</span>
              <input
                required
                maxLength={180}
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Enter notification title"
              />
            </label>

            <label className={styles.field}>
              <span>Message *</span>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(event) =>
                  setForm({ ...form, message: event.target.value })
                }
                placeholder="Write your announcement..."
              />
            </label>

            <div className={styles.two}>
              <label className={styles.field}>
                <span>Audience</span>
                <select
                  value={form.audience}
                  onChange={(event) =>
                    setForm({ ...form, audience: event.target.value })
                  }
                >
                  {["All", "Students", "Parents", "Staff"].map(
                    (audience) => (
                      <option key={audience} value={audience}>
                        {audience}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className={styles.field}>
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as Status,
                    })
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className={styles.field}>
              <span>Scheduled date (optional)</span>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(event) =>
                  setForm({
                    ...form,
                    scheduled_at: event.target.value,
                  })
                }
              />
            </label>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.primary}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save Changes"
                    : "Create Notification"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
