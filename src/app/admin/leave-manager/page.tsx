"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./leave-manager.module.css";

type LeaveStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled";

type ApplicantType = "Staff" | "Student";

type LeaveType =
  | "Casual"
  | "Sick"
  | "Emergency"
  | "Earned"
  | "Unpaid"
  | "Other";

type Staff = {
  id: string;
  first_name: string;
  last_name: string | null;
  employee_id: string | null;
  phone: string | null;
  designation: string | null;
  department: string | null;
  status: string | null;
};

type Student = {
  id: string;
  admission_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string;
  family_id: string | null;
  batch_id: string | null;
};

type LeaveRow = {
  id: string;
  institute_id: string;
  employee_id: string | null;
  student_id: string | null;
  applicant_type: ApplicantType;
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  reason: string | null;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type FormData = {
  applicantType: ApplicantType;
  employeeId: string;
  studentId: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
};

const supabase = createClient();

const emptyForm: FormData = {
  applicantType: "Staff",
  employeeId: "",
  studentId: "",
  leaveType: "Casual",
  fromDate: "",
  toDate: "",
  reason: "",
  status: "Pending",
};

/* =====================================================
   HELPERS
===================================================== */

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPersonName(
  person: Staff | Student | null | undefined
) {
  if (!person) return "Unknown";

  const first = person.first_name || "";
  const middle =
    "middle_name" in person
      ? person.middle_name || ""
      : "";
  const last = person.last_name || "";

  return `${first} ${middle} ${last}`
    .replace(/\s+/g, " ")
    .trim() || "Unknown";
}

function formatDate(date: string) {
  if (!date) return "-";

  const [year, month, day] = date.split("-");

  return `${day}-${month}-${year}`;
}

function calculateDays(from: string, to: string) {
  if (!from || !to) return 0;

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);

  const days =
    Math.floor(
      (end.getTime() - start.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  return days > 0 ? days : 0;
}

function getStatusClass(status: LeaveStatus) {
  if (status === "Approved") {
    return styles.approved;
  }

  if (status === "Rejected") {
    return styles.rejected;
  }

  if (status === "Cancelled") {
    return styles.cancelled;
  }

  return styles.pending;
}

/* =====================================================
   PAGE
===================================================== */

export default function Page() {
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "All" | LeaveStatus
  >("All");

  const [applicantFilter, setApplicantFilter] = useState<
    "All" | ApplicantType
  >("All");

  const [modalOpen, setModalOpen] = useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<FormData>(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =====================================================
     GET PROFILE / INSTITUTE
  ===================================================== */

  async function getInstituteContext() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      throw new Error("Please login first.");
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    if (!profile?.institute_id) {
      throw new Error(
        "Unable to load your institute profile."
      );
    }

    return {
      userId: user.id,
      instituteId: profile.institute_id,
    };
  }

  /* =====================================================
     LOAD DATA
  ===================================================== */

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const { instituteId } =
        await getInstituteContext();

      /* -----------------------------
         LOAD LEAVES
      ----------------------------- */

      const {
        data: leaveData,
        error: leaveError,
      } = await supabase
        .from("leaves")
        .select("*")
        .eq("institute_id", instituteId)
        .order("created_at", {
          ascending: false,
        });

      if (leaveError) {
        throw leaveError;
      }

      /* -----------------------------
         LOAD STAFF
      ----------------------------- */

      const {
        data: staffData,
        error: staffError,
      } = await supabase
        .from("staff")
        .select(
          `
          id,
          first_name,
          last_name,
          employee_id,
          phone,
          designation,
          department,
          status
        `
        )
        .eq("institute_id", instituteId)
        .order("first_name", {
          ascending: true,
        });

      if (staffError) {
        throw staffError;
      }

      /* -----------------------------
         LOAD STUDENTS
      ----------------------------- */

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          `
          id,
          admission_number,
          first_name,
          middle_name,
          last_name,
          phone,
          status,
          family_id,
          batch_id
        `
        )
        .eq("institute_id", instituteId)
        .order("first_name", {
          ascending: true,
        });

      if (studentError) {
        throw studentError;
      }

      setLeaves(
        (leaveData || []) as LeaveRow[]
      );

      setStaff(
        (staffData || []) as Staff[]
      );

      setStudents(
        (studentData || []) as Student[]
      );
    } catch (err: any) {
      console.error(
        "Leave Manager load error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load leave data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  /* =====================================================
     MAP STAFF / STUDENTS
  ===================================================== */

  const staffMap = useMemo(() => {
    const map = new Map<string, Staff>();

    staff.forEach((member) => {
      map.set(member.id, member);
    });

    return map;
  }, [staff]);

  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();

    students.forEach((student) => {
      map.set(student.id, student);
    });

    return map;
  }, [students]);

  /* =====================================================
     FILTERED LEAVES
  ===================================================== */

  const filteredLeaves = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return leaves.filter((leave) => {
      const person =
        leave.applicant_type === "Staff"
          ? staffMap.get(
              leave.employee_id || ""
            )
          : studentMap.get(
              leave.student_id || ""
            );

      const personName =
        getPersonName(person).toLowerCase();

      const admissionNumber =
        leave.applicant_type === "Student"
          ? (
              studentMap.get(
                leave.student_id || ""
              )?.admission_number || ""
            ).toLowerCase()
          : "";

      const matchesSearch =
        !query ||
        personName.includes(query) ||
        admissionNumber.includes(query) ||
        leave.leave_type
          .toLowerCase()
          .includes(query) ||
        (leave.reason || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        leave.status === statusFilter;

      const matchesApplicant =
        applicantFilter === "All" ||
        leave.applicant_type ===
          applicantFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesApplicant
      );
    });
  }, [
    leaves,
    staffMap,
    studentMap,
    search,
    statusFilter,
    applicantFilter,
  ]);

  /* =====================================================
     STATS
  ===================================================== */

  const stats = useMemo(() => {
    const now = new Date();

    const thisMonth = leaves.filter(
      (leave) => {
        const date = new Date(
          leave.created_at
        );

        return (
          date.getMonth() ===
            now.getMonth() &&
          date.getFullYear() ===
            now.getFullYear()
        );
      }
    );

    return {
      total: leaves.length,

      active: leaves.filter(
        (leave) =>
          leave.status === "Approved"
      ).length,

      pending: leaves.filter(
        (leave) =>
          leave.status === "Pending"
      ).length,

      thisMonth: thisMonth.length,
    };
  }, [leaves]);

  /* =====================================================
     ADD MODAL
  ===================================================== */

  function openAddModal() {
    const today = getToday();

    setEditingId(null);

    setForm({
      ...emptyForm,
      fromDate: today,
      toDate: today,
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  /* =====================================================
     EDIT MODAL
  ===================================================== */

  function openEditModal(
    leave: LeaveRow
  ) {
    setEditingId(leave.id);

    setForm({
      applicantType:
        leave.applicant_type,

      employeeId:
        leave.employee_id || "",

      studentId:
        leave.student_id || "",

      leaveType:
        leave.leave_type,

      fromDate:
        leave.from_date,

      toDate:
        leave.to_date,

      reason:
        leave.reason || "",

      status:
        leave.status,
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  /* =====================================================
     SAVE LEAVE
  ===================================================== */

  async function saveLeave(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.fromDate) {
      setError(
        "Please select From Date."
      );
      return;
    }

    if (!form.toDate) {
      setError(
        "Please select To Date."
      );
      return;
    }

    if (form.toDate < form.fromDate) {
      setError(
        "To Date cannot be before From Date."
      );
      return;
    }

    if (
      form.applicantType === "Staff" &&
      !form.employeeId
    ) {
      setError(
        "Please select a staff member."
      );
      return;
    }

    if (
      form.applicantType === "Student" &&
      !form.studentId
    ) {
      setError(
        "Please select a student."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        instituteId,
        userId,
      } = await getInstituteContext();

      const payload = {
        institute_id: instituteId,

        employee_id:
          form.applicantType === "Staff"
            ? form.employeeId
            : null,

        student_id:
          form.applicantType === "Student"
            ? form.studentId
            : null,

        applicant_type:
          form.applicantType,

        leave_type:
          form.leaveType,

        from_date:
          form.fromDate,

        to_date:
          form.toDate,

        reason:
          form.reason.trim() || null,

        status:
          form.status,

        created_by:
          userId,
      };

      /* UPDATE */

      if (editingId) {
        const {
          error: updateError,
        } = await supabase
          .from("leaves")
          .update(payload)
          .eq("id", editingId)
          .eq(
            "institute_id",
            instituteId
          );

        if (updateError) {
          throw updateError;
        }

        setSuccess(
          "Leave updated successfully."
        );
      }

      /* INSERT */

      else {
        const {
          error: insertError,
        } = await supabase
          .from("leaves")
          .insert(payload);

        if (insertError) {
          throw insertError;
        }

        setSuccess(
          "Leave added successfully."
        );
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadData();
    } catch (err: any) {
      console.error(
        "Save leave error:",
        err
      );

      setError(
        err?.message ||
          "Unable to save leave."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     DELETE
  ===================================================== */

  async function deleteLeave(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this leave request?"
      );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const {
        instituteId,
      } = await getInstituteContext();

      const {
        error: deleteError,
      } = await supabase
        .from("leaves")
        .delete()
        .eq("id", id)
        .eq(
          "institute_id",
          instituteId
        );

      if (deleteError) {
        throw deleteError;
      }

      setSuccess(
        "Leave deleted successfully."
      );

      await loadData();
    } catch (err: any) {
      console.error(
        "Delete leave error:",
        err
      );

      setError(
        err?.message ||
          "Unable to delete leave."
      );
    }
  }

  /* =====================================================
     APPROVE / REJECT
  ===================================================== */

  async function updateStatus(
    id: string,
    status: LeaveStatus
  ) {
    setError("");
    setSuccess("");

    try {
      const {
        instituteId,
        userId,
      } = await getInstituteContext();

      const updateData: Record<
        string,
        any
      > = {
        status,
      };

      if (status === "Approved") {
        updateData.approved_by =
          userId;

        updateData.approved_at =
          new Date().toISOString();
      } else {
        updateData.approved_by =
          null;

        updateData.approved_at =
          null;
      }

      const {
        error: updateError,
      } = await supabase
        .from("leaves")
        .update(updateData)
        .eq("id", id)
        .eq(
          "institute_id",
          instituteId
        );

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        status === "Approved"
          ? "Leave approved successfully."
          : "Leave rejected successfully."
      );

      await loadData();
    } catch (err: any) {
      console.error(
        "Status update error:",
        err
      );

      setError(
        err?.message ||
          "Unable to update leave status."
      );
    }
  }

  /* =====================================================
     CLOSE MODAL
  ===================================================== */

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className={styles.page}>
      {/* HEADER */}

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.icon}>
            ▣
          </div>

          <div>
            <h1 className={styles.title}>
              Leave Manager
            </h1>

            <p className={styles.description}>
              Manage student and staff leave
              requests and approvals.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.addButton}
          onClick={openAddModal}
        >
          + Add Leave
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div
          style={{
            marginBottom: 15,
            padding: "11px 14px",
            borderRadius: 10,
            background: "#fff1f1",
            color: "#c8444b",
            border:
              "1px solid #f3cccc",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* SUCCESS */}

      {success && (
        <div
          style={{
            marginBottom: 15,
            padding: "11px 14px",
            borderRadius: 10,
            background: "#edf9f3",
            color: "#24865b",
            border:
              "1px solid #ccebdc",
            fontSize: 13,
          }}
        >
          {success}
        </div>
      )}

      {/* STATS */}

      <div className={styles.stats}>
        <div
          className={`${styles.statCard} ${styles.purple}`}
        >
          <div className={styles.statLabel}>
            Total
          </div>

          <div className={styles.statValue}>
            {stats.total}
          </div>

          <div className={styles.statLine} />
        </div>

        <div
          className={`${styles.statCard} ${styles.green}`}
        >
          <div className={styles.statLabel}>
            Active
          </div>

          <div className={styles.statValue}>
            {stats.active}
          </div>

          <div className={styles.statLine} />
        </div>

        <div
          className={`${styles.statCard} ${styles.orange}`}
        >
          <div className={styles.statLabel}>
            Pending
          </div>

          <div className={styles.statValue}>
            {stats.pending}
          </div>

          <div className={styles.statLine} />
        </div>

        <div
          className={`${styles.statCard} ${styles.blue}`}
        >
          <div className={styles.statLabel}>
            This month
          </div>

          <div className={styles.statValue}>
            {stats.thisMonth}
          </div>

          <div className={styles.statLine} />
        </div>
      </div>

      {/* TOOLBAR */}

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <input
            className={styles.searchInput}
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search name, admission no, leave type..."
          />
        </div>

        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.filterButton} ${
              applicantFilter === "All"
                ? styles.filterActive
                : ""
            }`}
            onClick={() =>
              setApplicantFilter("All")
            }
          >
            All
          </button>

          <button
            type="button"
            className={`${styles.filterButton} ${
              applicantFilter === "Staff"
                ? styles.filterActive
                : ""
            }`}
            onClick={() =>
              setApplicantFilter("Staff")
            }
          >
            Staff
          </button>

          <button
            type="button"
            className={`${styles.filterButton} ${
              applicantFilter ===
              "Student"
                ? styles.filterActive
                : ""
            }`}
            onClick={() =>
              setApplicantFilter(
                "Student"
              )
            }
          >
            Students
          </button>

          <button
            type="button"
            className={`${styles.filterButton} ${
              statusFilter === "Pending"
                ? styles.filterActive
                : ""
            }`}
            onClick={() =>
              setStatusFilter(
                statusFilter === "Pending"
                  ? "All"
                  : "Pending"
              )
            }
          >
            Pending
          </button>
        </div>
      </div>

      {/* TABLE */}

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              ◌
            </div>

            <p className={styles.emptyTitle}>
              Loading leaves...
            </p>

            <p className={styles.emptyText}>
              Please wait.
            </p>
          </div>
        ) : filteredLeaves.length ===
          0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              ▣
            </div>

            <p className={styles.emptyTitle}>
              No leave requests found
            </p>

            <p className={styles.emptyText}>
              Click &quot;+ Add Leave&quot; to
              create your first request.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table
              className={styles.table}
            >
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Type</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredLeaves.map(
                  (leave) => {
                    const person =
                      leave.applicant_type ===
                      "Staff"
                        ? staffMap.get(
                            leave.employee_id ||
                              ""
                          )
                        : studentMap.get(
                            leave.student_id ||
                              ""
                          );

                    const student =
                      leave.applicant_type ===
                      "Student"
                        ? studentMap.get(
                            leave.student_id ||
                              ""
                          )
                        : null;

                    return (
                      <tr
                        key={leave.id}
                      >
                        <td>
                          <div
                            className={
                              styles.leaveTitle
                            }
                          >
                            {getPersonName(
                              person
                            )}
                          </div>

                          <div
                            className={
                              styles.leaveSubtitle
                            }
                          >
                            {leave.applicant_type ===
                            "Student"
                              ? student
                                  ?.admission_number ||
                                "Student"
                              : person &&
                                "employee_id" in
                                  person
                              ? person.employee_id ||
                                "Staff"
                              : "Staff"}
                          </div>
                        </td>

                        <td>
                          {
                            leave.applicant_type
                          }
                        </td>

                        <td>
                          {leave.leave_type}
                        </td>

                        <td>
                          <div>
                            {formatDate(
                              leave.from_date
                            )}
                          </div>

                          <div
                            className={
                              styles.leaveSubtitle
                            }
                          >
                            to{" "}
                            {formatDate(
                              leave.to_date
                            )}
                          </div>
                        </td>

                        <td>
                          {calculateDays(
                            leave.from_date,
                            leave.to_date
                          )}
                        </td>

                        <td>
                          <span
                            className={`${styles.status} ${getStatusClass(
                              leave.status
                            )}`}
                          >
                            <i
                              className={
                                styles.statusDot
                              }
                            />

                            {leave.status}
                          </span>
                        </td>

                        <td>
                          <div
                            className={
                              styles.actions
                            }
                          >
                            {leave.status ===
                              "Pending" && (
                              <>
                                <button
                                  type="button"
                                  className={
                                    styles.actionButton
                                  }
                                  title="Approve"
                                  onClick={() =>
                                    updateStatus(
                                      leave.id,
                                      "Approved"
                                    )
                                  }
                                >
                                  ✓
                                </button>

                                <button
                                  type="button"
                                  className={
                                    styles.actionButton
                                  }
                                  title="Reject"
                                  onClick={() =>
                                    updateStatus(
                                      leave.id,
                                      "Rejected"
                                    )
                                  }
                                >
                                  ×
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              className={
                                styles.actionButton
                              }
                              title="Edit"
                              onClick={() =>
                                openEditModal(
                                  leave
                                )
                              }
                            >
                              ✎
                            </button>

                            <button
                              type="button"
                              className={`${styles.actionButton} ${styles.deleteButton}`}
                              title="Delete"
                              onClick={() =>
                                deleteLeave(
                                  leave.id
                                )
                              }
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================
          MODAL
      ================================================= */}

      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background:
              "rgba(20,24,35,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 620,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 18,
              padding: 24,
              boxShadow:
                "0 25px 70px rgba(0,0,0,.18)",
            }}
          >
            {/* MODAL HEADER */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                marginBottom: 22,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    color: "#202735",
                  }}
                >
                  {editingId
                    ? "Edit Leave"
                    : "Add Leave"}
                </h2>

                <p
                  style={{
                    margin:
                      "5px 0 0",
                    fontSize: 13,
                    color: "#858c9b",
                  }}
                >
                  Create and manage a leave
                  request.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                style={{
                  border: 0,
                  background:
                    "#f3f4f7",
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={saveLeave}
            >
              {/* APPLICANT */}

              <div
                style={{
                  marginBottom: 16,
                }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontSize: 13,
                    fontWeight: 650,
                    color: "#3b4250",
                  }}
                >
                  Applicant
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setForm(
                        (prev) => ({
                          ...prev,
                          applicantType:
                            "Staff",
                          employeeId:
                            "",
                          studentId:
                            "",
                        })
                      )
                    }
                    style={{
                      height: 42,
                      borderRadius: 9,
                      border:
                        form.applicantType ===
                        "Staff"
                          ? "1px solid #7654e8"
                          : "1px solid #e1e4ea",
                      background:
                        form.applicantType ===
                        "Staff"
                          ? "#f3efff"
                          : "#fff",
                      color:
                        form.applicantType ===
                        "Staff"
                          ? "#7654e8"
                          : "#687080",
                      fontWeight: 650,
                      cursor:
                        "pointer",
                    }}
                  >
                    Staff
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setForm(
                        (prev) => ({
                          ...prev,
                          applicantType:
                            "Student",
                          employeeId:
                            "",
                          studentId:
                            "",
                        })
                      )
                    }
                    style={{
                      height: 42,
                      borderRadius: 9,
                      border:
                        form.applicantType ===
                        "Student"
                          ? "1px solid #7654e8"
                          : "1px solid #e1e4ea",
                      background:
                        form.applicantType ===
                        "Student"
                          ? "#f3efff"
                          : "#fff",
                      color:
                        form.applicantType ===
                        "Student"
                          ? "#7654e8"
                          : "#687080",
                      fontWeight: 650,
                      cursor:
                        "pointer",
                    }}
                  >
                    Student
                  </button>
                </div>
              </div>

              {/* PERSON */}

              <div
                style={{
                  marginBottom: 16,
                }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontSize: 13,
                    fontWeight: 650,
                    color: "#3b4250",
                  }}
                >
                  {form.applicantType ===
                  "Staff"
                    ? "Staff Member"
                    : "Student"}
                </label>

                <select
                  required
                  value={
                    form.applicantType ===
                    "Staff"
                      ? form.employeeId
                      : form.studentId
                  }
                  onChange={(event) => {
                    if (
                      form.applicantType ===
                      "Staff"
                    ) {
                      setForm(
                        (prev) => ({
                          ...prev,
                          employeeId:
                            event.target
                              .value,
                        })
                      );
                    } else {
                      setForm(
                        (prev) => ({
                          ...prev,
                          studentId:
                            event.target
                              .value,
                        })
                      );
                    }
                  }}
                  style={{
                    width: "100%",
                    height: 44,
                    border:
                      "1px solid #e1e4ea",
                    borderRadius: 9,
                    padding:
                      "0 12px",
                    fontSize: 13,
                    outline: "none",
                    background:
                      "#fff",
                    color:
                      "#303746",
                  }}
                >
                  <option value="">
                    Select{" "}
                    {form.applicantType ===
                    "Staff"
                      ? "staff member"
                      : "student"}
                  </option>

                  {form.applicantType ===
                    "Staff" &&
                    staff.map(
                      (member) => (
                        <option
                          key={
                            member.id
                          }
                          value={
                            member.id
                          }
                        >
                          {getPersonName(
                            member
                          )}
                          {member.employee_id
                            ? ` — ${member.employee_id}`
                            : ""}
                        </option>
                      )
                    )}

                  {form.applicantType ===
                    "Student" &&
                    students.map(
                      (student) => (
                        <option
                          key={
                            student.id
                          }
                          value={
                            student.id
                          }
                        >
                          {getPersonName(
                            student
                          )}
                          {student.admission_number
                            ? ` — ${student.admission_number}`
                            : ""}
                        </option>
                      )
                    )}
                </select>
              </div>

              {/* LEAVE TYPE + STATUS */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 7,
                      fontSize: 13,
                      fontWeight: 650,
                      color: "#3b4250",
                    }}
                  >
                    Leave Type
                  </label>

                  <select
                    value={
                      form.leaveType
                    }
                    onChange={(event) =>
                      setForm(
                        (prev) => ({
                          ...prev,
                          leaveType:
                            event.target
                              .value as LeaveType,
                        })
                      )
                    }
                    style={{
                      width: "100%",
                      height: 44,
                      border:
                        "1px solid #e1e4ea",
                      borderRadius: 9,
                      padding:
                        "0 12px",
                      fontSize: 13,
                      background:
                        "#fff",
                    }}
                  >
                    <option value="Casual">
                      Casual
                    </option>

                    <option value="Sick">
                      Sick
                    </option>

                    <option value="Emergency">
                      Emergency
                    </option>

                    <option value="Earned">
                      Earned
                    </option>

                    <option value="Unpaid">
                      Unpaid
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 7,
                      fontSize: 13,
                      fontWeight: 650,
                      color: "#3b4250",
                    }}
                  >
                    Status
                  </label>

                  <select
                    value={
                      form.status
                    }
                    onChange={(event) =>
                      setForm(
                        (prev) => ({
                          ...prev,
                          status:
                            event.target
                              .value as LeaveStatus,
                        })
                      )
                    }
                    style={{
                      width: "100%",
                      height: 44,
                      border:
                        "1px solid #e1e4ea",
                      borderRadius: 9,
                      padding:
                        "0 12px",
                      fontSize: 13,
                      background:
                        "#fff",
                    }}
                  >
                    <option value="Pending">
                      Pending
                    </option>

                    <option value="Approved">
                      Approved
                    </option>

                    <option value="Rejected">
                      Rejected
                    </option>

                    <option value="Cancelled">
                      Cancelled
                    </option>
                  </select>
                </div>
              </div>

              {/* DATES */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 7,
                      fontSize: 13,
                      fontWeight: 650,
                      color: "#3b4250",
                    }}
                  >
                    From Date
                  </label>

                  <input
                    type="date"
                    required
                    value={
                      form.fromDate
                    }
                    onChange={(event) =>
                      setForm(
                        (prev) => ({
                          ...prev,
                          fromDate:
                            event.target
                              .value,
                        })
                      )
                    }
                    style={{
                      width: "100%",
                      height: 44,
                      border:
                        "1px solid #e1e4ea",
                      borderRadius: 9,
                      padding:
                        "0 12px",
                      fontSize: 13,
                      boxSizing:
                        "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 7,
                      fontSize: 13,
                      fontWeight: 650,
                      color: "#3b4250",
                    }}
                  >
                    To Date
                  </label>

                  <input
                    type="date"
                    required
                    min={
                      form.fromDate
                    }
                    value={
                      form.toDate
                    }
                    onChange={(event) =>
                      setForm(
                        (prev) => ({
                          ...prev,
                          toDate:
                            event.target
                              .value,
                        })
                      )
                    }
                    style={{
                      width: "100%",
                      height: 44,
                      border:
                        "1px solid #e1e4ea",
                      borderRadius: 9,
                      padding:
                        "0 12px",
                      fontSize: 13,
                      boxSizing:
                        "border-box",
                    }}
                  />
                </div>
              </div>

              {/* DAYS */}

              {form.fromDate &&
                form.toDate && (
                  <div
                    style={{
                      marginBottom: 16,
                      padding:
                        "10px 12px",
                      background:
                        "#f7f5ff",
                      border:
                        "1px solid #e7e0ff",
                      borderRadius: 9,
                      color:
                        "#7654e8",
                      fontSize: 13,
                      fontWeight: 650,
                    }}
                  >
                    Total leave days:{" "}
                    {calculateDays(
                      form.fromDate,
                      form.toDate
                    )}
                  </div>
                )}

              {/* REASON */}

              <div
                style={{
                  marginBottom: 20,
                }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontSize: 13,
                    fontWeight: 650,
                    color: "#3b4250",
                  }}
                >
                  Reason
                </label>

                <textarea
                  rows={4}
                  value={
                    form.reason
                  }
                  onChange={(event) =>
                    setForm(
                      (prev) => ({
                        ...prev,
                        reason:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Enter reason for leave..."
                  style={{
                    width: "100%",
                    resize: "vertical",
                    border:
                      "1px solid #e1e4ea",
                    borderRadius: 9,
                    padding: 12,
                    fontSize: 13,
                    outline: "none",
                    boxSizing:
                      "border-box",
                    fontFamily:
                      "inherit",
                  }}
                />
              </div>

              {/* BUTTONS */}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  style={{
                    height: 42,
                    padding:
                      "0 17px",
                    border:
                      "1px solid #e1e4ea",
                    borderRadius: 9,
                    background:
                      "#fff",
                    color:
                      "#687080",
                    fontWeight: 650,
                    cursor:
                      "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    height: 42,
                    padding:
                      "0 19px",
                    border: 0,
                    borderRadius: 9,
                    background:
                      "#7654e8",
                    color:
                      "#fff",
                    fontWeight: 650,
                    cursor: saving
                      ? "not-allowed"
                      : "pointer",
                    opacity: saving
                      ? 0.7
                      : 1,
                  }}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Leave"
                    : "Save Leave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}