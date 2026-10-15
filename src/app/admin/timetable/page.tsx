
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./timetable.module.css";

type Batch = {
  id: string;
  name: string;
};

type Staff = {
  id: string;
  employee_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  designation: string | null;
  department: string | null;
  status: string | null;
};

type TimetableEntry = {
  id: string;
  institute_id: string;
  batch_id: string | null;
  staff_id: string | null;
  subject: string;
  room: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  entry_type: "Class" | "Lab" | "Exam" | "Activity" | "Break" | "Other";
  status: "Active" | "Cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const supabase = createClient();

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const shortDays = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const entryTypes = [
  "Class",
  "Lab",
  "Exam",
  "Activity",
  "Break",
  "Other",
] as const;

function displayTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeToMinutes(value: string) {
  const [h, m] = value.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedDay, setSelectedDay] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [modal, setModal] = useState(false);
  const [viewing, setViewing] = useState<TimetableEntry | null>(null);
  const [editing, setEditing] = useState<TimetableEntry | null>(null);

  const [form, setForm] = useState({
    batch_id: "",
    staff_id: "",
    subject: "",
    room: "",
    day_of_week: "1",
    start_time: "09:00",
    end_time: "10:00",
    entry_type: "Class" as TimetableEntry["entry_type"],
    status: "Active" as TimetableEntry["status"],
    notes: "",
  });

  const getInstituteId = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("Please login first.");

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    if (!data?.institute_id) {
      throw new Error("Institute profile not found.");
    }

    return data.institute_id as string;
  }, []);

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const instituteId = await getInstituteId();

        const [entryResult, batchResult, staffResult] =
          await Promise.all([
            supabase
              .from("timetable_entries")
              .select("*")
              .eq("institute_id", instituteId)
              .order("day_of_week", { ascending: true })
              .order("start_time", { ascending: true }),

            supabase
              .from("batches")
              .select("id,name")
              .eq("institute_id", instituteId)
              .order("name"),

            supabase
              .from("staff")
              .select(
                "id, employee_id, first_name, last_name, phone, email, designation, department, status"
              )
              .eq("institute_id", instituteId)
              .order("created_at", { ascending: false }),
          ]);

        if (entryResult.error) throw entryResult.error;

        setEntries((entryResult.data || []) as TimetableEntry[]);

        if (!batchResult.error) {
          setBatches((batchResult.data || []) as Batch[]);
        }

        if (!staffResult.error) {
          setStaff((staffResult.data || []) as Staff[]);
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Unable to load timetable.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getInstituteId]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const batchMap = useMemo(
    () => new Map(batches.map((batch) => [batch.id, batch.name])),
    [batches]
  );

  const staffMap = useMemo(
    () =>
      new Map(
        staff.map((person) => [
          person.id,
          [person.first_name, person.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() ||
            person.employee_id ||
            "Staff",
        ])
      ),
    [staff]
  );

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const batchName = entry.batch_id
        ? batchMap.get(entry.batch_id) || ""
        : "";
      const staffName = entry.staff_id
        ? staffMap.get(entry.staff_id) || ""
        : "";

      const matchesBatch =
        selectedBatch === "all" || entry.batch_id === selectedBatch;

      const matchesDay = entry.day_of_week === selectedDay;

      const matchesType =
        typeFilter === "all" || entry.entry_type === typeFilter;

      const matchesSearch =
        !q ||
        entry.subject.toLowerCase().includes(q) ||
        batchName.toLowerCase().includes(q) ||
        staffName.toLowerCase().includes(q) ||
        String(entry.room || "").toLowerCase().includes(q);

      return matchesBatch && matchesDay && matchesType && matchesSearch;
    });
  }, [
    entries,
    batchMap,
    staffMap,
    selectedBatch,
    selectedDay,
    typeFilter,
    search,
  ]);

  const weekEntries = useMemo(() => {
    const q = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const batchName = entry.batch_id
        ? batchMap.get(entry.batch_id) || ""
        : "";
      const staffName = entry.staff_id
        ? staffMap.get(entry.staff_id) || ""
        : "";

      const matchesBatch =
        selectedBatch === "all" || entry.batch_id === selectedBatch;

      const matchesType =
        typeFilter === "all" || entry.entry_type === typeFilter;

      const matchesSearch =
        !q ||
        entry.subject.toLowerCase().includes(q) ||
        batchName.toLowerCase().includes(q) ||
        staffName.toLowerCase().includes(q) ||
        String(entry.room || "").toLowerCase().includes(q);

      return matchesBatch && matchesType && matchesSearch;
    });
  }, [
    entries,
    batchMap,
    staffMap,
    selectedBatch,
    typeFilter,
    search,
  ]);

  const stats = useMemo(() => {
    const active = entries.filter((entry) => entry.status === "Active");

    return {
      total: active.length,
      classes: active.filter((entry) => entry.entry_type === "Class").length,
      labs: active.filter((entry) => entry.entry_type === "Lab").length,
      exams: active.filter((entry) => entry.entry_type === "Exam").length,
      batches: new Set(
        active
          .map((entry) => entry.batch_id)
          .filter(Boolean)
      ).size,
    };
  }, [entries]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function openAdd(day = selectedDay) {
    clearMessages();
    setEditing(null);

    setForm({
      batch_id: selectedBatch === "all" ? "" : selectedBatch,
      staff_id: "",
      subject: "",
      room: "",
      day_of_week: String(day),
      start_time: "09:00",
      end_time: "10:00",
      entry_type: "Class",
      status: "Active",
      notes: "",
    });

    setModal(true);
  }

  function openEdit(entry: TimetableEntry) {
    clearMessages();
    setEditing(entry);

    setForm({
      batch_id: entry.batch_id || "",
      staff_id: entry.staff_id || "",
      subject: entry.subject,
      room: entry.room || "",
      day_of_week: String(entry.day_of_week),
      start_time: entry.start_time.slice(0, 5),
      end_time: entry.end_time.slice(0, 5),
      entry_type: entry.entry_type,
      status: entry.status,
      notes: entry.notes || "",
    });

    setModal(true);
  }

  async function saveEntry(event: React.FormEvent) {
    event.preventDefault();

    setSaving(true);
    clearMessages();

    try {
      const instituteId = await getInstituteId();

      if (!form.subject.trim()) {
        throw new Error("Subject / class name is required.");
      }

      if (!form.batch_id) {
        throw new Error("Please select a batch.");
      }

      if (timeToMinutes(form.end_time) <= timeToMinutes(form.start_time)) {
        throw new Error("End time must be after start time.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        institute_id: instituteId,
        batch_id: form.batch_id || null,
        staff_id: form.staff_id || null,
        subject: form.subject.trim(),
        room: form.room.trim() || null,
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        entry_type: form.entry_type,
        status: form.status,
        notes: form.notes.trim() || null,
        created_by: user?.id || null,
      };

      if (editing) {
        const { error: updateError } = await supabase
          .from("timetable_entries")
          .update(payload)
          .eq("id", editing.id)
          .eq("institute_id", instituteId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("timetable_entries")
          .insert(payload);

        if (insertError) throw insertError;
      }

      setModal(false);
      setSelectedDay(Number(form.day_of_week));
      setSuccess(
        editing
          ? "Timetable entry updated successfully."
          : "Timetable entry added successfully."
      );

      await loadData(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to save timetable entry.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entry: TimetableEntry) {
    clearMessages();

    if (!window.confirm(`Delete "${entry.subject}" from timetable?`)) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("timetable_entries")
      .delete()
      .eq("id", entry.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setViewing(null);
    setSuccess("Timetable entry deleted successfully.");
    await loadData(true);
  }

  async function cancelEntry(entry: TimetableEntry) {
    clearMessages();

    const { error: updateError } = await supabase
      .from("timetable_entries")
      .update({ status: "Cancelled" })
      .eq("id", entry.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setViewing(null);
    setSuccess("Timetable entry cancelled.");
    await loadData(true);
  }

  function typeClass(type: TimetableEntry["entry_type"]) {
    const map: Record<TimetableEntry["entry_type"], string> = {
      Class: styles.classType,
      Lab: styles.labType,
      Exam: styles.examType,
      Activity: styles.activityType,
      Break: styles.breakType,
      Other: styles.otherType,
    };

    return map[type];
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>TOOLS</span>
          <h1>Timetable</h1>
          <p>
            Build and manage weekly class schedules for every batch and staff member.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            onClick={() => void loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>

          <button
            className={styles.primaryButton}
            onClick={() => openAdd()}
          >
            + Add Schedule
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className={styles.success}>
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Active Schedules</span>
          <strong>{stats.total}</strong>
          <small>Total timetable entries</small>
        </div>

        <div className={styles.statCard}>
          <span>Classes</span>
          <strong>{stats.classes}</strong>
          <small>Regular classes</small>
        </div>

        <div className={styles.statCard}>
          <span>Labs</span>
          <strong>{stats.labs}</strong>
          <small>Lab sessions</small>
        </div>

        <div className={styles.statCard}>
          <span>Exams</span>
          <strong>{stats.exams}</strong>
          <small>Exam schedules</small>
        </div>

        <div className={styles.statCard}>
          <span>Batches Covered</span>
          <strong>{stats.batches}</strong>
          <small>With active schedules</small>
        </div>
      </section>

      <section className={styles.controls}>
        <div className={styles.batchTabs}>
          <button
            className={selectedBatch === "all" ? styles.activeTab : ""}
            onClick={() => setSelectedBatch("all")}
          >
            All Batches
          </button>

          {batches.map((batch) => (
            <button
              key={batch.id}
              className={
                selectedBatch === batch.id ? styles.activeTab : ""
              }
              onClick={() => setSelectedBatch(batch.id)}
            >
              {batch.name}
            </button>
          ))}
        </div>

        <div className={styles.filters}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search subject, batch, teacher..."
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All Types</option>
            {entryTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.dayTabs}>
        {days.map((day, index) => (
          <button
            key={day}
            className={selectedDay === index ? styles.selectedDay : ""}
            onClick={() => setSelectedDay(index)}
          >
            <span>{shortDays[index]}</span>
            <strong>{weekEntries.filter((entry) => entry.day_of_week === index).length}</strong>
          </button>
        ))}
      </section>

      <section className={styles.scheduleCard}>
        <div className={styles.scheduleHeader}>
          <div>
            <span>DAILY SCHEDULE</span>
            <h2>{days[selectedDay]}</h2>
          </div>

          <button
            className={styles.smallAdd}
            onClick={() => openAdd(selectedDay)}
          >
            + Add
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading timetable...</div>
        ) : (
          <div className={styles.scheduleList}>
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                className={styles.scheduleRow}
                onClick={() => setViewing(entry)}
              >
                <div className={styles.timeBlock}>
                  <strong>{displayTime(entry.start_time)}</strong>
                  <span>{displayTime(entry.end_time)}</span>
                </div>

                <div className={`${styles.typeBar} ${typeClass(entry.entry_type)}`} />

                <div className={styles.scheduleMain}>
                  <div className={styles.scheduleTitle}>
                    <strong>{entry.subject}</strong>
                    <span className={`${styles.badge} ${typeClass(entry.entry_type)}`}>
                      {entry.entry_type}
                    </span>

                    {entry.status === "Cancelled" && (
                      <span className={styles.cancelledBadge}>Cancelled</span>
                    )}
                  </div>

                  <div className={styles.scheduleMeta}>
                    <span>
                      {entry.batch_id
                        ? batchMap.get(entry.batch_id) || "Batch"
                        : "No batch"}
                    </span>

                    <span>
                      {entry.staff_id
                        ? staffMap.get(entry.staff_id) || "Staff"
                        : "No teacher"}
                    </span>

                    <span>
                      {entry.room || "Room not assigned"}
                    </span>
                  </div>
                </div>

                <span className={styles.rowArrow}>›</span>
              </button>
            ))}

            {!filteredEntries.length && (
              <div className={styles.empty}>
                <div>🗓️</div>
                <strong>No schedule found</strong>
                <span>
                  Add a schedule for {days[selectedDay]} or change your filters.
                </span>
                <button onClick={() => openAdd(selectedDay)}>
                  Add Schedule
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className={styles.weekOverview}>
        <div className={styles.sectionHeading}>
          <div>
            <span>WEEK OVERVIEW</span>
            <h2>All weekly schedules</h2>
          </div>
        </div>

        <div className={styles.weekGrid}>
          {days.map((day, dayIndex) => {
            const dayEntries = weekEntries
              .filter((entry) => entry.day_of_week === dayIndex)
              .sort(
                (a, b) =>
                  timeToMinutes(a.start_time) -
                  timeToMinutes(b.start_time)
              );

            return (
              <button
                key={day}
                className={styles.weekColumn}
                onClick={() => setSelectedDay(dayIndex)}
              >
                <div className={styles.weekColumnHeader}>
                  <span>{shortDays[dayIndex]}</span>
                  <strong>{dayEntries.length}</strong>
                </div>

                {dayEntries.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className={`${styles.miniEntry} ${typeClass(entry.entry_type)}`}
                  >
                    <strong>{displayTime(entry.start_time)}</strong>
                    <span>{entry.subject}</span>
                  </div>
                ))}

                {dayEntries.length > 5 && (
                  <span className={styles.more}>
                    +{dayEntries.length - 5} more
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {modal && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModal(false);
            }
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span>TIMETABLE</span>
                <h2>{editing ? "Edit Schedule" : "Add Schedule"}</h2>
              </div>

              <button onClick={() => setModal(false)}>×</button>
            </div>

            <form className={styles.form} onSubmit={saveEntry}>
              <div className={styles.formGrid}>
                <label>
                  Batch *
                  <select
                    value={form.batch_id}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        batch_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Teacher / Staff
                  <select
                    value={form.staff_id}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        staff_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select staff</option>

                    {staff
                      .filter(
                        (person) =>
                          String(person.status || "").toLowerCase() !==
                          "inactive"
                      )
                      .map((person) => {
                        const name =
                          [person.first_name, person.last_name]
                            .filter(Boolean)
                            .join(" ")
                            .trim() ||
                          person.employee_id ||
                          "Staff";

                        return (
                          <option key={person.id} value={person.id}>
                            {name}
                            {person.designation
                              ? ` — ${person.designation}`
                              : ""}
                          </option>
                        );
                      })}
                  </select>
                </label>

                <label className={styles.full}>
                  Subject / Class Name *
                  <input
                    value={form.subject}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        subject: event.target.value,
                      }))
                    }
                    placeholder="e.g. Mathematics"
                  />
                </label>

                <label>
                  Day *
                  <select
                    value={form.day_of_week}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        day_of_week: event.target.value,
                      }))
                    }
                  >
                    {days.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Entry Type
                  <select
                    value={form.entry_type}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        entry_type:
                          event.target.value as TimetableEntry["entry_type"],
                      }))
                    }
                  >
                    {entryTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Start Time *
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        start_time: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  End Time *
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        end_time: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Room
                  <input
                    value={form.room}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        room: event.target.value,
                      }))
                    }
                    placeholder="e.g. Room 204"
                  />
                </label>

                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        status:
                          event.target.value as TimetableEntry["status"],
                      }))
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </label>

                <label className={styles.full}>
                  Notes
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Additional instructions..."
                  />
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Update Schedule"
                      : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewing && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewing(null);
            }
          }}
        >
          <div className={styles.viewModal}>
            <div className={styles.modalHeader}>
              <div>
                <span>{viewing.entry_type.toUpperCase()}</span>
                <h2>{viewing.subject}</h2>
              </div>

              <button onClick={() => setViewing(null)}>×</button>
            </div>

            <div className={styles.viewBody}>
              <div className={styles.viewGrid}>
                <div>
                  <span>DAY</span>
                  <strong>{days[viewing.day_of_week]}</strong>
                </div>

                <div>
                  <span>TIME</span>
                  <strong>
                    {displayTime(viewing.start_time)} –{" "}
                    {displayTime(viewing.end_time)}
                  </strong>
                </div>

                <div>
                  <span>BATCH</span>
                  <strong>
                    {viewing.batch_id
                      ? batchMap.get(viewing.batch_id) || "—"
                      : "—"}
                  </strong>
                </div>

                <div>
                  <span>TEACHER</span>
                  <strong>
                    {viewing.staff_id
                      ? staffMap.get(viewing.staff_id) || "—"
                      : "—"}
                  </strong>
                </div>

                <div>
                  <span>ROOM</span>
                  <strong>{viewing.room || "Not assigned"}</strong>
                </div>

                <div>
                  <span>STATUS</span>
                  <strong>{viewing.status}</strong>
                </div>
              </div>

              <div className={styles.notesBox}>
                {viewing.notes || "No additional notes."}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setViewing(null)}>Close</button>

              <button
                onClick={() => {
                  setViewing(null);
                  openEdit(viewing);
                }}
              >
                Edit
              </button>

              {viewing.status === "Active" && (
                <button onClick={() => void cancelEntry(viewing)}>
                  Cancel Schedule
                </button>
              )}

              <button
                className={styles.dangerButton}
                onClick={() => void deleteEntry(viewing)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
