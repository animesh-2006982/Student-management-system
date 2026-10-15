"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./performance.module.css";

type PerformanceRow = {
  id: number;
  name: string;
  batch: string;
  attendance: number;
  average: number;
  status: "Excellent" | "Good" | "Needs Improvement";
};

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState("All Batches");

  // Database connect hone tak intentionally empty.
  const students: PerformanceRow[] = [];

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch = student.name
        .toLowerCase()
        .includes(search.toLowerCase());

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

  const exportPerformance = () => {
    if (students.length === 0) {
      alert("No performance data available to export.");
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
    link.click();

    URL.revokeObjectURL(url);
  };

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <main className={styles.page}>
      {/* HEADER */}
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
                onClick={refreshPage}
              >
                ↻ Refresh
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

      {/* STAT CARDS */}
      <section className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.purpleCard}`}>
          <div className={styles.statIcon}>♙</div>

          <div className={styles.statContent}>
            <span>Total Students</span>
            <strong>0</strong>
            <small>Database records</small>
          </div>

          <div className={styles.cardGlow} />
        </div>

        <div className={`${styles.statCard} ${styles.greenCard}`}>
          <div className={styles.statIcon}>↗</div>

          <div className={styles.statContent}>
            <span>Average Performance</span>
            <strong>0%</strong>
            <small>No performance data</small>
          </div>

          <div className={styles.cardGlow} />
        </div>

        <div className={`${styles.statCard} ${styles.orangeCard}`}>
          <div className={styles.statIcon}>★</div>

          <div className={styles.statContent}>
            <span>Top Performers</span>
            <strong>0</strong>
            <small>Excellent performance</small>
          </div>

          <div className={styles.cardGlow} />
        </div>

        <div className={`${styles.statCard} ${styles.blueCard}`}>
          <div className={styles.statIcon}>!</div>

          <div className={styles.statContent}>
            <span>Needs Improvement</span>
            <strong>0</strong>
            <small>Requires attention</small>
          </div>

          <div className={styles.cardGlow} />
        </div>
      </section>

      {/* PERFORMANCE DIRECTORY */}
      <section className={styles.directory}>
        <div className={styles.directoryHeader}>
          <div>
            <p className={styles.sectionLabel}>PERFORMANCE DIRECTORY</p>

            <h2>Student Performance</h2>

            <p>
              View and manage student academic performance information.
            </p>
          </div>
        </div>

        {/* TABS */}
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

        {/* FILTERS */}
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
          </select>

          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setSearch("");
              setBatch("All Batches");
              setActiveTab("All");
            }}
          >
            Clear
          </button>
        </div>

        {/* TABLE */}
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
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>#{student.id}</td>

                    <td>
                      <div className={styles.studentCell}>
                        <div className={styles.avatar}>
                          {student.name.charAt(0)}
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
                      <span className={styles.status}>
                        {student.status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={styles.viewButton}
                        onClick={() =>
                          alert(`Performance details: ${student.name}`)
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

                      <h3>No performance data yet</h3>

                      <p>
                        Student performance records will appear here after
                        connecting the database.
                      </p>

                      <span>
                        Students: 0 &nbsp; • &nbsp; Performance records: 0
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* BOTTOM INFO */}
      <section className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>✦</div>

          <div>
            <span>SMART ANALYTICS</span>
            <h3>Understand student progress.</h3>
            <p>
              Academic performance data will automatically appear here once
              your database is connected.
            </p>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>✓</div>

          <div>
            <span>DATABASE READY</span>
            <h3>Built for live student data.</h3>
            <p>
              This page currently starts at zero and is ready for database
              integration.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}