"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./study-material.module.css";
import { createClient } from "@/lib/supabase/client";

type MaterialType = "PDF" | "Video" | "Document";

type Material = {
  id: string;
  title: string;
  subject: string;
  type: MaterialType;
  date: string;
  url: string;
};

const toType = (value: string | null): MaterialType =>
  value === "PDF" ? "PDF" : value === "Video" ? "Video" : "Document";

export default function StudyMaterialPage() {
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [type, setType] = useState("All Types");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [pendingMaterial, setPendingMaterial] = useState<{
    title: string;
    subject: string;
    materialType: MaterialType;
    description: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getInstitute = async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("Please login again.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile?.institute_id) throw new Error("Institute profile not found.");

    return { userId: user.id, instituteId: profile.institute_id as string };
  };

  const loadMaterials = async () => {
    setLoading(true);
    setError("");

    try {
      const { instituteId } = await getInstitute();

      const { data, error: loadError } = await supabase
        .from("study_material")
        .select("id,title,subject,material_type,file_url,created_at")
        .eq("institute_id", instituteId)
        .order("created_at", { ascending: false });

      if (loadError) throw loadError;

      setMaterials(
        (data ?? []).map((item: any) => ({
          id: item.id,
          title: item.title,
          subject: item.subject || "General",
          type: toType(item.material_type),
          date: item.created_at
            ? new Date(item.created_at).toISOString().slice(0, 10)
            : "",
          url: item.file_url || "",
        }))
      );
    } catch (err: any) {
      console.error("Study material load error:", err);
      setError(err?.message || "Unable to load study materials.");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const filteredMaterials = useMemo(() => {
    const query = search.toLowerCase().trim();

    return materials.filter((material) => {
      const matchesSearch =
        !query ||
        material.title.toLowerCase().includes(query) ||
        material.subject.toLowerCase().includes(query);

      const matchesType =
        type === "All Types" || material.type === type;

      return matchesSearch && matchesType;
    });
  }, [materials, search, type]);

  const saveMaterial = async (fileUrl: string | null) => {
    if (!pendingMaterial) return;

    setBusy(true);
    setError("");

    try {
      const { userId, instituteId } = await getInstitute();

      const { error: insertError } = await supabase
        .from("study_material")
        .insert({
          institute_id: instituteId,
          title: pendingMaterial.title,
          description: pendingMaterial.description || null,
          subject: pendingMaterial.subject,
          material_type: pendingMaterial.materialType,
          file_url: fileUrl?.trim() || null,
          created_by: userId,
        });

      if (insertError) throw insertError;

      setPendingMaterial(null);
      setLinkValue("");
      setSelectedFile(null);
      setShowSourceModal(false);
      setShowLinkModal(false);
      setShowUploadModal(false);

      await loadMaterials();
    } catch (err: any) {
      console.error("Study material save error:", err);
      setError(err?.message || "Unable to save study material.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddMaterial = () => {
    if (busy) return;

    const title = window.prompt("Material title:");
    if (!title?.trim()) return;

    const subject = window.prompt("Subject:");
    if (!subject?.trim()) return;

    const rawType = window.prompt(
      "Type: PDF, Video or Document",
      "PDF"
    );
    if (!rawType?.trim()) return;

    const typeValue = rawType.trim().toLowerCase();

    let materialType: MaterialType;

    if (typeValue === "pdf") {
      materialType = "PDF";
    } else if (typeValue === "video") {
      materialType = "Video";
    } else if (typeValue === "document" || typeValue === "doc") {
      materialType = "Document";
    } else {
      setError("Type must be PDF, Video or Document.");
      return;
    }

    const description = window.prompt("Description (optional):") || "";

    setPendingMaterial({
      title: title.trim(),
      subject: subject.trim(),
      materialType,
      description: description.trim(),
    });

    setLinkValue("");
    setSelectedFile(null);

    if (materialType === "Video") {
      setShowLinkModal(true);
    } else {
      setShowSourceModal(true);
    }
  };

  const handleChooseUpload = () => {
    setShowSourceModal(false);
    setSelectedFile(null);
    setShowUploadModal(true);
  };

  const handleChooseLink = () => {
    setShowSourceModal(false);
    setLinkValue("");
    setShowLinkModal(true);
  };

  const handleFileSelected = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;
    if (!file || !pendingMaterial) return;

    const name = file.name.toLowerCase();

    if (
      pendingMaterial.materialType === "PDF" &&
      file.type !== "application/pdf" &&
      !name.endsWith(".pdf")
    ) {
      setError("Please select a PDF file.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    const allowedDocumentExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".ppt",
      ".pptx",
      ".xls",
      ".xlsx",
      ".txt",
    ];

    if (
      pendingMaterial.materialType === "Document" &&
      !allowedDocumentExtensions.some((ext) => name.endsWith(ext))
    ) {
      setError(
        "Document must be PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX or TXT."
      );
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setError("");
    setSelectedFile(file);
  };

  const handleUploadAndSave = async () => {
    if (!pendingMaterial || !selectedFile) {
      setError("Please select a file first.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const { userId, instituteId } = await getInstitute();

      const safeName = selectedFile.name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");

      const storagePath =
        `${instituteId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("study-material")
        .upload(storagePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type || undefined,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("study-material")
        .getPublicUrl(storagePath);

      const { error: insertError } = await supabase
        .from("study_material")
        .insert({
          institute_id: instituteId,
          title: pendingMaterial.title,
          description: pendingMaterial.description || null,
          subject: pendingMaterial.subject,
          material_type: pendingMaterial.materialType,
          file_url: publicUrl,
          created_by: userId,
        });

      if (insertError) {
        await supabase.storage
          .from("study-material")
          .remove([storagePath]);
        throw insertError;
      }

      setPendingMaterial(null);
      setSelectedFile(null);
      setShowUploadModal(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadMaterials();
    } catch (err: any) {
      console.error("Study material upload error:", err);
      setError(err?.message || "Unable to upload and save the file.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveLink = async () => {
    if (!linkValue.trim()) {
      setError("Please enter a resource URL.");
      return;
    }

    await saveMaterial(linkValue.trim());
  };


  const handleRowAction = async (material: Material) => {
    const action = window.prompt(
      `Material: ${material.title}\n\nType View, Edit or Delete:`,
      "View"
    );

    if (!action) return;

    if (action.toLowerCase() === "view") {
      if (material.url) {
        window.open(material.url, "_blank", "noopener,noreferrer");
      } else {
        window.alert(
          `Title: ${material.title}\nSubject: ${material.subject}\nType: ${material.type}\n\nNo resource link added.`
        );
      }
      return;
    }

    if (action.toLowerCase() === "delete") {
      if (!window.confirm(`Delete "${material.title}"?`)) return;

      const { error: deleteError } = await supabase
        .from("study_material")
        .delete()
        .eq("id", material.id);

      if (deleteError) {
        setError(deleteError.message || "Unable to delete material.");
        return;
      }

      setMaterials((items) =>
        items.filter((item) => item.id !== material.id)
      );
      return;
    }

    if (action.toLowerCase() === "edit") {
      const title = window.prompt("Material title:", material.title);
      if (!title?.trim()) return;

      const subject = window.prompt("Subject:", material.subject);
      if (!subject?.trim()) return;

      const rawType = window.prompt(
        "Type: PDF, Video or Document",
        material.type
      );
      if (!rawType?.trim()) return;

      const typeValue = rawType.trim().toLowerCase();
      const materialType: MaterialType =
        typeValue === "pdf"
          ? "PDF"
          : typeValue === "video"
            ? "Video"
            : "Document";

      if (!["pdf", "video", "document"].includes(typeValue)) {
        setError("Type must be PDF, Video or Document.");
        return;
      }

      const fileUrl =
        window.prompt("File / video / resource link:", material.url) || "";

      const { error: updateError } = await supabase
        .from("study_material")
        .update({
          title: title.trim(),
          subject: subject.trim(),
          material_type: materialType,
          file_url: fileUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", material.id);

      if (updateError) {
        setError(updateError.message || "Unable to update material.");
        return;
      }

      await loadMaterials();
    }
  };

  const handleClear = () => {
    setSearch("");
    setType("All Types");
  };

  const totalMaterials = materials.length;
  const pdfCount = materials.filter((item) => item.type === "PDF").length;
  const videoCount = materials.filter((item) => item.type === "Video").length;
  const documentCount = materials.filter(
    (item) => item.type === "Document"
  ).length;

  return (
    <main className={styles.page}>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,application/pdf"
        onChange={handleFileSelected}
      />

      {(showSourceModal || showLinkModal || showUploadModal) && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(15, 20, 45, 0.58)",
          }}
        >
          <div
            style={{
              width: "min(460px, 100%)",
              borderRadius: 20,
              background: "#fff",
              padding: 24,
              boxShadow: "0 25px 70px rgba(20, 25, 60, 0.25)",
            }}
          >
            {showSourceModal && (
              <>
                <h2 style={{ margin: "0 0 8px", color: "#171b3b", fontSize: 21 }}>
                  Add {pendingMaterial?.materialType}
                </h2>
                <p style={{ margin: "0 0 20px", color: "#7b83a6", fontSize: 13 }}>
                  Choose how you want to add this resource.
                </p>

                <div style={{ display: "grid", gap: 12 }}>
                  <button
                    type="button"
                    onClick={handleChooseUpload}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "1px solid #dfe2ef",
                      borderRadius: 12,
                      background: "#f5f6ff",
                      color: "#5965ff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ↑ Upload File
                  </button>

                  <button
                    type="button"
                    onClick={handleChooseLink}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: 0,
                      borderRadius: 12,
                      background: "linear-gradient(135deg,#5965ff,#6755ee)",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ↗ Add Link
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSourceModal(false)}
                    style={{
                      padding: "11px",
                      border: "1px solid #dfe2ef",
                      borderRadius: 11,
                      background: "#fff",
                      color: "#777f9e",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {showUploadModal && (
              <>
                <h2 style={{ margin: "0 0 8px", color: "#171b3b", fontSize: 21 }}>
                  Upload {pendingMaterial?.materialType}
                </h2>

                <p style={{ margin: "0 0 16px", color: "#7b83a6", fontSize: 13 }}>
                  Select a file. It will be uploaded to Supabase Storage and
                  saved automatically.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,application/pdf"
                  onChange={handleFileSelected}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 12,
                    border: "1px dashed #aeb5d0",
                    borderRadius: 12,
                    background: "#fafbff",
                    color: "#454d70",
                  }}
                />

                {selectedFile && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 10,
                      background: "#eef8f5",
                      color: "#008f74",
                      fontSize: 12,
                    }}
                  >
                    Selected: <strong>{selectedFile.name}</strong>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button
                    type="button"
                    onClick={handleUploadAndSave}
                    disabled={busy || !selectedFile}
                    style={{
                      flex: 1,
                      padding: "13px 15px",
                      border: 0,
                      borderRadius: 11,
                      background:
                        busy || !selectedFile
                          ? "#b9bddd"
                          : "linear-gradient(135deg,#5965ff,#6755ee)",
                      color: "#fff",
                      fontWeight: 700,
                      cursor:
                        busy || !selectedFile ? "not-allowed" : "pointer",
                    }}
                  >
                    {busy ? "Uploading & Saving..." : "Upload & Save"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                    }}
                    disabled={busy}
                    style={{
                      padding: "13px 15px",
                      border: "1px solid #dfe2ef",
                      borderRadius: 11,
                      background: "#fff",
                      color: "#777f9e",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {showLinkModal && (
              <>
                <h2 style={{ margin: "0 0 8px", color: "#171b3b", fontSize: 21 }}>
                  Add Resource Link
                </h2>

                <p style={{ margin: "0 0 16px", color: "#7b83a6", fontSize: 13 }}>
                  Paste the {pendingMaterial?.materialType.toLowerCase()} link.
                </p>

                <input
                  type="url"
                  value={linkValue}
                  onChange={(event) => setLinkValue(event.target.value)}
                  placeholder="https://..."
                  autoFocus
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    height: 48,
                    padding: "0 14px",
                    border: "1px solid #dce0ec",
                    borderRadius: 11,
                    outline: "none",
                    color: "#202543",
                    fontSize: 13,
                  }}
                />

                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button
                    type="button"
                    onClick={handleSaveLink}
                    disabled={busy || !linkValue.trim()}
                    style={{
                      flex: 1,
                      padding: "13px 15px",
                      border: 0,
                      borderRadius: 11,
                      background:
                        busy || !linkValue.trim()
                          ? "#b9bddd"
                          : "linear-gradient(135deg,#5965ff,#6755ee)",
                      color: "#fff",
                      fontWeight: 700,
                      cursor:
                        busy || !linkValue.trim()
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {busy ? "Saving..." : "Save Link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    disabled={busy}
                    style={{
                      padding: "13px 15px",
                      border: "1px solid #dfe2ef",
                      borderRadius: 11,
                      background: "#fff",
                      color: "#777f9e",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,application/pdf"
        onChange={handleFileSelected}
      />
      <header className={styles.topBar}>
        <div className={styles.headerContent}>
          <div className={styles.breadcrumb}>
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <span>Study Material</span>
          </div>

          <p className={styles.eyebrow}>ACADEMIC MANAGEMENT</p>

          <h1>
            Study <span>Material</span>
          </h1>

          <p className={styles.description}>
            Upload, organize and manage learning resources
            for your students.
          </p>
        </div>

        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddMaterial}
          disabled={busy}
        >
          <span>+</span>
          {busy ? "Saving..." : "Add Material"}
        </button>
      </header>

      {error && (
        <div
          style={{
            marginBottom: 18,
            padding: "12px 15px",
            border: "1px solid #ffc9cf",
            borderRadius: 12,
            background: "#fff1f2",
            color: "#dc3545",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

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
          <div className={styles.icon}><small>PDF</small></div>
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

      <section className={styles.directory}>
        <div className={styles.directoryHeader}>
          <div>
            <p className={styles.eyebrow}>RESOURCE LIBRARY</p>
            <h2>All Study Materials</h2>
            <p>Manage educational resources from one place.</p>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search material or subject..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
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

        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>ID</span>
            <span>MATERIAL</span>
            <span>SUBJECT</span>
            <span>TYPE</span>
            <span>DATE</span>
          </div>

          {loading ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>…</div>
              <h3>Loading study materials</h3>
              <p>Fetching learning resources from database.</p>
            </div>
          ) : filteredMaterials.length > 0 ? (
            filteredMaterials.map((material) => (
              <div
                className={styles.tableRow}
                key={material.id}
                onDoubleClick={() => handleRowAction(material)}
                title="Double-click for View / Edit / Delete"
              >
                <span>#{material.id.slice(-4)}</span>
                <strong
                  onClick={() => {
                    if (material.url) {
                      window.open(material.url, "_blank", "noopener,noreferrer");
                    } else {
                      window.alert(
                        `No ${material.type} link has been added for "${material.title}".`
                      );
                    }
                  }}
                  style={{
                    cursor: "pointer",
                    color: "#5965ff",
                    textDecoration: material.url ? "underline" : "none",
                  }}
                  title={material.url ? `Open ${material.type}` : `No ${material.type} link added`}
                >
                  {material.title}
                </strong>
                <span>{material.subject}</span>
                <span>{material.type}</span>
                <span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{material.date}</span>
                    {material.url && (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(material.url, "_blank", "noopener,noreferrer")
                        }
                        style={{
                          border: "1px solid #dce0ec",
                          borderRadius: 9,
                          background: "#fff",
                          color: "#5965ff",
                          padding: "6px 9px",
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {material.type === "Video"
                          ? "▶ Watch"
                          : material.type === "PDF"
                            ? "↗ PDF"
                            : "↗ Open"}
                      </button>
                    )}
                  </div>
                </span>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>▤</div>
              <h3>No study materials found</h3>
              <p>
                Study materials will appear here when you add them
                or connect your database.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
