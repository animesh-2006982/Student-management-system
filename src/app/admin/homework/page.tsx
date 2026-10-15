 "use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./homework.module.css";

type HomeworkRow = {
  id: string;
  title: string;
  subject: string;
  description: string;
  batch: string;
  assigned_date: string;
  due_date: string;
  status: string;
  attachment_url: string;
};

type Batch = {
  id: string;
  name: string;
};

const emptyForm = {
  title: "",
  subject: "",
  description: "",
  batch_id: "",
  assigned_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  status: "Pending",
  attachment_url: "",
};

export default function Page() {
  const supabase = createClient();

  const [rows, setRows] = useState<HomeworkRow[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<HomeworkRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function getInstituteId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("Please login first.");

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", user.id)
      .single();

    if (error || !profile?.institute_id) {
      throw new Error("Unable to load your institute profile.");
    }

    return { userId: user.id, instituteId: profile.institute_id as string };
  }

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const { instituteId } = await getInstituteId();

      const [{ data: homework, error: homeworkError }, { data: batchData, error: batchError }] =
        await Promise.all([
          supabase
            .from("homework")
            .select(`
              id,
              title,
              subject,
              description,
              assigned_date,
              due_date,
              status,
              attachment_url,
              batch_id,
              batches ( name )
            `)
            .eq("institute_id", instituteId)
            .order("created_at", { ascending: false }),
          supabase
            .from("batches")
            .select("id,name")
            .eq("institute_id", instituteId)
            .order("name"),
        ]);

      if (homeworkError) throw new Error(homeworkError.message);
      if (batchError) throw new Error(batchError.message);

      setRows(
        (homework || []).map((item: any) => ({
          id: item.id,
          title: item.title || "",
          subject: item.subject || "",
          description: item.description || "",
          batch: Array.isArray(item.batches)
            ? item.batches[0]?.name || ""
            : item.batches?.name || "",
          assigned_date: item.assigned_date || "",
          due_date: item.due_date || "",
          status: item.status || "Pending",
          attachment_url: item.attachment_url || "",
        }))
      );

      setBatches(batchData || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load homework.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.title.toLowerCase().includes(q) ||
        row.subject.toLowerCase().includes(q) ||
        row.batch.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || row.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const active = rows.filter(
      (r) => r.status === "Pending" || r.status === "In Progress"
    ).length;

    const pending = rows.filter((r) => r.status === "Pending").length;

    const thisMonth = rows.filter((r) => {
      if (!r.assigned_date) return false;
      const d = new Date(`${r.assigned_date}T00:00:00`);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    return { total: rows.length, active, pending, thisMonth };
  }, [rows]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setShowForm(true);
  }

  function openEdit(row: HomeworkRow) {
    const batch = batches.find((b) => b.name === row.batch);

    setEditingId(row.id);
    setForm({
      title: row.title,
      subject: row.subject,
      description: row.description,
      batch_id: batch?.id || "",
      assigned_date: row.assigned_date || "",
      due_date: row.due_date || "",
      status: row.status,
      attachment_url: row.attachment_url || "",
    });
    setMessage("");
    setShowForm(true);
  }

  async function saveHomework(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim() || !form.subject.trim()) {
      setMessage("Title and subject are required.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const { userId, instituteId } = await getInstituteId();

      const payload = {
        institute_id: instituteId,
        title: form.title.trim(),
        subject: form.subject.trim(),
        description: form.description.trim() || null,
        batch_id: form.batch_id || null,
        assigned_date: form.assigned_date || new Date().toISOString().slice(0, 10),
        due_date: form.due_date || null,
        status: form.status,
        attachment_url: form.attachment_url.trim() || null,
        created_by: userId,
      };

      const result = editingId
        ? await supabase
            .from("homework")
            .update(payload)
            .eq("id", editingId)
            .eq("institute_id", instituteId)
        : await supabase.from("homework").insert(payload);

      if (result.error) throw new Error(result.error.message);

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setMessage(editingId ? "Homework updated successfully." : "Homework added successfully.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save homework.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteHomework(id: string) {
    if (!window.confirm("Delete this homework?")) return;

    try {
      const { instituteId } = await getInstituteId();

      const { error } = await supabase
        .from("homework")
        .delete()
        .eq("id", id)
        .eq("institute_id", instituteId);

      if (error) throw new Error(error.message);

      setViewing(null);
      setMessage("Homework deleted successfully.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete homework.");
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>ACADEMIC MANAGEMENT</span>
          <h2>Homework</h2>
          <p>Create, assign and track homework for batches and students.</p>
        </div>

        <button className={styles.primaryButton} onClick={openAdd}>
          + Add Homework
        </button>
      </section>

      <section className={styles.statsGrid}>
        <Stat label="Total" value={stats.total} tone="purple" />
        <Stat label="Active" value={stats.active} tone="green" />
        <Stat label="Pending" value={stats.pending} tone="orange" />
        <Stat label="This month" value={stats.thisMonth} tone="blue" />
      </section>

      {message && <div className={styles.message}>{message}</div>}

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div>
            <span className={styles.sectionLabel}>HOMEWORK LIST</span>
            <h3>Assignments</h3>
          </div>

          <div className={styles.filters}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search homework..."
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All</option>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Overdue</option>
            </select>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>HOMEWORK</th>
                <th>SUBJECT</th>
                <th>BATCH</th>
                <th>ASSIGNED</th>
                <th>DUE DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    Loading homework...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    <strong>No homework found</strong>
                    <span>Create your first homework assignment.</span>
                    <button onClick={openAdd}>Add Homework</button>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className={styles.titleCell}>
                        <strong>{row.title}</strong>
                        <span>{row.description || "No description"}</span>
                      </div>
                    </td>
                    <td>{row.subject}</td>
                    <td>{row.batch || "All batches"}</td>
                    <td>{row.assigned_date || "—"}</td>
                    <td>{row.due_date || "—"}</td>
                    <td>
                      <span className={`${styles.status} ${styles[row.status.toLowerCase().replaceAll(" ", "_")] || ""}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button onClick={() => setViewing(row)} title="View">◉</button>
                        <button onClick={() => openEdit(row)} title="Edit">✎</button>
                        <button onClick={() => deleteHomework(row.id)} title="Delete" className={styles.danger}>⌫</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <div>
                <span className={styles.sectionLabel}>RECORD FORM</span>
                <h3>{editingId ? "Edit Homework" : "Add Homework"}</h3>
              </div>
              <button onClick={() => setShowForm(false)}>×</button>
            </div>

            <form onSubmit={saveHomework}>
              <div className={styles.formGrid}>
                <label>
                  Title *
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Mathematics Practice"
                  />
                </label>

                <label>
                  Subject *
                  <input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="e.g. Mathematics"
                  />
                </label>

                <label>
                  Batch
                  <select
                    value={form.batch_id}
                    onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                  >
                    <option value="">All batches</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                    <option>Overdue</option>
                  </select>
                </label>

                <label>
                  Assigned Date
                  <input
                    type="date"
                    value={form.assigned_date}
                    onChange={(e) => setForm({ ...form, assigned_date: e.target.value })}
                  />
                </label>

                <label>
                  Due Date
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </label>

                <label className={styles.full}>
                  Description
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Enter homework instructions..."
                  />
                </label>

                <label className={styles.full}>
                  Attachment URL
                  <input
                    value={form.attachment_url}
                    onChange={(e) => setForm({ ...form, attachment_url: e.target.value })}
                    placeholder="https://..."
                  />
                </label>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Homework" : "Save Homework"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewing && (
        <div className={styles.overlay}>
          <div className={styles.viewModal}>
            <div className={styles.modalHead}>
              <div>
                <span className={styles.sectionLabel}>HOMEWORK DETAILS</span>
                <h3>{viewing.title}</h3>
              </div>
              <button onClick={() => setViewing(null)}>×</button>
            </div>

            <div className={styles.detailGrid}>
              <Detail label="Subject" value={viewing.subject} />
              <Detail label="Batch" value={viewing.batch || "All batches"} />
              <Detail label="Assigned Date" value={viewing.assigned_date || "—"} />
              <Detail label="Due Date" value={viewing.due_date || "—"} />
              <Detail label="Status" value={viewing.status} />
              <Detail label="Attachment" value={viewing.attachment_url || "None"} />
              <div className={styles.detailFull}>
                <small>Description</small>
                <p>{viewing.description || "No description provided."}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`${styles.statCard} ${styles[tone] || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detail}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
