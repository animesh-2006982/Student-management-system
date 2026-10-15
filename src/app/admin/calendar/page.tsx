
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./calendar.module.css";

type EventType =
  | "Event"
  | "Class"
  | "Exam"
  | "Holiday"
  | "Meeting"
  | "Reminder"
  | "Workshop"
  | "Other";

type EventStatus =
  | "Active"
  | "Cancelled"
  | "Completed";

type AudienceType =
  | "All"
  | "Students"
  | "Parents"
  | "Staff"
  | "Batch";

type CalendarEvent = {
  id: string;
  institute_id: string;
  title: string;
  description?: string | null;
  event_type: EventType;
  start_at: string;
  end_at?: string | null;
  all_day: boolean;
  location?: string | null;
  audience_type: AudienceType;
  audience_id?: string | null;
  status: EventStatus;
  color?: string | null;
  created_at: string;
  updated_at?: string;
};

type Batch = {
  id: string;
  name: string;
};

const supabase = createClient();

const eventTypes: EventType[] = [
  "Event",
  "Class",
  "Exam",
  "Holiday",
  "Meeting",
  "Reminder",
  "Workshop",
  "Other",
];

function toLocalInput(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);

  return local.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
  });
}

function monthTitle(date: Date) {
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [month, setMonth] = useState(
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )
  );

  const [selectedDate, setSelectedDate] = useState(
    new Date()
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modal, setModal] = useState(false);
  const [viewing, setViewing] =
    useState<CalendarEvent | null>(null);
  const [editing, setEditing] =
    useState<CalendarEvent | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "Event" as EventType,
    start_at: "",
    end_at: "",
    all_day: false,
    location: "",
    audience_type: "All" as AudienceType,
    audience_id: "",
    status: "Active" as EventStatus,
  });

  const getInstituteId = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("Please login first.");
    }

    const { data, error: profileError } =
      await supabase
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

        const [eventResult, batchResult] =
          await Promise.all([
            supabase
              .from("calendar_events")
              .select("*")
              .eq("institute_id", instituteId)
              .order("start_at", {
                ascending: true,
              }),

            supabase
              .from("batches")
              .select("id,name")
              .eq("institute_id", instituteId)
              .order("name"),
          ]);

        if (eventResult.error)
          throw eventResult.error;

        setEvents(
          (eventResult.data || []) as CalendarEvent[]
        );

        if (!batchResult.error) {
          setBatches(
            (batchResult.data || []) as Batch[]
          );
        }
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ||
            "Unable to load calendar."
        );
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

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !q ||
        event.title.toLowerCase().includes(q) ||
        String(event.description || "")
          .toLowerCase()
          .includes(q) ||
        String(event.location || "")
          .toLowerCase()
          .includes(q);

      const matchesType =
        typeFilter === "all" ||
        event.event_type === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        event.status === statusFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    events,
    search,
    typeFilter,
    statusFilter,
  ]);

  const monthEvents = useMemo(() => {
    return filteredEvents.filter((event) => {
      const date = new Date(event.start_at);

      return (
        date.getFullYear() === month.getFullYear() &&
        date.getMonth() === month.getMonth()
      );
    });
  }, [filteredEvents, month]);

  const selectedEvents = useMemo(() => {
    return filteredEvents
      .filter((event) =>
        sameDay(
          new Date(event.start_at),
          selectedDate
        )
      )
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() -
          new Date(b.start_at).getTime()
      );
  }, [filteredEvents, selectedDate]);

  const stats = useMemo(() => {
    return {
      total: monthEvents.length,
      exams: monthEvents.filter(
        (event) => event.event_type === "Exam"
      ).length,
      holidays: monthEvents.filter(
        (event) => event.event_type === "Holiday"
      ).length,
      meetings: monthEvents.filter(
        (event) => event.event_type === "Meeting"
      ).length,
      classes: monthEvents.filter(
        (event) => event.event_type === "Class"
      ).length,
    };
  }, [monthEvents]);

  const calendarDays = useMemo(() => {
    const first = new Date(
      month.getFullYear(),
      month.getMonth(),
      1
    );

    const last = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0
    );

    const startOffset = first.getDay();
    const totalCells = Math.ceil(
      (startOffset + last.getDate()) / 7
    ) * 7;

    return Array.from(
      { length: totalCells },
      (_, index) => {
        const date = new Date(
          month.getFullYear(),
          month.getMonth(),
          1 - startOffset + index
        );

        return date;
      }
    );
  }, [month]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function goPreviousMonth() {
    setMonth(
      new Date(
        month.getFullYear(),
        month.getMonth() - 1,
        1
      )
    );
  }

  function goNextMonth() {
    setMonth(
      new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        1
      )
    );
  }

  function goToday() {
    const today = new Date();

    setMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    setSelectedDate(today);
  }

  function openAdd(date?: Date) {
    clearMessages();
    setEditing(null);

    const target =
      date || selectedDate || new Date();

    const start = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
      9,
      0
    );

    const end = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
      10,
      0
    );

    setForm({
      title: "",
      description: "",
      event_type: "Event",
      start_at: toLocalInput(start.toISOString()),
      end_at: toLocalInput(end.toISOString()),
      all_day: false,
      location: "",
      audience_type: "All",
      audience_id: "",
      status: "Active",
    });

    setModal(true);
  }

  function openEdit(event: CalendarEvent) {
    clearMessages();
    setEditing(event);

    setForm({
      title: event.title,
      description: event.description || "",
      event_type: event.event_type,
      start_at: toLocalInput(event.start_at),
      end_at: toLocalInput(event.end_at),
      all_day: event.all_day,
      location: event.location || "",
      audience_type: event.audience_type,
      audience_id: event.audience_id || "",
      status: event.status,
    });

    setModal(true);
  }

  async function saveEvent(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setSaving(true);
    clearMessages();

    try {
      const instituteId =
        await getInstituteId();

      if (!form.title.trim()) {
        throw new Error(
          "Event title is required."
        );
      }

      if (!form.start_at) {
        throw new Error(
          "Start date and time are required."
        );
      }

      if (
        form.audience_type === "Batch" &&
        !form.audience_id
      ) {
        throw new Error(
          "Please select a batch."
        );
      }

      const start = new Date(
        form.start_at
      );

      const end = form.end_at
        ? new Date(form.end_at)
        : null;

      if (
        end &&
        end.getTime() < start.getTime()
      ) {
        throw new Error(
          "End time cannot be before start time."
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        institute_id: instituteId,
        title: form.title.trim(),
        description:
          form.description.trim() || null,
        event_type: form.event_type,
        start_at: start.toISOString(),
        end_at: end
          ? end.toISOString()
          : null,
        all_day: form.all_day,
        location:
          form.location.trim() || null,
        audience_type:
          form.audience_type,
        audience_id:
          form.audience_type === "Batch"
            ? form.audience_id
            : null,
        status: form.status,
        created_by:
          user?.id || null,
      };

      if (editing) {
        const { error: updateError } =
          await supabase
            .from("calendar_events")
            .update(payload)
            .eq("id", editing.id)
            .eq(
              "institute_id",
              instituteId
            );

        if (updateError)
          throw updateError;
      } else {
        const { error: insertError } =
          await supabase
            .from("calendar_events")
            .insert(payload);

        if (insertError)
          throw insertError;
      }

      setModal(false);

      setSuccess(
        editing
          ? "Event updated successfully."
          : "Event created successfully."
      );

      setSelectedDate(start);

      setMonth(
        new Date(
          start.getFullYear(),
          start.getMonth(),
          1
        )
      );

      await loadData(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to save calendar event."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(
    event: CalendarEvent
  ) {
    clearMessages();

    if (
      !window.confirm(
        `Delete "${event.title}"?`
      )
    ) {
      return;
    }

    const { error: deleteError } =
      await supabase
        .from("calendar_events")
        .delete()
        .eq("id", event.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setViewing(null);

    setSuccess(
      "Event deleted successfully."
    );

    await loadData(true);
  }

  async function changeStatus(
    event: CalendarEvent,
    status: EventStatus
  ) {
    clearMessages();

    const { error: updateError } =
      await supabase
        .from("calendar_events")
        .update({ status })
        .eq("id", event.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(
      `Event marked as ${status}.`
    );

    setViewing(null);

    await loadData(true);
  }

  function eventColor(
    type: EventType
  ) {
    const map: Record<EventType, string> = {
      Event: styles.eventBlue,
      Class: styles.eventPurple,
      Exam: styles.eventRed,
      Holiday: styles.eventGreen,
      Meeting: styles.eventOrange,
      Reminder: styles.eventYellow,
      Workshop: styles.eventCyan,
      Other: styles.eventGrey,
    };

    return map[type];
  }

  function audienceLabel(
    event: CalendarEvent
  ) {
    if (event.audience_type === "Batch") {
      return (
        batches.find(
          (batch) =>
            batch.id === event.audience_id
        )?.name || "Selected batch"
      );
    }

    return event.audience_type;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            TOOLS
          </span>

          <h1>Calendar</h1>

          <p>
            Manage institute events, classes,
            exams, holidays, meetings and reminders.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            onClick={goToday}
          >
            Today
          </button>

          <button
            className={styles.secondaryButton}
            onClick={() =>
              void loadData(true)
            }
            disabled={refreshing}
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>

          <button
            className={styles.primaryButton}
            onClick={() =>
              openAdd(selectedDate)
            }
          >
            + Add Event
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className={styles.success}>
          <span>{success}</span>
          <button
            onClick={() => setSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>This Month</span>
          <strong>{stats.total}</strong>
          <small>Calendar events</small>
        </div>

        <div className={styles.statCard}>
          <span>Classes</span>
          <strong>{stats.classes}</strong>
          <small>Class schedules</small>
        </div>

        <div className={styles.statCard}>
          <span>Exams</span>
          <strong>{stats.exams}</strong>
          <small>Exam dates</small>
        </div>

        <div className={styles.statCard}>
          <span>Holidays</span>
          <strong>{stats.holidays}</strong>
          <small>Institute holidays</small>
        </div>

        <div className={styles.statCard}>
          <span>Meetings</span>
          <strong>{stats.meetings}</strong>
          <small>Scheduled meetings</small>
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.filters}>
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search events..."
          />

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Types
            </option>

            {eventTypes.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Status
            </option>
            <option value="Active">
              Active
            </option>
            <option value="Completed">
              Completed
            </option>
            <option value="Cancelled">
              Cancelled
            </option>
          </select>
        </div>
      </section>

      <section className={styles.calendarLayout}>
        <div className={styles.calendarCard}>
          <div className={styles.calendarHeader}>
            <button
              className={styles.navButton}
              onClick={goPreviousMonth}
            >
              ‹
            </button>

            <h2>{monthTitle(month)}</h2>

            <button
              className={styles.navButton}
              onClick={goNextMonth}
            >
              ›
            </button>
          </div>

          <div className={styles.weekdays}>
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className={styles.calendarGrid}>
            {calendarDays.map((date) => {
              const dayEvents =
                monthEvents.filter(
                  (event) =>
                    sameDay(
                      new Date(
                        event.start_at
                      ),
                      date
                    )
                );

              const inMonth =
                date.getMonth() ===
                  month.getMonth() &&
                date.getFullYear() ===
                  month.getFullYear();

              const selected =
                sameDay(
                  date,
                  selectedDate
                );

              const today =
                sameDay(
                  date,
                  new Date()
                );

              return (
                <button
                  key={date.toISOString()}
                  className={`${styles.dayCell} ${
                    !inMonth
                      ? styles.otherMonth
                      : ""
                  } ${
                    selected
                      ? styles.selectedDay
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedDate(date);

                    if (
                      date.getMonth() !==
                      month.getMonth()
                    ) {
                      setMonth(
                        new Date(
                          date.getFullYear(),
                          date.getMonth(),
                          1
                        )
                      );
                    }
                  }}
                >
                  <span
                    className={
                      today
                        ? styles.todayNumber
                        : styles.dayNumber
                    }
                  >
                    {formatDay(date)}
                  </span>

                  <div
                    className={
                      styles.dayEvents
                    }
                  >
                    {dayEvents
                      .slice(0, 3)
                      .map((event) => (
                        <span
                          key={event.id}
                          className={`${styles.eventPill} ${eventColor(
                            event.event_type
                          )}`}
                          onClick={(click) => {
                            click.stopPropagation();
                            setViewing(event);
                          }}
                        >
                          {event.title}
                        </span>
                      ))}

                    {dayEvents.length > 3 && (
                      <span
                        className={
                          styles.moreEvents
                        }
                      >
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className={styles.sideCard}>
          <div className={styles.sideHeader}>
            <div>
              <span>SELECTED DATE</span>
              <h2>
                {selectedDate.toLocaleDateString(
                  "en-IN",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }
                )}
              </h2>
            </div>

            <button
              className={styles.addMini}
              onClick={() =>
                openAdd(selectedDate)
              }
            >
              +
            </button>
          </div>

          <div className={styles.selectedList}>
            {selectedEvents.map((event) => (
              <button
                key={event.id}
                className={styles.eventCard}
                onClick={() =>
                  setViewing(event)
                }
              >
                <span
                  className={`${styles.eventDot} ${eventColor(
                    event.event_type
                  )}`}
                />

                <div>
                  <strong>
                    {event.title}
                  </strong>

                  <small>
                    {event.all_day
                      ? "All day"
                      : new Date(
                          event.start_at
                        ).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}

                    {" · "}
                    {event.event_type}
                  </small>
                </div>
              </button>
            ))}

            {!selectedEvents.length && (
              <div className={styles.noEvents}>
                <div>📅</div>
                <strong>No events</strong>
                <span>
                  Nothing scheduled for this date.
                </span>

                <button
                  onClick={() =>
                    openAdd(selectedDate)
                  }
                >
                  Add Event
                </button>
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* ADD / EDIT MODAL */}

      {modal && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setModal(false);
            }
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span>CALENDAR</span>
                <h2>
                  {editing
                    ? "Edit Event"
                    : "Add Event"}
                </h2>
              </div>

              <button
                onClick={() =>
                  setModal(false)
                }
              >
                ×
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={saveEvent}
            >
              <div className={styles.formGrid}>
                <label className={styles.full}>
                  Event Title *
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        title:
                          event.target
                            .value,
                      }))
                    }
                    placeholder="e.g. Annual Examination"
                  />
                </label>

                <label>
                  Event Type
                  <select
                    value={form.event_type}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        event_type:
                          event.target
                            .value as EventType,
                      }))
                    }
                  >
                    {eventTypes.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        status:
                          event.target
                            .value as EventStatus,
                      }))
                    }
                  >
                    <option value="Active">
                      Active
                    </option>
                    <option value="Completed">
                      Completed
                    </option>
                    <option value="Cancelled">
                      Cancelled
                    </option>
                  </select>
                </label>

                <label>
                  Start
                  <input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        start_at:
                          event.target
                            .value,
                      }))
                    }
                  />
                </label>

                <label>
                  End
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        end_at:
                          event.target
                            .value,
                      }))
                    }
                  />
                </label>

                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={form.all_day}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        all_day:
                          event.target
                            .checked,
                      }))
                    }
                  />
                  All-day event
                </label>

                <label>
                  Location
                  <input
                    value={form.location}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        location:
                          event.target
                            .value,
                      }))
                    }
                    placeholder="Classroom / Hall / Online"
                  />
                </label>

                <label>
                  Audience
                  <select
                    value={
                      form.audience_type
                    }
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        audience_type:
                          event.target
                            .value as AudienceType,
                        audience_id: "",
                      }))
                    }
                  >
                    <option>All</option>
                    <option>Students</option>
                    <option>Parents</option>
                    <option>Staff</option>
                    <option>Batch</option>
                  </select>
                </label>

                {form.audience_type ===
                  "Batch" && (
                  <label>
                    Select Batch *
                    <select
                      value={
                        form.audience_id
                      }
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          audience_id:
                            event.target
                              .value,
                        }))
                      }
                    >
                      <option value="">
                        Select batch
                      </option>

                      {batches.map(
                        (batch) => (
                          <option
                            key={batch.id}
                            value={
                              batch.id
                            }
                          >
                            {batch.name}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                )}

                <label
                  className={styles.full}
                >
                  Description
                  <textarea
                    rows={5}
                    value={
                      form.description
                    }
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description:
                          event.target
                            .value,
                      }))
                    }
                    placeholder="Event details..."
                  />
                </label>
              </div>

              <div
                className={
                  styles.modalFooter
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    setModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Update Event"
                      : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}

      {viewing && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setViewing(null);
            }
          }}
        >
          <div className={styles.viewModal}>
            <div className={styles.modalHeader}>
              <div>
                <span>
                  {viewing.event_type.toUpperCase()}
                </span>
                <h2>
                  {viewing.title}
                </h2>
              </div>

              <button
                onClick={() =>
                  setViewing(null)
                }
              >
                ×
              </button>
            </div>

            <div className={styles.viewBody}>
              <div className={styles.viewMeta}>
                <span>
                  Date & Time
                  <strong>
                    {viewing.all_day
                      ? formatDate(
                          viewing.start_at
                        ).split(",")[0]
                      : formatDate(
                          viewing.start_at
                        )}
                  </strong>
                </span>

                <span>
                  Audience
                  <strong>
                    {audienceLabel(
                      viewing
                    )}
                  </strong>
                </span>

                <span>
                  Status
                  <strong>
                    {viewing.status}
                  </strong>
                </span>

                <span>
                  Location
                  <strong>
                    {viewing.location ||
                      "—"}
                  </strong>
                </span>
              </div>

              {viewing.end_at && (
                <div
                  className={
                    styles.infoLine
                  }
                >
                  Ends:{" "}
                  {formatDate(
                    viewing.end_at
                  )}
                </div>
              )}

              <div
                className={
                  styles.messageBox
                }
              >
                {viewing.description ||
                  "No description added."}
              </div>
            </div>

            <div
              className={
                styles.modalFooter
              }
            >
              <button
                onClick={() =>
                  setViewing(null)
                }
              >
                Close
              </button>

              <button
                onClick={() => {
                  setViewing(null);
                  openEdit(viewing);
                }}
              >
                Edit
              </button>

              {viewing.status ===
                "Active" && (
                <button
                  onClick={() =>
                    void changeStatus(
                      viewing,
                      "Completed"
                    )
                  }
                >
                  Mark Completed
                </button>
              )}

              <button
                className={
                  styles.dangerButton
                }
                onClick={() =>
                  void deleteEvent(
                    viewing
                  )
                }
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
