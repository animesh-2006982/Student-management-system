"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./exams.module.css";

type ExamStatus = "Upcoming" | "Completed" | "Draft";

type Exam = {
  id: string;
  name: string;
  className: string;
  date: string;
  status: ExamStatus;
};

export default function ExamsPage() {
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getInstituteId = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("Please login again.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile?.institute_id) {
      throw new Error("Institute profile not found.");
    }

    return profile.institute_id as string;
  };

  const loadExams = async () => {
    setLoading(true);
    setError("");

    try {
      const instituteId = await getInstituteId();

      const { data, error: examsError } = await supabase
        .from("exams")
        .select("id,name,class_name,exam_date,status")
        .eq("institute_id", instituteId)
        .order("exam_date", { ascending: true })
        .order("created_at", { ascending: false });

      if (examsError) throw examsError;

      setExams(
        (data ?? []).map((exam) => ({
          id: exam.id,
          name: exam.name,
          className: exam.class_name,
          date: exam.exam_date,
          status: exam.status as ExamStatus,
        }))
      );
    } catch (err: any) {
      console.error("Load exams error:", err);
      setError(err?.message || "Unable to load exams.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const filteredExams = useMemo(() => {
    const query = search.trim().toLowerCase();

    return exams.filter((exam) => {
      const matchesSearch =
        exam.name.toLowerCase().includes(query) ||
        exam.className.toLowerCase().includes(query);

      const matchesFilter =
        filter === "All" || exam.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [exams, search, filter]);

  const handleCreateExam = async () => {
    if (saving) return;

    const name = window.prompt("Enter exam name:");
    if (!name?.trim()) return;

    const className = window.prompt("Enter class / batch:");
    if (!className?.trim()) return;

    const date = window.prompt(
      "Enter exam date (DD-MM-YYYY, DD/MM/YYYY or YYYY-MM-DD):"
    );
    if (!date?.trim()) return;

    const rawDate = date.trim().replaceAll("/", "-");
    let normalizedDate = "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      normalizedDate = rawDate;
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
      const [day, month, year] = rawDate.split("-");
      normalizedDate = `${year}-${month}-${day}`;
    } else {
      setError(
        "Please enter a valid date. Use DD-MM-YYYY, DD/MM/YYYY or YYYY-MM-DD."
      );
      return;
    }

    const [yearNumber, monthNumber, dayNumber] = normalizedDate
      .split("-")
      .map(Number);

    const checkDate = new Date(yearNumber, monthNumber - 1, dayNumber);

    if (
      checkDate.getFullYear() !== yearNumber ||
      checkDate.getMonth() !== monthNumber - 1 ||
      checkDate.getDate() !== dayNumber
    ) {
      setError("Please enter a valid date.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const instituteId = await getInstituteId();

      const { error: insertError } = await supabase.from("exams").insert({
        institute_id: instituteId,
        name: name.trim(),
        class_name: className.trim(),
        exam_date: normalizedDate,
        status: "Upcoming",
      });

      if (insertError) throw insertError;

      setShowModal(false);
      await loadExams();
    } catch (err: any) {
      console.error("Create exam error:", err);
      setError(err?.message || "Unable to create exam.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this exam?"
    );

    if (!confirmed) return;

    setError("");
    setShowMenu(null);

    const { error: deleteError } = await supabase
      .from("exams")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Delete exam error:", deleteError);
      setError(deleteError.message || "Unable to delete exam.");
      return;
    }

    setExams((current) => current.filter((exam) => exam.id !== id));
  };

  const handleView = (exam: Exam) => {
    window.alert(
      `Exam: ${exam.name}\nClass: ${exam.className}\nDate: ${exam.date}\nStatus: ${exam.status}`
    );
    setShowMenu(null);
  };

  const handleEdit = async (exam: Exam) => {
    setShowMenu(null);

    const name = window.prompt("Exam name:", exam.name);
    if (!name?.trim()) return;

    const className = window.prompt("Class / batch:", exam.className);
    if (!className?.trim()) return;

    const date = window.prompt(
      "Exam date (DD-MM-YYYY, DD/MM/YYYY or YYYY-MM-DD):",
      exam.date
    );
    if (!date?.trim()) return;

    const rawDate = date.trim().replaceAll("/", "-");
    let normalizedDate = "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      normalizedDate = rawDate;
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
      const [day, month, year] = rawDate.split("-");
      normalizedDate = `${year}-${month}-${day}`;
    } else {
      setError(
        "Please enter a valid date. Use DD-MM-YYYY, DD/MM/YYYY or YYYY-MM-DD."
      );
      return;
    }

    const [yearNumber, monthNumber, dayNumber] = normalizedDate
      .split("-")
      .map(Number);

    const checkDate = new Date(yearNumber, monthNumber - 1, dayNumber);

    if (
      checkDate.getFullYear() !== yearNumber ||
      checkDate.getMonth() !== monthNumber - 1 ||
      checkDate.getDate() !== dayNumber
    ) {
      setError("Please enter a valid date.");
      return;
    }

    setError("");

    const { error: updateError } = await supabase
      .from("exams")
      .update({
        name: name.trim(),
        class_name: className.trim(),
        exam_date: normalizedDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", exam.id);

    if (updateError) {
      console.error("Edit exam error:", updateError);
      setError(updateError.message || "Unable to edit exam.");
      return;
    }

    await loadExams();
  };

  const handleStatus = async (exam: Exam, status: ExamStatus) => {
    setShowMenu(null);
    setError("");

    const { error: updateError } = await supabase
      .from("exams")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", exam.id);

    if (updateError) {
      console.error("Status update error:", updateError);
      setError(updateError.message || "Unable to update exam status.");
      return;
    }

    setExams((current) =>
      current.map((item) =>
        item.id === exam.id ? { ...item, status } : item
      )
    );
  };

  const openCreate = () => {
    setError("");
    setShowModal(true);
  };

  return (
    <main className={styles.page}>
      {/* HEADER */}
      <header className={styles.topHeader}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <span>Exams</span>
          </div>

          <h1 className={styles.title}>
            Exam <span>Management</span>
          </h1>

          <p className={styles.subtitle}>
            Create, manage and track examinations from one organized workspace.
          </p>
        </div>

        <button
          className={styles.primaryButton}
          onClick={openCreate}
          disabled={saving}
          type="button"
        >
          <span>＋</span>
          Create Exam
        </button>
      </header>

      {error && (
        <div
          style={{
            marginBottom: 18,
            padding: "12px 15px",
            border: "1px solid #ffc9cf",
            borderRadius: 12,
            background: "#fff1f2",
            color: "#dc3545",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* STAT CARDS */}
      <section className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.purpleCard}`}>
          <div className={styles.statIcon}>▣</div>
          <div>
            <span>Total Exams</span>
            <strong>{exams.length}</strong>
            <small>Database records</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.greenCard}`}>
          <div className={styles.statIcon}>✓</div>
          <div>
            <span>Active Exams</span>
            <strong>
              {exams.filter((exam) => exam.status === "Upcoming").length}
            </strong>
            <small>Currently active</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.orangeCard}`}>
          <div className={styles.statIcon}>!</div>
          <div>
            <span>Upcoming</span>
            <strong>
              {exams.filter((exam) => exam.status === "Upcoming").length}
            </strong>
            <small>Scheduled exams</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.blueCard}`}>
          <div className={styles.statIcon}>✓</div>
          <div>
            <span>Completed</span>
            <strong>
              {exams.filter((exam) => exam.status === "Completed").length}
            </strong>
            <small>Finished exams</small>
          </div>
        </div>
      </section>

      {/* EXAM DIRECTORY */}
      <section className={styles.directory}>
        <div className={styles.directoryHeader}>
          <div>
            <p>EXAM DIRECTORY</p>
            <h2>All Examinations</h2>
            <span>View and manage examination information.</span>
          </div>

          <button
            className={styles.smallPrimaryButton}
            onClick={openCreate}
            type="button"
          >
            ＋ Add Exam
          </button>
        </div>

        {/* FILTER BAR */}
        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search exam or class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={styles.select}
          >
            <option value="All">All Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
            <option value="Draft">Draft</option>
          </select>
        </div>

        {/* TABLE */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>EXAMINATION</th>
                <th>CLASS</th>
                <th>DATE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>…</div>
                      <h3>Loading exams</h3>
                      <p>Fetching examination records from database.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>▣</div>
                      <h3>No exams found</h3>
                      <p>
                        Exam data will appear here once you create an exam or
                        connect your database.
                      </p>
                      <button
                        className={styles.emptyButton}
                        onClick={openCreate}
                        type="button"
                      >
                        ＋ Create First Exam
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam) => (
                  <tr key={exam.id}>
                    <td>
                      <span className={styles.idBadge}>
                        #{exam.id.slice(-4)}
                      </span>
                    </td>

                    <td>
                      <div className={styles.examName}>
                        <div className={styles.examAvatar}>E</div>
                        <div>
                          <strong>{exam.name}</strong>
                          <small>Examination</small>
                        </div>
                      </div>
                    </td>

                    <td>{exam.className}</td>
                    <td>{exam.date}</td>

                    <td>
                      <span
                        className={`${styles.status} ${
                          exam.status === "Upcoming"
                            ? styles.statusUpcoming
                            : exam.status === "Completed"
                              ? styles.statusCompleted
                              : styles.statusDraft
                        }`}
                      >
                        {exam.status}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actionArea}>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleView(exam)}
                          type="button"
                        >
                          View
                        </button>

                        <button
                          className={styles.moreButton}
                          onClick={() =>
                            setShowMenu(
                              showMenu === exam.id ? null : exam.id
                            )
                          }
                          type="button"
                        >
                          ⋮
                        </button>

                        {showMenu === exam.id && (
                          <div className={styles.actionMenu}>
                            <button
                              type="button"
                              onClick={() => handleView(exam)}
                            >
                              View Exam
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEdit(exam)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleStatus(exam, "Upcoming")
                              }
                            >
                              Mark Upcoming
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleStatus(exam, "Completed")
                              }
                            >
                              Mark Completed
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatus(exam, "Draft")}
                            >
                              Mark Draft
                            </button>

                            <button
                              className={styles.deleteItem}
                              type="button"
                              onClick={() => handleDelete(exam.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE EXAM MODAL */}
      {showModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeButton}
              onClick={() => !saving && setShowModal(false)}
              type="button"
            >
              ×
            </button>

            <div className={styles.modalIcon}>＋</div>

            <h2>Create Examination</h2>

            <p>
              Create a new examination record.
            </p>

            <button
              className={styles.modalCreateButton}
              onClick={handleCreateExam}
              disabled={saving}
              type="button"
            >
              {saving ? "Saving..." : "Create Exam"}
            </button>

            <button
              className={styles.modalCancelButton}
              onClick={() => !saving && setShowModal(false)}
              disabled={saving}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
