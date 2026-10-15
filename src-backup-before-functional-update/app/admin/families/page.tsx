"use client";

import Link from "next/link";
import styles from "./families.module.css";

export default function FamiliesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>FAMILY MANAGEMENT</p>
          <h1>Manage Families</h1>
          <span>
            Manage guardians and family information connected with students.
          </span>
        </div>

        <Link href="/admin" className={styles.back}>
          ← Dashboard
        </Link>
      </header>

      <section className={styles.cards}>
        <div className={styles.card}>
          <small>Total Families</small>
          <strong>0</strong>
          <span>Database data will appear here</span>
        </div>

        <div className={styles.card}>
          <small>Parents / Guardians</small>
          <strong>0</strong>
          <span>No records connected</span>
        </div>

        <div className={styles.card}>
          <small>Students Connected</small>
          <strong>0</strong>
          <span>Waiting for database</span>
        </div>
      </section>

      <section className={styles.panel}>
        <div>
          <p>FAMILY DIRECTORY</p>
          <h2>All Families</h2>
          <span>Family records will be fetched from the database.</span>
        </div>

        <div className={styles.empty}>
          <div>♧</div>
          <h3>No families yet</h3>
          <p>
            Family and guardian information will appear here after database
            connection.
          </p>
        </div>
      </section>
    </main>
  );
}