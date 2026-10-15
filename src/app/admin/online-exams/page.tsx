"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Exam = {
  id: string;
  institute_id: string;
  title: string;
  subject: string;
  class_name: string | null;
  exam_date: string | null;
  duration: number | null;
  questions: number | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};

type FormState = {
  title: string;
  subject: string;
  class_name: string;
  exam_date: string;
  duration: string;
  questions: string;
  status: string;
};

const emptyForm: FormState = {
  title: "",
  subject: "",
  class_name: "",
  exam_date: "",
  duration: "",
  questions: "",
  status: "Draft",
};

export default function OnlineExamsPage() {
  const supabase = createClient();

  const [exams, setExams] = useState<Exam[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Status");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadExams = async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Your login session has expired. Please login again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.institute_id) {
      setError("Unable to load your institute profile.");
      setLoading(false);
      return;
    }

    const { data, error: examsError } = await supabase
      .from("online_exams")
      .select("*")
      .eq("institute_id", profile.institute_id)
      .order("created_at", { ascending: false });

    if (examsError) {
      setError(examsError.message);
      setExams([]);
    } else {
      setExams((data || []) as Exam[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadExams();
  }, []);

  const filteredExams = useMemo(() => {
    const q = search.trim().toLowerCase();

    return exams.filter((exam) => {
      const matchesSearch =
        !q ||
        exam.title.toLowerCase().includes(q) ||
        exam.subject.toLowerCase().includes(q) ||
        String(exam.class_name || "").toLowerCase().includes(q);

      const matchesStatus =
        status === "All Status" || exam.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [exams, search, status]);

  const activeCount = exams.filter((e) => e.status === "Active").length;
  const completedCount = exams.filter((e) => e.status === "Completed").length;
  const draftCount = exams.filter((e) => e.status === "Draft").length;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (exam: Exam) => {
    setEditing(exam);
    setForm({
      title: exam.title || "",
      subject: exam.subject || "",
      class_name: exam.class_name || "",
      exam_date: exam.exam_date || "",
      duration: exam.duration == null ? "" : String(exam.duration),
      questions: exam.questions == null ? "" : String(exam.questions),
      status: exam.status || "Draft",
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const saveExam = async () => {
    if (!form.title.trim()) {
      alert("Please enter exam name.");
      return;
    }

    if (!form.subject.trim()) {
      alert("Please enter subject.");
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Your login session has expired. Please login again.");
      setSaving(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", user.id)
      .single();

    if (!profile?.institute_id) {
      alert("Unable to find your institute.");
      setSaving(false);
      return;
    }

    const payload = {
      institute_id: profile.institute_id,
      title: form.title.trim(),
      subject: form.subject.trim(),
      class_name: form.class_name.trim() || null,
      exam_date: form.exam_date || null,
      duration: form.duration ? Number(form.duration) : null,
      questions: form.questions ? Number(form.questions) : null,
      status: form.status,
    };

    const result = editing
      ? await supabase
          .from("online_exams")
          .update(payload)
          .eq("id", editing.id)
          .eq("institute_id", profile.institute_id)
      : await supabase.from("online_exams").insert(payload);

    if (result.error) {
      alert(result.error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    closeModal();
    await loadExams();
  };

  const deleteExam = async (exam: Exam) => {
    const ok = window.confirm(
      `Delete "${exam.title}"? This action cannot be undone.`
    );

    if (!ok) return;

    const { error: deleteError } = await supabase
      .from("online_exams")
      .delete()
      .eq("id", exam.id)
      .eq("institute_id", exam.institute_id);

    if (deleteError) {
      alert(deleteError.message);
      return;
    }

    await loadExams();
  };

  const viewExam = (exam: Exam) => {
    alert(
      [
        `Exam: ${exam.title}`,
        `Subject: ${exam.subject}`,
        `Class: ${exam.class_name || "—"}`,
        `Date: ${exam.exam_date || "—"}`,
        `Duration: ${exam.duration ? `${exam.duration} min` : "—"}`,
        `Questions: ${exam.questions ?? "—"}`,
        `Status: ${exam.status}`,
      ].join("\n")
    );
  };

  const handleClear = () => {
    setSearch("");
    setStatus("All Status");
  };

  return (
    <main className="examPage">
      <div className="examHeader">
        <div>
          <div className="breadcrumb">
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <span>Online Exams</span>
          </div>
          <h1>Online Exams</h1>
        </div>

        <button type="button" className="createButton" onClick={openCreate}>
          <span>+</span>
          Create Exam
        </button>
      </div>

      <section className="intro">
        <div className="eyebrow">EXAMINATION MANAGEMENT</div>
        <h2>
          Online <span>Exams</span>
        </h2>
        <p>
          Create, publish and manage online examinations from one organized
          workspace.
        </p>
      </section>

      <section className="statsGrid">
        <div className="statCard">
          <div className="statIcon purple">▣</div>
          <div>
            <small>Total Exams</small>
            <strong>{exams.length}</strong>
            <em>Database records</em>
          </div>
        </div>

        <div className="statCard">
          <div className="statIcon green">✓</div>
          <div>
            <small>Active Exams</small>
            <strong>{activeCount}</strong>
            <em>Currently available</em>
          </div>
        </div>

        <div className="statCard">
          <div className="statIcon blue">◆</div>
          <div>
            <small>Completed</small>
            <strong>{completedCount}</strong>
            <em>Finished exams</em>
          </div>
        </div>

        <div className="statCard">
          <div className="statIcon orange">◷</div>
          <div>
            <small>Draft Exams</small>
            <strong>{draftCount}</strong>
            <em>Not published</em>
          </div>
        </div>
      </section>

      <section className="directory">
        <div className="directoryHeader">
          <div>
            <div className="eyebrow">EXAMINATION LIBRARY</div>
            <h3>All Online Exams</h3>
            <p>Create, publish and manage online examinations.</p>
          </div>
        </div>

        <div className="filters">
          <div className="searchBox">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search exam or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Completed</option>
            <option>Draft</option>
          </select>

          <button type="button" className="clearButton" onClick={handleClear}>
            Clear
          </button>
        </div>

        {error && <div className="errorBox">{error}</div>}

        <div className="examTable">
          <div className="tableHead">
            <span>EXAM</span>
            <span>SUBJECT</span>
            <span>DURATION</span>
            <span>QUESTIONS</span>
            <span>STATUS</span>
            <span>ACTION</span>
          </div>

          {loading ? (
            <div className="emptyState">
              <div className="emptyIcon">◌</div>
              <h4>Loading online exams...</h4>
              <p>Please wait while your exam records are loaded.</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="emptyState">
              <div className="emptyIcon">▣</div>
              <h4>No online exams found</h4>
              <p>
                {exams.length
                  ? "No exams match your current search or status filter."
                  : "Create your first online exam to start managing examinations."}
              </p>
              {!exams.length && (
                <button
                  type="button"
                  className="emptyCreateButton"
                  onClick={openCreate}
                >
                  + Create Exam
                </button>
              )}
            </div>
          ) : (
            filteredExams.map((exam) => (
              <div className="examRow" key={exam.id}>
                <div>
                  <strong>{exam.title}</strong>
                  <small>{exam.class_name || "All classes"}</small>
                </div>
                <div>{exam.subject}</div>
                <div>{exam.duration ? `${exam.duration} min` : "—"}</div>
                <div>{exam.questions ?? "—"}</div>
                <div>
                  <span
                    className={`statusPill ${exam.status
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    {exam.status}
                  </span>
                </div>
                <div className="rowActions">
                  <button type="button" onClick={() => viewExam(exam)}>
                    ◉
                  </button>
                  <button type="button" onClick={() => openEdit(exam)}>
                    ✎
                  </button>
                  <button
                    type="button"
                    className="deleteAction"
                    onClick={() => deleteExam(exam)}
                  >
                    ⌫
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showModal && (
        <div className="modalBackdrop" onMouseDown={closeModal}>
          <div className="examModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <div className="eyebrow">EXAMINATION FORM</div>
                <h3>{editing ? "Edit Exam" : "Create Exam"}</h3>
              </div>
              <button type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="formGrid">
              <label>
                Exam Name *
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="e.g. Mathematics Unit Test"
                />
              </label>

              <label>
                Subject *
                <input
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  placeholder="e.g. Mathematics"
                />
              </label>

              <label>
                Class / Batch
                <input
                  value={form.class_name}
                  onChange={(e) =>
                    setForm({ ...form, class_name: e.target.value })
                  }
                  placeholder="e.g. 11th"
                />
              </label>

              <label>
                Exam Date
                <input
                  type="date"
                  value={form.exam_date}
                  onChange={(e) =>
                    setForm({ ...form, exam_date: e.target.value })
                  }
                />
              </label>

              <label>
                Duration (minutes)
                <input
                  type="number"
                  min="1"
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                  placeholder="60"
                />
              </label>

              <label>
                Questions
                <input
                  type="number"
                  min="1"
                  value={form.questions}
                  onChange={(e) =>
                    setForm({ ...form, questions: e.target.value })
                  }
                  placeholder="50"
                />
              </label>

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option>Draft</option>
                  <option>Active</option>
                  <option>Completed</option>
                </select>
              </label>
            </div>

            <div className="modalActions">
              <button
                type="button"
                className="cancelButton"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="saveButton"
                onClick={saveExam}
                disabled={saving}
              >
                {saving ? "Saving..." : editing ? "Update Exam" : "Save Exam"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .examPage {
          min-height: 100vh;
          padding: 30px;
          background: #f5f6ff;
          color: #18203a;
          animation: pageIn 0.45s ease;
        }

        .examHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 32px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          font-size: 13px;
          color: #8a91aa;
        }

        .breadcrumb a {
          color: #5368ff;
          text-decoration: none;
        }

        .examHeader h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 800;
        }

        .createButton,
        .emptyCreateButton,
        .saveButton {
          border: 0;
          border-radius: 13px;
          background: linear-gradient(135deg, #5867ff, #7355ff);
          color: white;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 25px rgba(89, 94, 246, 0.22);
          transition: all 0.22s ease;
        }

        .createButton {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 50px;
          padding: 0 23px;
          font-size: 14px;
        }

        .createButton span {
          font-size: 20px;
        }

        .createButton:hover,
        .emptyCreateButton:hover,
        .saveButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 17px 32px rgba(89, 94, 246, 0.3);
        }

        .intro {
          margin-bottom: 28px;
        }

        .eyebrow {
          margin-bottom: 8px;
          color: #5368ff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 4px;
        }

        .intro h2 {
          margin: 0;
          font-size: 40px;
          line-height: 1.15;
          letter-spacing: -1px;
        }

        .intro h2 span {
          color: #5d65f6;
        }

        .intro p {
          max-width: 650px;
          margin: 10px 0 0;
          color: #7b84a1;
          font-size: 14px;
          line-height: 1.7;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          margin-bottom: 28px;
        }

        .statCard {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 18px;
          min-height: 135px;
          padding: 24px;
          background: white;
          border: 1px solid #e2e5f0;
          border-radius: 21px;
          box-shadow: 0 10px 28px rgba(45, 54, 100, 0.05);
          transition: all 0.25s ease;
        }

        .statCard::after {
          content: "";
          position: absolute;
          right: -35px;
          bottom: -60px;
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: #f1f1ff;
        }

        .statCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 35px rgba(45, 54, 100, 0.1);
        }

        .statIcon {
          position: relative;
          z-index: 1;
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          font-size: 21px;
          font-weight: 800;
        }

        .purple { color: #5963f5; background: #eeedff; }
        .green { color: #00b889; background: #e1f8f1; }
        .blue { color: #089dd2; background: #e0f5ff; }
        .orange { color: #f29a19; background: #fff1dc; }

        .statCard small,
        .statCard strong,
        .statCard em {
          position: relative;
          z-index: 1;
          display: block;
        }

        .statCard small {
          margin-bottom: 6px;
          color: #7b84a1;
          font-size: 13px;
        }

        .statCard strong {
          font-size: 27px;
          line-height: 1;
        }

        .statCard em {
          margin-top: 7px;
          color: #9ba2b8;
          font-size: 11px;
          font-style: normal;
        }

        .directory {
          overflow: hidden;
          background: white;
          border: 1px solid #e2e5f0;
          border-radius: 23px;
          box-shadow: 0 12px 35px rgba(45, 54, 100, 0.06);
          animation: fadeUp 0.55s ease;
        }

        .directoryHeader {
          padding: 28px 30px 22px;
          border-bottom: 1px solid #edf0f6;
        }

        .directoryHeader h3 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
        }

        .directoryHeader p {
          margin: 7px 0 0;
          color: #8a92aa;
          font-size: 13px;
        }

        .filters {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px 30px;
          border-bottom: 1px solid #edf0f6;
        }

        .searchBox {
          height: 46px;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 14px;
          border: 1px solid #dfe3ee;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .searchBox:focus-within {
          border-color: #6871ff;
          box-shadow: 0 0 0 4px rgba(104, 113, 255, 0.1);
        }

        .searchBox span {
          color: #8d95aa;
          font-size: 20px;
        }

        .searchBox input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: #252d48;
          font-size: 13px;
        }

        .filters select,
        .clearButton {
          height: 46px;
          border: 1px solid #dfe3ee;
          border-radius: 12px;
          outline: none;
          background: white;
          color: #66708d;
          cursor: pointer;
        }

        .filters select {
          min-width: 155px;
          padding: 0 13px;
        }

        .clearButton {
          padding: 0 18px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .clearButton:hover {
          border-color: #6871ff;
          color: #5360ec;
          background: #f5f6ff;
        }

        .errorBox {
          margin: 16px 30px 0;
          padding: 12px 14px;
          border: 1px solid #ffd0d0;
          border-radius: 10px;
          background: #fff5f5;
          color: #c33d3d;
          font-size: 13px;
        }

        .examTable {
          width: 100%;
          overflow-x: auto;
        }

        .tableHead,
        .examRow {
          display: grid;
          grid-template-columns: 1.6fr 1.2fr 1fr 1fr 1fr 0.9fr;
          min-width: 820px;
          align-items: center;
          gap: 12px;
          padding: 17px 30px;
        }

        .tableHead {
          background: #fafbfe;
          border-bottom: 1px solid #edf0f6;
          color: #8790aa;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .examRow {
          min-height: 76px;
          border-bottom: 1px solid #edf0f6;
          color: #68708a;
          font-size: 13px;
        }

        .examRow:last-child {
          border-bottom: 0;
        }

        .examRow strong,
        .examRow small {
          display: block;
        }

        .examRow strong {
          color: #252d48;
          font-size: 14px;
          margin-bottom: 5px;
        }

        .examRow small {
          color: #9ba2b8;
          font-size: 11px;
        }

        .statusPill {
          display: inline-flex;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
        }

        .statusPill.active {
          color: #008d6b;
          background: #e5faf3;
        }

        .statusPill.completed {
          color: #1680b1;
          background: #e5f6ff;
        }

        .statusPill.draft {
          color: #b77908;
          background: #fff4dd;
        }

        .rowActions {
          display: flex;
          gap: 7px;
        }

        .rowActions button {
          width: 31px;
          height: 31px;
          border: 1px solid #e1e4ee;
          border-radius: 8px;
          background: white;
          color: #68718b;
          cursor: pointer;
        }

        .rowActions button:hover {
          border-color: #6871ff;
          color: #5360ec;
          background: #f5f6ff;
        }

        .rowActions .deleteAction:hover {
          border-color: #ffb5b5;
          color: #d84848;
          background: #fff5f5;
        }

        .emptyState {
          min-height: 290px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 50px 20px;
          text-align: center;
        }

        .emptyIcon {
          width: 62px;
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 17px;
          border-radius: 18px;
          background: #eeedff;
          color: #5c67ff;
          font-size: 25px;
          animation: floating 3s ease-in-out infinite;
        }

        .emptyState h4 {
          margin: 0;
          font-size: 18px;
        }

        .emptyState p {
          max-width: 400px;
          margin: 9px 0 0;
          color: #939bb0;
          font-size: 13px;
          line-height: 1.6;
        }

        .emptyCreateButton {
          margin-top: 18px;
          padding: 11px 18px;
        }

        .modalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(20, 25, 48, 0.48);
          backdrop-filter: blur(4px);
        }

        .examModal {
          width: min(700px, 100%);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          padding: 26px;
          border-radius: 22px;
          background: white;
          box-shadow: 0 25px 70px rgba(24, 32, 58, 0.2);
        }

        .modalHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .modalHead h3 {
          margin: 4px 0 0;
          font-size: 23px;
        }

        .modalHead > button {
          width: 36px;
          height: 36px;
          border: 1px solid #e1e4ee;
          border-radius: 10px;
          background: white;
          color: #65708c;
          font-size: 22px;
          cursor: pointer;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 17px;
        }

        .formGrid label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #66708d;
          font-size: 12px;
          font-weight: 700;
        }

        .formGrid input,
        .formGrid select {
          width: 100%;
          height: 46px;
          box-sizing: border-box;
          padding: 0 13px;
          border: 1px solid #dfe3ee;
          border-radius: 11px;
          outline: none;
          background: white;
          color: #252d48;
          font-size: 13px;
        }

        .formGrid input:focus,
        .formGrid select:focus {
          border-color: #6871ff;
          box-shadow: 0 0 0 4px rgba(104, 113, 255, 0.1);
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid #edf0f6;
        }

        .cancelButton {
          height: 44px;
          padding: 0 18px;
          border: 1px solid #dfe3ee;
          border-radius: 11px;
          background: white;
          color: #68718b;
          font-weight: 700;
          cursor: pointer;
        }

        .saveButton {
          height: 44px;
          padding: 0 20px;
        }

        button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none !important;
        }

        @keyframes pageIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes floating {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        @media (max-width: 900px) {
          .examPage { padding: 24px; }
          .filters { flex-wrap: wrap; }
          .searchBox { flex-basis: 100%; }
        }

        @media (max-width: 640px) {
          .examPage { padding: 18px 14px 30px; }

          .examHeader {
            align-items: stretch;
            flex-direction: column;
          }

          .examHeader h1 { font-size: 25px; }
          .createButton { width: 100%; }
          .intro h2 { font-size: 31px; }

          .statsGrid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .statCard {
            min-height: 110px;
            padding: 19px;
          }

          .directory { border-radius: 18px; }
          .directoryHeader { padding: 22px 18px; }
          .directoryHeader h3 { font-size: 20px; }

          .filters {
            flex-direction: column;
            align-items: stretch;
            padding: 15px 18px;
          }

          .searchBox,
          .filters select,
          .clearButton {
            width: 100%;
            flex: none;
          }

          .tableHead,
          .examRow {
            padding-left: 18px;
            padding-right: 18px;
          }

          .formGrid {
            grid-template-columns: 1fr;
          }

          .examModal {
            padding: 20px;
            border-radius: 18px;
          }

          .modalActions {
            flex-direction: column-reverse;
          }

          .cancelButton,
          .saveButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
