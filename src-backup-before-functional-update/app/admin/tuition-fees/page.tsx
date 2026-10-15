"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./tuition-fees.module.css";

export default function TuitionFeesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [showAddFee, setShowAddFee] = useState(false);

  const filters = ["All", "Paid", "Pending", "Partial"];

  return (
    <div className={styles.page}>

      {/* PAGE HEADER */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.eyebrow}>FINANCE MANAGEMENT</div>

          <h1>
            Tuition <span>Fees</span>
          </h1>

          <p>
            Manage student fees, payments and pending balances
            from one organized workspace.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.exportButton}
            onClick={() => alert("Export will be available when database is connected.")}
          >
            ↓
            <span>Export</span>
          </button>

          <button
            className={styles.addButton}
            onClick={() => setShowAddFee(true)}
          >
            +
            <span>Add Fee</span>
          </button>
        </div>
      </div>


      {/* STAT CARDS */}
      <div className={styles.statsGrid}>

        <div className={`${styles.statCard} ${styles.purpleCard}`}>
          <div className={styles.statIcon}>₹</div>

          <div>
            <p>Total Fees</p>
            <strong>₹0</strong>
            <small>All fee records</small>
          </div>
        </div>


        <div className={`${styles.statCard} ${styles.greenCard}`}>
          <div className={styles.statIcon}>✓</div>

          <div>
            <p>Total Collected</p>
            <strong>₹0</strong>
            <small>Amount received</small>
          </div>
        </div>


        <div className={`${styles.statCard} ${styles.orangeCard}`}>
          <div className={styles.statIcon}>!</div>

          <div>
            <p>Pending Fees</p>
            <strong>₹0</strong>
            <small>Amount remaining</small>
          </div>
        </div>


        <div className={`${styles.statCard} ${styles.blueCard}`}>
          <div className={styles.statIcon}>#</div>

          <div>
            <p>Fee Records</p>
            <strong>0</strong>
            <small>Database records</small>
          </div>
        </div>

      </div>


      {/* FEE DIRECTORY */}
      <section className={styles.directory}>

        <div className={styles.directoryHeader}>

          <div>
            <div className={styles.eyebrow}>FEE DIRECTORY</div>

            <h2>All Fee Records</h2>

            <p>
              View and manage student tuition fee information.
            </p>
          </div>

          <button
            className={styles.recordButton}
            onClick={() => setShowAddFee(true)}
          >
            + Record Payment
          </button>

        </div>


        {/* FILTER BAR */}
        <div className={styles.filterBar}>

          <div className={styles.filters}>
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={
                  activeFilter === filter
                    ? styles.activeFilter
                    : styles.filterButton
                }
              >
                {filter}
              </button>
            ))}
          </div>

          <select className={styles.select}>
            <option>All Status</option>
            <option>Paid</option>
            <option>Pending</option>
            <option>Partial</option>
          </select>

          <input
            className={styles.search}
            type="text"
            placeholder="⌕  Search student..."
          />

        </div>


        {/* EMPTY DATABASE STATE */}
        <div className={styles.emptyState}>

          <div className={styles.emptyIcon}>₹</div>

          <h3>No fee records yet</h3>

          <p>
            Student fee information will appear here automatically
            when the database is connected.
          </p>

          <button
            className={styles.emptyButton}
            onClick={() => setShowAddFee(true)}
          >
            + Add First Fee
          </button>

        </div>

      </section>


      {/* MODAL */}
      {showAddFee && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowAddFee(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >

            <div className={styles.modalHeader}>
              <div>
                <span>FEE MANAGEMENT</span>
                <h2>Add Fee Record</h2>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setShowAddFee(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.form}>

              <div className={styles.inputGroup}>
                <label>Student</label>
                <select>
                  <option>No students available</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Total Fee</label>
                <input
                  type="number"
                  placeholder="₹ 0"
                  defaultValue=""
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Paid Amount</label>
                <input
                  type="number"
                  placeholder="₹ 0"
                  defaultValue=""
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowAddFee(false)}
                >
                  Cancel
                </button>

                <button
                  className={styles.saveButton}
                  onClick={() => {
                    alert("Fee record will be saved when database is connected.");
                    setShowAddFee(false);
                  }}
                >
                  Save Fee
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}