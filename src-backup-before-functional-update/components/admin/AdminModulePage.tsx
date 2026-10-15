"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type ModuleRow = {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  meta?: string;
};

type StatTone = "purple" | "blue" | "green" | "orange";

type Props = {
  title: string;
  description: string;
  icon: string;
  addLabel: string;
  searchPlaceholder?: string;
  rows?: ModuleRow[];
  stats?: {
    label: string;
    value: string;
    tone?: StatTone;
  }[];
};

export default function AdminModulePage({
  title,
  description,
  icon,
  addLabel,
  searchPlaceholder = "Search records...",
  rows = [],
  stats = [],
}: Props) {
  const [query, setQuery] = useState("");
  const [showPanel, setShowPanel] = useState(false);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return rows;
    }

    return rows.filter((row) =>
      `${row.id} ${row.title} ${row.subtitle ?? ""} ${row.status ?? ""} ${row.meta ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [query, rows]);

  return (
    <main className="addonPage">
      <div className="addonHeader">
        <div className="addonTitleWrap">
          <div className="addonIcon">{icon}</div>

          <div>
            <div className="addonBreadcrumb">
              <Link href="/admin">Admin</Link>
              <span>/</span>
              <span>{title}</span>
            </div>

            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>

        <button
          type="button"
          className="addonPrimary"
          onClick={() => setShowPanel(true)}
        >
          <span>＋</span>
          {addLabel}
        </button>
      </div>

      {stats.length > 0 && (
        <section className="addonStats">
          {stats.map((stat) => (
            <div
              className={`addonStat ${stat.tone ?? "purple"}`}
              key={stat.label}
            >
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="addonToolbar">
        <div className="addonSearch">
          <span>⌕</span>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>

        <button type="button" className="addonFilter">
          Filter ▾
        </button>

        <button type="button" className="addonExport">
          Export
        </button>
      </section>

      <section className="addonTable">
        <div className="addonTableHead">
          <span>RECORD</span>
          <span>DETAILS</span>
          <span>STATUS</span>
          <span>ACTION</span>
        </div>

        {filteredRows.length === 0 ? (
          <div className="addonEmpty">
            <div>{icon}</div>
            <h3>No records yet</h3>
            <p>Start by adding your first record.</p>

            <button
              type="button"
              onClick={() => setShowPanel(true)}
            >
              {addLabel}
            </button>
          </div>
        ) : (
          filteredRows.map((row) => (
            <div className="addonTableRow" key={row.id}>
              <div>
                <strong>{row.title}</strong>
                <small>{row.id}</small>
              </div>

              <div>
                <span>{row.subtitle ?? "—"}</span>
                <small>{row.meta ?? ""}</small>
              </div>

              <div>
                <span className="addonStatus">
                  {row.status ?? "Active"}
                </span>
              </div>

              <div className="addonActions">
                <button type="button">View</button>
                <button type="button">Edit</button>
              </div>
            </div>
          ))
        )}
      </section>

      {showPanel && (
        <div
          className="addonOverlay"
          onClick={() => setShowPanel(false)}
        >
          <div
            className="addonPanel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="addonPanelHead">
              <div>
                <span>NEW RECORD</span>
                <h2>{addLabel}</h2>
              </div>

              <button
                type="button"
                onClick={() => setShowPanel(false)}
              >
                ×
              </button>
            </div>

            <div className="addonFormGrid">
              <label>
                Name / Title
                <input
                  placeholder={`Enter ${title.toLowerCase()} name`}
                />
              </label>

              <label>
                Category
                <input placeholder="Category" />
              </label>

              <label>
                Status
                <select defaultValue="Active">
                  <option>Active</option>
                  <option>Pending</option>
                  <option>Draft</option>
                  <option>Completed</option>
                </select>
              </label>

              <label>
                Notes
                <textarea placeholder="Additional information..." />
              </label>
            </div>

            <div className="addonPanelActions">
              <button
                type="button"
                className="addonCancel"
                onClick={() => setShowPanel(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="addonPrimary"
                onClick={() => setShowPanel(false)}
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
