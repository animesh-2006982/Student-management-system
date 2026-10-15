"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./batches.module.css";
import { createClient } from "@/lib/supabase/client";

type Batch = {
  id: string;
  name: string;
  description: string | null;
  courseName: string | null;
  subject: string | null;
  teacherId: string | null;
  room: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  capacity: number | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

function displayClass(name: string) {
  const parts = name.split(" — ");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function displayBatchName(name: string) {
  const parts = name.split(" — ");
  return parts.length > 1 ? parts.slice(0, -1).join(" — ") : name;
}

export default function BatchesPage() {
  const supabase = createClient();

  const [showModal, setShowModal] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [className, setClassName] = useState("");
  const [status, setStatus] = useState("Active");

  const [batches, setBatches] = useState<Batch[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [classFilter, setClassFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadBatches = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please login first.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.institute_id) {
        console.error("Profile error:", profileError);
        setError("Unable to load your institute profile.");
        return;
      }

      const instituteId = profile.institute_id;

      const [
        { data: batchData, error: batchError },
        { count, error: studentError },
      ] = await Promise.all([
        supabase
          .from("batches")
          .select(
            "id,name,description,course_name,subject,teacher_id,room,start_date,end_date,start_time,end_time,capacity,status,created_at,updated_at"
          )
          .eq("institute_id", instituteId)
          .order("created_at", { ascending: false }),

        supabase
          .from("students")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("institute_id", instituteId),
      ]);

      if (batchError) {
        console.error("Batch error:", batchError);
        setError(batchError.message);
        return;
      }

      if (studentError) {
        console.error("Student count error:", studentError);
      }

      setBatches(
  (batchData || []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    courseName: row.course_name ?? null,
    subject: row.subject ?? null,
    teacherId: row.teacher_id ?? null,
    room: row.room ?? null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    startTime: row.start_time ?? null,
    endTime: row.end_time ?? null,
    capacity: row.capacity ?? null,
    status: row.status ?? "active",
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
  }))
);
      setStudentCount(count || 0);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load batches."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBatches();
  }, []);

  const activeCount = batches.filter(
    (batch) =>
      String(batch.status).toLowerCase() === "active"
  ).length;

  const inactiveCount = batches.length - activeCount;

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const batchStatus =
        String(batch.status).toLowerCase() === "active"
          ? "active"
          : "inactive";

      if (
        activeTab !== "all" &&
        batchStatus !== activeTab
      ) {
        return false;
      }

      const currentClass =
        batch.courseName || displayClass(batch.name);

      if (
        classFilter !== "all" &&
        currentClass.toLowerCase() !==
          classFilter.toLowerCase()
      ) {
        return false;
      }

      if (search.trim()) {
        const haystack = [
          batch.name,
          batch.courseName || "",
          batch.subject || "",
          batch.teacherId || "",
          batch.room || "",
        ]
          .join(" ")
          .toLowerCase();

        if (
          !haystack.includes(
            search.trim().toLowerCase()
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    batches,
    activeTab,
    classFilter,
    search,
  ]);

  const handleCreateBatch = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (
      !batchName.trim() ||
      !className.trim()
    ) {
      alert(
        "Please enter batch name and class."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please login first.");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        !profile?.institute_id
      ) {
        setError(
          "Unable to load your institute profile."
        );
        return;
      }

      /*
       * Existing database schema has course_name
       * instead of class_name.
       *
       * We therefore save the selected class
       * into course_name.
       */

      const { error: insertError } =
        await supabase.from("batches").insert({
          institute_id: profile.institute_id,

          name: batchName.trim(),

          description: null,

          course_name: className.trim(),

          subject: null,

          teacher_id: null,

          room: null,

          start_date: null,

          end_date: null,

          start_time: null,

          end_time: null,

          capacity: 0,

          status: status.toLowerCase(),
        });

      if (insertError) {
        console.error(
          "Create batch error:",
          insertError
        );

        setError(insertError.message);
        return;
      }

      setBatchName("");
      setClassName("");
      setStatus("Active");
      setShowModal(false);

      await loadBatches();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create batch."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this batch?"
    );

    if (!confirmed) return;

    setError("");

    try {
      const { error: deleteError } =
        await supabase
          .from("batches")
          .delete()
          .eq("id", id);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      await loadBatches();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete batch."
      );
    }
  };

  return (
    <main className={styles.page}>
      {/* TOP HEADER */}

      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/admin">
              Dashboard
            </Link>

            <span>/</span>

            <strong>Batches</strong>
          </div>

          <div className={styles.eyebrow}>
            <span className={styles.dot}></span>

            ACADEMIC MANAGEMENT
          </div>

          <h1>
            Manage <span>Batches</span>
          </h1>

          <p>
            Create and manage classes, batches and
            academic groups from one organized
            workspace.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              const rows =
                filteredBatches.map(
                  (batch) => ({
                    Name: displayBatchName(
                      batch.name
                    ),
                    Class:
                      batch.courseName ||
                      displayClass(
                        batch.name
                      ),
                    Status: batch.status,
                    Subject:
                      batch.subject || "",
                    Teacher:
                      batch.teacherId || "",
                    Room:
                      batch.room || "",
                    Capacity:
                      batch.capacity ?? 0,
                  })
                );

              if (!rows.length) {
                alert(
                  "No batch data available to export."
                );
                return;
              }

              const header =
                Object.keys(rows[0]).join(
                  ","
                );

              const body = rows
                .map((row) =>
                  Object.values(row)
                    .map(
                      (value) =>
                        `"${String(
                          value
                        ).replace(
                          /"/g,
                          '""'
                        )}"`
                    )
                    .join(",")
                )
                .join("\n");

              const blob = new Blob(
                [
                  `${header}\n${body}`,
                ],
                {
                  type:
                    "text/csv;charset=utf-8;",
                }
              );

              const url =
                URL.createObjectURL(blob);

              const link =
                document.createElement(
                  "a"
                );

              link.href = url;
              link.download =
                "studentflow-batches.csv";

              link.click();

              URL.revokeObjectURL(url);
            }}
          >
            ↓ Export
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() =>
              setShowModal(true)
            }
          >
            + Create Batch
          </button>
        </div>
      </header>

      {error && (
        <div
          style={{
            margin: "20px 0",
            padding: "14px 18px",
            borderRadius: 14,
            background: "#fff1f2",
            border:
              "1px solid #fecdd3",
            color: "#be123c",
          }}
        >
          {error}
        </div>
      )}

      {/* STATS */}

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div
            className={`${styles.statIcon} ${styles.purple}`}
          >
            ▦
          </div>

          <div>
            <span>Total Batches</span>

            <strong>
              {loading
                ? "…"
                : batches.length}
            </strong>

            <small>
              {loading
                ? "Loading..."
                : "From database"}
            </small>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={`${styles.statIcon} ${styles.green}`}
          >
            ✓
          </div>

          <div>
            <span>Active Batches</span>

            <strong>
              {loading
                ? "…"
                : activeCount}
            </strong>

            <small>
              Currently active
            </small>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={`${styles.statIcon} ${styles.orange}`}
          >
            ◷
          </div>

          <div>
            <span>Inactive Batches</span>

            <strong>
              {loading
                ? "…"
                : inactiveCount}
            </strong>

            <small>
              Currently inactive
            </small>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={`${styles.statIcon} ${styles.blue}`}
          >
            ♙
          </div>

          <div>
            <span>Total Students</span>

            <strong>
              {loading
                ? "…"
                : studentCount}
            </strong>

            <small>
              From database
            </small>
          </div>
        </div>
      </section>

      {/* BATCH DIRECTORY */}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <div
              className={
                styles.panelEyebrow
              }
            >
              BATCH DIRECTORY
            </div>

            <h2>All Batches</h2>

            <p>
              View and manage every academic
              batch in your institution.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.mobileAddBtn
            }
            onClick={() =>
              setShowModal(true)
            }
          >
            + Add
          </button>
        </div>

        {/* TOOLBAR */}

        <div className={styles.toolbar}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${
                activeTab === "all"
                  ? styles.activeTab
                  : ""
              }`}
              onClick={() =>
                setActiveTab("all")
              }
            >
              All{" "}
              <span>
                {batches.length}
              </span>
            </button>

            <button
              type="button"
              className={`${styles.tab} ${
                activeTab === "active"
                  ? styles.activeTab
                  : ""
              }`}
              onClick={() =>
                setActiveTab("active")
              }
            >
              Active{" "}
              <span>
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              className={`${styles.tab} ${
                activeTab === "inactive"
                  ? styles.activeTab
                  : ""
              }`}
              onClick={() =>
                setActiveTab("inactive")
              }
            >
              Inactive{" "}
              <span>
                {inactiveCount}
              </span>
            </button>
          </div>

          <div className={styles.filters}>
            <select
              className={styles.select}
              value={classFilter}
              onChange={(e) =>
                setClassFilter(
                  e.target.value
                )
              }
            >
              <option value="all">
                All Classes
              </option>

              <option value="Nursery">
                Nursery
              </option>

              <option value="KG">
                Kindergarten
              </option>

              <option value="1st Class">
                1st Class
              </option>

              <option value="2nd Class">
                2nd Class
              </option>

              <option value="3rd Class">
                3rd Class
              </option>

              <option value="4th Class">
                4th Class
              </option>

              <option value="5th Class">
                5th Class
              </option>

              <option value="6th Class">
                6th Class
              </option>

              <option value="7th Class">
                7th Class
              </option>

              <option value="8th Class">
                8th Class
              </option>

              <option value="9th Class">
                9th Class
              </option>

              <option value="10th Class">
                10th Class
              </option>

              <option value="11th Class">
                11th Class
              </option>

              <option value="12th Class">
                12th Class
              </option>
            </select>

            <input
              className={styles.search}
              type="search"
              placeholder="⌕  Search batches..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            <div
              className={
                styles.emptyIcon
              }
            >
              ▦
            </div>

            <h3>
              Loading batches...
            </h3>

            <p>
              Fetching batch information
              from Supabase.
            </p>
          </div>
        ) : filteredBatches.length ===
          0 ? (
          <div className={styles.emptyState}>
            <div
              className={
                styles.emptyIcon
              }
            >
              ▦
            </div>

            <h3>
              No batches yet
            </h3>

            <p>
              {batches.length
                ? "No batches match your current filters."
                : "Create your first batch to start managing academic groups."}
            </p>

            <button
              type="button"
              className={
                styles.emptyButton
              }
              onClick={() =>
                setShowModal(true)
              }
            >
              + Create First Batch
            </button>
          </div>
        ) : (
          <div
            style={{
              padding:
                "20px 24px 28px",
              display: "grid",
              gap: 12,
            }}
          >
            {filteredBatches.map(
              (batch) => (
                <div
                  key={batch.id}
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    gap: 16,
                    padding:
                      "18px 20px",
                    border:
                      "1px solid rgba(100,116,139,.16)",
                    borderRadius: 18,
                    background: "#fff",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 17,
                        color:
                          "#18213f",
                      }}
                    >
                      {
                        displayBatchName(
                          batch.name
                        )
                      }
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 13,
                        color:
                          "#7180a5",
                      }}
                    >
                      {batch.courseName ||
                        displayClass(
                          batch.name
                        ) ||
                        "Class not specified"}

                      {batch.subject
                        ? ` • ${batch.subject}`
                        : ""}

                      {batch.room
                        ? ` • ${batch.room}`
                        : ""}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        padding:
                          "7px 11px",
                        borderRadius:
                          999,
                        fontSize: 12,
                        fontWeight: 700,

                        background:
                          String(
                            batch.status
                          ).toLowerCase() ===
                          "active"
                            ? "#ecfdf5"
                            : "#fff7ed",

                        color:
                          String(
                            batch.status
                          ).toLowerCase() ===
                          "active"
                            ? "#047857"
                            : "#c2410c",
                      }}
                    >
                      {batch.status}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          batch.id
                        )
                      }
                      style={{
                        border: 0,
                        background:
                          "transparent",
                        color:
                          "#dc2626",
                        cursor:
                          "pointer",
                        fontWeight: 700,
                        padding:
                          "8px 6px",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* INFO CARDS */}

      <section className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <div
            className={
              styles.infoIcon
            }
          >
            ✦
          </div>

          <div>
            <span>
              ACADEMIC ORGANIZATION
            </span>

            <h3>
              Keep your classes
              organized.
            </h3>

            <p>
              Create separate batches
              for different classes,
              sessions and academic
              groups.
            </p>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div
            className={
              styles.infoIcon
            }
          >
            ↗
          </div>

          <div>
            <span>
              DATABASE CONNECTED
            </span>

            <h3>
              Live batch data is
              active.
            </h3>

            <p>
              Batch records are now
              loaded and saved through
              your Supabase database.
            </p>
          </div>
        </div>
      </section>

      {/* CREATE BATCH MODAL */}

      {showModal && (
        <div
          className={
            styles.modalOverlay
          }
          onClick={() =>
            !saving &&
            setShowModal(false)
          }
        >
          <div
            className={styles.modal}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span>
                  ACADEMIC MANAGEMENT
                </span>

                <h2>
                  Create New Batch
                </h2>

                <p>
                  Add a new academic
                  batch.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.closeBtn
                }
                onClick={() =>
                  !saving &&
                  setShowModal(false)
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleCreateBatch
              }
            >
              <div
                className={
                  styles.formGroup
                }
              >
                <label>
                  Batch Name
                </label>

                <input
                  type="text"
                  placeholder="Example: Morning Batch"
                  value={batchName}
                  onChange={(e) =>
                    setBatchName(
                      e.target.value
                    )
                  }
                  disabled={saving}
                />
              </div>

              <div
                className={
                  styles.formGroup
                }
              >
                <label>
                  Class
                </label>

                <select
                  value={className}
                  onChange={(e) =>
                    setClassName(
                      e.target.value
                    )
                  }
                  disabled={saving}
                >
                  <option value="">
                    Select class
                  </option>

                  <option value="Nursery">
                    Nursery
                  </option>

                  <option value="KG">
                    Kindergarten
                  </option>

                  <option value="1st Class">
                    1st Class
                  </option>

                  <option value="2nd Class">
                    2nd Class
                  </option>

                  <option value="3rd Class">
                    3rd Class
                  </option>

                  <option value="4th Class">
                    4th Class
                  </option>

                  <option value="5th Class">
                    5th Class
                  </option>

                  <option value="6th Class">
                    6th Class
                  </option>

                  <option value="7th Class">
                    7th Class
                  </option>

                  <option value="8th Class">
                    8th Class
                  </option>

                  <option value="9th Class">
                    9th Class
                  </option>

                  <option value="10th Class">
                    10th Class
                  </option>

                  <option value="11th Class">
                    11th Class
                  </option>

                  <option value="12th Class">
                    12th Class
                  </option>
                </select>
              </div>

              <div
                className={
                  styles.formGroup
                }
              >
                <label>
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value
                    )
                  }
                  disabled={saving}
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>

              <div
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelBtn
                  }
                  onClick={() =>
                    !saving &&
                    setShowModal(false)
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={
                    styles.saveBtn
                  }
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}