"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./attendance.module.css";

type AttendanceStatus = "P" | "A" | "L";

type Student = {
  id: string;
  name: string;
};

type AttendanceMap = Record<string, AttendanceStatus>;

export default function AttendancePage() {
  /*
    IMPORTANT:
    Abhi database connected nahi hai.
    Isliye students empty hain.

    Later:
    Database/API se students yahan fetch honge.
  */
  const [students] = useState<Student[]>([]);

  const [attendance, setAttendance] = useState<AttendanceMap>({});

  const setStatus = (
    studentId: string,
    status: AttendanceStatus
  ) => {
    setAttendance((previous) => ({
      ...previous,
      [studentId]: status,
    }));
  };

  const presentCount = useMemo(() => {
    return Object.values(attendance).filter(
      (status) => status === "P"
    ).length;
  }, [attendance]);

  const absentCount = useMemo(() => {
    return Object.values(attendance).filter(
      (status) => status === "A"
    ).length;
  }, [attendance]);

  const leaveCount = useMemo(() => {
    return Object.values(attendance).filter(
      (status) => status === "L"
    ).length;
  }, [attendance]);

  const handleSave = () => {
    if (students.length === 0) {
      alert("No students available. Students will appear after database connection.");
      return;
    }

    console.log("Attendance:", attendance);

    alert("Attendance saved successfully.");
  };

  return (
    <main className={styles.page}>
      {/* Animated background */}
      <div className={styles.glowOne} />
      <div className={styles.glowTwo} />

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link
            href="/admin"
            className={styles.backButton}
          >
            ←
          </Link>

          <div>
            <p className={styles.eyebrow}>
              ACADEMIC MANAGEMENT
            </p>

            <h1>Attendance</h1>

            <p className={styles.subtitle}>
              Manage daily student attendance.
            </p>
          </div>
        </div>

        <Link
          href="/admin"
          className={styles.dashboardButton}
        >
          Dashboard
        </Link>
      </header>

      {/* CONTENT */}
      <section className={styles.content}>

        {/* STATS */}
        <section className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.totalCard}`}>
            <div className={styles.statIcon}>♙</div>

            <div>
              <span>Total Students</span>
              <strong>{students.length}</strong>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.presentCard}`}>
            <div className={styles.statIcon}>P</div>

            <div>
              <span>Present</span>
              <strong>{presentCount}</strong>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.absentCard}`}>
            <div className={styles.statIcon}>A</div>

            <div>
              <span>Absent</span>
              <strong>{absentCount}</strong>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.leaveCard}`}>
            <div className={styles.statIcon}>L</div>

            <div>
              <span>Leave</span>
              <strong>{leaveCount}</strong>
            </div>
          </div>
        </section>

        {/* ATTENDANCE PANEL */}
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelLabel}>
                TODAY&apos;S RECORD
              </p>

              <h2>Student Attendance</h2>

              <p>
                Student records will be loaded from the database.
              </p>
            </div>

            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
            >
              Save Attendance
            </button>
          </div>

          {/* EMPTY STATE */}
          {students.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                ♙
              </div>

              <h3>No students found</h3>

              <p>
                Student names will appear here automatically
                after the database is connected.
              </p>

              <Link
                href="/admin/students"
                className={styles.studentButton}
              >
                Go to Students
              </Link>
            </div>
          ) : (
            /* STUDENT LIST */
            <div className={styles.studentList}>
              {students.map((student) => {
                const currentStatus =
                  attendance[student.id];

                return (
                  <div
                    key={student.id}
                    className={styles.studentRow}
                  >
                    <div className={styles.studentInfo}>
                      <div className={styles.studentAvatar}>
                        {student.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>{student.name}</strong>

                        <span>
                          Student ID: {student.id}
                        </span>
                      </div>
                    </div>

                    <div className={styles.statusButtons}>
                      <button
                        type="button"
                        className={`${styles.statusButton} ${
                          styles.presentButton
                        } ${
                          currentStatus === "P"
                            ? styles.selected
                            : ""
                        }`}
                        onClick={() =>
                          setStatus(student.id, "P")
                        }
                      >
                        P
                      </button>

                      <button
                        type="button"
                        className={`${styles.statusButton} ${
                          styles.absentButton
                        } ${
                          currentStatus === "A"
                            ? styles.selected
                            : ""
                        }`}
                        onClick={() =>
                          setStatus(student.id, "A")
                        }
                      >
                        A
                      </button>

                      <button
                        type="button"
                        className={`${styles.statusButton} ${
                          styles.leaveButton
                        } ${
                          currentStatus === "L"
                            ? styles.selected
                            : ""
                        }`}
                        onClick={() =>
                          setStatus(student.id, "L")
                        }
                      >
                        L
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* INFORMATION */}
        <section className={styles.infoBox}>
          <div className={styles.infoIcon}>i</div>

          <div>
            <strong>Database Ready</strong>

            <p>
              This attendance section is prepared for
              database integration. Student names and
              records will be fetched dynamically instead
              of being written manually in the page.
            </p>
          </div>
        </section>

      </section>
    </main>
  );
}