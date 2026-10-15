"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./students.module.css";
import { createClient } from "@/lib/supabase/client";

type Family = {
  father_name: string | null;
  mother_name: string | null;
  guardian_name: string | null;
};

type Batch = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  admission_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: "active" | "inactive" | "left" | "completed";
  family_id: string | null;
  batch_id: string | null;
  families: Family | Family[] | null;
  batches: Batch | Batch[] | null;
};

export default function StudentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pendingFees, setPendingFees] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [selectedBatch, setSelectedBatch] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
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

      if (profileError) {
        console.error("Profile loading error:", profileError);
        setError("Unable to load your institute profile.");
        return;
      }

      if (!profile?.institute_id) {
        setError("No institute is linked to your account.");
        return;
      }

      const instituteId = profile.institute_id;

      const { data: studentData, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          admission_number,
          first_name,
          middle_name,
          last_name,
          phone,
          status,
          family_id,
          batch_id,
          families (
            father_name,
            mother_name,
            guardian_name
          ),
          batches (
            id,
            name
          )
        `)
        .eq("institute_id", instituteId)
        .order("created_at", { ascending: false });

      if (studentsError) {
        console.error("Student loading error:", studentsError);
        setError(studentsError.message);
        return;
      }

      setStudents((studentData || []) as Student[]);

      const { data: batchData, error: batchError } = await supabase
        .from("batches")
        .select("id, name")
        .eq("institute_id", instituteId)
        .eq("status", "active")
        .order("name", { ascending: true });

      if (batchError) {
        console.error("Batch loading error:", batchError);
        setBatches([]);
      } else {
        setBatches(batchData || []);
      }

      const { data: feeData, error: feeError } = await supabase
        .from("tuition_fees")
        .select("amount, discount, status")
        .eq("institute_id", instituteId)
        .in("status", ["pending", "partial", "overdue"]);

      if (feeError) {
        console.error("Fee loading error:", feeError);
        setPendingFees(0);
      } else {
        const totalPending = (feeData || []).reduce((total, fee) => {
          const amount = Number(fee.amount || 0);
          const discount = Number(fee.discount || 0);
          return total + Math.max(amount - discount, 0);
        }, 0);

        setPendingFees(totalPending);
      }
    } catch (err) {
      console.error("Students page error:", err);
      setError("Something went wrong while loading students.");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return students.filter((student) => {
      if (
        selectedFilter === "active" &&
        student.status !== "active"
      ) {
        return false;
      }

      if (
        selectedFilter === "inactive" &&
        student.status === "active"
      ) {
        return false;
      }

      if (
        selectedBatch !== "all" &&
        student.batch_id !== selectedBatch
      ) {
        return false;
      }

      if (searchValue) {
        const fullName = [
          student.first_name,
          student.middle_name,
          student.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const admissionNumber =
          student.admission_number?.toLowerCase() || "";

        const phone = student.phone?.toLowerCase() || "";

        if (
          !fullName.includes(searchValue) &&
          !admissionNumber.includes(searchValue) &&
          !phone.includes(searchValue)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [students, selectedFilter, selectedBatch, search]);

  const totalStudents = students.length;

  const activeStudents = students.filter(
    (student) => student.status === "active"
  ).length;

  const inactiveStudents = students.filter(
    (student) => student.status !== "active"
  ).length;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getGuardian = (student: Student) => {
    const family = Array.isArray(student.families)
      ? student.families[0]
      : student.families;

    return (
      family?.guardian_name ||
      family?.father_name ||
      family?.mother_name ||
      "—"
    );
  };

  const getBatchName = (student: Student) => {
    const batch = Array.isArray(student.batches)
      ? student.batches[0]
      : student.batches;

    return batch?.name || "—";
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <strong>Students</strong>
          </div>

          <div className={styles.eyebrow}>
            <span />
            ACADEMIC MANAGEMENT
          </div>

          <h1>
            Manage <span>Students</span>
          </h1>

          <p className={styles.subtitle}>
            Manage student profiles, academic records, batches and fee
            information from one organized workspace.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={() => {
              const rows = filteredStudents.map((student) => ({
                admission_number: student.admission_number,
                name: [
                  student.first_name,
                  student.middle_name,
                  student.last_name,
                ]
                  .filter(Boolean)
                  .join(" "),
                phone: student.phone || "",
                batch: getBatchName(student),
                guardian: getGuardian(student),
                status: student.status,
              }));

              const csv = [
                Object.keys(rows[0] || {
                  admission_number: "",
                  name: "",
                  phone: "",
                  batch: "",
                  guardian: "",
                  status: "",
                }).join(","),
                ...rows.map((row) =>
                  Object.values(row)
                    .map((value) =>
                      `"${String(value).replace(/"/g, '""')}"`
                    )
                    .join(",")
                ),
              ].join("\n");

              const blob = new Blob([csv], {
                type: "text/csv;charset=utf-8;",
              });

              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "students.csv";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            ↓ Export
          </button>

          <Link
            href="/admin/students/add"
            className={styles.addBtn}
          >
            + Add Student
          </Link>
        </div>
      </header>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "12px",
            background: "#fff1f1",
            color: "#b42318",
            border: "1px solid #f5c2c0",
          }}
        >
          {error}
        </div>
      )}

      <section className={styles.stats}>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.statIcon}>♙</div>
          <div className={styles.statContent}>
            <span>Total Students</span>
            <strong>{loading ? "—" : totalStudents}</strong>
            <small>All registered students</small>
          </div>
          <div className={styles.cardArrow}>↗</div>
        </div>

        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.statIcon}>✓</div>
          <div className={styles.statContent}>
            <span>Active Students</span>
            <strong>{loading ? "—" : activeStudents}</strong>
            <small>Currently active</small>
          </div>
          <div className={styles.cardArrow}>↗</div>
        </div>

        <div className={`${styles.statCard} ${styles.orange}`}>
          <div className={styles.statIcon}>!</div>
          <div className={styles.statContent}>
            <span>Inactive Students</span>
            <strong>{loading ? "—" : inactiveStudents}</strong>
            <small>Inactive profiles</small>
          </div>
          <div className={styles.cardArrow}>↗</div>
        </div>

        <div className={`${styles.statCard} ${styles.purple}`}>
          <div className={styles.statIcon}>₹</div>
          <div className={styles.statContent}>
            <span>Pending Fees</span>
            <strong>
              {loading ? "—" : formatMoney(pendingFees)}
            </strong>
            <small>
              {pendingFees > 0
                ? "Pending fee amount"
                : "No pending data"}
            </small>
          </div>
          <div className={styles.cardArrow}>↗</div>
        </div>
      </section>

      <section className={styles.directory}>
        <div className={styles.directoryHeader}>
          <div>
            <p className={styles.directoryEyebrow}>
              STUDENT DIRECTORY
            </p>
            <h2>All Students</h2>
            <p>
              View and manage every student registered with your
              institution.
            </p>
          </div>

          <div className={styles.directoryBadge}>
            {loading ? "—" : `${filteredStudents.length} Students`}
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <button
              type="button"
              onClick={() => setSelectedFilter("all")}
              className={`${styles.filterBtn} ${
                selectedFilter === "all" ? styles.selected : ""
              }`}
            >
              All <span>{totalStudents}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter("active")}
              className={`${styles.filterBtn} ${
                selectedFilter === "active" ? styles.selected : ""
              }`}
            >
              Active <span>{activeStudents}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter("inactive")}
              className={`${styles.filterBtn} ${
                selectedFilter === "inactive" ? styles.selected : ""
              }`}
            >
              Inactive <span>{inactiveStudents}</span>
            </button>
          </div>

          <div className={styles.tools}>
            <select
              className={styles.select}
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="all">All Batches</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>

            <div className={styles.search}>
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
              />
            </div>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>STUDENT</th>
                <th>GUARDIAN</th>
                <th>MOBILE</th>
                <th>BATCH</th>
                <th>PENDING</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>⏳</div>
                      <h3>Loading students...</h3>
                      <p>Fetching student data from the database.</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>!</div>
                      <h3>Unable to load students</h3>
                      <p>{error}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={8}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>♙</div>

                      <h3>
                        {students.length === 0
                          ? "No students yet"
                          : "No matching students"}
                      </h3>

                      <p>
                        {students.length === 0
                          ? "Student data will appear here after adding your first student."
                          : "Try changing the search or filter options."}
                      </p>

                      {students.length === 0 && (
                        <Link
                          href="/admin/students/add"
                          className={styles.emptyButton}
                        >
                          + Add First Student
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const fullName = [
                    student.first_name,
                    student.middle_name,
                    student.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={student.id}>
                      <td>{student.admission_number}</td>

                      <td>
                        <strong>{fullName}</strong>
                      </td>

                      <td>{getGuardian(student)}</td>

                      <td>{student.phone || "—"}</td>

                      <td>{getBatchName(student)}</td>

                      <td>₹0</td>

                      <td>{student.status}</td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/admin/students/${student.id}`
                            )
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.bottomInfo}>
        <span>Student Management</span>
        <span>•</span>
        <span>
          {loading ? "Loading database..." : "Connected to Supabase"}
        </span>
      </div>
    </div>
  );
}
