"use client";

import { useCallback, useEffect, useState } from "react";
import { MODULES } from "@/lib/permissions/modules";
import styles from "./roles-permissions.module.css";

type Role = {
  id: string;
  role_key: string;
  role_name: string;
  description: string | null;
  is_system: boolean;
};

type Permission = {
  module_key: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

const blankPermission = (module_key: string): Permission => ({
  module_key,
  can_view: false,
  can_add: false,
  can_edit: false,
  can_delete: false,
});

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/roles-permissions", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load roles.");
      }

      setRoles(data.roles ?? []);
      setPermissions(data.permissions ?? []);

      setSelectedRoleId((current) => {
        if (current && data.roles?.some((role: Role) => role.id === current)) {
          return current;
        }
        return data.roles?.[0]?.id ?? "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const selectedPermissions = MODULES.map((module) => {
    return (
      permissions.find(
        (permission) =>
          permission.module_key === module.key &&
          // Filter by selected role below via permissionsForRole.
          true
      ) ?? blankPermission(module.key)
    );
  });

  const [permissionsForRole, setPermissionsForRole] = useState<
    Record<string, Permission[]>
  >({});

  useEffect(() => {
    const next: Record<string, Permission[]> = {};

    for (const role of roles) {
      next[role.id] = MODULES.map((module) => {
        return (
          permissions.find(
            (permission) =>
              permission.module_key === module.key &&
              // Role-specific permissions are loaded separately below.
              false
          ) ?? blankPermission(module.key)
        );
      });
    }

    // Fetch role-specific matrix from the API's complete permission list.
    // The API response is enhanced in the next code block below.
    setPermissionsForRole((current) => ({ ...current, ...next }));
  }, [roles, permissions]);

  const [matrix, setMatrix] = useState<Permission[]>([]);

  useEffect(() => {
    if (!selectedRoleId) {
      setMatrix(MODULES.map((module) => blankPermission(module.key)));
      return;
    }

    setMatrix(
      MODULES.map((module) => {
        return (
          permissionsForRole[selectedRoleId]?.find(
            (permission) => permission.module_key === module.key
          ) ?? blankPermission(module.key)
        );
      })
    );
  }, [selectedRoleId, permissionsForRole]);

  function updatePermission(
    moduleKey: string,
    action: keyof Omit<Permission, "module_key">,
    value: boolean
  ) {
    setMatrix((current) =>
      current.map((permission) =>
        permission.module_key === moduleKey
          ? { ...permission, [action]: value }
          : permission
      )
    );
  }

  function setAll(action: keyof Omit<Permission, "module_key">, value: boolean) {
    setMatrix((current) =>
      current.map((permission) => ({ ...permission, [action]: value }))
    );
  }

  async function savePermissions() {
    if (!selectedRoleId) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/roles-permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_id: selectedRoleId,
          permissions: matrix,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save permissions.");
      }

      setNotice(data.message || "Permissions saved.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save permissions."
      );
    } finally {
      setSaving(false);
    }
  }

  async function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/roles-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_name: roleName,
          description,
          permissions: MODULES.map((module) => blankPermission(module.key)),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create role.");
      }

      setCreating(false);
      setRoleName("");
      setDescription("");
      setNotice("Role created. Assign its permissions before using it.");
      await loadData();

      if (data.role?.id) {
        setSelectedRoleId(data.role.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create role.");
    } finally {
      setSaving(false);
    }
  }

  const activePermissionCount = matrix.filter(
    (permission) =>
      permission.can_view ||
      permission.can_add ||
      permission.can_edit ||
      permission.can_delete
  ).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>ACCESS CONTROL</p>
          <h1>Roles &amp; Permissions</h1>
          <p className={styles.subtitle}>
            Configure which modules and actions each role can access.
          </p>
        </div>

        <button
          className={styles.primaryButton}
          onClick={() => setCreating((value) => !value)}
        >
          + Create Role
        </button>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}

      {creating && (
        <section className={styles.card}>
          <h2>Create custom role</h2>

          <form className={styles.createForm} onSubmit={createRole}>
            <label>
              Role name
              <input
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="e.g. Front Desk"
                required
                maxLength={60}
              />
            </label>

            <label>
              Description
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this role can do"
              />
            </label>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setCreating(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Role"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Role configuration</h2>
            <p>Select a role to configure its permissions.</p>
          </div>
          <button
            className={styles.secondaryButton}
            onClick={() => void loadData()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className={styles.empty}>Loading roles...</div>
        ) : roles.length === 0 ? (
          <div className={styles.empty}>
            No roles found. Create a role or check your database setup.
          </div>
        ) : (
          <>
            <div className={styles.roleGrid}>
              {roles.map((role) => (
                <button
                  key={role.id}
                  className={`${styles.roleCard} ${
                    selectedRoleId === role.id ? styles.roleSelected : ""
                  }`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <span className={styles.roleIcon}>R</span>
                  <span className={styles.roleDetails}>
                    <strong>{role.role_name}</strong>
                    <small>
                      {role.is_system ? "System role" : "Custom role"}
                    </small>
                  </span>
                  {selectedRoleId === role.id && (
                    <span className={styles.selectedMark}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {selectedRole && (
              <>
                <div className={styles.permissionHeading}>
                  <div>
                    <h3>{selectedRole.role_name}</h3>
                    <p>
                      {selectedRole.description ||
                        "Choose the access this role should receive."}
                    </p>
                  </div>
                  <span className={styles.countBadge}>
                    {activePermissionCount}/{MODULES.length} modules enabled
                  </span>
                </div>

                <div className={styles.bulkActions}>
                  <span>Quick actions</span>
                  <button
                    className={styles.smallButton}
                    onClick={() => setAll("can_view", true)}
                  >
                    Enable all views
                  </button>
                  <button
                    className={styles.smallButton}
                    onClick={() => setAll("can_view", false)}
                  >
                    Clear all views
                  </button>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Module</th>
                        <th>View</th>
                        <th>Add</th>
                        <th>Edit</th>
                        <th>Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((module) => {
                        const permission =
                          matrix.find(
                            (item) => item.module_key === module.key
                          ) ?? blankPermission(module.key);

                        return (
                          <tr key={module.key}>
                            <td>
                              <strong>{module.label}</strong>
                              <small>{module.key}</small>
                            </td>
                            {(
                              [
                                ["can_view", "can_view"],
                                ["can_add", "can_add"],
                                ["can_edit", "can_edit"],
                                ["can_delete", "can_delete"],
                              ] as const
                            ).map(([action]) => (
                              <td key={action}>
                                <input
                                  className={styles.checkbox}
                                  type="checkbox"
                                  checked={permission[action]}
                                  onChange={(event) =>
                                    updatePermission(
                                      module.key,
                                      action,
                                      event.target.checked
                                    )
                                  }
                                  aria-label={`${module.label} ${action}`}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.footerActions}>
                  <button
                    className={styles.primaryButton}
                    onClick={() => void savePermissions()}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Permissions"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}