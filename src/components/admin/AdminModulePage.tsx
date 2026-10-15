"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  exportCsv,
  makeId,
  readRecords,
  removeRecord,
  upsertRecord,
  writeRecords,
  type DataRecord,
} from "@/lib/store";
import { moduleMap, type Field } from "@/lib/admin";

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
  stats?: { label: string; value: string; tone?: StatTone }[];
};

function keyForTitle(title: string) {
  const hit = Object.values(moduleMap).find((m) => m.title === title);
  return hit?.key ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function seedRows(key: string, rows: ModuleRow[]) {
  const existing = readRecords(key);
  if (existing.length || !rows.length) return existing;
  const now = new Date().toISOString();
  const seeded = rows.map((r) => ({
    id: r.id || makeId(key),
    createdAt: now,
    updatedAt: now,
    name: r.title,
    title: r.title,
    subtitle: r.subtitle ?? "",
    status: r.status ?? "Active",
    meta: r.meta ?? "",
  }));
  writeRecords(key, seeded);
  return seeded;
}

function fieldValue(record: DataRecord, field: Field) {
  const value = record[field.key];
  if (value === undefined || value === null) return "";
  return String(value);
}

export default function AdminModulePage({
  title,
  description,
  icon,
  addLabel,
  searchPlaceholder = "Search records...",
  rows = [],
  stats = [],
}: Props) {
  const key = keyForTitle(title);
  const def = moduleMap[key];
  const fields: Field[] =
    def?.fields ?? [
      { key: "name", label: "Name / Title", required: true },
      { key: "category", label: "Category" },
      { key: "status", label: "Status", type: "select", options: ["Active", "Pending", "Draft", "Completed"] },
      { key: "notes", label: "Notes", type: "textarea" },
    ];

  const [records, setRecords] = useState<DataRecord[]>([]);
  const [query, setQuery] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState<DataRecord | null>(null);
  const [viewing, setViewing] = useState<DataRecord | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const load = () => setRecords(seedRows(key, rows));

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("studentflow-data", refresh);
    return () => window.removeEventListener("studentflow-data", refresh);
  }, [key]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((row) =>
      Object.values(row).join(" ").toLowerCase().includes(q)
    );
  }, [query, records]);

  const openAdd = () => {
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "date") initial[f.key] = new Date().toISOString().slice(0, 10);
      else if (f.type === "select") initial[f.key] = f.options?.[0] ?? "";
      else initial[f.key] = "";
    });
    setForm(initial);
    setEditing(null);
    setShowPanel(true);
  };

  const openEdit = (row: DataRecord) => {
    setForm({ ...row });
    setEditing(row);
    setShowPanel(true);
  };

  const save = () => {
    for (const f of fields) {
      if (f.required && !String(form[f.key] ?? "").trim()) {
        alert(`${f.label} is required`);
        return;
      }
    }
    upsertRecord(key, form, editing?.id);
    setShowPanel(false);
    setEditing(null);
    load();
  };

  const deleteRow = (id: string) => {
    if (!confirm("Delete this record? This action cannot be undone.")) return;
    removeRecord(key, id);
    load();
  };

  const titleOf = (row: DataRecord) =>
    String(row.name ?? row.title ?? row.student ?? row.staff ?? row.person ?? row.id);

  const subtitleOf = (row: DataRecord) =>
    String(row.subtitle ?? row.classBatch ?? row.batch ?? row.email ?? row.phone ?? row.mobile ?? row.meta ?? "—");

  const statusOf = (row: DataRecord) => String(row.status ?? "Active");

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

        <button type="button" className="addonPrimary" onClick={openAdd}>
          <span>＋</span>
          {addLabel}
        </button>
      </div>

      {stats.length > 0 && (
        <section className="addonStats">
          {stats.map((stat) => {
            const value =
              stat.label.toLowerCase().includes("total")
                ? String(records.length)
                : stat.label.toLowerCase().includes("active")
                  ? String(records.filter((r) => /active|published|issued|available|scheduled|success/i.test(statusOf(r))).length)
                  : stat.label.toLowerCase().includes("pending")
                    ? String(records.filter((r) => /pending|draft|follow-up/i.test(statusOf(r))).length)
                    : String(records.filter((r) => String(r.createdAt ?? "").slice(0, 7) === new Date().toISOString().slice(0, 7)).length);
            return (
              <div className={`addonStat ${stat.tone ?? "purple"}`} key={stat.label}>
                <span>{stat.label}</span>
                <strong>{value}</strong>
              </div>
            );
          })}
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
        <button type="button" className="addonFilter" onClick={() => setQuery("")}>
          Filter ▾
        </button>
        <button type="button" className="addonExport" onClick={() => exportCsv(`${key}.csv`, filteredRows)}>
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
            <button type="button" onClick={openAdd}>{addLabel}</button>
          </div>
        ) : (
          filteredRows.map((row) => (
            <div className="addonTableRow" key={row.id}>
              <div>
                <strong>{titleOf(row)}</strong>
                <small>{row.id}</small>
              </div>
              <div>
                <span>{subtitleOf(row)}</span>
                <small>{row.meta ?? row.description ?? ""}</small>
              </div>
              <div>
                <span className="addonStatus">{statusOf(row)}</span>
              </div>
              <div className="addonActions">
                <button type="button" onClick={() => setViewing(row)}>View</button>
                <button type="button" onClick={() => openEdit(row)}>Edit</button>
                <button type="button" onClick={() => deleteRow(row.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </section>

      {(showPanel || viewing) && (
        <div
          className="addonOverlay"
          onClick={() => { setShowPanel(false); setViewing(null); }}
        >
          <div className="addonPanel" onClick={(event) => event.stopPropagation()}>
            {viewing ? (
              <>
                <div className="addonPanelHead">
                  <div><span>RECORD</span><h2>{titleOf(viewing)}</h2></div>
                  <button type="button" onClick={() => setViewing(null)}>×</button>
                </div>
                <div className="addonFormGrid">
                  {fields.map((f) => (
                    <label key={f.key}>
                      {f.label}
                      <input value={fieldValue(viewing, f)} readOnly />
                    </label>
                  ))}
                </div>
                <div className="addonPanelActions">
                  <button type="button" className="addonCancel" onClick={() => setViewing(null)}>Close</button>
                  <button type="button" className="addonPrimary" onClick={() => { setViewing(null); openEdit(viewing); }}>Edit Record</button>
                </div>
              </>
            ) : (
              <>
                <div className="addonPanelHead">
                  <div><span>{editing ? "EDIT RECORD" : "NEW RECORD"}</span><h2>{editing ? "Edit Record" : addLabel}</h2></div>
                  <button type="button" onClick={() => setShowPanel(false)}>×</button>
                </div>
                <div className="addonFormGrid">
                  {fields.map((f) => (
                    <label key={f.key}>
                      {f.label}
                      {f.type === "textarea" ? (
                        <textarea
                          value={form[f.key] ?? ""}
                          onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
                          placeholder={f.label}
                        />
                      ) : f.type === "select" ? (
                        <select
                          value={form[f.key] ?? ""}
                          onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
                        >
                          {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
                          value={form[f.key] ?? ""}
                          onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
                          placeholder={f.label}
                        />
                      )}
                    </label>
                  ))}
                </div>
                <div className="addonPanelActions">
                  <button type="button" className="addonCancel" onClick={() => setShowPanel(false)}>Cancel</button>
                  <button type="button" className="addonPrimary" onClick={save}>{editing ? "Update Record" : "Save Record"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
