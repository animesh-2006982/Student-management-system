"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./reports.module.css";

type Student = {
  id: string;
  admission_number?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  status?: string | null;
  batch_id?: string | null;
  created_at?: string | null;
};

type Batch = {
  id: string;
  name?: string | null;
  status?: string | null;
};

type Attendance = {
  id: string;
  student_id: string;
  batch_id?: string | null;
  attendance_date?: string | null;
  status?: string | null;
  remarks?: string | null;
  created_at?: string | null;
};

type Fee = {
  id: string;
  amount?: number | string | null;
  discount?: number | string | null;
  paid?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

type Staff = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  employee_id?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type Transaction = {
  id?: string | number;
  title?: string;
  category?: string;
  amount?: number | string;
  date?: string;
  type?: string;
  note?: string;
};

type ReportData = {
  students: Student[];
  batches: Batch[];
  attendance: Attendance[];
  fees: Fee[];
  staff: Staff[];
  transactions: Transaction[];
};

type ReportType =
  | "students"
  | "attendance"
  | "fees"
  | "finance"
  | "staff"
  | null;

const supabase = createClient();

/* =====================================================
   HELPERS
===================================================== */

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function dateFormat(value?: string | null) {
  if (!value) return "—";

  const d = new Date(
    value.includes("T")
      ? value
      : `${value}T00:00:00`
  );

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function attendanceDateKey(value?: string | null) {
  if (!value) return "";
  const raw = String(value);
  return raw.includes("T") ? raw.slice(0, 10) : raw.slice(0, 10);
}

function attendanceMark(value?: string | null) {
  const status = normalize(value);
  if (status === "present" || status === "p") return "P";
  if (status === "absent" || status === "a") return "A";
  if (status === "leave" || status === "l" || status === "lv") return "L";
  return "—";
}

function studentName(student: Student) {
  return (
    [
      student.first_name,
      student.middle_name,
      student.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unknown Student"
  );
}

function staffName(staff: Staff) {
  return (
    [staff.first_name, staff.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unknown Staff"
  );
}

function isCurrentMonth(value?: string | null) {
  if (!value) return false;

  const date = new Date(
    value.includes("T")
      ? value
      : `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

/* =====================================================
   PAGE
===================================================== */

export default function ReportsPage() {
  const [data, setData] = useState<ReportData>({
    students: [],
    batches: [],
    attendance: [],
    fees: [],
    staff: [],
    transactions: [],
  });

  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedReport, setSelectedReport] =
    useState<ReportType>(null);

  const [search, setSearch] = useState("");

  const [batchFilter, setBatchFilter] =
    useState("all");

  const [attendanceFilter, setAttendanceFilter] =
    useState("all");

  const [feeFilter, setFeeFilter] =
    useState("all");

  /* =====================================================
     GET INSTITUTE
  ===================================================== */

  const getInstituteId = useCallback(async () => {
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
        "No institute is linked to your account."
      );
    }

    return profile.institute_id as string;
  }, []);

  /* =====================================================
     LOAD DATA
  ===================================================== */

  const loadReports = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const instituteId =
          await getInstituteId();

        const [
          studentsResult,
          batchesResult,
          attendanceResult,
          feesResult,
          staffResult,
        ] = await Promise.all([
          supabase
            .from("students")
            .select("*")
            .eq(
              "institute_id",
              instituteId
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("batches")
            .select("*")
            .eq(
              "institute_id",
              instituteId
            )
            .order("name", {
              ascending: true,
            }),

          supabase
            .from("attendance")
            .select("*")
            .eq(
              "institute_id",
              instituteId
            )
            .order("attendance_date", {
              ascending: false,
            }),

          supabase
            .from("tuition_fees")
            .select("*")
            .eq(
              "institute_id",
              instituteId
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("staff")
            .select("*")
            .eq(
              "institute_id",
              instituteId
            )
            .order("first_name", {
              ascending: true,
            }),
        ]);

        if (studentsResult.error) {
          throw studentsResult.error;
        }

        if (batchesResult.error) {
          throw batchesResult.error;
        }

        if (attendanceResult.error) {
          throw attendanceResult.error;
        }

        if (feesResult.error) {
          throw feesResult.error;
        }

        if (staffResult.error) {
          throw staffResult.error;
        }

        /* Finance data */

        let transactions: Transaction[] = [];

        try {
          const keys = [
            "studentflow:income-expense",
            "income-expense",
          ];

          for (const key of keys) {
            const raw =
              localStorage.getItem(key);

            if (!raw) continue;

            const parsed = JSON.parse(raw);

            if (Array.isArray(parsed)) {
              transactions =
                parsed as Transaction[];
              break;
            }
          }
        } catch {
          transactions = [];
        }

        setData({
          students:
            (studentsResult.data ||
              []) as Student[],

          batches:
            (batchesResult.data ||
              []) as Batch[],

          attendance:
            (attendanceResult.data ||
              []) as Attendance[],

          fees:
            (feesResult.data ||
              []) as Fee[],

          staff:
            (staffResult.data ||
              []) as Staff[],

          transactions,
        });
      } catch (err: any) {
        console.error(
          "Reports error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load reports."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getInstituteId]
  );

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  /* =====================================================
     MAPS
  ===================================================== */

  const batchMap = useMemo(() => {
    const map = new Map<string, string>();

    data.batches.forEach((batch) => {
      map.set(
        batch.id,
        batch.name ||
          "Unnamed Batch"
      );
    });

    return map;
  }, [data.batches]);

  const studentMap = useMemo(() => {
    const map = new Map<
      string,
      Student
    >();

    data.students.forEach((student) => {
      map.set(student.id, student);
    });

    return map;
  }, [data.students]);

  /* =====================================================
     STUDENTS
  ===================================================== */

  const totalStudents =
    data.students.length;

  const activeStudents =
    data.students.filter(
      (student) =>
        normalize(student.status) ===
        "active"
    ).length;

  const inactiveStudents =
    Math.max(
      totalStudents -
        activeStudents,
      0
    );

  /* =====================================================
     ATTENDANCE
  ===================================================== */

  const presentCount =
    data.attendance.filter((row) => {
      const status = normalize(row.status);

      return (
        status === "present" ||
        status === "p"
      );
    }).length;

  const absentCount =
    data.attendance.filter((row) => {
      const status = normalize(row.status);

      return (
        status === "absent" ||
        status === "a"
      );
    }).length;

  const leaveCount =
    data.attendance.filter((row) => {
      const status = normalize(row.status);

      return (
        status === "leave" ||
        status === "l" ||
        status === "lv"
      );
    }).length;

  const attendanceTotal =
    data.attendance.length;

  const attendancePercentage =
    attendanceTotal > 0
      ? Math.round(
          (presentCount /
            attendanceTotal) *
            100
        )
      : 0;

  /* =====================================================
     FEES
  ===================================================== */

  const totalFeeAmount =
    data.fees.reduce(
      (sum, fee) =>
        sum +
        Number(
          fee.amount || 0
        ),
      0
    );

  const totalDiscount =
    data.fees.reduce(
      (sum, fee) =>
        sum +
        Number(
          fee.discount || 0
        ),
      0
    );

  const paidFeeAmount =
    data.fees
      .filter((fee) => {
        const status =
          normalize(fee.status);

        return (
          status === "paid" ||
          status === "completed"
        );
      })
      .reduce(
        (sum, fee) =>
          sum +
          Math.max(
            Number(
              fee.amount || 0
            ) -
              Number(
                fee.discount || 0
              ),
            0
          ),
        0
      );

  const pendingFees =
    data.fees
      .filter((fee) => {
        const status =
          normalize(fee.status);

        return [
          "pending",
          "partial",
          "overdue",
        ].includes(status);
      })
      .reduce(
        (sum, fee) => {
          const amount =
            Number(
              fee.amount || 0
            );

          const discount =
            Number(
              fee.discount || 0
            );

          const paid =
            Number(
              fee.paid || 0
            );

          return (
            sum +
            Math.max(
              amount -
                discount -
                paid,
              0
            )
          );
        },
        0
      );

  /* =====================================================
     FINANCE
  ===================================================== */

  const income =
    data.transactions
      .filter(
        (item) =>
          normalize(
            item.type
          ) === "income"
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount || 0
          ),
        0
      );

  const expense =
    data.transactions
      .filter(
        (item) =>
          normalize(
            item.type
          ) === "expense"
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount || 0
          ),
        0
      );

  const balance =
    income - expense;

  /* =====================================================
     STAFF
  ===================================================== */

  const totalStaff =
    data.staff.length;

  const activeStaff =
    data.staff.filter(
      (staff) =>
        normalize(staff.status) ===
        "active"
    ).length;

  const inactiveStaff =
    Math.max(
      totalStaff -
        activeStaff,
      0
    );

  /* =====================================================
     FILTERED STUDENTS
  ===================================================== */

  const filteredStudents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return data.students.filter(
        (student) => {
          if (
            batchFilter !==
              "all" &&
            student.batch_id !==
              batchFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            studentName(student)
              .toLowerCase()
              .includes(query) ||
            String(
              student.admission_number ||
                ""
            )
              .toLowerCase()
              .includes(query) ||
            String(
              student.phone || ""
            )
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      data.students,
      search,
      batchFilter,
    ]);

  /* =====================================================
     FILTERED ATTENDANCE
  ===================================================== */

  const filteredAttendance =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return data.attendance.filter(
        (row) => {
          const status =
            normalize(row.status);

          if (
            attendanceFilter !==
              "all" &&
            status !==
              attendanceFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const student =
            studentMap.get(
              row.student_id
            );

          return (
            student
              ? studentName(
                  student
                )
                  .toLowerCase()
                  .includes(query)
              : false
          );
        }
      );
    }, [
      data.attendance,
      studentMap,
      search,
      attendanceFilter,
    ]);

  /* =====================================================
     FILTERED FEES
  ===================================================== */

  const filteredFees =
    useMemo(() => {
      return data.fees.filter(
        (fee) => {
          if (
            feeFilter ===
            "all"
          ) {
            return true;
          }

          return (
            normalize(
              fee.status
            ) === feeFilter
          );
        }
      );
    }, [
      data.fees,
      feeFilter,
    ]);

  /* =====================================================
     ATTENDANCE REGISTRY
  ===================================================== */

  const attendanceDates = useMemo(() => {
    const dates = new Set<string>();

    data.attendance.forEach((row) => {
      const key = attendanceDateKey(
        row.attendance_date || row.created_at
      );
      if (key) dates.add(key);
    });

    return Array.from(dates).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [data.attendance]);

  const attendanceRegistry = useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = data.students
      .filter((student) => {
        if (batchFilter !== "all" && student.batch_id !== batchFilter) {
          return false;
        }

        if (!query) return true;

        return (
          studentName(student).toLowerCase().includes(query) ||
          String(student.admission_number || "").toLowerCase().includes(query) ||
          String(student.phone || "").toLowerCase().includes(query)
        );
      })
      .filter((student) => {
        if (attendanceFilter === "all") return true;

        return data.attendance.some((row) => {
          if (row.student_id !== student.id) return false;
          const mark = attendanceMark(row.status).toLowerCase();
          const filter = attendanceFilter.toLowerCase();

          if (filter === "p") return mark === "p";
          if (filter === "a") return mark === "a";
          if (filter === "l") return mark === "l";

          return false;
        });
      });

    return rows;
  }, [
    data.students,
    data.attendance,
    search,
    batchFilter,
    attendanceFilter,
  ]);

  const attendanceRegistryMap = useMemo(() => {
    const map = new Map<string, Map<string, string>>();

    data.attendance.forEach((row) => {
      const date = attendanceDateKey(
        row.attendance_date || row.created_at
      );
      if (!date) return;

      if (!map.has(row.student_id)) {
        map.set(row.student_id, new Map());
      }

      map.get(row.student_id)!.set(
        date,
        attendanceMark(row.status)
      );
    });

    return map;
  }, [data.attendance]);

  /* =====================================================
     REPORT CARD DATA
  ===================================================== */

  const reportCards = [
    {
      key: "students" as const,
      icon: "♙",
      label: "Student Reports",
      title:
        "Student data, strength & demographics",
      value: totalStudents,
      sub: `${activeStudents} active students`,
      tone: "purple",
    },

    {
      key: "attendance" as const,
      icon: "✓",
      label: "Attendance Reports",
      title:
        "Daily and overall attendance analysis",
      value: `${attendancePercentage}%`,
      sub: `${presentCount} present records`,
      tone: "green",
    },

    {
      key: "fees" as const,
      icon: "₹",
      label: "Fees Reports",
      title:
        "Collection and pending fee analysis",
      value: money(paidFeeAmount),
      sub: `${data.fees.length} fee records`,
      tone: "orange",
    },

    {
      key: "finance" as const,
      icon: "↔",
      label: "Finance Reports",
      title:
        "Income, expense and balance analysis",
      value: money(balance),
      sub: "Net balance",
      tone: "blue",
    },

    {
      key: "staff" as const,
      icon: "♟",
      label: "Staff Reports",
      title:
        "Staff strength and status",
      value: totalStaff,
      sub: `${activeStaff} active staff`,
      tone: "pink",
    },
  ];

  /* =====================================================
     CLOSE MODAL
  ===================================================== */

  function closeReport() {
    setSelectedReport(null);
    setSearch("");
    setBatchFilter("all");
    setAttendanceFilter("all");
    setFeeFilter("all");
  }

  /* =====================================================
     PRINT
  ===================================================== */

  function printReport(title: string) {
    const oldTitle =
      document.title;

    document.title =
      `StudentFlow - ${title}`;

    window.print();

    setTimeout(() => {
      document.title =
        oldTitle;
    }, 1000);
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <main className={styles.page}>
      {/* ================================================
          MAIN HEADER
      ================================================= */}

      <header className={styles.header}>
        <div>
          <span
            className={styles.eyebrow}
          >
            REPORTS
          </span>

          <h1>Reports</h1>

          <p>
            All your core institute
            reports in one place.
          </p>
        </div>

        <div
          className={
            styles.headerActions
          }
        >
          <button
            type="button"
            className={
              styles.refreshButton
            }
            onClick={() =>
              void loadReports(true)
            }
            disabled={refreshing}
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>

          <button
            type="button"
            className={
              styles.printButton
            }
            onClick={() =>
              printReport(
                "Reports"
              )
            }
          >
            ⎙ Print Report
          </button>
        </div>
      </header>

      {/* ERROR */}

      {error && (
        <div
          className={
            styles.errorBox
          }
        >
          {error}
        </div>
      )}

      {/* ================================================
          SUMMARY
      ================================================= */}

      <section
        className={
          styles.summaryGrid
        }
      >
        <div
          className={`${styles.summaryCard} ${styles.purple}`}
        >
          <span>Students</span>

          <strong>
            {totalStudents}
          </strong>

          <small>
            {activeStudents} active
          </small>
        </div>

        <div
          className={`${styles.summaryCard} ${styles.green}`}
        >
          <span>Attendance</span>

          <strong>
            {attendancePercentage}%
          </strong>

          <small>
            {attendanceTotal} records
          </small>
        </div>

        <div
          className={`${styles.summaryCard} ${styles.orange}`}
        >
          <span>Pending Fees</span>

          <strong>
            {money(pendingFees)}
          </strong>

          <small>
            {data.fees.length} fee
            records
          </small>
        </div>

        <div
          className={`${styles.summaryCard} ${styles.blue}`}
        >
          <span>Net Balance</span>

          <strong>
            {money(balance)}
          </strong>

          <small>
            Income − expense
          </small>
        </div>

        <div
          className={`${styles.summaryCard} ${styles.pink}`}
        >
          <span>Staff</span>

          <strong>
            {totalStaff}
          </strong>

          <small>
            {activeStaff} active
          </small>
        </div>
      </section>

      {/* ================================================
          CLICKABLE REPORT CARDS
      ================================================= */}

      <section
        className={
          styles.reportGrid
        }
      >
        {reportCards.map(
          (report) => (
            <button
              key={report.key}
              type="button"
              className={`${styles.reportCard} ${styles[report.tone]}`}
              onClick={() =>
                setSelectedReport(
                  report.key
                )
              }
            >
              <div
                className={
                  styles.reportIcon
                }
              >
                {report.icon}
              </div>

              <div
                className={
                  styles.reportContent
                }
              >
                <span>
                  {report.label}
                </span>

                <h2>
                  {report.title}
                </h2>

                <strong>
                  {report.value}
                </strong>

                <small>
                  {report.sub}
                </small>
              </div>

              <b className={styles.arrow}>
                ↗
              </b>
            </button>
          )
        )}
      </section>

      {/* ================================================
          REPORT POPUP
      ================================================= */}

      {selectedReport && (
        <div
          className={
            styles.modalBackdrop
          }
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeReport();
            }
          }}
        >
          <section
            className={
              styles.reportModal
            }
          >
            {/* MODAL HEADER */}

            <div
              className={
                styles.modalHeader
              }
            >
              <div
                className={
                  styles.modalTitle
                }
              >
                <div
                  className={`${styles.modalIcon} ${
                    styles[
                      selectedReport ===
                      "students"
                        ? "purple"
                        : selectedReport ===
                            "attendance"
                          ? "green"
                          : selectedReport ===
                              "fees"
                            ? "orange"
                            : selectedReport ===
                                "finance"
                              ? "blue"
                              : "pink"
                    ]
                  }`}
                >
                  {selectedReport ===
                    "students" && "♙"}

                  {selectedReport ===
                    "attendance" && "✓"}

                  {selectedReport ===
                    "fees" && "₹"}

                  {selectedReport ===
                    "finance" && "↔"}

                  {selectedReport ===
                    "staff" && "♟"}
                </div>

                <div>
                  <span>
                    DETAILED REPORT
                  </span>

                  <h2>
                    {selectedReport ===
                      "students" &&
                      "Student Reports"}

                    {selectedReport ===
                      "attendance" &&
                      "Attendance Reports"}

                    {selectedReport ===
                      "fees" &&
                      "Fees Reports"}

                    {selectedReport ===
                      "finance" &&
                      "Finance Reports"}

                    {selectedReport ===
                      "staff" &&
                      "Staff Reports"}
                  </h2>
                </div>
              </div>

              <div
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    printReport(
                      selectedReport
                    )
                  }
                >
                  ⎙ Print
                </button>

                <button
                  type="button"
                  className={
                    styles.closeButton
                  }
                  onClick={
                    closeReport
                  }
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* ==========================================
                STUDENT REPORT
            ========================================== */}

            {selectedReport ===
              "students" && (
              <div
                className={
                  styles.modalBody
                }
              >
                <div
                  className={
                    styles.detailStats
                  }
                >
                  <div>
                    <span>
                      Total Students
                    </span>

                    <strong>
                      {totalStudents}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Active
                    </span>

                    <strong>
                      {activeStudents}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Inactive
                    </span>

                    <strong>
                      {inactiveStudents}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Batches
                    </span>

                    <strong>
                      {data.batches.length}
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.filterBar
                  }
                >
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search student..."
                  />

                  <select
                    value={
                      batchFilter
                    }
                    onChange={(event) =>
                      setBatchFilter(
                        event.target.value
                      )
                    }
                  >
                    <option value="all">
                      All Batches
                    </option>

                    {data.batches.map(
                      (batch) => (
                        <option
                          key={
                            batch.id
                          }
                          value={
                            batch.id
                          }
                        >
                          {batch.name ||
                            "Unnamed Batch"}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div
                  className={
                    styles.tableWrap
                  }
                >
                  <table
                    className={
                      styles.table
                    }
                  >
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>
                          Student
                        </th>
                        <th>
                          Admission No.
                        </th>
                        <th>
                          Batch
                        </th>
                        <th>
                          Phone
                        </th>
                        <th>
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredStudents.map(
                        (
                          student,
                          index
                        ) => (
                          <tr
                            key={
                              student.id
                            }
                          >
                            <td>
                              {index +
                                1}
                            </td>

                            <td>
                              <strong>
                                {studentName(
                                  student
                                )}
                              </strong>
                            </td>

                            <td>
                              {student.admission_number ||
                                "—"}
                            </td>

                            <td>
                              {student.batch_id
                                ? batchMap.get(
                                    student.batch_id
                                  ) ||
                                  "—"
                                : "—"}
                            </td>

                            <td>
                              {student.phone ||
                                "—"}
                            </td>

                            <td>
                              <span
                                className={
                                  normalize(
                                    student.status
                                  ) ===
                                  "active"
                                    ? styles.greenStatus
                                    : styles.grayStatus
                                }
                              >
                                {student.status ||
                                  "—"}
                              </span>
                            </td>
                          </tr>
                        )
                      )}

                      {!filteredStudents.length && (
                        <tr>
                          <td
                            colSpan={6}
                            className={
                              styles.empty
                            }
                          >
                            No students
                            found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ==========================================
                ATTENDANCE REGISTER REPORT
            ========================================== */}

            {selectedReport ===
              "attendance" && (
              <div
                className={
                  styles.modalBody
                }
              >
                <div
                  className={
                    styles.detailStats
                  }
                >
                  <div>
                    <span>
                      Attendance
                    </span>
                    <strong>
                      {attendancePercentage}%
                    </strong>
                  </div>

                  <div>
                    <span>
                      Present
                    </span>
                    <strong>
                      {presentCount}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Absent
                    </span>
                    <strong>
                      {absentCount}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Leave
                    </span>
                    <strong>
                      {leaveCount}
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.registryToolbar
                  }
                >
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search student..."
                  />

                  <select
                    value={batchFilter}
                    onChange={(event) =>
                      setBatchFilter(
                        event.target.value
                      )
                    }
                  >
                    <option value="all">
                      All Batches
                    </option>
                    {data.batches.map(
                      (batch) => (
                        <option
                          key={batch.id}
                          value={batch.id}
                        >
                          {batch.name ||
                            "Unnamed Batch"}
                        </option>
                      )
                    )}
                  </select>

                  <select
                    value={attendanceFilter}
                    onChange={(event) =>
                      setAttendanceFilter(
                        event.target.value
                      )
                    }
                  >
                    <option value="all">
                      All Status
                    </option>
                    <option value="p">
                      Present (P)
                    </option>
                    <option value="a">
                      Absent (A)
                    </option>
                    <option value="l">
                      Leave (L)
                    </option>
                  </select>
                </div>

                <div
                  className={
                    styles.registryHint
                  }
                >
                  <strong>Attendance Register</strong>
                  <span>
                    P = Present &nbsp; A = Absent &nbsp; L = Leave
                  </span>
                </div>

                <div
                  className={`${styles.tableWrap} ${styles.registryWrap}`}
                >
                  <table
                    className={`${styles.table} ${styles.registryTable}`}
                  >
                    <thead>
                      <tr>
                        <th className={styles.registryNo}>
                          #
                        </th>
                        <th className={styles.stickyStudent}>
                          Student Name
                        </th>
                        <th className={styles.stickyBatch}>
                          Batch
                        </th>
                        {attendanceDates.map(
                          (date) => (
                            <th
                              key={date}
                              className={styles.dateHead}
                            >
                              {date.slice(8, 10)}
                              <small>
                                {date.slice(5, 7)}
                              </small>
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {attendanceRegistry.map(
                        (student, index) => {
                          const studentAttendance =
                            attendanceRegistryMap.get(
                              student.id
                            );

                          return (
                            <tr
                              key={student.id}
                            >
                              <td className={styles.registryNo}>
                                {index + 1}
                              </td>

                              <td className={styles.stickyStudent}>
                                <strong>
                                  {studentName(
                                    student
                                  )}
                                </strong>
                              </td>

                              <td className={styles.stickyBatch}>
                                {student.batch_id
                                  ? batchMap.get(
                                      student.batch_id
                                    ) ||
                                    "—"
                                  : "—"}
                              </td>

                              {attendanceDates.map(
                                (date) => {
                                  const mark =
                                    studentAttendance?.get(
                                      date
                                    ) ||
                                    "—";

                                  return (
                                    <td
                                      key={`${student.id}-${date}`}
                                      className={
                                        mark === "P"
                                          ? styles.presentCell
                                          : mark === "A"
                                          ? styles.absentCell
                                          : mark === "L"
                                          ? styles.leaveCell
                                          : styles.blankCell
                                      }
                                    >
                                      {mark}
                                    </td>
                                  );
                                }
                              )}
                            </tr>
                          );
                        }
                      )}

                      {!attendanceRegistry.length && (
                        <tr>
                          <td
                            colSpan={Math.max(
                              3 + attendanceDates.length,
                              3
                            )}
                            className={
                              styles.empty
                            }
                          >
                            No students or attendance records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ==========================================
                FEES REPORT
            ========================================== */}

            {selectedReport ===
              "fees" && (
              <div
                className={
                  styles.modalBody
                }
              >
                <div
                  className={
                    styles.detailStats
                  }
                >
                  <div>
                    <span>
                      Total Fees
                    </span>

                    <strong>
                      {money(
                        totalFeeAmount
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Discount
                    </span>

                    <strong>
                      {money(
                        totalDiscount
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Collected
                    </span>

                    <strong>
                      {money(
                        paidFeeAmount
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Pending
                    </span>

                    <strong>
                      {money(
                        pendingFees
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.filterBar
                  }
                >
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search fee..."
                  />

                  <select
                    value={feeFilter}
                    onChange={(event) =>
                      setFeeFilter(
                        event.target.value
                      )
                    }
                  >
                    <option value="all">
                      All Fees
                    </option>

                    <option value="paid">
                      Paid
                    </option>

                    <option value="pending">
                      Pending
                    </option>

                    <option value="partial">
                      Partial
                    </option>

                    <option value="overdue">
                      Overdue
                    </option>
                  </select>
                </div>

                <div
                  className={
                    styles.tableWrap
                  }
                >
                  <table
                    className={
                      styles.table
                    }
                  >
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>
                          Fee ID
                        </th>
                        <th>
                          Amount
                        </th>
                        <th>
                          Discount
                        </th>
                        <th>
                          Net
                        </th>
                        <th>
                          Paid
                        </th>
                        <th>
                          Status
                        </th>
                        <th>
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredFees.map(
                        (
                          fee,
                          index
                        ) => {
                          const amount =
                            Number(
                              fee.amount ||
                                0
                            );

                          const discount =
                            Number(
                              fee.discount ||
                                0
                            );

                          const paid =
                            Number(
                              fee.paid ||
                                0
                            );

                          return (
                            <tr
                              key={
                                fee.id
                              }
                            >
                              <td>
                                {index +
                                  1}
                              </td>

                              <td>
                                {fee.id.slice(
                                  0,
                                  8
                                )}
                              </td>

                              <td>
                                {money(
                                  amount
                                )}
                              </td>

                              <td>
                                {money(
                                  discount
                                )}
                              </td>

                              <td>
                                <strong>
                                  {money(
                                    Math.max(
                                      amount -
                                        discount,
                                      0
                                    )
                                  )}
                                </strong>
                              </td>

                              <td>
                                {money(
                                  paid
                                )}
                              </td>

                              <td>
                                <span
                                  className={
                                    styles.statusBadge
                                  }
                                >
                                  {fee.status ||
                                    "—"}
                                </span>
                              </td>

                              <td>
                                {dateFormat(
                                  fee.created_at
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}

                      {!filteredFees.length && (
                        <tr>
                          <td
                            colSpan={8}
                            className={
                              styles.empty
                            }
                          >
                            No fee
                            records
                            found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ==========================================
                FINANCE REPORT
            ========================================== */}

            {selectedReport ===
              "finance" && (
              <div
                className={
                  styles.modalBody
                }
              >
                <div
                  className={
                    styles.detailStats
                  }
                >
                  <div>
                    <span>
                      Income
                    </span>

                    <strong>
                      {money(income)}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Expense
                    </span>

                    <strong>
                      {money(expense)}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Net Balance
                    </span>

                    <strong>
                      {money(balance)}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Transactions
                    </span>

                    <strong>
                      {
                        data
                          .transactions
                          .length
                      }
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.financeBoxes
                  }
                >
                  <div>
                    <span>
                      Monthly Income
                    </span>

                    <strong>
                      {money(
                        data.transactions
                          .filter(
                            (item) =>
                              normalize(
                                item.type
                              ) ===
                                "income" &&
                              isCurrentMonth(
                                item.date
                              )
                          )
                          .reduce(
                            (
                              sum,
                              item
                            ) =>
                              sum +
                              Number(
                                item.amount ||
                                  0
                              ),
                            0
                          )
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Monthly Expense
                    </span>

                    <strong>
                      {money(
                        data.transactions
                          .filter(
                            (item) =>
                              normalize(
                                item.type
                              ) ===
                                "expense" &&
                              isCurrentMonth(
                                item.date
                              )
                          )
                          .reduce(
                            (
                              sum,
                              item
                            ) =>
                              sum +
                              Number(
                                item.amount ||
                                  0
                              ),
                            0
                          )
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.tableWrap
                  }
                >
                  <table
                    className={
                      styles.table
                    }
                  >
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>
                          Description
                        </th>
                        <th>
                          Category
                        </th>
                        <th>
                          Date
                        </th>
                        <th>
                          Type
                        </th>
                        <th>
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.transactions.map(
                        (
                          item,
                          index
                        ) => (
                          <tr
                            key={String(
                              item.id ??
                                index
                            )}
                          >
                            <td>
                              {index +
                                1}
                            </td>

                            <td>
                              <strong>
                                {item.title ||
                                  "Transaction"}
                              </strong>
                            </td>

                            <td>
                              {item.category ||
                                "—"}
                            </td>

                            <td>
                              {dateFormat(
                                item.date
                              )}
                            </td>

                            <td>
                              <span
                                className={
                                  styles.statusBadge
                                }
                              >
                                {item.type ||
                                  "—"}
                              </span>
                            </td>

                            <td>
                              {money(
                                Number(
                                  item.amount ||
                                    0
                                )
                              )}
                            </td>
                          </tr>
                        )
                      )}

                      {!data.transactions
                        .length && (
                        <tr>
                          <td
                            colSpan={6}
                            className={
                              styles.empty
                            }
                          >
                            No finance
                            transactions
                            found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ==========================================
                STAFF REPORT
            ========================================== */}

            {selectedReport ===
              "staff" && (
              <div
                className={
                  styles.modalBody
                }
              >
                <div
                  className={
                    styles.detailStats
                  }
                >
                  <div>
                    <span>
                      Total Staff
                    </span>

                    <strong>
                      {totalStaff}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Active
                    </span>

                    <strong>
                      {activeStaff}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Inactive
                    </span>

                    <strong>
                      {inactiveStaff}
                    </strong>
                  </div>

                  <div>
                    <span>
                      This Month
                    </span>

                    <strong>
                      {
                        data.staff.filter(
                          (staff) =>
                            isCurrentMonth(
                              staff.created_at
                            )
                        ).length
                      }
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.filterBar
                  }
                >
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search staff..."
                  />
                </div>

                <div
                  className={
                    styles.tableWrap
                  }
                >
                  <table
                    className={
                      styles.table
                    }
                  >
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>
                          Staff
                        </th>
                        <th>
                          Employee ID
                        </th>
                        <th>
                          Designation
                        </th>
                        <th>
                          Department
                        </th>
                        <th>
                          Phone
                        </th>
                        <th>
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.staff
                        .filter(
                          (staff) => {
                            const q =
                              search
                                .trim()
                                .toLowerCase();

                            if (!q) {
                              return true;
                            }

                            return (
                              staffName(
                                staff
                              )
                                .toLowerCase()
                                .includes(
                                  q
                                ) ||
                              String(
                                staff.employee_id ||
                                  ""
                              )
                                .toLowerCase()
                                .includes(
                                  q
                                ) ||
                              String(
                                staff.designation ||
                                  ""
                              )
                                .toLowerCase()
                                .includes(
                                  q
                                )
                            );
                          }
                        )
                        .map(
                          (
                            staff,
                            index
                          ) => (
                            <tr
                              key={
                                staff.id
                              }
                            >
                              <td>
                                {index +
                                  1}
                              </td>

                              <td>
                                <strong>
                                  {staffName(
                                    staff
                                  )}
                                </strong>
                              </td>

                              <td>
                                {staff.employee_id ||
                                  "—"}
                              </td>

                              <td>
                                {staff.designation ||
                                  "—"}
                              </td>

                              <td>
                                {staff.department ||
                                  "—"}
                              </td>

                              <td>
                                {staff.phone ||
                                  "—"}
                              </td>

                              <td>
                                <span
                                  className={
                                    normalize(
                                      staff.status
                                    ) ===
                                    "active"
                                      ? styles.greenStatus
                                      : styles.grayStatus
                                  }
                                >
                                  {staff.status ||
                                    "—"}
                                </span>
                              </td>
                            </tr>
                          )
                        )}

                      {!data.staff.length && (
                        <tr>
                          <td
                            colSpan={7}
                            className={
                              styles.empty
                            }
                          >
                            No staff
                            records
                            found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}