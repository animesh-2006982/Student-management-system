"use client";

import { useMemo, useState } from "react";
import styles from "./staff.module.css";

type StaffMember = {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  status: "Active" | "Inactive";
};

export default function StaffPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [showModal, setShowModal] = useState(false);

  // Database connect hone tak empty rakha gaya hai
  const staff: StaffMember[] = [];

  const departments = useMemo(() => {
    const values = Array.from(
      new Set(staff.map((person) => person.department).filter(Boolean))
    );

    return ["All Departments", ...values];
  }, [staff]);

  const filteredStaff = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return staff.filter((person) => {
      const matchesSearch =
        !keyword ||
        person.name.toLowerCase().includes(keyword) ||
        person.role.toLowerCase().includes(keyword) ||
        person.phone.toLowerCase().includes(keyword);

      const matchesDepartment =
        department === "All Departments" ||
        person.department === department;

      return matchesSearch && matchesDepartment;
    });
  }, [staff, search, department]);

  const totalStaff = staff.length;
  const activeStaff = staff.filter(
    (person) => person.status === "Active"
  ).length;
  const inactiveStaff = staff.filter(
    (person) => person.status === "Inactive"
  ).length;

  const departmentCount = new Set(
    staff.map((person) => person.department).filter(Boolean)
  ).size;

  return (
    <main className={styles.page}>
      {/* Background animation */}
      <div className={styles.glowOne} />
      <div className={styles.glowTwo} />

      {/* Page Header */}
      <section className={styles.pageHeader}>
        <div className={styles.headerText}>
          <div className={styles.eyebrow}>MANAGEMENT</div>

          <h1>
            Staff <span>Management</span>
          </h1>

          <p>
            Manage teachers, administrators and other staff members
            from one organized workspace.
          </p>
        </div>

        {/* ONLY ONE ADD STAFF BUTTON */}
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setShowModal(true)}
        >
          <span>+</span>
          Add Staff
        </button>
      </section>

      {/* Statistics */}
      <section className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.purpleCard}`}>
          <div className={styles.statIcon}>♙</div>

          <div className={styles.statContent}>
            <span>Total Staff</span>
            <strong>{totalStaff}</strong>
            <small>Database records</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.greenCard}`}>
          <div className={styles.statIcon}>✓</div>

          <div className={styles.statContent}>
            <span>Active Staff</span>
            <strong>{activeStaff}</strong>
            <small>Currently active</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.orangeCard}`}>
          <div className={styles.statIcon}>!</div>

          <div className={styles.statContent}>
            <span>Inactive Staff</span>
            <strong>{inactiveStaff}</strong>
            <small>Not active</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.blueCard}`}>
          <div className={styles.statIcon}>#</div>

          <div className={styles.statContent}>
            <span>Departments</span>
            <strong>{departmentCount}</strong>
            <small>Available departments</small>
          </div>
        </div>
      </section>

      {/* Staff Directory */}
      <section className={styles.directory}>
        <div className={styles.directoryHeader}>
          <div>
            <div className={styles.directoryLabel}>STAFF DIRECTORY</div>

            <h2>All Staff Members</h2>

            <p>
              View and manage staff information from your institution.
            </p>
          </div>
        </div>

        {/* Search / Filter */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <select
            className={styles.departmentSelect}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            {departments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>STAFF</th>
                <th>ROLE</th>
                <th>DEPARTMENT</th>
                <th>PHONE</th>
                <th>STATUS</th>
              </tr>
            </thead>

            <tbody>
              {filteredStaff.length > 0 ? (
                filteredStaff.map((person) => (
                  <tr key={person.id}>
                    <td>{person.id}</td>

                    <td>
                      <div className={styles.staffName}>
                        <div className={styles.avatar}>
                          {person.name.charAt(0).toUpperCase()}
                        </div>

                        <strong>{person.name}</strong>
                      </div>
                    </td>

                    <td>{person.role}</td>
                    <td>{person.department}</td>
                    <td>{person.phone}</td>

                    <td>
                      <span
                        className={
                          person.status === "Active"
                            ? styles.activeBadge
                            : styles.inactiveBadge
                        }
                      >
                        {person.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>♙</div>

                      <h3>No staff records yet</h3>

                      <p>
                        Staff information will appear here when connected
                        to your database.
                      </p>

                      {search || department !== "All Departments" ? (
                        <button
                          type="button"
                          className={styles.resetButton}
                          onClick={() => {
                            setSearch("");
                            setDepartment("All Departments");
                          }}
                        >
                          Reset Filters
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ADD STAFF MODAL */}
      {showModal && (
        <div
          className={styles.modalOverlay}
          onMouseDown={() => setShowModal(false)}
        >
          <div
            className={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalLabel}>STAFF</span>
                <h2>Add New Staff</h2>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.formGrid}>
              <label>
                Full Name
                <input
                  type="text"
                  placeholder="Enter staff name"
                />
              </label>

              <label>
                Role
                <input
                  type="text"
                  placeholder="Teacher / Admin"
                />
              </label>

              <label>
                Department
                <input
                  type="text"
                  placeholder="Enter department"
                />
              </label>

              <label>
                Phone
                <input
                  type="tel"
                  placeholder="Enter phone number"
                />
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.saveButton}
                onClick={() => {
                  alert(
                    "Database connection is not added yet. Staff will be saved here after database integration."
                  );
                }}
              >
                Save Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}