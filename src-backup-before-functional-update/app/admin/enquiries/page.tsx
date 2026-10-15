"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./enquiries.module.css";

type Enquiry = {
  id: number;
  name: string;
  phone: string;
  course: string;
  date: string;
  status: "New" | "Contacted" | "Converted" | "Closed";
};

export default function EnquiriesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);

  // Database connect hone tak intentionally empty.
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((item) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        item.name.toLowerCase().includes(searchValue) ||
        item.phone.toLowerCase().includes(searchValue) ||
        item.course.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [enquiries, search, statusFilter]);

  const newCount = enquiries.filter(
    (item) => item.status === "New"
  ).length;

  const contactedCount = enquiries.filter(
    (item) => item.status === "Contacted"
  ).length;

  const convertedCount = enquiries.filter(
    (item) => item.status === "Converted"
  ).length;

  const handleAddEnquiry = () => {
    const name = window.prompt("Enter student / parent name:");

    if (!name?.trim()) return;

    const phone = window.prompt("Enter phone number:");

    if (!phone?.trim()) return;

    const course = window.prompt("Enter course / class:");

    if (!course?.trim()) return;

    const newEnquiry: Enquiry = {
      id: Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      course: course.trim(),
      date: new Date().toLocaleDateString("en-IN"),
      status: "New",
    };

    setEnquiries((current) => [newEnquiry, ...current]);
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this enquiry?"
    );

    if (!confirmed) return;

    setEnquiries((current) =>
      current.filter((item) => item.id !== id)
    );

    setMenuId(null);
  };

  const handleView = (item: Enquiry) => {
    window.alert(
      `Name: ${item.name}\nPhone: ${item.phone}\nCourse: ${item.course}\nDate: ${item.date}\nStatus: ${item.status}`
    );

    setMenuId(null);
  };

  const handleEdit = (item: Enquiry) => {
    const newStatus = window.prompt(
      "Enter status: New / Contacted / Converted / Closed",
      item.status
    );

    if (!newStatus) return;

    const validStatuses = [
      "New",
      "Contacted",
      "Converted",
      "Closed",
    ];

    if (!validStatuses.includes(newStatus)) {
      window.alert("Invalid status.");
      return;
    }

    setEnquiries((current) =>
      current.map((enquiry) =>
        enquiry.id === item.id
          ? {
              ...enquiry,
              status: newStatus as Enquiry["status"],
            }
          : enquiry
      )
    );

    setMenuId(null);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  return (
    <main className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <span>Enquiries</span>
          </div>

          <p className={styles.eyebrow}>ADMISSION MANAGEMENT</p>

          <h1>
            Enquiry <span>Management</span>
          </h1>

          <p className={styles.subtitle}>
            Manage admission enquiries, follow-ups and prospective
            students from one place.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => setShowModal(true)}
        >
          <span>＋</span>
          Add Enquiry
        </button>
      </header>

      {/* STATS */}
      <section className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.purple}`}>
          <div className={styles.icon}>?</div>

          <div>
            <span>Total Enquiries</span>
            <strong>{enquiries.length}</strong>
            <small>Database records</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.orange}`}>
          <div className={styles.icon}>!</div>

          <div>
            <span>New Enquiries</span>
            <strong>{newCount}</strong>
            <small>Need follow-up</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.icon}>↗</div>

          <div>
            <span>Contacted</span>
            <strong>{contactedCount}</strong>
            <small>Follow-up started</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.icon}>✓</div>

          <div>
            <span>Converted</span>
            <strong>{convertedCount}</strong>
            <small>Successful admissions</small>
          </div>
        </div>
      </section>

      {/* MAIN CARD */}
      <section className={styles.directory}>
        <div className={styles.directoryHeader}>
          <div>
            <p>ENQUIRY DIRECTORY</p>

            <h2>All Enquiries</h2>

            <span>
              Track prospective students and admission follow-ups.
            </span>
          </div>

          <button
            type="button"
            className={styles.smallButton}
            onClick={() => setShowModal(true)}
          >
            ＋ New Enquiry
          </button>
        </div>

        {/* FILTER BAR */}
        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search name, phone or course..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            className={styles.select}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="All">All Status</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Converted">Converted</option>
            <option value="Closed">Closed</option>
          </select>

          <button
            type="button"
            className={styles.clearButton}
            onClick={clearFilters}
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
                <th>ENQUIRY</th>
                <th>PHONE</th>
                <th>COURSE / CLASS</th>
                <th>DATE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filteredEnquiries.length > 0 ? (
                filteredEnquiries.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className={styles.id}>
                        #{item.id.toString().slice(-4)}
                      </span>
                    </td>

                    <td>
                      <div className={styles.person}>
                        <div className={styles.avatar}>
                          {item.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <strong>{item.name}</strong>
                          <small>Prospective student</small>
                        </div>
                      </div>
                    </td>

                    <td>{item.phone}</td>

                    <td>{item.course}</td>

                    <td>{item.date}</td>

                    <td>
                      <span
                        className={`${styles.status} ${
                          item.status === "New"
                            ? styles.newStatus
                            : item.status === "Contacted"
                            ? styles.contactedStatus
                            : item.status === "Converted"
                            ? styles.convertedStatus
                            : styles.closedStatus
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actionArea}>
                        <button
                          type="button"
                          className={styles.viewButton}
                          onClick={() => handleView(item)}
                        >
                          View
                        </button>

                        <button
                          type="button"
                          className={styles.moreButton}
                          onClick={() =>
                            setMenuId(
                              menuId === item.id
                                ? null
                                : item.id
                            )
                          }
                        >
                          ⋮
                        </button>

                        {menuId === item.id && (
                          <div className={styles.actionMenu}>
                            <button
                              type="button"
                              onClick={() => handleView(item)}
                            >
                              View Enquiry
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                            >
                              Change Status
                            </button>

                            <button
                              type="button"
                              className={styles.deleteButton}
                              onClick={() =>
                                handleDelete(item.id)
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
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>?</div>

                      <h3>No enquiries found</h3>

                      <p>
                        Enquiry records will appear here when you
                        create an enquiry or connect your database.
                      </p>

                      <button
                        type="button"
                        className={styles.emptyButton}
                        onClick={() => setShowModal(true)}
                      >
                        ＋ Create First Enquiry
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* INFO */}
      <section className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>✦</div>

          <div>
            <span>FOLLOW-UP MANAGEMENT</span>
            <h3>Never lose a prospective student.</h3>

            <p>
              Keep track of new enquiries, follow-ups and
              successful admissions in one place.
            </p>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>◎</div>

          <div>
            <span>DATABASE READY</span>
            <h3>Live enquiry data coming here.</h3>

            <p>
              The page currently starts with zero records and
              can be connected to your database later.
            </p>
          </div>
        </div>
      </section>

      {/* MODAL */}
      {showModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowModal(false)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setShowModal(false)}
            >
              ×
            </button>

            <div className={styles.modalIcon}>?</div>

            <h2>Add New Enquiry</h2>

            <p>
              Create a new admission enquiry record.
            </p>

            <button
              type="button"
              className={styles.modalCreateButton}
              onClick={handleAddEnquiry}
            >
              ＋ Create Enquiry
            </button>

            <button
              type="button"
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