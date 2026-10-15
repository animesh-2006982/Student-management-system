"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./enquiries.module.css";

type EnquiryStatus = "New" | "Contacted" | "Converted" | "Closed";

type Enquiry = {
  id: string;
  name: string;
  phone: string;
  course: string;
  date: string;
  status: EnquiryStatus;
};

const statusClass: Record<EnquiryStatus, string> = {
  New: styles.newStatus,
  Contacted: styles.contactedStatus,
  Converted: styles.convertedStatus,
  Closed: styles.closedStatus,
};

const statsMeta = [
  { key: "total", label: "Total Enquiries", note: "From database", icon: "?", tone: styles.purple },
  { key: "new", label: "New Enquiries", note: "Need follow-up", icon: "!", tone: styles.orange },
  { key: "contacted", label: "Contacted", note: "Follow-up done", icon: "↗", tone: styles.blue },
  { key: "converted", label: "Converted", note: "Successful admissions", icon: "✓", tone: styles.green },
];

export default function EnquiriesPage() {
  const supabase = createClient();

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | EnquiryStatus>("All");
  const [tab, setTab] = useState<"All" | EnquiryStatus>("All");
  const [showModal, setShowModal] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [course, setCourse] = useState("");

  const loadEnquiries = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please login again.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.institute_id) {
        throw new Error("Institute profile not found.");
      }

      const { data, error: enquiryError } = await supabase
        .from("enquiries")
        .select("id,name,phone,course,enquiry_date,status")
        .eq("institute_id", profile.institute_id)
        .order("enquiry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (enquiryError) throw enquiryError;

      setEnquiries(
        (data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          course: item.course,
          date: item.enquiry_date,
          status: item.status as EnquiryStatus,
        }))
      );
    } catch (err: any) {
      console.error("Load enquiries error:", err);
      setError(err?.message || err?.details || "Unable to load enquiries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, []);

  const filteredEnquiries = useMemo(() => {
    const q = search.trim().toLowerCase();

    return enquiries.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.course.toLowerCase().includes(q);

      const selectedStatus = tab !== "All" ? tab : statusFilter;
      const matchesStatus =
        selectedStatus === "All" || item.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [enquiries, search, statusFilter, tab]);

  const counts = useMemo(
    () => ({
      total: enquiries.length,
      new: enquiries.filter((x) => x.status === "New").length,
      contacted: enquiries.filter((x) => x.status === "Contacted").length,
      converted: enquiries.filter((x) => x.status === "Converted").length,
    }),
    [enquiries]
  );

  const resetModal = () => {
    setName("");
    setPhone("");
    setCourse("");
    setShowModal(false);
  };

  const addEnquiry = async () => {
    if (!name.trim() || !phone.trim() || !course.trim()) {
      setError("Name, phone and course are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please login again.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.institute_id) throw new Error("Institute profile not found.");

      const { error: insertError } = await supabase.from("enquiries").insert({
        institute_id: profile.institute_id,
        name: name.trim(),
        phone: phone.trim(),
        course: course.trim(),
        enquiry_date: new Date().toISOString().slice(0, 10),
        status: "New",
        created_by: user.id,
      });

      if (insertError) throw insertError;

      resetModal();
      await loadEnquiries();
    } catch (err: any) {
      console.error("Add enquiry error:", err);
      setError(err?.message || err?.details || "Unable to add enquiry.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, nextStatus: EnquiryStatus) => {
    setError("");
    setOpenMenu(null);

    const { error: updateError } = await supabase
      .from("enquiries")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update enquiry error:", updateError);
      setError(updateError.message || "Unable to update status.");
      return;
    }

    setEnquiries((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: nextStatus } : item
      )
    );
  };

  const deleteEnquiry = async (id: string) => {
    if (!window.confirm("Delete this enquiry?")) return;

    setError("");
    setOpenMenu(null);

    const { error: deleteError } = await supabase
      .from("enquiries")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Delete enquiry error:", deleteError);
      setError(deleteError.message || "Unable to delete enquiry.");
      return;
    }

    setEnquiries((current) => current.filter((item) => item.id !== id));
  };

  const exportCsv = () => {
    if (!filteredEnquiries.length) {
      window.alert("No enquiry data available to export.");
      return;
    }

    const header = ["Name", "Phone", "Course", "Date", "Status"];

    const rows = filteredEnquiries.map((item) =>
      [
        item.name,
        item.phone,
        item.course,
        item.date,
        item.status,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "studentflow-enquiries.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <div className={styles.breadcrumb}>
            <a href="/admin">Dashboard</a>
            <span>/</span>
            <strong>Enquiries</strong>
          </div>

          <div className={styles.eyebrow}>
            <span className={styles.dot} />
            ADMISSION MANAGEMENT
          </div>

          <h1>
            Manage <span>Enquiries</span>
          </h1>

          <p>
            Create and manage admission enquiries, follow-ups and prospective
            students from one organized workspace.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryBtn} onClick={exportCsv}>
            ↓ Export
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setError("");
              setShowModal(true);
            }}
          >
            + Create Enquiry
          </button>
        </div>
      </header>

      {error && <div className={styles.errorBox}>{error}</div>}

      <section className={styles.statsGrid}>
        {statsMeta.map((stat) => (
          <div className={styles.statCard} key={stat.key}>
            <div className={`${styles.statIcon} ${stat.tone}`}>{stat.icon}</div>
            <div>
              <span>{stat.label}</span>
              <strong>{counts[stat.key as keyof typeof counts]}</strong>
              <small>{stat.note}</small>
            </div>
          </div>
        ))}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.panelEyebrow}>ENQUIRY DIRECTORY</div>
            <h2>All Enquiries</h2>
            <p>View and manage every admission enquiry in your institution.</p>
          </div>

          <button
            type="button"
            className={styles.mobileAddBtn}
            onClick={() => {
              setError("");
              setShowModal(true);
            }}
          >
            + Add
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.tabs}>
            {(["All", "New", "Contacted", "Converted"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.tab} ${
                  tab === item ? styles.activeTab : ""
                }`}
                onClick={() => {
                  setTab(item);
                  setStatusFilter("All");
                }}
              >
                {item}
                <span>
                  {item === "All"
                    ? counts.total
                    : counts[item.toLowerCase() as "new" | "contacted" | "converted"]}
                </span>
              </button>
            ))}
          </div>

          <div className={styles.filters}>
            <select
              className={styles.select}
              value={statusFilter}
              onChange={(event) => {
                setTab("All");
                setStatusFilter(event.target.value as "All" | EnquiryStatus);
              }}
            >
              <option value="All">All Status</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Converted">Converted</option>
              <option value="Closed">Closed</option>
            </select>

            <div className={styles.search}>
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search enquiries..."
                aria-label="Search enquiries"
              />
            </div>

            {(search || statusFilter !== "All" || tab !== "All") && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                  setTab("All");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>…</div>
            <h3>Loading enquiries</h3>
            <p>Fetching your enquiry records from Supabase.</p>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>?</div>
            <h3>No enquiries yet</h3>
            <p>
              {search || statusFilter !== "All" || tab !== "All"
                ? "No enquiries match the current search or filter."
                : "Add your first admission enquiry to start tracking prospective students."}
            </p>
            <button
              type="button"
              className={styles.emptyButton}
              onClick={() => {
                setError("");
                setShowModal(true);
              }}
            >
              + Create First Enquiry
            </button>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ENQUIRY</th>
                  <th>PHONE</th>
                  <th>COURSE</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {filteredEnquiries.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.person}>
                        <div className={styles.avatar}>
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.id.slice(0, 8)}</small>
                        </div>
                      </div>
                    </td>

                    <td>{item.phone}</td>
                    <td>{item.course}</td>
                    <td>{item.date}</td>

                    <td>
                      <span className={`${styles.status} ${statusClass[item.status]}`}>
                        {item.status}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actionArea}>
                        <button
                          type="button"
                          className={styles.viewButton}
                          onClick={() =>
                            window.alert(
                              `Name: ${item.name}\nPhone: ${item.phone}\nCourse: ${item.course}\nStatus: ${item.status}`
                            )
                          }
                        >
                          View
                        </button>

                        <button
                          type="button"
                          className={styles.moreButton}
                          onClick={() =>
                            setOpenMenu((current) =>
                              current === item.id ? null : item.id
                            )
                          }
                        >
                          ⋮
                        </button>

                        {openMenu === item.id && (
                          <div className={styles.actionMenu}>
                            {(["New", "Contacted", "Converted", "Closed"] as const).map(
                              (nextStatus) => (
                                <button
                                  key={nextStatus}
                                  type="button"
                                  onClick={() => updateStatus(item.id, nextStatus)}
                                >
                                  Mark {nextStatus}
                                </button>
                              )
                            )}

                            <button
                              type="button"
                              className={styles.deleteButton}
                              onClick={() => deleteEnquiry(item.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>✓</div>
          <div>
            <strong>Follow-up tracking</strong>
            <p>Keep every enquiry organized by status.</p>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>↗</div>
          <div>
            <strong>Conversion tracking</strong>
            <p>Move successful enquiries to Converted.</p>
          </div>
        </div>
      </section>

      {showModal && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              resetModal();
            }
          }}
        >
          <div className={styles.modal}>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => !saving && resetModal()}
            >
              ×
            </button>

            <div className={styles.modalIcon}>+</div>
            <h2>Create Enquiry</h2>
            <p>Add a new admission enquiry.</p>

            <div className={styles.form}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Student / Parent name"
                className={styles.formInput}
              />

              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
                className={styles.formInput}
              />

              <input
                value={course}
                onChange={(event) => setCourse(event.target.value)}
                placeholder="Course / Class"
                className={styles.formInput}
              />

              <button
                type="button"
                className={styles.modalCreateButton}
                onClick={addEnquiry}
                disabled={saving}
              >
                {saving ? "Saving..." : "Create Enquiry"}
              </button>

              <button
                type="button"
                className={styles.modalCancelButton}
                onClick={() => !saving && resetModal()}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
