
"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./staff.module.css";
import { createClient } from "@/lib/supabase/client";

type StaffStatus = "Active" | "Inactive";

type StaffMember = {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  status: StaffStatus;
};

type StaffForm = {
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  joiningDate: string;
  salary: string;
  address: string;
  status: StaffStatus;
};

const emptyForm: StaffForm = {
  firstName: "",
  lastName: "",
  role: "",
  department: "",
  phone: "",
  email: "",
  joiningDate: "",
  salary: "",
  address: "",
  status: "Active",
};

export default function StaffPage() {
  const supabase = createClient();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [staffLimit, setStaffLimit] = useState<number | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please login first.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.institute_id) {
        throw new Error("Unable to load your institute profile.");
      }

      const subscriptionResponse = await fetch("/api/my-subscription", { cache: "no-store" });
      if (subscriptionResponse.ok) {
        const subscriptionPayload = await subscriptionResponse.json();
        setStaffLimit(typeof subscriptionPayload?.subscription?.staffLimit === "number" ? subscriptionPayload.subscription.staffLimit : null);
      } else {
        setStaffLimit(null);
      }

      const { data, error: staffError } = await supabase
        .from("staff")
        .select(
          "id, employee_id, first_name, last_name, phone, email, designation, department, status"
        )
        .eq("institute_id", profile.institute_id)
        .order("created_at", { ascending: false });

      if (staffError) throw staffError;

      const mapped: StaffMember[] = (data ?? []).map((person) => ({
        id: person.id,
        employeeId: person.employee_id || person.id.slice(0, 8).toUpperCase(),
        name: [person.first_name, person.last_name]
          .filter(Boolean)
          .join(" "),
        role: person.designation || "Staff",
        department: person.department || "General",
        phone: person.phone || "",
        email: person.email || "",
        status:
          String(person.status).toLowerCase() === "inactive"
            ? "Inactive"
            : "Active",
      }));

      setStaff(mapped);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to load staff records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

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
        person.phone.toLowerCase().includes(keyword) ||
        person.email.toLowerCase().includes(keyword) ||
        person.employeeId.toLowerCase().includes(keyword);

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

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      joiningDate: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = async (id: string) => {
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Please login first.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const subscriptionResponse = await fetch("/api/my-subscription", { cache: "no-store" });
      if (subscriptionResponse.ok) {
        const subscriptionPayload = await subscriptionResponse.json();
        setStaffLimit(typeof subscriptionPayload?.subscription?.staffLimit === "number" ? subscriptionPayload.subscription.staffLimit : null);
      } else {
        setStaffLimit(null);
      }

      const { data, error: staffError } = await supabase
        .from("staff")
        .select(
          "id, first_name, last_name, designation, department, phone, email, joining_date, salary, address, status"
        )
        .eq("id", id)
        .eq("institute_id", profile.institute_id)
        .single();

      if (staffError) throw staffError;

      setEditingId(data.id);
      setForm({
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        role: data.designation || "",
        department: data.department || "",
        phone: data.phone || "",
        email: data.email || "",
        joiningDate: data.joining_date || "",
        salary:
          data.salary === null || data.salary === undefined
            ? ""
            : String(data.salary),
        address: data.address || "",
        status:
          String(data.status).toLowerCase() === "inactive"
            ? "Inactive"
            : "Active",
      });
      setShowModal(true);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to load staff details."
      );
    }
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!form.firstName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!form.role.trim()) {
      setError("Role / designation is required.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please login first.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.institute_id) {
        throw new Error("Unable to load your institute profile.");
      }

      const firstName = form.firstName.trim();
      const lastName = form.lastName.trim() || null;

      if (editingId) {
        const { error: updateError } = await supabase
          .from("staff")
          .update({
            first_name: firstName,
            last_name: lastName,
            designation: form.role.trim(),
            department: form.department.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            joining_date: form.joiningDate || null,
            salary: form.salary ? Number(form.salary) : null,
            address: form.address.trim() || null,
            status: form.status.toLowerCase(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .eq("institute_id", profile.institute_id);

        if (updateError) throw updateError;

        setSuccess("Staff record updated successfully.");
      } else {
        const [countResult, subscriptionResponse] = await Promise.all([
          supabase.from("staff").select("id", { count: "exact", head: true }).eq("institute_id", profile.institute_id),
          fetch("/api/my-subscription", { cache: "no-store" }),
        ]);
        if (countResult.error) throw countResult.error;
        const subscriptionPayload = subscriptionResponse.ok ? await subscriptionResponse.json() : null;
        const limit = typeof subscriptionPayload?.subscription?.staffLimit === "number" ? subscriptionPayload.subscription.staffLimit : staffLimit;
        if (limit === null || subscriptionPayload?.subscription?.status !== "confirmed") {
          throw new Error("A confirmed subscription is required before adding staff. Please activate a plan first.");
        }
        if ((countResult.count ?? 0) >= limit) {
          setStaffLimit(limit);
          throw new Error(`Staff limit reached (${countResult.count ?? 0}/${limit}). Upgrade your plan or remove an existing staff record before adding another.`);
        }
        const employeeId = `EMP-${Date.now().toString().slice(-6)}`;

        const { error: insertError } = await supabase.from("staff").insert({
          institute_id: profile.institute_id,
          employee_id: employeeId,
          first_name: firstName,
          last_name: lastName,
          designation: form.role.trim(),
          department: form.department.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          joining_date: form.joiningDate || null,
          salary: form.salary ? Number(form.salary) : null,
          address: form.address.trim() || null,
          status: form.status.toLowerCase(),
        });

        if (insertError) throw insertError;

        setSuccess("Staff added successfully.");
      }

      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadStaff();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to save staff record."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this staff record?")) return;

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please login first.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const { error: deleteError } = await supabase
        .from("staff")
        .delete()
        .eq("id", id)
        .eq("institute_id", profile.institute_id);

      if (deleteError) throw deleteError;

      setSuccess("Staff record deleted successfully.");
      await loadStaff();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to delete staff record."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.glowOne} />
      <div className={styles.glowTwo} />

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

        <button
          type="button"
          className={styles.addButton}
          onClick={openAddModal}
          disabled={staffLimit !== null && totalStaff >= staffLimit}
          title={staffLimit !== null && totalStaff >= staffLimit ? "Staff limit reached for this plan" : "Add staff"}
        >
          <span>+</span>
          Add Staff
        </button>
      </section>

      <div style={{ margin: "0 0 16px", padding: "12px 14px", border: "1px solid #d9e2f0", background: "#f5f8ff", color: "#243b64", fontSize: 14 }}>
        Staff capacity: <strong>{loading ? "Loading…" : `${totalStaff}/${staffLimit ?? "—"}`}</strong>
        {staffLimit !== null ? ` · ${Math.max(0, staffLimit - totalStaff)} slots remaining` : " · Activate a plan to view capacity"}
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <section className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.purpleCard}`}>
          <div className={styles.statIcon}>♙</div>
          <div className={styles.statContent}>
            <span>Total Staff</span>
            <strong>{loading ? "..." : totalStaff}</strong>
            <small>Database records</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.greenCard}`}>
          <div className={styles.statIcon}>✓</div>
          <div className={styles.statContent}>
            <span>Active Staff</span>
            <strong>{loading ? "..." : activeStaff}</strong>
            <small>Currently active</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.orangeCard}`}>
          <div className={styles.statIcon}>!</div>
          <div className={styles.statContent}>
            <span>Inactive Staff</span>
            <strong>{loading ? "..." : inactiveStaff}</strong>
            <small>Not active</small>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.blueCard}`}>
          <div className={styles.statIcon}>#</div>
          <div className={styles.statContent}>
            <span>Departments</span>
            <strong>{loading ? "..." : departmentCount}</strong>
            <small>Available departments</small>
          </div>
        </div>
      </section>

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
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>♙</div>
                      <h3>Loading staff records...</h3>
                      <p>Please wait while staff data is loaded.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map((person) => (
                  <tr key={person.id}>
                    <td>{person.employeeId}</td>

                    <td>
                      <div className={styles.staffName}>
                        <div className={styles.avatar}>
                          {person.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <strong>{person.name}</strong>
                          {person.email && <small>{person.email}</small>}
                        </div>
                      </div>
                    </td>

                    <td>{person.role}</td>
                    <td>{person.department}</td>
                    <td>{person.phone || "—"}</td>

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

                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          onClick={() => openEditModal(person.id)}
                          disabled={deletingId === person.id}
                          title="Edit staff"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(person.id)}
                          disabled={deletingId === person.id}
                          title="Delete staff"
                        >
                          {deletingId === person.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>♙</div>

                      <h3>No staff records yet</h3>

                      <p>
                        {search || department !== "All Departments"
                          ? "No staff records match your current filters."
                          : "Staff information will appear here when connected to your database."}
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
                      ) : (
                        <button
                          type="button"
                          className={styles.resetButton}
                          onClick={openAddModal}
                        >
                          + Add First Staff
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div
          className={styles.modalOverlay}
          onMouseDown={() => {
            if (!saving) setShowModal(false);
          }}
        >
          <div
            className={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalLabel}>STAFF</span>
                <h2>{editingId ? "Edit Staff" : "Add New Staff"}</h2>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => !saving && setShowModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.formGrid}>
              <label>
                First Name *
                <input
                  type="text"
                  placeholder="Enter first name"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      firstName: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Last Name
                <input
                  type="text"
                  placeholder="Enter last name"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      lastName: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Role / Designation *
                <input
                  type="text"
                  placeholder="Teacher / Admin"
                  value={form.role}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      role: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Department
                <input
                  type="text"
                  placeholder="Enter department"
                  value={form.department}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      department: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Phone
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      phone: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  placeholder="Enter email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      email: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Joining Date
                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      joiningDate: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Salary
                <input
                  type="number"
                  min="0"
                  placeholder="Enter salary"
                  value={form.salary}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      salary: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      status: e.target.value as StaffStatus,
                    }))
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <label className={styles.fullWidth}>
                Address
                <textarea
                  placeholder="Enter address"
                  value={form.address}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      address: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => !saving && setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.saveButton}
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Staff"
                    : "Save Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
