"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./exams.module.css";

type Exam = {
  id: number;
  name: string;
  className: string;
  date: string;
  status: "Upcoming" | "Completed" | "Draft";
};

export default function ExamsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState<number | null>(null);

  const [exams, setExams] = useState<Exam[]>([]);

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        exam.name.toLowerCase().includes(search.toLowerCase()) ||
        exam.className.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" || exam.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [exams, search, filter]);

  const handleDelete = (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this exam?"
    );

    if (!confirmed) return;

    setExams((current) =>
      current.filter((exam) => exam.id !== id)
    );

    setShowMenu(null);
  };

  const handleCreateExam = () => {
    const name = window.prompt("Enter exam name:");

    if (!name?.trim()) return;

    const className = window.prompt("Enter class:");

    if (!className?.trim()) return;

    const date = window.prompt("Enter exam date:");

    if (!date?.trim()) return;

    const newExam: Exam = {
      id: Date.now(),
      name: name.trim(),
      className: className.trim(),
      date: date.trim(),
      status: "Upcoming",
    };

    setExams((current) => [newExam, ...current]);
    setShowModal(false);
  };

  const handleView = (exam: Exam) => {
    window.alert(
      `Exam: ${exam.name}\nClass: ${exam.className}\nDate: ${exam.date}\nStatus: ${exam.status}`
    );

    setShowMenu(null);
  };

  return (
    <main className={styles.page}>

      {/* HEADER */}
      <header className={styles.topHeader}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <span>Exams</span>
          </div>

          <h1 className={styles.title}>
            Exam <span>Management</span>
          </h1>

          <p className={styles.subtitle}>
            Create, manage and track examinations from one organized workspace.
          </p>
        </div>

        <button
          className={styles.primaryButton}
          onClick={() => setShowModal(true)}
        >
          <span>＋</span>
          Create Exam
        </button>
      </header>

      {/* STAT CARDS */}
      <section className={styles.statsGrid}>

        <div className={`${styles.statCard} ${styles.purpleCard}`}>
          <div className={styles.statIcon}>▣</div>

          <div>
            <span>Total Exams</span>
            <strong>{exams.length}</strong>
            <small>Database records</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.greenCard}`}>
          <div className={styles.statIcon}>✓</div>

          <div>
            <span>Active Exams</span>
            <strong>
              {exams.filter((exam) => exam.status === "Upcoming").length}
            </strong>
            <small>Currently active</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.orangeCard}`}>
          <div className={styles.statIcon}>!</div>

          <div>
            <span>Upcoming</span>
            <strong>
              {exams.filter((exam) => exam.status === "Upcoming").length}
            </strong>
            <small>Scheduled exams</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.blueCard}`}>
          <div className={styles.statIcon}>✓</div>

          <div>
            <span>Completed</span>
            <strong>
              {exams.filter((exam) => exam.status === "Completed").length}
            </strong>
            <small>Finished exams</small>
          </div>
        </div>

      </section>

      {/* EXAM DIRECTORY */}
      <section className={styles.directory}>

        <div className={styles.directoryHeader}>
          <div>
            <p>EXAM DIRECTORY</p>

            <h2>All Examinations</h2>

            <span>
              View and manage examination information.
            </span>
          </div>

          <button
            className={styles.smallPrimaryButton}
            onClick={() => setShowModal(true)}
          >
            ＋ Add Exam
          </button>
        </div>

        {/* FILTER BAR */}
        <div className={styles.filterBar}>

          <div className={styles.searchBox}>
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search exam or class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={styles.select}
          >
            <option value="All">All Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
            <option value="Draft">Draft</option>
          </select>

        </div>

        {/* TABLE */}
        <div className={styles.tableWrapper}>

          <table className={styles.table}>

            <thead>
              <tr>
                <th>ID</th>
                <th>EXAMINATION</th>
                <th>CLASS</th>
                <th>DATE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>

              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={6}>

                    <div className={styles.emptyState}>

                      <div className={styles.emptyIcon}>
                        ▣
                      </div>

                      <h3>No exams found</h3>

                      <p>
                        Exam data will appear here once you create
                        an exam or connect your database.
                      </p>

                      <button
                        className={styles.emptyButton}
                        onClick={() => setShowModal(true)}
                      >
                        ＋ Create First Exam
                      </button>

                    </div>

                  </td>
                </tr>
              ) : (
                filteredExams.map((exam) => (
                  <tr key={exam.id}>

                    <td>
                      <span className={styles.idBadge}>
                        #{exam.id.toString().slice(-4)}
                      </span>
                    </td>

                    <td>
                      <div className={styles.examName}>
                        <div className={styles.examAvatar}>
                          E
                        </div>

                        <div>
                          <strong>{exam.name}</strong>
                          <small>Examination</small>
                        </div>
                      </div>
                    </td>

                    <td>{exam.className}</td>

                    <td>{exam.date}</td>

                    <td>
                      <span
                        className={`${styles.status} ${
                          exam.status === "Upcoming"
                            ? styles.statusUpcoming
                            : exam.status === "Completed"
                            ? styles.statusCompleted
                            : styles.statusDraft
                        }`}
                      >
                        {exam.status}
                      </span>
                    </td>

                    <td>

                      <div className={styles.actionArea}>

                        <button
                          className={styles.actionButton}
                          onClick={() => handleView(exam)}
                        >
                          View
                        </button>

                        <button
                          className={styles.moreButton}
                          onClick={() =>
                            setShowMenu(
                              showMenu === exam.id
                                ? null
                                : exam.id
                            )
                          }
                        >
                          ⋮
                        </button>

                        {showMenu === exam.id && (
                          <div className={styles.actionMenu}>

                            <button
                              onClick={() => handleView(exam)}
                            >
                              View Exam
                            </button>

                            <button
                              onClick={() => {
                                window.alert(
                                  "Edit functionality will be connected with the database later."
                                );
                                setShowMenu(null);
                              }}
                            >
                              Edit
                            </button>

                            <button
                              className={styles.deleteItem}
                              onClick={() =>
                                handleDelete(exam.id)
                              }
                            >
                              Delete
                            </button>

                          </div>
                        )}

                      </div>

                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* CREATE EXAM MODAL */}
      {showModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowModal(false)}
        >

          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className={styles.closeButton}
              onClick={() => setShowModal(false)}
            >
              ×
            </button>

            <div className={styles.modalIcon}>
              ＋
            </div>

            <h2>Create Examination</h2>

            <p>
              Create a new examination record.
            </p>

            <button
              className={styles.modalCreateButton}
              onClick={handleCreateExam}
            >
              Create Exam
            </button>

            <button
              className={styles.modalCancelButton}
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>

          </div>

        </div>
      )}

    </main>
  );
}