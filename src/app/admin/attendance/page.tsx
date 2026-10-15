"use client";



import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import styles from "./attendance.module.css";

import { createClient } from "@/lib/supabase/client";



type AttendanceStatus = "P" | "A" | "L";



type Student = {

  id: string;

  name: string;

  phone: string | null;

  batchId: string | null;

};



type AttendanceMap = Record<string, AttendanceStatus>;



type AttendanceRow = {

  id: string;

  student_id: string;

  batch_id: string | null;

  attendance_date: string;

  status: string;

  remarks: string | null;

  marked_by: string | null;

};



function getToday() {

  const date = new Date();



  const year = date.getFullYear();

  const month = String(

    date.getMonth() + 1

  ).padStart(2, "0");

  const day = String(

    date.getDate()

  ).padStart(2, "0");



  return `${year}-${month}-${day}`;

}



function getStudentName(student: {

  first_name: string | null;

  middle_name: string | null;

  last_name: string | null;

}) {

  return [

    student.first_name,

    student.middle_name,

    student.last_name,

  ]

    .filter(Boolean)

    .join(" ")

    .trim();

}



function databaseStatusToUI(

  status: string

): AttendanceStatus | null {

  const value = status.toLowerCase();



  if (

    value === "present" ||

    value === "p"

  ) {

    return "P";

  }



  if (

    value === "absent" ||

    value === "a"

  ) {

    return "A";

  }



  if (

    value === "leave" ||

    value === "l"

  ) {

    return "L";

  }



  return null;

}



function uiStatusToDatabase(

  status: AttendanceStatus

) {

  if (status === "P") return "present";

  if (status === "A") return "absent";

  return "leave";

}



