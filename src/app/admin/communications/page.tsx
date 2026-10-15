
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./communications.module.css";

type Communication = {
  id: string;
  institute_id: string;
  title: string;
  message: string;
  communication_type:
    | "Announcement"
    | "Notice"
    | "Reminder"
    | "Message";
  channel:
    | "In-App"
    | "Email"
    | "WhatsApp"
    | "SMS";
  audience_type:
    | "All"
    | "Students"
    | "Parents"
    | "Staff"
    | "Batch"
    | "Student";
  audience_id?: string | null;
  status:
    | "Draft"
    | "Scheduled"
    | "Sent"
    | "Archived";
  scheduled_at?: string | null;
  sent_at?: string | null;
  attachment_url?: string | null;
  created_at: string;
  updated_at?: string;
};

type Batch = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  admission_no?: string | null;
};

const supabase = createClient();

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CommunicationsPage() {
  const [messages, setMessages] = useState<Communication[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");

  const [activeTab, setActiveTab] =
    useState<"messages" | "history">("messages");

  const [modal, setModal] = useState(false);
  const [editing, setEditing] =
    useState<Communication | null>(null);

  const [viewing, setViewing] =
    useState<Communication | null>(null);

  const [form, setForm] = useState({
    title: "",
    message: "",
    communication_type: "Announcement",
    channel: "In-App",
    audience_type: "All",
    audience_id: "",
    status: "Draft",
    scheduled_at: "",
    attachment_url: "",
  });

  const getInstituteId = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) {
      throw new Error("Please login first.");
    }

    const { data, error: profileError } =
      await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

    if (profileError) throw profileError;

    if (!data?.institute_id) {
      throw new Error("Institute profile not found.");
    }

    return data.institute_id as string;
  }, []);

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const instituteId = await getInstituteId();

        const [messageResult, batchResult, studentResult] =
          await Promise.all([
            supabase
              .from("communications")
              .select("*")
              .eq("institute_id", instituteId)
              .order("created_at", {
                ascending: false,
              }),

            supabase
              .from("batches")
              .select("id,name")
              .eq("institute_id", instituteId)
              .order("name"),

            supabase
              .from("students")
              .select("id,name,full_name,admission_no")
              .eq("institute_id", instituteId)
              .order("name"),
          ]);

        if (messageResult.error) throw messageResult.error;

        setMessages(
          (messageResult.data || []) as Communication[]
        );

        if (!batchResult.error) {
          setBatches((batchResult.data || []) as Batch[]);
        }

        if (!studentResult.error) {
          setStudents(
            (studentResult.data || []) as Student[]
          );
        }
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message || "Unable to load communications."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getInstituteId]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return {
      total: messages.length,
      sent: messages.filter((x) => x.status === "Sent").length,
      drafts: messages.filter((x) => x.status === "Draft").length,
      scheduled: messages.filter(
        (x) => x.status === "Scheduled"
      ).length,
      thisMonth: messages.filter((x) => {
        const date = new Date(x.created_at);
        return (
          date.getMonth() === month &&
          date.getFullYear() === year
        );
      }).length,
    };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const q = search.trim().toLowerCase();

    return messages.filter((message) => {
      const matchesSearch =
        !q ||
        message.title.toLowerCase().includes(q) ||
        message.message.toLowerCase().includes(q) ||
        message.communication_type
          .toLowerCase()
          .includes(q) ||
        message.audience_type
          .toLowerCase()
          .includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        message.status === statusFilter;

      const matchesType =
        typeFilter === "all" ||
        message.communication_type === typeFilter;

      const matchesChannel =
        channelFilter === "all" ||
        message.channel === channelFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesChannel
      );
    });
  }, [
    messages,
    search,
    statusFilter,
    typeFilter,
    channelFilter,
  ]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function openAdd() {
    clearMessages();
    setEditing(null);

    setForm({
      title: "",
      message: "",
      communication_type: "Announcement",
      channel: "In-App",
      audience_type: "All",
      audience_id: "",
      status: "Draft",
      scheduled_at: "",
      attachment_url: "",
    });

    setModal(true);
  }

  function openEdit(item: Communication) {
    clearMessages();
    setEditing(item);

    setForm({
      title: item.title,
      message: item.message,
      communication_type: item.communication_type,
      channel: item.channel,
      audience_type: item.audience_type,
      audience_id: item.audience_id || "",
      status: item.status,
      scheduled_at: item.scheduled_at
        ? new Date(item.scheduled_at)
            .toISOString()
            .slice(0, 16)
        : "",
      attachment_url: item.attachment_url || "",
    });

    setModal(true);
  }

  function audienceLabel(item: Communication) {
    if (item.audience_type === "Batch") {
      return (
        batches.find((batch) => batch.id === item.audience_id)
          ?.name || "Selected batch"
      );
    }

    if (item.audience_type === "Student") {
      const student = students.find(
        (x) => x.id === item.audience_id
      );

      return (
        student?.full_name ||
        student?.name ||
        "Selected student"
      );
    }

    return item.audience_type;
  }

  async function saveCommunication(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setSaving(true);
    clearMessages();

    try {
      const instituteId = await getInstituteId();

      if (!form.title.trim()) {
        throw new Error("Title is required.");
      }

      if (!form.message.trim()) {
        throw new Error("Message is required.");
      }

      if (
        (form.audience_type === "Batch" ||
          form.audience_type === "Student") &&
        !form.audience_id
      ) {
        throw new Error(
          `Please select a ${form.audience_type.toLowerCase()}.`
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        institute_id: instituteId,
        title: form.title.trim(),
        message: form.message.trim(),
        communication_type: form.communication_type,
        channel: form.channel,
        audience_type: form.audience_type,
        audience_id:
          form.audience_type === "Batch" ||
          form.audience_type === "Student"
            ? form.audience_id
            : null,
        status: form.status,
        scheduled_at:
          form.status === "Scheduled" && form.scheduled_at
            ? new Date(form.scheduled_at).toISOString()
            : null,
        sent_at: null,
        attachment_url:
          form.attachment_url.trim() || null,
        created_by: user?.id || null,
      };

      if (editing) {
        const { error: updateError } =
          await supabase
            .from("communications")
            .update(payload)
            .eq("id", editing.id)
            .eq("institute_id", instituteId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } =
          await supabase
            .from("communications")
            .insert(payload);

        if (insertError) throw insertError;
      }

      setModal(false);

      setSuccess(
        editing
          ? "Communication updated successfully."
          : "Communication created successfully."
      );

      await loadData(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "Unable to save communication."
      );
    } finally {
      setSaving(false);
    }
  }

  async function markSent(item: Communication) {
    clearMessages();

    if (
      !window.confirm(
        `Mark "${item.title}" as sent?`
      )
    ) {
      return;
    }

    const { error: rpcError } =
      await supabase.rpc("mark_communication_sent", {
        p_communication_id: item.id,
      });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setSuccess("Communication marked as sent.");
    await loadData(true);
  }

  async function archive(item: Communication) {
    clearMessages();

    const { error: updateError } =
      await supabase
        .from("communications")
        .update({ status: "Archived" })
        .eq("id", item.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Communication archived.");
    await loadData(true);
  }

  async function deleteCommunication(
    item: Communication
  ) {
    clearMessages();

    if (
      !window.confirm(
        `Delete "${item.title}"?`
      )
    ) {
      return;
    }

    const { error: deleteError } =
      await supabase
        .from("communications")
        .delete()
        .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSuccess("Communication deleted.");
    await loadData(true);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            TOOLS
          </span>
          <h1>Communications</h1>
          <p>
            Create announcements, notices and messages
            for students, parents, staff and batches.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            onClick={() => void loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>

          <button
            className={styles.primaryButton}
            onClick={openAdd}
          >
            + New Communication
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className={styles.success}>
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Total</span>
          <strong>{stats.total}</strong>
          <small>All communications</small>
        </div>

        <div className={styles.statCard}>
          <span>Sent</span>
          <strong>{stats.sent}</strong>
          <small>Completed messages</small>
        </div>

        <div className={styles.statCard}>
          <span>Drafts</span>
          <strong>{stats.drafts}</strong>
          <small>Not sent yet</small>
        </div>

        <div className={styles.statCard}>
          <span>Scheduled</span>
          <strong>{stats.scheduled}</strong>
          <small>Future messages</small>
        </div>

        <div className={styles.statCard}>
          <span>This Month</span>
          <strong>{stats.thisMonth}</strong>
          <small>Created this month</small>
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <button
            className={
              activeTab === "messages"
                ? styles.activeTab
                : ""
            }
            onClick={() => setActiveTab("messages")}
          >
            ✉ Communications
          </button>

          <button
            className={
              activeTab === "history"
                ? styles.activeTab
                : ""
            }
            onClick={() => setActiveTab("history")}
          >
            ▤ History
          </button>
        </div>

        <div className={styles.filters}>
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search communications..."
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Sent">Sent</option>
            <option value="Archived">Archived</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
          >
            <option value="all">All Types</option>
            <option value="Announcement">Announcement</option>
            <option value="Notice">Notice</option>
            <option value="Reminder">Reminder</option>
            <option value="Message">Message</option>
          </select>

          <select
            value={channelFilter}
            onChange={(event) =>
              setChannelFilter(event.target.value)
            }
          >
            <option value="all">All Channels</option>
            <option value="In-App">In-App</option>
            <option value="Email">Email</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="SMS">SMS</option>
          </select>
        </div>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2>
              {activeTab === "messages"
                ? "Communication Centre"
                : "Communication History"}
            </h2>

            <span>
              {filteredMessages.length} record
              {filteredMessages.length === 1 ? "" : "s"}
            </span>
          </div>

          <button
            className={styles.smallPrimary}
            onClick={openAdd}
          >
            + New
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Communication</th>
                <th>Type</th>
                <th>Audience</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredMessages.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>

                  <td>
                    <strong>{item.title}</strong>
                    <small>
                      {item.message.length > 80
                        ? `${item.message.slice(0, 80)}…`
                        : item.message}
                    </small>
                  </td>

                  <td>
                    <span className={styles.typeBadge}>
                      {item.communication_type}
                    </span>
                  </td>

                  <td>
                    <strong className={styles.normalStrong}>
                      {audienceLabel(item)}
                    </strong>
                  </td>

                  <td>{item.channel}</td>

                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[`status${item.status}`]
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td>{formatDate(item.created_at)}</td>

                  <td>
                    <div className={styles.rowActions}>
                      <button
                        onClick={() => setViewing(item)}
                      >
                        View
                      </button>

                      <button
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </button>

                      {item.status !== "Sent" &&
                        item.status !== "Archived" && (
                          <button
                            className={styles.sendButton}
                            onClick={() =>
                              void markSent(item)
                            }
                          >
                            Send
                          </button>
                        )}

                      {item.status !== "Archived" && (
                        <button
                          onClick={() =>
                            void archive(item)
                          }
                        >
                          Archive
                        </button>
                      )}

                      <button
                        className={styles.deleteButton}
                        onClick={() =>
                          void deleteCommunication(item)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filteredMessages.length && (
                <tr>
                  <td
                    colSpan={8}
                    className={styles.empty}
                  >
                    {loading
                      ? "Loading communications..."
                      : "No communications found. Create your first announcement."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE / EDIT */}

      {modal && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModal(false);
            }
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span>COMMUNICATIONS</span>
                <h2>
                  {editing
                    ? "Edit Communication"
                    : "New Communication"}
                </h2>
              </div>

              <button onClick={() => setModal(false)}>
                ×
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={saveCommunication}
            >
              <div className={styles.formGrid}>
                <label className={styles.full}>
                  Title *
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    placeholder="e.g. Parent Meeting Notice"
                  />
                </label>

                <label>
                  Type
                  <select
                    value={form.communication_type}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        communication_type:
                          event.target.value,
                      }))
                    }
                  >
                    <option>Announcement</option>
                    <option>Notice</option>
                    <option>Reminder</option>
                    <option>Message</option>
                  </select>
                </label>

                <label>
                  Channel
                  <select
                    value={form.channel}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        channel: event.target.value,
                      }))
                    }
                  >
                    <option>In-App</option>
                    <option>Email</option>
                    <option>WhatsApp</option>
                    <option>SMS</option>
                  </select>
                </label>

                <label>
                  Audience
                  <select
                    value={form.audience_type}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        audience_type:
                          event.target.value,
                        audience_id: "",
                      }))
                    }
                  >
                    <option>All</option>
                    <option>Students</option>
                    <option>Parents</option>
                    <option>Staff</option>
                    <option>Batch</option>
                    <option>Student</option>
                  </select>
                </label>

                {form.audience_type === "Batch" && (
                  <label>
                    Select Batch *
                    <select
                      value={form.audience_id}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          audience_id:
                            event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        Select batch
                      </option>

                      {batches.map((batch) => (
                        <option
                          key={batch.id}
                          value={batch.id}
                        >
                          {batch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {form.audience_type === "Student" && (
                  <label>
                    Select Student *
                    <select
                      value={form.audience_id}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          audience_id:
                            event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        Select student
                      </option>

                      {students.map((student) => (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {student.full_name ||
                            student.name ||
                            "Student"}{" "}
                          {student.admission_no
                            ? `— ${student.admission_no}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option>Draft</option>
                    <option>Scheduled</option>
                    <option>Sent</option>
                    <option>Archived</option>
                  </select>
                </label>

                {form.status === "Scheduled" && (
                  <label>
                    Schedule Date & Time
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          scheduled_at:
                            event.target.value,
                        }))
                      }
                    />
                  </label>
                )}

                <label className={styles.full}>
                  Attachment URL
                  <input
                    type="url"
                    value={form.attachment_url}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        attachment_url:
                          event.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </label>

                <label className={styles.full}>
                  Message *
                  <textarea
                    rows={7}
                    value={form.message}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        message: event.target.value,
                      }))
                    }
                    placeholder="Write your announcement or message..."
                  />
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Update Communication"
                      : "Save Communication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW */}

      {viewing && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewing(null);
            }
          }}
        >
          <div className={styles.viewModal}>
            <div className={styles.modalHeader}>
              <div>
                <span>
                  {viewing.communication_type.toUpperCase()}
                </span>
                <h2>{viewing.title}</h2>
              </div>

              <button onClick={() => setViewing(null)}>
                ×
              </button>
            </div>

            <div className={styles.viewBody}>
              <div className={styles.viewMeta}>
                <span>
                  Audience
                  <strong>
                    {audienceLabel(viewing)}
                  </strong>
                </span>

                <span>
                  Channel
                  <strong>{viewing.channel}</strong>
                </span>

                <span>
                  Status
                  <strong>{viewing.status}</strong>
                </span>

                <span>
                  Created
                  <strong>
                    {formatDate(viewing.created_at)}
                  </strong>
                </span>
              </div>

              <div className={styles.messageBox}>
                {viewing.message}
              </div>

              {viewing.attachment_url && (
                <a
                  href={viewing.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.attachment}
                >
                  Open Attachment ↗
                </a>
              )}

              {viewing.scheduled_at && (
                <p className={styles.scheduleInfo}>
                  Scheduled for{" "}
                  {formatDate(viewing.scheduled_at)}
                </p>
              )}

              {viewing.sent_at && (
                <p className={styles.scheduleInfo}>
                  Sent on {formatDate(viewing.sent_at)}
                </p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setViewing(null)}>
                Close
              </button>

              {viewing.status !== "Sent" &&
                viewing.status !== "Archived" && (
                  <button
                    onClick={() => {
                      setViewing(null);
                      void markSent(viewing);
                    }}
                  >
                    Mark as Sent
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
