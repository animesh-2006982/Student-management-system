"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./performance.module.css";

type PerformanceStatus = "Excellent" | "Good" | "Needs Improvement";

type Student = {
  id: string;
  name: string;
  batchId: string | null;
  batch: string;
  attendance: number;
  average: number;
  status: PerformanceStatus;
  records: number;
};

type PerformanceRecord = {
  id: string;
  student_id: string;
  marks: number;
  total_marks: number;
};

type Batch = {
  id: string;
  name: string;
};

function getStatus(average: number): PerformanceStatus {
  if (average >= 80) return "Excellent";
  if (average >= 50) return "Good";
  return "Needs Improvement";
}

export default function PerformancePage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState("All Batches");

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPerformance = async () => {
    setLoading(true);
    setError("");

    try {
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
        .maybeSingle();

      if (profileError) throw profileError;

      const instituteId = profile?.institute_id as string | undefined;

      if (!instituteId) {
        throw new Error("Institute profile not found.");
      }

      // Load core student data first. This keeps the page usable even if
      // an optional performance/attendance table is empty or not created yet.
      const { data: studentRows, error: studentsError } = await supabase
        .from("students")
        .select("id,first_name,last_name,batch_id")
        .eq("institute_id", instituteId)
        .order("created_at", { ascending: false });

      if (studentsError) throw studentsError;

      const { data: batchRows, error: batchesError } = await supabase
        .from("batches")
        .select("id,name")
        .eq("institute_id", instituteId)
        .order("name", { ascending: true });

      if (batchesError) throw batchesError;

      // Performance records are optional. If the table has not been created
      // yet, show students with 0 performance instead of breaking the page.
      const {
        data: performanceRows,
        error: performanceError,
      } = await supabase
        .from("student_performance")
        .select("id,student_id,marks,total_marks")
        .eq("institute_id", instituteId);

      // Attendance is also optional for this dashboard.
      const {
        data: attendanceRows,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select("student_id,status")
        .eq("institute_id", instituteId);

      const batchMap = new Map<string, string>();

      (batchRows ?? []).forEach((item: any) => {
        batchMap.set(
          item.id,
          item.name || "Unassigned"
        );
      });

      const performanceMap = new Map<
        string,
        { marks: number; total: number; records: number }
      >();

      if (!performanceError) {
        (performanceRows ?? []).forEach((item: PerformanceRecord) => {
          const current = performanceMap.get(item.student_id) || {
            marks: 0,
            total: 0,
            records: 0,
          };

          performanceMap.set(item.student_id, {
            marks: current.marks + Number(item.marks || 0),
            total: current.total + Number(item.total_marks || 0),
            records: current.records + 1,
          });
        });
      }

      const attendanceMap = new Map<
        string,
        { present: number; total: number }
      >();

      if (!attendanceError) {
        (attendanceRows ?? []).forEach((item: any) => {
          const current = attendanceMap.get(item.student_id) || {
            present: 0,
            total: 0,
          };

          const status = String(item.status || "").toLowerCase();

          attendanceMap.set(item.student_id, {
            present:
              current.present +
              (status === "p" || status === "present" ? 1 : 0),
            total: current.total + 1,
          });
        });
      }

      const mappedStudents: Student[] = (studentRows ?? []).map((item: any) => {
        const performance = performanceMap.get(item.id);
        const attendance = attendanceMap.get(item.id);

        const average =
          performance && performance.total > 0
            ? Math.round((performance.marks / performance.total) * 100)
            : 0;

        const attendancePercent =
          attendance && attendance.total > 0
            ? Math.round((attendance.present / attendance.total) * 100)
            : 0;

        const fullName =
          `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
          "Unnamed Student";

        return {
          id: item.id,
          name: fullName,
          batchId: item.batch_id || null,
          batch: item.batch_id
            ? batchMap.get(item.batch_id) || "Unknown Batch"
            : "Unassigned",
          attendance: attendancePercent,
          average,
          status: getStatus(average),
          records: performance?.records || 0,
        };
      });

      setBatches(
        (batchRows ?? []).map((item: any) => ({
          id: item.id,
          name: item.name || "Unnamed Batch",
        }))
      );

      setStudents(mappedStudents);

      // Do not block the dashboard for optional tables. Give a small,
      // actionable message only when the performance table is missing.
      if (performanceError) {
        const message = String(
          (performanceError as any)?.message || ""
        ).toLowerCase();

        if (
          message.includes("student_performance") ||
          message.includes("relation") ||
          message.includes("schema cache")
        ) {
          setError(
            "Performance table is not available yet. Run the Performance SQL once in Supabase; student data is loaded."
          );
        } else {
          setError(performanceError.message || "Unable to load performance records.");
        }
      }
    } catch (err: any) {
      console.error(
        "Performance load error:",
        err?.message || err
      );
      setError(err?.message || "Unable to load performance data.");
      setStudents([]);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformance();
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(query);

      const matchesBatch =
        batch === "All Batches" || student.batch === batch;

      const matchesTab =
        activeTab === "All" ||
        (activeTab === "Excellent" && student.status === "Excellent") ||
        (activeTab === "Good" && student.status === "Good") ||
        (activeTab === "Needs Improvement" &&
          student.status === "Needs Improvement");

      return matchesSearch && matchesBatch && matchesTab;
    });
  }, [students, search, batch, activeTab]);

  const averagePerformance = useMemo(() => {
    const withRecords = students.filter((student) => student.records > 0);

    if (!withRecords.length) return 0;

    return Math.round(
      withRecords.reduce((sum, student) => sum + student.average, 0) /
        withRecords.length
    );
  }, [students]);

  const topPerformers = useMemo(
    () => students.filter((student) => student.status === "Excellent").length,
    [students]
  );

  const needsImprovement = useMemo(
    () =>
      students.filter(
        (student) => student.status === "Needs Improvement"
      ).length,
    [students]
  );

  const exportPerformance = () => {
    if (students.length === 0) {
      window.alert("No performance data available to export.");
      return;
    }

    const header = [
      "ID",
      "Student",
      "Batch",
      "Attendance",
      "Average",
      "Status",
    ];

    const rows = students.map((student) => [
      student.id,
      student.name,
      student.batch,
      `${student.attendance}%`,
      `${student.average}%`,
      student.status,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "student-performance.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch("");
    setBatch("All Batches");
    setActiveTab("All");
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <span>Performance</span>
          </div>

          <div className={styles.headingArea}>
            <div>
              <p className={styles.eyebrow}>ACADEMIC MANAGEMENT</p>

              <h1>
                Student <span>Performance</span>
              </h1>

              <p className={styles.description}>
                Track academic performance, attendance and student progress
                from one organized workspace.
              </p>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.refreshButton}
                onClick={loadPerformance}
                disabled={loading}
              >
                ↻ {loading ? "Loading..." : "Refresh"}
              </button>

              <button
                type="button"
                className={styles.exportButton}
                onClick={exportPerformance}
              >
                ↓ Export
              </button>
            </div>
          </div>
        </div>
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
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <section className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.purpleCard}`}>
          <div className={styles.statIcon}>♙</div>
          <div className={styles.statContent}>
            <span>Total Students</span>
            <strong>{students.length}</strong>
            <small>Database records</small>
          </div>
          <div className={styles.cardGlow} />
        </div>

        <div className={`${styles.statCard} ${styles.greenCard}`}>
          <div className={styles.statIcon}>↗</div>
          <div className={styles.statContent}>
            <span>Average Performance</span>
            <strong>{averagePerformance}%</strong>
            <small>
              {students.some((student) => student.records > 0)
                ? "Based on performance records"
                : "No performance data"}
            </small>
          </div>
          <div className={styles.cardGlow} />
        </div>

        <div className={`${styles.statCard} ${styles.orangeCard}`}>
          <div className={styles.statIcon}>★</div>
          <div className={styles.statContent}>
            <span>Top Performers</span>
            <strong>{topPerformers}</strong>
            <small>Excellent performance</small>
          </div>
          <div className={styles.cardGlow} />
        </div>

        <div className={`${styles.statCard} ${styles.blueCard}`}>
          <div className={styles.statIcon}>!</div>
          <div className={styles.statContent}>
            <span>Needs Improvement</span>
            <strong>{needsImprovement}</strong>
            <small>Requires attention</small>
          </div>
          <div className={styles.cardGlow} />
        </div>
      </section>

      <section className={styles.directory}>
        <div className={styles.directoryHeader}>
          <div>
            <p className={styles.sectionLabel}>PERFORMANCE DIRECTORY</p>
            <h2>Student Performance</h2>
            <p>View and manage student academic performance information.</p>
          </div>
        </div>

        <div className={styles.tabs}>
          {["All", "Excellent", "Good", "Needs Improvement"].map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${styles.tabButton} ${
                activeTab === tab ? styles.activeTab : ""
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            className={styles.select}
          >
            <option>All Batches</option>
            {batches.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </select>

          <button
            type="button"
            className={styles.clearButton}
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>STUDENT</th>
                <th>BATCH</th>
                <th>ATTENDANCE</th>
                <th>AVERAGE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>◎</div>
                      <h3>Loading performance data</h3>
                      <p>Fetching students and academic records.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>#{student.id.slice(-6)}</td>

                    <td>
                      <div className={styles.studentCell}>
                        <div className={styles.avatar}>
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <strong>{student.name}</strong>
                      </div>
                    </td>

                    <td>{student.batch}</td>

                    <td>
                      <div className={styles.progressCell}>
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressBar}
                            style={{ width: `${student.attendance}%` }}
                          />
                        </div>
                        <span>{student.attendance}%</span>
                      </div>
                    </td>

                    <td>
                      <strong>{student.average}%</strong>
                    </td>

                    <td>
                      <span className={styles.status}>{student.status}</span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={styles.viewButton}
                        onClick={() =>
                          window.alert(
                            `Performance details:\n${student.name}\nBatch: ${student.batch}\nAttendance: ${student.attendance}%\nAverage: ${student.average}%\nStatus: ${student.status}\nRecords: ${student.records}`
                          )
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>◎</div>
                      <h3>
                        {students.length
                          ? "No matching students"
                          : "No performance data yet"}
                      </h3>
                      <p>
                        {students.length
                          ? "Try changing your search, batch or performance filter."
                          : "Student records will appear here once students are added."}
                      </p>
                      <span>
                        Students: {students.length} &nbsp; • &nbsp; Performance
                        records:{" "}
                        {students.reduce(
                          (total, student) => total + student.records,
                          0
                        )}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>✦</div>
          <div>
            <span>SMART ANALYTICS</span>
            <h3>Understand student progress.</h3>
            <p>
              Performance and attendance are calculated from your live
              database records.
            </p>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>✓</div>
          <div>
            <span>DATABASE READY</span>
            <h3>Built for live student data.</h3>
            <p>
              Students, batches, attendance and performance records are
              connected to your institute.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
