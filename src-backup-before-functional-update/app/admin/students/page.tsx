"use client";

import Link from "next/link";
import styles from "./students.module.css";

export default function StudentsPage() {
  return (
    <div className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <strong>Students</strong>
          </div>

          <div className={styles.eyebrow}>
            <span></span>
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
          <button className={styles.exportBtn}>↓ Export</button>

          <button className={styles.addBtn}>+ Add Student</button>
        </div>
      </header>

      {/* STATS */}
      <section className={styles.stats}>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.statIcon}>♙</div>

          <div className={styles.statContent}>
            <span>Total Students</span>
            <strong>0</strong>
            <small>All registered students</small>
          </div>

          <div className={styles.cardArrow}>↗</div>
        </div>

        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.statIcon}>✓</div>

          <div className={styles.statContent}>
            <span>Active Students</span>
            <strong>0</strong>
            <small>Currently active</small>
          </div>

          <div className={styles.cardArrow}>↗</div>
        </div>

        <div className={`${styles.statCard} ${styles.orange}`}>
          <div className={styles.statIcon}>!</div>

          <div className={styles.statContent}>
            <span>Inactive Students</span>
            <strong>0</strong>
            <small>Inactive profiles</small>
          </div>

          <div className={styles.cardArrow}>↗</div>
        </div>

        <div className={`${styles.statCard} ${styles.purple}`}>
          <div className={styles.statIcon}>₹</div>

          <div className={styles.statContent}>
            <span>Pending Fees</span>
            <strong>₹0</strong>
            <small>No pending data</small>
          </div>

          <div className={styles.cardArrow}>↗</div>
        </div>
      </section>

      {/* STUDENT DIRECTORY */}
      <section className={styles.directory}>
        <div className={styles.directoryHeader}>
          <div>
            <p className={styles.directoryEyebrow}>STUDENT DIRECTORY</p>

            <h2>All Students</h2>

            <p>
              View and manage every student registered with your institution.
            </p>
          </div>

          <div className={styles.directoryBadge}>
            0 Students
          </div>
        </div>

        {/* FILTER BAR */}
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <button className={`${styles.filterBtn} ${styles.selected}`}>
              All <span>0</span>
            </button>

            <button className={styles.filterBtn}>
              Active <span>0</span>
            </button>

            <button className={styles.filterBtn}>
              Inactive <span>0</span>
            </button>
          </div>

          <div className={styles.tools}>
            <select className={styles.select}>
              <option>All Batches</option>
            </select>

            <div className={styles.search}>
              <span>⌕</span>
              <input placeholder="Search students..." />
            </div>
          </div>
        </div>

        {/* TABLE */}
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
              {/* DATABASE SE CONNECT HONE KE BAAD YAHAN STUDENTS AAYENGE */}

              <tr className={styles.emptyRow}>
                <td colSpan={8}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>♙</div>

                    <h3>No students yet</h3>

                    <p>
                      Student data will appear here after connecting the
                      database.
                    </p>

                    <button className={styles.emptyButton}>
                      + Add First Student
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FOOTER INFO */}
      <div className={styles.bottomInfo}>
        <span>Student Management</span>
        <span>•</span>
        <span>Database connection pending</span>
      </div>
    </div>
  );
}