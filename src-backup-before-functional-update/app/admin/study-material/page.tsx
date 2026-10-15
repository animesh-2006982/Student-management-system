"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./study-material.module.css";

type Material = {
  id: number;
  title: string;
  subject: string;
  type: "PDF" | "Video" | "Document";
  date: string;
};

export default function StudyMaterialPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All Types");

  // Later database se fetch hoga
  const materials: Material[] = [];

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const query = search.toLowerCase().trim();

      const matchesSearch =
        material.title.toLowerCase().includes(query) ||
        material.subject.toLowerCase().includes(query);

      const matchesType =
        type === "All Types" || material.type === type;

      return matchesSearch && matchesType;
    });
  }, [search, type]);

  const handleAddMaterial = () => {
    alert("Add Material clicked");
  };

  const handleClear = () => {
    setSearch("");
    setType("All Types");
  };

  const totalMaterials = materials.length;

  const pdfCount = materials.filter(
    (item) => item.type === "PDF"
  ).length;

  const videoCount = materials.filter(
    (item) => item.type === "Video"
  ).length;

  const documentCount = materials.filter(
    (item) => item.type === "Document"
  ).length;

  return (
    <main className={styles.page}>

      {/* HEADER */}
      <header className={styles.topBar}>
        <div className={styles.headerContent}>

          <div className={styles.breadcrumb}>
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <span>Study Material</span>
          </div>

          <p className={styles.eyebrow}>
            ACADEMIC MANAGEMENT
          </p>

          <h1>
            Study <span>Material</span>
          </h1>

          <p className={styles.description}>
            Upload, organize and manage learning resources
            for your students.
          </p>

        </div>

        {/* ONLY ONE ADD MATERIAL BUTTON */}
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddMaterial}
        >
          <span>+</span>
          Add Material
        </button>
      </header>


      {/* STATISTICS */}
      <section className={styles.statsGrid}>

        <div className={`${styles.statCard} ${styles.purple}`}>
          <div className={styles.icon}>▤</div>

          <div className={styles.statContent}>
            <span>Total Materials</span>
            <strong>{totalMaterials}</strong>
            <small>Database records</small>
          </div>
        </div>


        <div className={`${styles.statCard} ${styles.red}`}>
          <div className={styles.icon}>
            <small>PDF</small>
          </div>

          <div className={styles.statContent}>
            <span>PDF Files</span>
            <strong>{pdfCount}</strong>
            <small>Study documents</small>
          </div>
        </div>


        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.icon}>▶</div>

          <div className={styles.statContent}>
            <span>Videos</span>
            <strong>{videoCount}</strong>
            <small>Video resources</small>
          </div>
        </div>


        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.icon}>▱</div>

          <div className={styles.statContent}>
            <span>Documents</span>
            <strong>{documentCount}</strong>
            <small>Learning resources</small>
          </div>
        </div>

      </section>


      {/* MATERIAL DIRECTORY */}
      <section className={styles.directory}>

        <div className={styles.directoryHeader}>

          <div>
            <p className={styles.eyebrow}>
              RESOURCE LIBRARY
            </p>

            <h2>All Study Materials</h2>

            <p>
              Manage educational resources from one place.
            </p>
          </div>

        </div>


        {/* FILTERS */}
        <div className={styles.filters}>

          <div className={styles.searchBox}>
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search material or subject..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>


          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
          >
            <option>All Types</option>
            <option>PDF</option>
            <option>Video</option>
            <option>Document</option>
          </select>


          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
          >
            Clear
          </button>

        </div>


        {/* TABLE */}
        <div className={styles.table}>

          <div className={styles.tableHead}>
            <span>ID</span>
            <span>MATERIAL</span>
            <span>SUBJECT</span>
            <span>TYPE</span>
            <span>DATE</span>
          </div>


          {filteredMaterials.length > 0 ? (

            filteredMaterials.map((material) => (
              <div
                className={styles.tableRow}
                key={material.id}
              >
                <span>{material.id}</span>

                <strong>{material.title}</strong>

                <span>{material.subject}</span>

                <span>{material.type}</span>

                <span>{material.date}</span>
              </div>
            ))

          ) : (

            <div className={styles.emptyState}>

              <div className={styles.emptyIcon}>
                ▤
              </div>

              <h3>
                No study materials found
              </h3>

              <p>
                Study materials will appear here when
                you add them or connect your database.
              </p>

            </div>

          )}

        </div>

      </section>

    </main>
  );
}