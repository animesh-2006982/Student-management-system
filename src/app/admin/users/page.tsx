
"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./users.module.css";

type UserRecord = {
  id: string;
  institute_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  created_at?: string | null;
};

const roles = [
  "admin",
  "staff",
  "teacher",
  "accountant",
  "receptionist",
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [status, setStatus] = useState("active");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/users", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not load users.");
      }

      setUsers(result.users ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load users."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("staff");
    setStatus("active");
  }

  function openCreateForm() {
    setError("");
    setNotice("");
    setEditing(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("staff");
    setStatus("active");
    setShowForm(true);
  }

  function openEditForm(user: UserRecord) {
    setError("");
    setNotice("");
    setEditing(user);
    setFullName(user.full_name ?? "");
    setEmail(user.email ?? "");
    setPassword("");
    setRole(roles.includes(user.role ?? "") ? user.role! : "staff");
    setStatus(user.status === "inactive" ? "inactive" : "active");
    setShowForm(true);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? {
                id: editing.id,
                full_name: fullName,
                role,
                status,
              }
            : {
                full_name: fullName,
                email,
                password,
                role,
              }
        ),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save user.");
      }

      resetForm();
      setNotice(result.message || "Saved successfully.");
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save user."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: UserRecord) {
    const nextStatus = user.status === "active" ? "inactive" : "active";

    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          status: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update status.");
      }

      setNotice(
        `${user.full_name || user.email || "User"} is now ${nextStatus}.`
      );
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update status."
      );
    }
  }

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      (user.full_name ?? "").toLowerCase().includes(query) ||
      (user.email ?? "").toLowerCase().includes(query);

    const matchesRole =
      roleFilter === "all" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeCount = users.filter((user) => user.status === "active").length;
  const inactiveCount = users.filter(
    (user) => user.status !== "active"
  ).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>ADMINISTRATION</p>
          <h1>Users</h1>
          <p className={styles.subtitle}>
            Manage login accounts, roles and access status.
          </p>
        </div>

        <button className={styles.primaryButton} onClick={openCreateForm}>
          + Create User
        </button>
      </header>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <span>Total users</span>
          <strong>{users.length}</strong>
        </article>
        <article className={styles.statCard}>
          <span>Active users</span>
          <strong>{activeCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span>Inactive users</span>
          <strong>{inactiveCount}</strong>
        </article>
      </section>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}

      {showForm && (
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <div>
              <h2>{editing ? "Edit User" : "Create User"}</h2>
              <p>
                {editing
                  ? "Update the user's details and access."
                  : "Create a login account for your institute."}
              </p>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={resetForm}
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <form onSubmit={submitForm} className={styles.form}>
            <label>
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter full name"
                required
              />
            </label>

            {!editing && (
              <>
                <label>
                  Email address
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="user@example.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <label>
                  Temporary password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </>
            )}

            <label>
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {roles.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            {editing && (
              <label>
                Account status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            )}

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save Changes"
                    : "Create Account"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <h2>All users</h2>
            <p>{filteredUsers.length} users displayed</p>
          </div>
          <button
            className={styles.secondaryButton}
            onClick={() => void loadUsers()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <div className={styles.filters}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email..."
            aria-label="Search users"
          />

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Filter by role"
          >
            <option value="all">All roles</option>
            {roles.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className={styles.empty}>Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className={styles.empty}>
            No users found. Create a user or change your filters.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.avatar}>
                          {(user.full_name || user.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <strong>{user.full_name || "Unnamed user"}</strong>
                          <span>{user.email || "No email"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.roleBadge}>
                        {user.role || "Unassigned"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          user.status === "active"
                            ? styles.activeBadge
                            : styles.inactiveBadge
                        }
                      >
                        {user.status || "Unknown"}
                      </span>
                    </td>
                    <td>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.editButton}
                          onClick={() => openEditForm(user)}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.statusButton}
                          onClick={() => void toggleStatus(user)}
                        >
                          {user.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
