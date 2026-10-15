"use client";



import Link from "next/link";

import { useEffect, useState } from "react";

import styles from "./families.module.css";

import { createClient } from "@/lib/supabase/client";



type Family = {

  id: string;

  family_name: string | null;

  father_name: string | null;

  mother_name: string | null;

  guardian_name: string | null;

  phone: string | null;

  alternate_phone: string | null;

  email: string | null;

  address: string | null;

  city: string | null;

  state: string | null;

  pincode: string | null;

  created_at: string;

  updated_at: string | null;

  student_count: number;

};

type FamilyForm = {
  family_name: string;
  father_name: string;
  mother_name: string;
  guardian_name: string;
  phone: string;
  alternate_phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

const emptyForm: FamilyForm = {
  family_name: "",
  father_name: "",
  mother_name: "",
  guardian_name: "",
  phone: "",
  alternate_phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

export default function FamiliesPage() {

  const supabase = createClient();



  const [families, setFamilies] = useState<Family[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FamilyForm>(emptyForm);



  const updateField = (key: keyof FamilyForm, value: string) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const getInstituteId = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Please login first.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.institute_id) {
      throw new Error("Unable to load your institute profile.");
    }

    return profile.institute_id as string;
  };

  const openAddFamily = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  const openEditFamily = (family: Family) => {
    setEditingId(family.id);
    setForm({
      family_name: family.family_name || "",
      father_name: family.father_name || "",
      mother_name: family.mother_name || "",
      guardian_name: family.guardian_name || "",
      phone: family.phone || "",
      alternate_phone: family.alternate_phone || "",
      email: family.email || "",
      address: family.address || "",
      city: family.city || "",
      state: family.state || "",
      pincode: family.pincode || "",
    });
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const saveFamily = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const familyName =
      form.family_name.trim() ||
      form.guardian_name.trim() ||
      form.father_name.trim() ||
      form.mother_name.trim();

    if (!familyName) {
      setError("Family Name or a parent/guardian name is required.");
      return;
    }

    setSaving(true);

    try {
      const instituteId = await getInstituteId();

      const payload = {
        institute_id: instituteId,
        family_name: familyName,
        father_name: form.father_name.trim() || null,
        mother_name: form.mother_name.trim() || null,
        guardian_name: form.guardian_name.trim() || null,
        phone: form.phone.trim() || null,
        alternate_phone: form.alternate_phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
      };

      const result = editingId
        ? await supabase
            .from("families")
            .update(payload)
            .eq("id", editingId)
            .eq("institute_id", instituteId)
        : await supabase
            .from("families")
            .insert(payload);

      if (result.error) {
        throw new Error(result.error.message);
      }

      closeForm();
      await loadFamilies();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save family."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteFamily = async (family: Family) => {
    if (family.student_count > 0) {
      setError(
        "This family is connected to a student. Remove the student connection first."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete family "${family.family_name || "Family"}"?`
    );

    if (!confirmed) return;

    try {
      setError("");

      const instituteId = await getInstituteId();

      const { error: deleteError } = await supabase
        .from("families")
        .delete()
        .eq("id", family.id)
        .eq("institute_id", instituteId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await loadFamilies();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete family."
      );
    }
  };



  const loadFamilies = async () => {

    setLoading(true);

    setError("");



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

      // USER PROFILE + INSTITUTE

      // ---------------------------------------------



      const { data: profile, error: profileError } =

        await supabase

          .from("profiles")

          .select("institute_id")

          .eq("id", user.id)

          .single();



      if (profileError) {

        console.error(

          "Profile loading error:",

          profileError

        );



        setError(

          "Unable to load your institute profile."

        );



        return;

      }



      if (!profile?.institute_id) {

        setError(

          "No institute is linked to your account."

        );



        return;

      }



      const instituteId = profile.institute_id;



      // ---------------------------------------------

      // LOAD FAMILIES

      // ---------------------------------------------



      const {

        data: familyData,

        error: familyError,

      } = await supabase

        .from("families")

        .select(`

          id,

          family_name,

          father_name,

          mother_name,

          guardian_name,

          phone,

          alternate_phone,

          email,

          address,

          city,

          state,

          pincode,

          created_at,

          updated_at

        `)

        .eq("institute_id", instituteId)

        .order("created_at", {

          ascending: false,

        });



      if (familyError) {

        console.error(

          "Family loading error:",

          familyError

        );



        setError(familyError.message);



        return;

      }



      // ---------------------------------------------

      // LOAD STUDENTS CONNECTED TO FAMILIES

      // ---------------------------------------------



      const {

        data: studentData,

        error: studentError,

      } = await supabase

        .from("students")

        .select("id, family_id")

        .eq("institute_id", instituteId);



      if (studentError) {

        console.error(

          "Student loading error:",

          studentError

        );



        setError(studentError.message);



        return;

      }



      // ---------------------------------------------

      // COUNT STUDENTS PER FAMILY

      // ---------------------------------------------



      const studentCountMap =

        new Map<string, number>();



      (studentData || []).forEach((student) => {

        if (!student.family_id) return;



        const current =

          studentCountMap.get(

            student.family_id

          ) || 0;



        studentCountMap.set(

          student.family_id,

          current + 1

        );

      });



      // ---------------------------------------------

      // FINAL FAMILY DATA

      // ---------------------------------------------



      const formattedFamilies: Family[] =

        (familyData || []).map((family) => ({

          id: family.id,



          family_name:

            family.family_name || null,



          father_name:

            family.father_name || null,



          mother_name:

            family.mother_name || null,



          guardian_name:

            family.guardian_name || null,



          phone:

            family.phone || null,



          alternate_phone:

            family.alternate_phone || null,



          email:

            family.email || null,



          address:

            family.address || null,



          city:

            family.city || null,



          state:

            family.state || null,



          pincode:

            family.pincode || null,



          created_at:

            family.created_at,



          updated_at:

            family.updated_at || null,



          student_count:

            studentCountMap.get(

              family.id

            ) || 0,

        }));



      setFamilies(formattedFamilies);

    } catch (err) {

      console.error(err);



      setError(

        err instanceof Error

          ? err.message

          : "Unable to load families."

      );

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    void loadFamilies();

  }, []);



  // ---------------------------------------------

  // COUNTS

  // ---------------------------------------------



  const totalFamilies = families.length;



  const parentsGuardians =

    families.filter(

      (family) =>

        Boolean(

          family.father_name ||

            family.mother_name ||

            family.guardian_name

        )

    ).length;



  const studentsConnected =

    families.reduce(

      (total, family) =>

        total + family.student_count,

      0

    );



  return (

    <main className={styles.page}>

      



      <header className={styles.header}>

        <div>

          <p>FAMILY MANAGEMENT</p>



          <h1>Manage Families</h1>



          <span>

            Manage guardians and family

            information connected with

            students.

          </span>

        </div>



        <Link

          href="/admin"

          className={styles.back}

        >

          ← Dashboard

        </Link>

      </header>



      



      {error && (

        <div

          style={{

            margin: "20px 0",

            padding: "14px 18px",

            borderRadius: "14px",

            background: "#fff1f2",

            border:

              "1px solid #fecdd3",

            color: "#be123c",

          }}

        >

          {error}

        </div>

      )}



      



      <section className={styles.cards}>

        <div className={styles.card}>

          <small>Total Families</small>



          <strong>

            {loading ? "…" : totalFamilies}

          </strong>



          <span>

            {loading

              ? "Loading..."

              : "From database"}

          </span>

        </div>



        <div className={styles.card}>

          <small>

            Parents / Guardians

          </small>



          <strong>

            {loading

              ? "…"

              : parentsGuardians}

          </strong>



          <span>

            {loading

              ? "Loading..."

              : "Family records connected"}

          </span>

        </div>



        <div className={styles.card}>

          <small>

            Students Connected

          </small>



          <strong>

            {loading

              ? "…"

              : studentsConnected}

          </strong>



          <span>

            {loading

              ? "Loading..."

              : "Connected through family records"}

          </span>

        </div>

      </section>



      



      <section className={styles.panel}>

        <div>

          <p>FAMILY DIRECTORY</p>



          <h2>All Families</h2>



          <span>

            Family records are loaded from

            the database.

          </span>

        </div>

        <button
          type="button"
          onClick={openAddFamily}
          style={{
            border: 0,
            borderRadius: "14px",
            padding: "13px 20px",
            background: "linear-gradient(135deg,#5865f2,#3b82f6)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Add Family
        </button>



        



        {loading ? (

          <div className={styles.empty}>

            <div>♧</div>



            <h3>

              Loading families...

            </h3>



            <p>

              Fetching family information

              from Supabase.

            </p>

          </div>

        ) : families.length === 0 ? (

          



          <div className={styles.empty}>

            <div>♧</div>



            <h3>No families yet</h3>



            <p>

              Family and guardian

              information will appear

              here after families are

              added.

            </p>

          </div>

        ) : (

          



          <div

            style={{

              marginTop: "28px",

              display: "grid",

              gap: "14px",

            }}

          >

            {families.map((family) => {

              const primaryGuardian =

                family.guardian_name ||

                family.father_name ||

                family.mother_name ||

                "Family";



              const parentNames = [

                family.father_name

                  ? `Father: ${family.father_name}`

                  : "",

                family.mother_name

                  ? `Mother: ${family.mother_name}`

                  : "",

                family.guardian_name

                  ? `Guardian: ${family.guardian_name}`

                  : "",

              ].filter(Boolean);



              return (

                <div

                  key={family.id}

                  style={{

                    padding: "20px",

                    border:

                      "1px solid rgba(100,116,139,.15)",

                    borderRadius: "18px",

                    background: "#fff",

                  }}

                >

                  <div

                    style={{

                      display: "flex",

                      justifyContent:

                        "space-between",

                      alignItems:

                        "flex-start",

                      gap: "20px",

                      flexWrap: "wrap",

                    }}

                  >

                    <div>

                      <h3

                        style={{

                          margin: 0,

                          fontSize: "18px",

                          fontWeight: 700,

                          color: "#18213f",

                        }}

                      >

                        {family.family_name ||

                          primaryGuardian}

                      </h3>



                      <div

                        style={{

                          marginTop: "8px",

                          display: "flex",

                          flexWrap: "wrap",

                          gap: "8px",

                          color: "#7180a5",

                          fontSize: "13px",

                        }}

                      >

                        {parentNames.map(

                          (name) => (

                            <span

                              key={name}

                              style={{

                                padding:

                                  "5px 9px",

                                borderRadius:

                                  "999px",

                                background:

                                  "#f4f5ff",

                              }}

                            >

                              {name}

                            </span>

                          )

                        )}

                      </div>

                    </div>



                    <div

                      style={{

                        padding:

                          "8px 12px",

                        borderRadius:

                          "999px",

                        background:

                          "#eef2ff",

                        color:

                          "#4f46e5",

                        fontSize: "12px",

                        fontWeight: 700,

                      }}

                    >

                      {family.student_count}{" "}

                      {family.student_count ===

                      1

                        ? "Student"

                        : "Students"}

                    </div>

                  </div>



                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                      marginTop: "16px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openEditFamily(family)}
                      style={{
                        border: "1px solid #dbe1f0",
                        borderRadius: "10px",
                        padding: "8px 14px",
                        background: "#fff",
                        color: "#334155",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteFamily(family)}
                      style={{
                        border: "1px solid #fecaca",
                        borderRadius: "10px",
                        padding: "8px 14px",
                        background: "#fff",
                        color: "#dc2626",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  <div

                    style={{

                      marginTop: "16px",

                      display: "grid",

                      gridTemplateColumns:

                        "repeat(auto-fit, minmax(180px, 1fr))",

                      gap: "10px",

                      color: "#7180a5",

                      fontSize: "13px",

                    }}

                  >

                    {family.phone && (

                      <div>

                        <strong

                          style={{

                            color:

                              "#18213f",

                          }}

                        >

                          Phone

                        </strong>

                        <br />

                        {family.phone}

                      </div>

                    )}



                    {family.email && (

                      <div>

                        <strong

                          style={{

                            color:

                              "#18213f",

                          }}

                        >

                          Email

                        </strong>

                        <br />

                        {family.email}

                      </div>

                    )}



                    {(family.city ||

                      family.state ||

                      family.pincode) && (

                      <div>

                        <strong

                          style={{

                            color:

                              "#18213f",

                          }}

                        >

                          Location

                        </strong>

                        <br />

                        {[

                          family.city,

                          family.state,

                          family.pincode,

                        ]

                          .filter(Boolean)

                          .join(", ")}

                      </div>

                    )}



                    {family.address && (

                      <div>

                        <strong

                          style={{

                            color:

                              "#18213f",

                          }}

                        >

                          Address

                        </strong>

                        <br />

                        {family.address}

                      </div>

                    )}

                  </div>

                </div>

              );

            })}

          </div>

        )}

      </section>

      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15,23,42,.48)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <form
            onSubmit={saveFamily}
            style={{
              width: "min(760px,100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "24px",
              padding: "28px",
              boxShadow: "0 25px 70px rgba(15,23,42,.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#5964ff",
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "2px",
                  }}
                >
                  FAMILY MANAGEMENT
                </p>
                <h2 style={{ margin: "7px 0 0", color: "#18213f" }}>
                  {editingId ? "Edit Family" : "Add New Family"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                style={{
                  border: 0,
                  borderRadius: "12px",
                  width: "42px",
                  height: "42px",
                  background: "#f4f5fa",
                  cursor: "pointer",
                  fontSize: "20px",
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "18px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  color: "#be123c",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: "16px",
              }}
            >
              {(
                [
                  ["family_name", "Family Name *"],
                  ["father_name", "Father Name"],
                  ["mother_name", "Mother Name"],
                  ["guardian_name", "Guardian Name"],
                  ["phone", "Phone"],
                  ["alternate_phone", "Alternate Phone"],
                  ["email", "Email"],
                  ["city", "City"],
                  ["state", "State"],
                  ["pincode", "Pincode"],
                ] as [keyof FamilyForm, string][]
              ).map(([key, label]) => (
                <label key={key} style={{ display: "grid", gap: "7px" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#334155",
                    }}
                  >
                    {label}
                  </span>
                  <input
                    value={form[key]}
                    onChange={(event) =>
                      updateField(key, event.target.value)
                    }
                    type={key === "email" ? "email" : "text"}
                    required={key === "family_name"}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: "1px solid #dbe1f0",
                      borderRadius: "12px",
                      padding: "12px 13px",
                      outline: "none",
                      color: "#18213f",
                    }}
                  />
                </label>
              ))}

              <label
                style={{
                  display: "grid",
                  gap: "7px",
                  gridColumn: "1 / -1",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  Address
                </span>
                <textarea
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  rows={3}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #dbe1f0",
                    borderRadius: "12px",
                    padding: "12px 13px",
                    resize: "vertical",
                    color: "#18213f",
                  }}
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "24px",
              }}
            >
              <button
                type="button"
                onClick={closeForm}
                style={{
                  border: "1px solid #dbe1f0",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  background: "#fff",
                  color: "#334155",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                style={{
                  border: 0,
                  borderRadius: "12px",
                  padding: "12px 20px",
                  background: "linear-gradient(135deg,#5865f2,#3b82f6)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Family"
                    : "Create Family"}
              </button>
            </div>
          </form>
        </div>
      )}

    </main>

  );

}