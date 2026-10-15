
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ModuleConfig, Field } from "../module-config";
import {
  type DataRecord,
  exportCsv,
  makeId,
  readRecords,
  writeRecords,
} from "@/lib/store";

function emptyForm(config: ModuleConfig): Record<string, string> {
  return Object.fromEntries(
    config.fields.map((field) => [
      field.name,
      field.type === "date"
        ? new Date().toISOString().slice(0, 10)
        : field.options?.[0] || "",
    ])
  ) as Record<string, string>;
}

export default function AdminModulePage({
  slug,
  config,
}: {
  slug: string;
  config: ModuleConfig;
}) {
  const [rows, setRows] = useState<DataRecord[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DataRecord | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [view, setView] = useState<DataRecord | null>(null);

  const load = () => {
    setRows(readRecords(slug));
  };

  useEffect(() => {
    load();

    const handleDataChange = () => load();

    window.addEventListener("studentflow-data", handleDataChange);

    return () => {
      window.removeEventListener("studentflow-data", handleDataChange);
    };
  }, [slug]);

  const filtered = useMemo(
    () =>
      rows.filter((record) => {
        const searchableText = Object.values(record)
          .join(" ")
          .toLowerCase();

        return (
          searchableText.includes(query.toLowerCase()) &&
          (filter === "All" || record.status === filter)
        );
      }),
    [rows, query, filter]
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm(config));
    setOpen(true);
  };

  const openEdit = (record: DataRecord) => {
    setEditing(record);
    setForm({ ...record } as Record<string, string>);
    setOpen(true);
  };

  const save = () => {
    for (const field of config.fields) {
      if (
        field.required &&
        !String(form[field.name] || "").trim()
      ) {
        alert(`${field.label} is required`);
        return;
      }
    }

    const now = new Date().toISOString();

    const record: DataRecord = {
      ...form,
      id: editing?.id || makeId(slug),
      createdAt: editing?.createdAt || now,
      updatedAt: now,
    };

    const next = editing
      ? rows.map((item) =>
          item.id === editing.id ? record : item
        )
      : [record, ...rows];

    writeRecords(slug, next);
    setRows(next);
    setOpen(false);
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this record?")) return;

    const next = rows.filter((record) => record.id !== id);

    writeRecords(slug, next);
    setRows(next);

    if (view?.id === id) {
      setView(null);
    }
  };

  const activeCount = rows.filter((record) =>
    [
      "Active",
      "Paid",
      "Received",
      "Completed",
      "Published",
      "Issued",
      "Success",
      "Present",
      "Processed",
    ].includes(String(record.status || ""))
  ).length;

  const pendingCount = rows.filter((record) =>
    ["Pending", "Draft", "Follow-up", "Partial", "Review"].includes(
      String(record.status || "")
    )
  ).length;

  return (
    <main className="modulePage">
      <div className="moduleHeader">
        <div className="titleWrap">
          <div className="moduleIcon">{config.icon}</div>

          <div>
            <div className="crumb">
              <Link href="/admin">Admin</Link>
              <span>/</span>
              <span>{config.title}</span>
            </div>

            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </div>
        </div>

        <button className="primary" onClick={openAdd}>
          ＋ {config.addLabel}
        </button>
      </div>

      <section className="stats">
        <div>
          <span>Total</span>
          <strong>{rows.length}</strong>
        </div>

        <div>
          <span>Active / Done</span>
          <strong>{activeCount}</strong>
        </div>

        <div>
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>

        <div>
          <span>Showing</span>
          <strong>{filtered.length}</strong>
        </div>
      </section>

      <section className="toolbar">
        <div className="search">
          ⌕
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${config.title.toLowerCase()}...`}
          />
        </div>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="All">All</option>
          {config.statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <button
          onClick={() => exportCsv(`${slug}.csv`, filtered)}
        >
          Export CSV
        </button>

        <button
          onClick={() => {
            setQuery("");
            setFilter("All");
          }}
        >
          Reset
        </button>
      </section>

      <section className="table">
        <div className="thead">
          <span>RECORD</span>
          <span>DETAILS</span>
          <span>STATUS</span>
          <span>ACTIONS</span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div>{config.icon}</div>
            <h3>No records found</h3>
            <p>Add a record or change your search/filter.</p>
            <button className="primary" onClick={openAdd}>
              {config.addLabel}
            </button>
          </div>
        ) : (
          filtered.map((record) => (
            <div className="tr" key={record.id}>
              <div>
                <b>
                  {String(
                    record[config.fields[0]?.name] || record.id
                  )}
                </b>
                <small>{record.id}</small>
              </div>

              <div>
                <span>
                  {config.fields
                    .slice(1, 3)
                    .map((field) => record[field.name])
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
                <small>
                  {new Date(record.updatedAt).toLocaleString()}
                </small>
              </div>

              <div>
                <em>{String(record.status || "Active")}</em>
              </div>

              <div className="actions">
                <button onClick={() => setView(record)}>View</button>
                <button onClick={() => openEdit(record)}>Edit</button>
                <button
                  className="danger"
                  onClick={() => remove(record.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {open && (
        <div
          className="overlay"
          onMouseDown={(event) =>
            event.currentTarget === event.target && setOpen(false)
          }
        >
          <div className="modal">
            <div className="modalHead">
              <div>
                <small>{editing ? "EDIT RECORD" : "NEW RECORD"}</small>
                <h2>
                  {editing ? "Edit" : "Add"} {config.title}
                </h2>
              </div>

              <button onClick={() => setOpen(false)}>×</button>
            </div>

            <div className="formGrid">
              {config.fields.map((field: Field) => (
                <label
                  key={field.name}
                  className={field.type === "textarea" ? "wide" : ""}
                >
                  {field.label}
                  {field.required && " *"}

                  {field.type === "select" ? (
                    <select
                      value={form[field.name] || ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          [field.name]: event.target.value,
                        })
                      }
                    >
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={form[field.name] || ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          [field.name]: event.target.value,
                        })
                      }
                    />
                  ) : (
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.name] || ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          [field.name]: event.target.value,
                        })
                      }
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="modalActions">
              <button onClick={() => setOpen(false)}>Cancel</button>
              <button className="primary" onClick={save}>
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {view && (
        <div
          className="overlay"
          onMouseDown={(event) =>
            event.currentTarget === event.target && setView(null)
          }
        >
          <div className="modal">
            <div className="modalHead">
              <div>
                <small>RECORD DETAILS</small>
                <h2>
                  {String(
                    view[config.fields[0]?.name] || view.id
                  )}
                </h2>
              </div>

              <button onClick={() => setView(null)}>×</button>
            </div>

            <div className="detailGrid">
              {config.fields.map((field) => (
                <div key={field.name}>
                  <small>{field.label}</small>
                  <strong>{String(view[field.name] || "—")}</strong>
                </div>
              ))}

              <div>
                <small>Record ID</small>
                <strong>{view.id}</strong>
              </div>

              <div>
                <small>Updated</small>
                <strong>
                  {new Date(view.updatedAt).toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="modalActions">
              <button onClick={() => setView(null)}>Close</button>
              <button
                className="primary"
                onClick={() => {
                  const record = view;
                  setView(null);
                  openEdit(record);
                }}
              >
                Edit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