export default function AttendancePage() {

  const supabase = createClient();



  const [students, setStudents] = useState<

    Student[]

  >([]);



  const [attendance, setAttendance] =

    useState<AttendanceMap>({});



  const [loading, setLoading] =

    useState(true);



  const [saving, setSaving] =

    useState(false);



  const [error, setError] =

    useState("");



  const [saved, setSaved] =

    useState(false);



  const [search, setSearch] =

    useState("");



  const [selectedDate, setSelectedDate] = useState(getToday());



  /*

   * ------------------------------------------------

   * LOAD STUDENTS + SELECTED DATE'S ATTENDANCE

   * ------------------------------------------------

   */



  const loadAttendance = async () => {

    setLoading(true);

    setError("");

    setSaved(false);



    try {

      // ---------------------------------------------

      // CURRENT USER

      // ---------------------------------------------



      const {

        data: { user },

        error: userError,

      } = await supabase.auth.getUser();



      if (userError || !user) {

        setError("Please login first.");

        return;

      }



      // ---------------------------------------------

      // PROFILE / INSTITUTE

      // ---------------------------------------------



      const {

        data: profile,

        error: profileError,

      } = await supabase

        .from("profiles")

        .select("institute_id")

        .eq("id", user.id)

        .single();



      if (

        profileError ||

        !profile?.institute_id

      ) {

        console.error(

          "Profile error:",

          profileError

        );



        setError(

          "Unable to load your institute profile."

        );



        return;

      }



      const instituteId =

        profile.institute_id;



      // ---------------------------------------------

      // LOAD STUDENTS

      // ---------------------------------------------



      const {

        data: studentData,

        error: studentError,

      } = await supabase

        .from("students")

        .select(

          `

          id,

          first_name,

          middle_name,

          last_name,

          phone,

          batch_id

        `

        )

        .eq(

          "institute_id",

          instituteId

        )

        .order("created_at", {

          ascending: false,

        });



      if (studentError) {

        console.error(

          "Student error:",

          studentError

        );



        setError(

          studentError.message

        );



        return;

      }



      const formattedStudents: Student[] =

        (studentData || []).map(

          (student) => ({

            id: student.id,



            name:

              getStudentName(student) ||

              "Unnamed Student",



            phone:

              student.phone || null,



            batchId:

              student.batch_id || null,

          })

        );



      setStudents(

        formattedStudents

      );



      // ---------------------------------------------

      // LOAD SELECTED DATE'S ATTENDANCE

      // ---------------------------------------------



      const {

        data: attendanceData,

        error: attendanceError,

      } = await supabase

        .from("attendance")

        .select(

          `

          id,

          student_id,

          batch_id,

          attendance_date,

          status,

          remarks,

          marked_by

        `

        )

        .eq(

          "institute_id",

          instituteId

        )

        .eq(

          "attendance_date",

          selectedDate

        );



      if (attendanceError) {

        console.error(

          "Attendance error:",

          attendanceError

        );



        setError(

          attendanceError.message

        );



        return;

      }



      const attendanceRows =

        (attendanceData ||

          []) as AttendanceRow[];



      const loadedAttendance: AttendanceMap =

        {};



      attendanceRows.forEach(

        (row) => {

          const status =

            databaseStatusToUI(

              row.status

            );



          if (status) {

            loadedAttendance[

              row.student_id

            ] = status;

          }

        }

      );



      setAttendance(

        loadedAttendance

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



  useEffect(() => {

    void loadAttendance();

  }, [selectedDate]);



  // ---------------------------------------------

  // SET STATUS

  // ---------------------------------------------



  const setStatus = (

    studentId: string,

    status: AttendanceStatus

  ) => {

    setSaved(false);



    setAttendance(

      (previous) => ({

        ...previous,

        [studentId]: status,

      })

    );

  };



  // ---------------------------------------------

  // SEARCH

  // ---------------------------------------------



  const filteredStudents =

    useMemo(() => {

      const query =

        search.trim().toLowerCase();



      if (!query) {

        return students;

      }



      return students.filter(

        (student) => {

          const text = [

            student.name,

            student.phone || "",

            student.id,

          ]

            .join(" ")

            .toLowerCase();



          return text.includes(

            query

          );

        }

      );

    }, [students, search]);



  // ---------------------------------------------

  // COUNTS

  // ---------------------------------------------



  const presentCount =

    useMemo(() => {

      return Object.values(

        attendance

      ).filter(

        (status) =>

          status === "P"

      ).length;

    }, [attendance]);



  const absentCount =

    useMemo(() => {

      return Object.values(

        attendance

      ).filter(

        (status) =>

          status === "A"

      ).length;

    }, [attendance]);



  const leaveCount =

    useMemo(() => {

      return Object.values(

        attendance

      ).filter(

        (status) =>

          status === "L"

      ).length;

    }, [attendance]);



  // ---------------------------------------------

  // SAVE ATTENDANCE

  // ---------------------------------------------



  const handleSave = async () => {

    if (students.length === 0) {

      alert(

        "No students available."

      );

      return;

    }



    if (

      Object.keys(attendance)

        .length === 0

    ) {

      alert(

        "Please mark attendance for at least one student."

      );

      return;

    }



    setSaving(true);

    setError("");

    setSaved(false);



    try {

      // -------------------------------------------

      // CURRENT USER

      // -------------------------------------------



      const {

        data: { user },

        error: userError,

      } = await supabase.auth.getUser();



      if (

        userError ||

        !user

      ) {

        setError(

          "Please login first."

        );



        return;

      }



      // -------------------------------------------

      // PROFILE

      // -------------------------------------------



      const {

        data: profile,

        error: profileError,

      } = await supabase

        .from("profiles")

        .select("institute_id")

        .eq("id", user.id)

        .single();



      if (

        profileError ||

        !profile?.institute_id

      ) {

        setError(

          "Unable to load your institute profile."

        );



        return;

      }



      const instituteId =

        profile.institute_id;



      // -------------------------------------------

      // SAVE EACH MARKED STUDENT

      // -------------------------------------------



      for (

        const student of students

      ) {

        const selectedStatus =

          attendance[

            student.id

          ];



        // Skip students for whom

        // attendance was not marked.

        if (!selectedStatus) {

          continue;

        }



        const databaseStatus =

          uiStatusToDatabase(

            selectedStatus

          );



        // -----------------------------------------

        // CHECK EXISTING RECORD

        // -----------------------------------------



        const {

          data: existing,

          error: existingError,

        } = await supabase

          .from("attendance")

          .select("id")

          .eq(

            "institute_id",

            instituteId

          )

          .eq(

            "student_id",

            student.id

          )

          .eq(

            "attendance_date",

          selectedDate

          )

          .maybeSingle();



        if (existingError) {

          throw existingError;

        }



        // -----------------------------------------

        // UPDATE EXISTING

        // -----------------------------------------



        if (existing?.id) {

          const {

            error: updateError,

          } = await supabase

            .from("attendance")

            .update({

              batch_id:

                student.batchId,

              status:

                databaseStatus,

              marked_by:

                user.id,

            })

            .eq(

              "id",

              existing.id

            );



          if (updateError) {

            throw updateError;

          }

        }



        // -----------------------------------------

        // INSERT NEW

        // -----------------------------------------



        else {

          const {

            error: insertError,

          } = await supabase

            .from("attendance")

            .insert({

              institute_id:

                instituteId,



              student_id:

                student.id,



              batch_id:

                student.batchId,



              attendance_date:

                selectedDate,



              status:

                databaseStatus,



              remarks:

                null,



              marked_by:

                user.id,

            });



          if (insertError) {

            throw insertError;

          }

        }

      }



      setSaved(true);



      // Reload from database so

      // UI represents actual saved data.

      await loadAttendance();

    } catch (err) {

      console.error(

        "Save attendance error:",

        err

      );



      setError(

        err instanceof Error

          ? err.message

          : "Unable to save attendance."

      );

    } finally {

      setSaving(false);

    }

  };



  return (

    <main className={styles.page}>

      {/* Animated background */}

      <div className={styles.glowOne} />

      <div className={styles.glowTwo} />



      {/* HEADER */}

      <header className={styles.header}>

        <div className={styles.headerLeft}>

          <Link

            href="/admin"

            className={styles.backButton}

          >

            ←

          </Link>



          <div>

            <p

              className={

                styles.eyebrow

              }

            >

              ACADEMIC MANAGEMENT

            </p>



            <h1>Attendance</h1>



            <p

              className={

                styles.subtitle

              }

            >

              Manage daily student

              attendance.

            </p>

          </div>

        </div>



        <Link

          href="/admin"

          className={

            styles.dashboardButton

          }

        >

          Dashboard

        </Link>

      </header>



      {/* CONTENT */}

      <section className={styles.content}>

        {/* ERROR */}

        {error && (

          <div

            style={{

              marginBottom: "20px",

              padding:

                "14px 18px",

              borderRadius:

                "14px",

              background:

                "#fff1f2",

              border:

                "1px solid #fecdd3",

              color:

                "#be123c",

            }}

          >

            {error}

          </div>

        )}



        {/* STATS */}

        <section

          className={

            styles.statsGrid

          }

        >

          <div

            className={`${styles.statCard} ${styles.totalCard}`}

          >

            <div

              className={

                styles.statIcon

              }

            >

              ♙

            </div>



            <div>

              <span>

                Total Students

              </span>



              <strong>

                {loading

                  ? "…"

                  : students.length}

              </strong>

            </div>

          </div>



          <div

            className={`${styles.statCard} ${styles.presentCard}`}

          >

            <div

              className={

                styles.statIcon

              }

            >

              P

            </div>



            <div>

              <span>Present</span>



              <strong>

                {presentCount}

              </strong>

            </div>

          </div>



          <div

            className={`${styles.statCard} ${styles.absentCard}`}

          >

            <div

              className={

                styles.statIcon

              }

            >

              A

            </div>



            <div>

              <span>Absent</span>



              <strong>

                {absentCount}

              </strong>

            </div>

          </div>



          <div

            className={`${styles.statCard} ${styles.leaveCard}`}

          >

            <div

              className={

                styles.statIcon

              }

            >

              L

            </div>



            <div>

              <span>Leave</span>



              <strong>

                {leaveCount}

              </strong>

            </div>

          </div>

        </section>



        {/* ATTENDANCE PANEL */}

        <section

          className={styles.panel}

        >

          <div

            className={

              styles.panelHeader

            }

          >

            <div>

              <p

                className={

                  styles.panelLabel

                }

              >

                DAILY RECORD

              </p>



              <h2>

                Student Attendance

              </h2>



              <p>

                {loading

                  ? "Loading student records..."

                  : `${students.length} student${

                      students.length === 1

                        ? ""

                        : "s"

                    } loaded for ${selectedDate}.`}

              </p>

            </div>



            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <label
                htmlFor="attendance-date"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#5f6b8a",
                }}
              >
                Date
              </label>

              <input
                id="attendance-date"
                type="date"
                value={selectedDate}
                max={getToday()}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSaved(false);
                  setError("");
                }}
                disabled={saving}
                style={{
                  height: "44px",
                  padding: "0 12px",
                  border: "1px solid rgba(100,116,139,.2)",
                  borderRadius: "12px",
                  background: "#fff",
                  color: "#18213f",
                  fontSize: "14px",
                  fontWeight: 600,
                  outline: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              />
            </div>

            <button

              type="button"

              className={

                styles.saveButton

              }

              onClick={

                handleSave

              }

              disabled={

                saving ||

                loading

              }

            >

              {saving

                ? "Saving..."

                : saved

                ? "✓ Saved"

                : "Save Attendance"}

            </button>

          </div>



          {/* SEARCH */}

          {!loading &&

            students.length > 0 && (

              <div

                style={{

                  padding:

                    "0 28px 18px",

                }}

              >

                <input

                  type="search"

                  placeholder="Search student..."

                  value={search}

                  onChange={(event) =>

                    setSearch(

                      event.target

                        .value

                    )

                  }

                  style={{

                    width:

                      "100%",

                    maxWidth:

                      "420px",

                    padding:

                      "12px 16px",

                    border:

                      "1px solid rgba(100,116,139,.2)",

                    borderRadius:

                      "12px",

                    outline:

                      "none",

                    fontSize:

                      "14px",

                    background:

                      "#fff",

                  }}

                />

              </div>

            )}



          {/* LOADING */}

          {loading ? (

            <div

              className={

                styles.emptyState

              }

            >

              <div

                className={

                  styles.emptyIcon

                }

              >

                ♙

              </div>



              <h3>

                Loading students...

              </h3>



              <p>

                Fetching student

                records from

                Supabase.

              </p>

            </div>

          ) : students.length ===

            0 ? (

            /* EMPTY STATE */



            <div

              className={

                styles.emptyState

              }

            >

              <div

                className={

                  styles.emptyIcon

                }

              >

                ♙

              </div>



              <h3>

                No students found

              </h3>



              <p>

                Student names will

                appear here after

                students are added

                to the database.

              </p>



              <Link

                href="/admin/students"

                className={

                  styles.studentButton

                }

              >

                Go to Students

              </Link>

            </div>

          ) : filteredStudents.length ===

            0 ? (

            /* SEARCH EMPTY */



            <div

              className={

                styles.emptyState

              }

            >

              <div

                className={

                  styles.emptyIcon

                }

              >

                ⌕

              </div>



              <h3>

                No students found

              </h3>



              <p>

                Try another student

                name or phone number.

              </p>

            </div>

          ) : (

            /* STUDENT LIST */



            <div

              className={

                styles.studentList

              }

            >

              {filteredStudents.map(

                (student) => {

                  const currentStatus =

                    attendance[

                      student.id

                    ];



                  return (

                    <div

                      key={

                        student.id

                      }

                      className={

                        styles.studentRow

                      }

                    >

                      <div

                        className={

                          styles.studentInfo

                        }

                      >

                        <div

                          className={

                            styles.studentAvatar

                          }

                        >

                          {student.name

                            .charAt(

                              0

                            )

                            .toUpperCase()}

                        </div>



                        <div>

                          <strong>

                            {

                              student.name

                            }

                          </strong>



                          <span>

                            {student.phone

                              ? `Phone: ${student.phone}`

                              : `Student ID: ${student.id}`}

                          </span>

                        </div>

                      </div>



                      <div

                        className={

                          styles.statusButtons

                        }

                      >

                        <button

                          type="button"

                          title="Mark Present"

                          className={`${styles.statusButton} ${

                            styles.presentButton

                          } ${

                            currentStatus ===

                            "P"

                              ? styles.selected

                              : ""

                          }`}

                          onClick={() =>

                            setStatus(

                              student.id,

                              "P"

                            )

                          }

                        >

                          P

                        </button>



                        <button

                          type="button"

                          title="Mark Absent"

                          className={`${styles.statusButton} ${

                            styles.absentButton

                          } ${

                            currentStatus ===

                            "A"

                              ? styles.selected

                              : ""

                          }`}

                          onClick={() =>

                            setStatus(

                              student.id,

                              "A"

                            )

                          }

                        >

                          A

                        </button>



                        <button

                          type="button"

                          title="Mark Leave"

                          className={`${styles.statusButton} ${

                            styles.leaveButton

                          } ${

                            currentStatus ===

                            "L"

                              ? styles.selected

                              : ""

                          }`}

                          onClick={() =>

                            setStatus(

                              student.id,

                              "L"

                            )

                          }

                        >

                          L

                        </button>

                      </div>

                    </div>

                  );

                }

              )}

            </div>

          )}

        </section>



        {/* INFORMATION */}

        <section

          className={styles.infoBox}

        >

          <div

            className={

              styles.infoIcon

            }

          >

            i

          </div>



          <div>

            <strong>

              Database Connected

            </strong>



            <p>

              Attendance is connected

              to Supabase. Today&apos;s

              attendance records are

              loaded automatically and

              saved against the selected

              student and institute.

            </p>

          </div>

        </section>

      </section>

    </main>

  );

}
