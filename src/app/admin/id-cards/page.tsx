"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./id-cards.module.css";

type Student = {
  id: string;
  admission_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string | null;
  batch_id: string | null;
};

type Batch = {
  id: string;
  name: string;
};

type Card = {
  id: string;
  student_id: string;
  card_number: string | null;
  issue_date: string;
  valid_until: string | null;
  status: "active" | "inactive" | "expired";
  qr_value: string | null;
  notes: string | null;
};

type Profile = {
  institute_id: string;
};

type Institute = {
  id: string;
  name: string | null;
  email: string | null;
  logo_url?: string | null;
};

const supabase = createClient();

function studentName(s?: Student) {
  if (!s) return "Unknown Student";

  return (
    [s.first_name, s.middle_name, s.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unnamed Student"
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function makeCardNumber() {
  return `ID-${Date.now().toString().slice(-8)}`;
}

export default function IDCardsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [institute, setInstitute] = useState<Institute | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [cards, setCards] = useState<Card[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [editing, setEditing] = useState<Card | null>(null);

  const [previewStudent, setPreviewStudent] =
    useState<Student | null>(null);

  const [previewCard, setPreviewCard] =
    useState<Card | null>(null);

  const [form, setForm] = useState({
    student_id: "",
    issue_date: today(),
    valid_until: "",
    status: "active" as Card["status"],
    card_number: "",
    notes: "",
  });

  const batchMap = useMemo(
    () => new Map(batches.map((b) => [b.id, b.name])),
    [batches]
  );

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setMessage("Please login again.");
      setLoading(false);
      return;
    }

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profileData?.institute_id
    ) {
      setMessage(
        profileError?.message ||
          "Institute profile not found."
      );

      setLoading(false);
      return;
    }

    setProfile(profileData);

    const [
      instituteRes,
      studentsRes,
      batchesRes,
      cardsRes,
    ] = await Promise.all([
      supabase
        .from("institutes")
        .select("id,name,email")
        .eq(
          "id",
          profileData.institute_id
        )
        .single(),

      /*
        IMPORTANT:
        Existing students table uses
        admission_number, NOT student_id.
      */
      supabase
        .from("students")
        .select(
          "id,admission_number,first_name,middle_name,last_name,phone,status,batch_id"
        )
        .eq(
          "institute_id",
          profileData.institute_id
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("batches")
        .select("id,name")
        .eq(
          "institute_id",
          profileData.institute_id
        )
        .order("name"),

      supabase
        .from("id_cards")
        .select(
          "id,student_id,card_number,issue_date,valid_until,status,qr_value,notes"
        )
        .eq(
          "institute_id",
          profileData.institute_id
        )
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (instituteRes.error) {
      setMessage(instituteRes.error.message);
    }

    if (studentsRes.error) {
      setMessage(studentsRes.error.message);
    }

    if (batchesRes.error) {
      setMessage(batchesRes.error.message);
    }

    if (cardsRes.error) {
      setMessage(cardsRes.error.message);
    }

    setInstitute(
      (instituteRes.data || null) as Institute | null
    );

    setStudents(
      (studentsRes.data || []) as Student[]
    );

    setBatches(
      (batchesRes.data || []) as Batch[]
    );

    setCards(
      (cardsRes.data || []) as Card[]
    );

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  function openCreate(studentId = "") {
    setEditing(null);

    setForm({
      student_id: studentId,
      issue_date: today(),
      valid_until: "",
      status: "active",
      card_number: makeCardNumber(),
      notes: "",
    });

    setShowModal(true);
  }

  function openEdit(card: Card) {
    setEditing(card);

    setForm({
      student_id: card.student_id,
      issue_date: card.issue_date,
      valid_until: card.valid_until || "",
      status: card.status,
      card_number:
        card.card_number || makeCardNumber(),
      notes: card.notes || "",
    });

    setShowModal(true);
  }

  async function saveCard(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !profile?.institute_id ||
      !form.student_id
    ) {
      setMessage("Select a student.");
      return;
    }

    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      institute_id: profile.institute_id,
      student_id: form.student_id,
      card_number:
        form.card_number || makeCardNumber(),
      issue_date:
        form.issue_date || today(),
      valid_until:
        form.valid_until || null,
      status: form.status,
      qr_value: `${window.location.origin}/id-card/${form.student_id}`,
      notes: form.notes || null,
      created_by: user?.id || null,
    };

    const result = editing
      ? await supabase
          .from("id_cards")
          .update(payload)
          .eq("id", editing.id)
      : await supabase
          .from("id_cards")
          .insert(payload);

    if (result.error) {
      setMessage(result.error.message);
      setSaving(false);
      return;
    }

    setMessage(
      editing
        ? "ID card updated successfully."
        : "ID card created successfully."
    );

    setShowModal(false);
    setEditing(null);
    setSaving(false);

    await loadData();
  }

  async function deleteCard(id: string) {
    if (!confirm("Delete this ID card?")) {
      return;
    }

    const { error } = await supabase
      .from("id_cards")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("ID card deleted.");

    await loadData();
  }

  async function toggleStatus(card: Card) {
    const next =
      card.status === "active"
        ? "inactive"
        : "active";

    const { error } = await supabase
      .from("id_cards")
      .update({
        status: next,
      })
      .eq("id", card.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadData();
  }

  function openPreview(card: Card) {
    setPreviewCard(card);

    setPreviewStudent(
      studentMap.get(card.student_id) || null
    );

    setShowPreview(true);
  }

  function printPreview() {
    window.print();
  }

  const filteredCards = cards.filter((card) => {
    const student = studentMap.get(
      card.student_id
    );

    if (!student) {
      return false;
    }

    const q = search.trim().toLowerCase();

    const matchesSearch =
      !q ||
      studentName(student)
        .toLowerCase()
        .includes(q) ||
      (student.admission_number || "")
        .toLowerCase()
        .includes(q) ||
      (card.card_number || "")
        .toLowerCase()
        .includes(q);

    const matchesBatch =
      batchFilter === "all" ||
      student.batch_id === batchFilter;

    const matchesStatus =
      statusFilter === "all" ||
      card.status === statusFilter;

    return (
      matchesSearch &&
      matchesBatch &&
      matchesStatus
    );
  });

  const activeCount = cards.filter(
    (c) => c.status === "active"
  ).length;

  const inactiveCount = cards.filter(
    (c) => c.status === "inactive"
  ).length;

  const expiredCount = cards.filter(
    (c) => c.status === "expired"
  ).length;

  const studentsWithoutCards =
    students.filter(
      (student) =>
        !cards.some(
          (card) =>
            card.student_id === student.id
        )
    );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          Loading ID Cards...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            TOOLS / ID CARDS
          </div>

          <h1>ID Cards</h1>

          <p>
            Create, manage, preview and print
            student identity cards.
          </p>
        </div>

        <button
          className={styles.primaryBtn}
          onClick={() => openCreate()}
        >
          + Create ID Card
        </button>
      </div>

      {/* MESSAGE */}
      {message && (
        <div className={styles.message}>
          <span>{message}</span>

          <button
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}

      {/* STATS */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span>Total Cards</span>
          <strong>{cards.length}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Active</span>
          <strong>{activeCount}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Inactive</span>
          <strong>{inactiveCount}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Expired</span>
          <strong>{expiredCount}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Without Card</span>
          <strong>
            {studentsWithoutCards.length}
          </strong>
        </div>
      </div>

      {/* FILTERS */}
      <div className={styles.toolbar}>
        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search student, admission no. or card no..."
        />

        <select
          value={batchFilter}
          onChange={(e) =>
            setBatchFilter(e.target.value)
          }
        >
          <option value="all">
            All Batches
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

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="all">
            All Status
          </option>

          <option value="active">
            Active
          </option>

          <option value="inactive">
            Inactive
          </option>

          <option value="expired">
            Expired
          </option>
        </select>

        <button
          className={styles.secondaryBtn}
          onClick={loadData}
        >
          Refresh
        </button>
      </div>

      {/* TABLE TITLE */}
      <div className={styles.sectionTitle}>
        <div>
          <h2>Student ID Cards</h2>

          <span>
            {filteredCards.length} cards shown
          </span>
        </div>
      </div>

      {/* TABLE */}
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Admission No.</th>
              <th>Batch</th>
              <th>Card No.</th>
              <th>Issue Date</th>
              <th>Valid Until</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredCards.map((card) => {
              const student =
                studentMap.get(
                  card.student_id
                );

              if (!student) {
                return null;
              }

              return (
                <tr key={card.id}>
                  <td>
                    <div
                      className={
                        styles.studentCell
                      }
                    >
                      <div
                        className={
                          styles.avatar
                        }
                      >
                        {studentName(
                          student
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {studentName(
                            student
                          )}
                        </strong>

                        <small>
                          {student.phone ||
                            student.status ||
                            "—"}
                        </small>
                      </div>
                    </div>
                  </td>

                  <td>
                    {student.admission_number ||
                      "—"}
                  </td>

                  <td>
                    {batchMap.get(
                      student.batch_id || ""
                    ) || "—"}
                  </td>

                  <td>
                    {card.card_number || "—"}
                  </td>

                  <td>
                    {card.issue_date || "—"}
                  </td>

                  <td>
                    {card.valid_until ||
                      "Unlimited"}
                  </td>

                  <td>
                    <span
                      className={`${styles.badge} ${styles[card.status]}`}
                    >
                      {card.status}
                    </span>
                  </td>

                  <td>
                    <div
                      className={
                        styles.actions
                      }
                    >
                      <button
                        onClick={() =>
                          openPreview(card)
                        }
                      >
                        Preview
                      </button>

                      <button
                        onClick={() =>
                          openEdit(card)
                        }
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          toggleStatus(card)
                        }
                      >
                        {card.status ===
                        "active"
                          ? "Disable"
                          : "Activate"}
                      </button>

                      <button
                        className={
                          styles.danger
                        }
                        onClick={() =>
                          deleteCard(card.id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredCards.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className={styles.empty}
                >
                  No ID cards found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* STUDENTS WITHOUT CARDS */}
      {studentsWithoutCards.length >
        0 && (
        <div
          className={
            styles.missingSection
          }
        >
          <div>
            <h2>
              Students Without ID Cards
            </h2>

            <p>
              Create cards directly for
              students who do not have one.
            </p>
          </div>

          <div
            className={
              styles.missingGrid
            }
          >
            {studentsWithoutCards
              .slice(0, 12)
              .map((student) => (
                <div
                  className={
                    styles.missingCard
                  }
                  key={student.id}
                >
                  <div
                    className={
                      styles.studentCell
                    }
                  >
                    <div
                      className={
                        styles.avatar
                      }
                    >
                      {studentName(
                        student
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <strong>
                        {studentName(
                          student
                        )}
                      </strong>

                      <small>
                        {batchMap.get(
                          student.batch_id ||
                            ""
                        ) ||
                          "No batch"}
                      </small>
                    </div>
                  </div>

                  <button
                    className={
                      styles.primarySmall
                    }
                    onClick={() =>
                      openCreate(
                        student.id
                      )
                    }
                  >
                    Create Card
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div
          className={styles.overlay}
        >
          <form
            className={styles.modal}
            onSubmit={saveCard}
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <h2>
                  {editing
                    ? "Edit ID Card"
                    : "Create ID Card"}
                </h2>

                <p>
                  Configure the student
                  ID card.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.close
                }
                onClick={() =>
                  setShowModal(false)
                }
              >
                ×
              </button>
            </div>

            <div
              className={
                styles.formGrid
              }
            >
              {/* STUDENT */}
              <label>
                Student

                <select
                  value={
                    form.student_id
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      student_id:
                        e.target.value,
                    })
                  }
                  required
                >
                  <option value="">
                    Select student
                  </option>

                  {students.map(
                    (student) => (
                      <option
                        key={
                          student.id
                        }
                        value={
                          student.id
                        }
                      >
                        {studentName(
                          student
                        )}

                        {student.admission_number
                          ? ` — ${student.admission_number}`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </label>

              {/* CARD NUMBER */}
              <label>
                Card Number

                <input
                  value={
                    form.card_number
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      card_number:
                        e.target.value,
                    })
                  }
                  placeholder="ID-00000001"
                />
              </label>

              {/* ISSUE DATE */}
              <label>
                Issue Date

                <input
                  type="date"
                  value={
                    form.issue_date
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      issue_date:
                        e.target.value,
                    })
                  }
                  required
                />
              </label>

              {/* VALID UNTIL */}
              <label>
                Valid Until

                <input
                  type="date"
                  value={
                    form.valid_until
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      valid_until:
                        e.target.value,
                    })
                  }
                />
              </label>

              {/* STATUS */}
              <label>
                Status

                <select
                  value={
                    form.status
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status:
                        e.target.value as Card["status"],
                    })
                  }
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>

                  <option value="expired">
                    Expired
                  </option>
                </select>
              </label>

              {/* NOTES */}
              <label
                className={
                  styles.full
                }
              >
                Notes

                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes:
                        e.target.value,
                    })
                  }
                  placeholder="Optional notes..."
                  rows={3}
                />
              </label>
            </div>

            <div
              className={
                styles.modalFooter
              }
            >
              <button
                type="button"
                className={
                  styles.secondaryBtn
                }
                onClick={() =>
                  setShowModal(false)
                }
              >
                Cancel
              </button>

              <button
                className={
                  styles.primaryBtn
                }
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editing
                  ? "Update Card"
                  : "Create Card"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PREVIEW */}
      {showPreview &&
        previewCard &&
        previewStudent && (
          <div
            className={`${styles.overlay} ${styles.previewOverlay}`}
          >
            <div
              className={
                styles.previewModal
              }
            >
              <div
                className={
                  styles.modalHeader
                }
              >
                <div>
                  <h2>
                    ID Card Preview
                  </h2>

                  <p>
                    Front and back
                    print layout.
                  </p>
                </div>

                <div
                  className={
                    styles.previewActions
                  }
                >
                  <button
                    className={
                      styles.primaryBtn
                    }
                    onClick={
                      printPreview
                    }
                  >
                    Print
                  </button>

                  <button
                    className={
                      styles.close
                    }
                    onClick={() =>
                      setShowPreview(
                        false
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              </div>

              <div
                className={
                  styles.cardsPreview
                }
              >
                {/* FRONT */}
                <div
                  className={
                    styles.idCard
                  }
                >
                  <div
                    className={
                      styles.cardTop
                    }
                  >
                    {institute?.logo_url ? (
                      <img
                        src={
                          institute.logo_url
                        }
                        alt=""
                      />
                    ) : (
                      <div
                        className={
                          styles.logoPlaceholder
                        }
                      >
                        SF
                      </div>
                    )}

                    <div>
                      <strong>
                        {institute?.name ||
                          "StudentFlow Institute"}
                      </strong>

                      <span>
                        STUDENT IDENTITY
                        CARD
                      </span>
                    </div>
                  </div>

                  <div
                    className={
                      styles.cardBody
                    }
                  >
                    {/* Student photo is not available
                        in the current students schema,
                        so initials are used. */}
                    <div
                      className={
                        styles.cardPhotoPlaceholder
                      }
                    >
                      {studentName(
                        previewStudent
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div
                      className={
                        styles.cardInfo
                      }
                    >
                      <h3>
                        {studentName(
                          previewStudent
                        )}
                      </h3>

                      <p>
                        <b>ID:</b>{" "}
                        {previewStudent.admission_number ||
                          "—"}
                      </p>

                      <p>
                        <b>Batch:</b>{" "}
                        {batchMap.get(
                          previewStudent.batch_id ||
                            ""
                        ) || "—"}
                      </p>

                      <p>
                        <b>Phone:</b>{" "}
                        {previewStudent.phone ||
                          "—"}
                      </p>

                      <p>
                        <b>Card No:</b>{" "}
                        {previewCard.card_number ||
                          "—"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={
                      styles.cardFooter
                    }
                  >
                    <span>
                      Valid:{" "}
                      {previewCard.valid_until ||
                        "No expiry"}
                    </span>

                    <span>
                      Authorized ID Card
                    </span>
                  </div>
                </div>

                {/* BACK */}
                <div
                  className={`${styles.idCard} ${styles.backCard}`}
                >
                  <div
                    className={
                      styles.backTitle
                    }
                  >
                    IMPORTANT
                    INFORMATION
                  </div>

                  <p>
                    This card is the
                    property of{" "}
                    <b>
                      {institute?.name ||
                        "the institute"}
                    </b>
                    .
                  </p>

                  <p>
                    If found, please
                    return it to the
                    institute office.
                  </p>

                  <div
                    className={
                      styles.qrBox
                    }
                  >
                    <div>QR</div>

                    <small>
                      {previewCard.qr_value ||
                        "Student ID"}
                    </small>
                  </div>

                  <div
                    className={
                      styles.contactBox
                    }
                  >
                    <span>
                      {institute?.email ||
                        ""}
                    </span>
                  </div>

                  <div
                    className={
                      styles.signature
                    }
                  >
                    Authorized Signature
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}