"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import styles from "./staff-attendance.module.css";



type AttendanceStatus = "P" | "A" | "L";



type Staff = {

  id: string;

  first_name: string;

  last_name: string | null;

  employee_id: string | null;

  phone: string | null;

  designation: string | null;

  department: string | null;

  status: string | null;

};



type AttendanceMap = Record<string, AttendanceStatus>;



function getToday() {

  const now = new Date();



  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");



  return `${year}-${month}-${day}`;

}



function formatDate(date: string) {

  if (!date) return "";



  const [year, month, day] = date.split("-");



  return `${day}-${month}-${year}`;

}



function getMonthStart(date: string) {

  if (!date) return "";



  return `${date.slice(0, 7)}-01`;

}



export default function StaffAttendancePage() {

  const supabase = createClient();



  const [selectedDate, setSelectedDate] =

    useState(getToday());



  const [staff, setStaff] = useState<Staff[]>([]);

  const [attendance, setAttendance] =

    useState<AttendanceMap>({});



  const [search, setSearch] = useState("");



  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);



  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");



  const [instituteId, setInstituteId] =

    useState<string | null>(null);



  const [userId, setUserId] =

    useState<string | null>(null);



  /*

   * ----------------------------------------------------

   * LOAD INSTITUTE + USER

   * ----------------------------------------------------

   */



  const loadProfile = useCallback(async () => {

    const {

      data: { user },

      error: userError,

    } = await supabase.auth.getUser();



    if (userError) {

      throw userError;

    }



    if (!user) {

      throw new Error("Please login first.");

    }



    setUserId(user.id);



    const {

      data: profile,

      error: profileError,

    } = await supabase

      .from("profiles")

      .select("institute_id")

      .eq("id", user.id)

      .single();



    if (profileError) {

      throw profileError;

    }



    if (!profile?.institute_id) {

      throw new Error(

        "Unable to load your institute profile."

      );

    }



    setInstituteId(profile.institute_id);



    return {

      userId: user.id,

      instituteId: profile.institute_id,

    };

  }, [supabase]);



  /*

   * ----------------------------------------------------

   * LOAD STAFF

   * ----------------------------------------------------

   */



  const loadStaff = useCallback(

    async (currentInstituteId: string) => {

      const {

        data,

        error: staffError,

      } = await supabase

        .from("staff")

        .select(

          `

          id,

          first_name,

          last_name,

          employee_id,

          phone,

          designation,

          department,

          status

        `

        )

        .eq("institute_id", currentInstituteId)

        .order("first_name", {

          ascending: true,

        });



      if (staffError) {

        throw staffError;

      }



      setStaff((data || []) as Staff[]);

    },

    [supabase]

  );



  /*

   * ----------------------------------------------------

   * LOAD ATTENDANCE FOR SELECTED DATE

   * ----------------------------------------------------

   */



  const loadAttendance = useCallback(

    async (

      currentInstituteId: string,

      date: string

    ) => {

      const {

        data,

        error: attendanceError,

      } = await supabase

        .from("staff_attendance")

        .select(

          `

          staff_id,

          status

        `

        )

        .eq("institute_id", currentInstituteId)

        .eq("attendance_date", date);



      if (attendanceError) {

        throw attendanceError;

      }



      const map: AttendanceMap = {};



      (data || []).forEach((row) => {

        const status = String(

          row.status

        ).toUpperCase();



        if (

          status === "P" ||

          status === "A" ||

          status === "L"

        ) {

          map[row.staff_id] =

            status as AttendanceStatus;

        }

      });



      setAttendance(map);

    },

    [supabase]

  );



  /*

   * ----------------------------------------------------

   * INITIAL LOAD

   * ----------------------------------------------------

   */



  const loadAll = useCallback(async () => {

    try {

      setLoading(true);

      setError("");



      const profile = await loadProfile();



      await Promise.all([

        loadStaff(profile.instituteId),

        loadAttendance(

          profile.instituteId,

          selectedDate

        ),

      ]);

    } catch (err) {

      console.error(

        "Staff attendance load error:",

        err

      );



      setError(

        err instanceof Error

          ? err.message

          : "Unable to load staff attendance."

      );

    } finally {

      setLoading(false);

    }

  }, [

    loadProfile,

    loadStaff,

    loadAttendance,

    selectedDate,

  ]);



  useEffect(() => {

    loadAll();

  }, [loadAll]);



  /*

   * ----------------------------------------------------

   * DATE CHANGE

   * ----------------------------------------------------

   */



  const handleDateChange = async (

    date: string

  ) => {

    setSelectedDate(date);

    setSuccess("");

    setError("");



    if (!instituteId) return;



    try {

      setLoading(true);



      await loadAttendance(

        instituteId,

        date

      );

    } catch (err) {

      console.error(err);



      setError(

        err instanceof Error

          ? err.message

          : "Unable to load attendance."

      );

    } finally {

      setLoading(false);

    }

  };



  /*

   * ----------------------------------------------------

   * SET STATUS

   * ----------------------------------------------------

   */



  const setStatus = (

    staffId: string,

    status: AttendanceStatus

  ) => {

    setAttendance((previous) => ({

      ...previous,

      [staffId]: status,

    }));



    setSuccess("");

    setError("");

  };



  /*

   * ----------------------------------------------------

   * CLEAR STATUS

   * ----------------------------------------------------

   */



  const clearStatus = (staffId: string) => {

    setAttendance((previous) => {

      const next = {

        ...previous,

      };



      delete next[staffId];



      return next;

    });

  };



  /*

   * ----------------------------------------------------

   * SAVE ATTENDANCE

   * ----------------------------------------------------

   */



  const handleSave = async () => {

    if (!instituteId || !userId) {

      setError(

        "Your institute profile could not be loaded."

      );

      return;

    }



    if (!selectedDate) {

      setError("Please select a date.");

      return;

    }



    if (Object.keys(attendance).length === 0) {

      setError(

        "Please mark attendance for at least one staff member."

      );

      return;

    }



    try {

      setSaving(true);

      setError("");

      setSuccess("");



      const rows = Object.entries(

        attendance

      ).map(([staffId, status]) => ({

        institute_id: instituteId,

        staff_id: staffId,

        attendance_date: selectedDate,

        status,

        remarks: null,

        marked_by: userId,

        updated_at: new Date().toISOString(),

      }));



      const {

        error: saveError,

      } = await supabase

        .from("staff_attendance")

        .upsert(rows, {

          onConflict:

            "staff_id,attendance_date",

        });



      if (saveError) {

        throw saveError;

      }



      setSuccess(

        `Attendance saved for ${formatDate(

          selectedDate

        )}.`

      );



      /*

       * Reload from database.

       * This ensures UI represents actual DB data.

       */



      await loadAttendance(

        instituteId,

        selectedDate

      );

    } catch (err: any) {

      console.error("Save staff attendance error:", err);

      setError(

        err?.message ||

        err?.details ||

        err?.hint ||

        "Unable to save attendance."

      );

    } finally {

      setSaving(false);

    }

  };



  /*

   * ----------------------------------------------------

   * ACTIVE STAFF

   * ----------------------------------------------------

   */



  const activeStaff = useMemo(() => {

    return staff.filter(

      (member) =>

        String(member.status || "")

          .toLowerCase() === "active"

    );

  }, [staff]);



  /*

   * ----------------------------------------------------

   * FILTERED STAFF

   * ----------------------------------------------------

   */



  const filteredStaff = useMemo(() => {

    const query = search

      .trim()

      .toLowerCase();



    if (!query) {

      return activeStaff;

    }



    return activeStaff.filter((member) => {

      const name =

        `${member.first_name || ""} ${

          member.last_name || ""

        }`.toLowerCase();



      const employeeId = String(

        member.employee_id || ""

      ).toLowerCase();



      const designation = String(

        member.designation || ""

      ).toLowerCase();



      const department = String(

        member.department || ""

      ).toLowerCase();



      return (

        name.includes(query) ||

        employeeId.includes(query) ||

        designation.includes(query) ||

        department.includes(query)

      );

    });

  }, [activeStaff, search]);



  /*

   * ----------------------------------------------------

   * TODAY COUNTS

   * ----------------------------------------------------

   */



  const presentCount = useMemo(() => {

    return activeStaff.filter(

      (member) =>

        attendance[member.id] === "P"

    ).length;

  }, [activeStaff, attendance]);



  const absentCount = useMemo(() => {

    return activeStaff.filter(

      (member) =>

        attendance[member.id] === "A"

    ).length;

  }, [activeStaff, attendance]);



  const leaveCount = useMemo(() => {

    return activeStaff.filter(

      (member) =>

        attendance[member.id] === "L"

    ).length;

  }, [activeStaff, attendance]);



  const pendingCount = useMemo(() => {

    return activeStaff.filter(

      (member) =>

        !attendance[member.id]

    ).length;

  }, [activeStaff, attendance]);



  /*

   * ----------------------------------------------------

   * THIS MONTH ATTENDANCE COUNT

   * ----------------------------------------------------

   */



  const [monthCount, setMonthCount] =

    useState(0);



  useEffect(() => {

    if (!instituteId || !selectedDate) return;



    const loadMonthCount =

      async () => {

        const monthStart =

          getMonthStart(selectedDate);



        const {

          count,

          error: monthError,

        } = await supabase

          .from("staff_attendance")

          .select("id", {

            count: "exact",

            head: true,

          })

          .eq(

            "institute_id",

            instituteId

          )

          .gte(

            "attendance_date",

            monthStart

          )

          .lte(

            "attendance_date",

            selectedDate

          );



        if (!monthError) {

          setMonthCount(count || 0);

        }

      };



    loadMonthCount();

  }, [

    instituteId,

    selectedDate,

    attendance,

    supabase,

  ]);



  /*

   * ----------------------------------------------------

   * UI

   * ----------------------------------------------------

   */



  return (

    <div className={`${styles.module_page} ${styles.staff_attendance_page}`}>

      



      {/* PAGE HERO */}

      <div className={styles.module_hero}>

        <div>

          <span className={styles.eyebrow}>

            STAFF MANAGEMENT

          </span>



          <h2>Staff Attendance</h2>



          <p>

            Track staff attendance, absences and

            working days.

          </p>

        </div>

      </div>



      {/* DATE + ACTION */}

      <div className={styles.attendance_top}>

        <div className={styles.attendance_date_box}>

          <label htmlFor="attendance-date">

            Attendance Date

          </label>



          <input

            id="attendance-date"

            type="date"

            value={selectedDate}

            onChange={(e) =>

              handleDateChange(

                e.target.value

              )

            }

          />

        </div>



        <button

          className={styles.primary_btn}

          onClick={handleSave}

          disabled={

            saving ||

            loading ||

            activeStaff.length === 0

          }

        >

          {saving

            ? "Saving..."

            : "✓ Save Attendance"}

        </button>

      </div>



      {/* ERROR */}

      {error && (

        <div className={`${styles.attendance_message} ${styles.attendance_error}`}>

          {error}

        </div>

      )}



      {/* SUCCESS */}

      {success && (

        <div className={`${styles.attendance_message} ${styles.attendance_success}`}>

          {success}

        </div>

      )}



      {/* STATS */}

      <div className={styles.module_stats}>

        <div className={`${styles.stat_card} ${styles.purple}`}>

          <span>Total</span>

          <strong>{staff.length}</strong>

        </div>



        <div className={`${styles.stat_card} ${styles.green}`}>

          <span>Active</span>

          <strong>{activeStaff.length}</strong>

        </div>



        <div className={`${styles.stat_card} ${styles.orange}`}>

          <span>Pending</span>

          <strong>{pendingCount}</strong>

        </div>



        <div className={`${styles.stat_card} ${styles.blue}`}>

          <span>This month</span>

          <strong>{monthCount}</strong>

        </div>

      </div>



      {/* ATTENDANCE PANEL */}

      <section className={styles.data_panel}>

        <div className={styles.attendance_controls}>

          <div>

            <strong>

              Attendance for{" "}

              {formatDate(selectedDate)}

            </strong>



            <div className={styles.attendance_date_text}>

              Mark P, A or L for each active staff

              member.

            </div>

          </div>



          <input

            className={styles.attendance_search}

            type="search"

            placeholder="Search staff..."

            value={search}

            onChange={(e) =>

              setSearch(e.target.value)

            }

          />

        </div>



        {loading ? (

          <div className={styles.empty_attendance}>

            Loading staff attendance...

          </div>

        ) : filteredStaff.length === 0 ? (

          <div className={styles.empty_attendance}>

            <strong>

              No staff members found

            </strong>



            <span>

              Add active staff from Staff Manager

              first.

            </span>

          </div>

        ) : (

          <div className={styles.attendance_list}>

            {filteredStaff.map((member) => {

              const fullName =

                `${member.first_name || ""} ${

                  member.last_name || ""

                }`.trim();



              const currentStatus =

                attendance[member.id];



              const meta = [

                member.employee_id

                  ? `ID: ${member.employee_id}`

                  : "",

                member.designation || "",

                member.department || "",

              ]

                .filter(Boolean)

                .join(" • ");



              return (

                <div

                  className={styles.attendance_row}

                  key={member.id}

                >

                  <div className={styles.staff_info}>

                    <div className={styles.staff_avatar}>

                      {(

                        member.first_name ||

                        "S"

                      )

                        .charAt(0)

                        .toUpperCase()}

                    </div>



                    <div>

                      <div className={styles.staff_name}>

                        {fullName ||

                          "Unnamed Staff"}

                      </div>



                      <span className={styles.staff_meta}>

                        {meta ||

                          member.phone ||

                          "Staff member"}

                      </span>

                    </div>

                  </div>



                  <div className={styles.status_buttons}>

                    <button

                      type="button"

                       className={`${styles.status_btn} ${styles.status_p} ${currentStatus === "P" ? styles.selected : ""}`}

                      onClick={() =>

                        setStatus(

                          member.id,

                          "P"

                        )

                      }

                    >

                      P

                    </button>



                    <button

                      type="button"

                       className={`${styles.status_btn} ${styles.status_a} ${currentStatus === "A" ? styles.selected : ""}`}

                      onClick={() =>

                        setStatus(

                          member.id,

                          "A"

                        )

                      }

                    >

                      A

                    </button>



                    <button

                      type="button"

                       className={`${styles.status_btn} ${styles.status_l} ${currentStatus === "L" ? styles.selected : ""}`}

                      onClick={() =>

                        setStatus(

                          member.id,

                          "L"

                        )

                      }

                    >

                      L

                    </button>



                    {currentStatus && (

                      <button

                        type="button"

                        className={styles.clear_status}

                        onClick={() =>

                          clearStatus(

                            member.id

                          )

                        }

                        title="Clear"

                      >

                        ×

                      </button>

                    )}

                  </div>

                </div>

              );

            })}

          </div>

        )}



        <div className={styles.attendance_footer}>

          <button

            className={styles.save_attendance}

            onClick={handleSave}

            disabled={

              saving ||

              loading ||

              activeStaff.length === 0

            }

          >

            {saving

              ? "Saving Attendance..."

              : `Save Attendance — ${formatDate(

                  selectedDate

                )}`}

          </button>

        </div>

      </section>



      {/* TODAY SUMMARY */}

      <section className={styles.data_panel}>

        <div className={styles.attendance_controls}>

          <div>

            <strong>

              {formatDate(selectedDate)} Summary

            </strong>



            <div className={styles.attendance_date_text}>

              Current attendance status

            </div>

          </div>

        </div>



        <div className={styles.module_stats}>

          <div className={`${styles.stat_card} ${styles.green}`}>

            <span>Present</span>

            <strong>{presentCount}</strong>

          </div>



          <div className={`${styles.stat_card} ${styles.red}`}>

            <span>Absent</span>

            <strong>{absentCount}</strong>

          </div>



          <div className={`${styles.stat_card} ${styles.orange}`}>

            <span>Leave</span>

            <strong>{leaveCount}</strong>

          </div>



          <div className={`${styles.stat_card} ${styles.purple}`}>

            <span>Not Marked</span>

            <strong>{pendingCount}</strong>

          </div>

        </div>

      </section>

    </div>

  );

}
