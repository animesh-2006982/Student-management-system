"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./batches.module.css";

export default function BatchesPage() {
  const [showModal, setShowModal] = useState(false);

  const [batchName, setBatchName] = useState("");
  const [className, setClassName] = useState("");
  const [status, setStatus] = useState("Active");

  function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();

    if (!batchName.trim() || !className.trim()) {
      alert("Please enter batch name and class.");
      return;
    }

    // Database integration will be added later.
    alert("Batch form is ready. Database connection will be added later.");

    setBatchName("");
    setClassName("");
    setStatus("Active");
    setShowModal(false);
  }

  return (
    <main className={styles.page}>

      {/* TOP HEADER */}
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <strong>Batches</strong>
          </div>

          <div className={styles.eyebrow}>
            <span className={styles.dot}></span>
            ACADEMIC MANAGEMENT
          </div>

          <h1>
            Manage <span>Batches</span>
          </h1>

          <p>
            Create and manage classes, batches and academic groups
            from one organized workspace.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => alert("Export will be connected to database later.")}
          >
            ↓ Export
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setShowModal(true)}
          >
            + Create Batch
          </button>
        </div>
      </header>


      {/* STATS */}
      <section className={styles.statsGrid}>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.purple}`}>
            ▦
          </div>

          <div>
            <span>Total Batches</span>
            <strong>0</strong>
            <small>No batch data yet</small>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.green}`}>
            ✓
          </div>

          <div>
            <span>Active Batches</span>
            <strong>0</strong>
            <small>Currently active</small>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.orange}`}>
            ◷
          </div>

          <div>
            <span>Inactive Batches</span>
            <strong>0</strong>
            <small>Currently inactive</small>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blue}`}>
            ♙
          </div>

          <div>
            <span>Total Students</span>
            <strong>0</strong>
            <small>Fetched from database later</small>
          </div>
        </div>

      </section>


      {/* BATCH DIRECTORY */}
      <section className={styles.panel}>

        <div className={styles.panelHeader}>

          <div>
            <div className={styles.panelEyebrow}>
              BATCH DIRECTORY
            </div>

            <h2>All Batches</h2>

            <p>
              View and manage every academic batch in your institution.
            </p>
          </div>

          <button
            type="button"
            className={styles.mobileAddBtn}
            onClick={() => setShowModal(true)}
          >
            + Add
          </button>

        </div>


        {/* TOOLBAR */}
        <div className={styles.toolbar}>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${styles.activeTab}`}>
              All <span>0</span>
            </button>

            <button className={styles.tab}>
              Active <span>0</span>
            </button>

            <button className={styles.tab}>
              Inactive <span>0</span>
            </button>
          </div>


          <div className={styles.filters}>

            <select
              className={styles.select}
              defaultValue="all"
              onChange={(e) => {
                console.log("Class filter:", e.target.value);
              }}
            >
              <option value="all">All Classes</option>
              <option value="nursery">Nursery</option>
              <option value="kg">Kindergarten</option>
              <option value="1">1st Class</option>
              <option value="2">2nd Class</option>
              <option value="3">3rd Class</option>
              <option value="4">4th Class</option>
              <option value="5">5th Class</option>
              <option value="6">6th Class</option>
              <option value="7">7th Class</option>
              <option value="8">8th Class</option>
              <option value="9">9th Class</option>
              <option value="10">10th Class</option>
              <option value="11">11th Class</option>
              <option value="12">12th Class</option>
            </select>

            <input
              className={styles.search}
              type="search"
              placeholder="⌕  Search batches..."
              onChange={(e) => {
                console.log("Search:", e.target.value);
              }}
            />

          </div>

        </div>


        {/* EMPTY STATE */}
        <div className={styles.emptyState}>

          <div className={styles.emptyIcon}>
            ▦
          </div>

          <h3>No batches yet</h3>

          <p>
            Batch information will appear here when batches are
            connected with the database.
          </p>

          <button
            type="button"
            className={styles.emptyButton}
            onClick={() => setShowModal(true)}
          >
            + Create First Batch
          </button>

        </div>

      </section>


      {/* INFO CARDS */}
      <section className={styles.infoGrid}>

        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>✦</div>

          <div>
            <span>ACADEMIC ORGANIZATION</span>
            <h3>Keep your classes organized.</h3>
            <p>
              Create separate batches for different classes,
              sessions and academic groups.
            </p>
          </div>
        </div>


        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>↗</div>

          <div>
            <span>DATABASE READY</span>
            <h3>Live batch data coming next.</h3>
            <p>
              Once your database is connected, students and batch
              information will automatically appear here.
            </p>
          </div>
        </div>

      </section>


      {/* CREATE BATCH MODAL */}
      {showModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowModal(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >

            <div className={styles.modalHeader}>
              <div>
                <span>ACADEMIC MANAGEMENT</span>
                <h2>Create New Batch</h2>
                <p>Add a new academic batch.</p>
              </div>

              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>


            <form onSubmit={handleCreateBatch}>

              <div className={styles.formGroup}>
                <label>Batch Name</label>

                <input
                  type="text"
                  placeholder="Example: Morning Batch"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />
              </div>


              <div className={styles.formGroup}>
                <label>Class</label>

                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                >
                  <option value="">Select class</option>
                  <option value="Nursery">Nursery</option>
                  <option value="KG">Kindergarten</option>
                  <option value="1st Class">1st Class</option>
                  <option value="2nd Class">2nd Class</option>
                  <option value="3rd Class">3rd Class</option>
                  <option value="4th Class">4th Class</option>
                  <option value="5th Class">5th Class</option>
                  <option value="6th Class">6th Class</option>
                  <option value="7th Class">7th Class</option>
                  <option value="8th Class">8th Class</option>
                  <option value="9th Class">9th Class</option>
                  <option value="10th Class">10th Class</option>
                  <option value="11th Class">11th Class</option>
                  <option value="12th Class">12th Class</option>
                </select>
              </div>


              <div className={styles.formGroup}>
                <label>Status</label>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>


              <div className={styles.modalActions}>

                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={styles.saveBtn}
                >
                  Create Batch
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </main>
  );
}