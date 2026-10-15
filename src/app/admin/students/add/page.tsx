"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Batch = {
  id: string;
  name: string;
};

export default function AddStudentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [admissionNumber, setAdmissionNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [batchId, setBatchId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoadingBatches(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please login first.");
      setLoadingBatches(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.institute_id) {
      console.error(profileError);
      setError("Unable to load your institute profile.");
      setLoadingBatches(false);
      return;
    }

    const { data, error: batchError } = await supabase
      .from("batches")
      .select("id, name")
      .eq("institute_id", profile.institute_id)
      .eq("status", "active")
      .order("name", { ascending: true });

    if (batchError) {
      console.error(batchError);
      setError(batchError.message);
    } else {
      setBatches(data || []);
    }

    setLoadingBatches(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanAdmission = admissionNumber.trim();
    const cleanFirstName = firstName.trim();

    if (!cleanAdmission || !cleanFirstName) {
      setError("Admission number and first name are required.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please login first.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.institute_id) {
        console.error(profileError);
        setError("Unable to load your institute profile.");
        return;
      }

      const { error: insertError } = await supabase.from("students").insert({
        institute_id: profile.institute_id,
        admission_number: cleanAdmission,
        first_name: cleanFirstName,
        middle_name: middleName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        batch_id: batchId || null,
        family_id: null,
        status,
      });

      if (insertError) {
        console.error(insertError);
        setError(insertError.message);
        return;
      }

      setSuccess("Student added successfully.");

      setTimeout(() => {
        router.push("/admin/students");
        router.refresh();
      }, 700);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while adding the student.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <button type="button" onClick={() => router.push("/admin/students")} style={backButtonStyle}>
          ← Back to Students
        </button>

        <section style={cardStyle}>
          <div style={{ marginBottom: 30 }}>
            <div style={eyebrowStyle}>ACADEMIC MANAGEMENT</div>
            <h1 style={titleStyle}>Add Student</h1>
            <p style={subtitleStyle}>
              Create a student profile and add it to your institution.
            </p>
          </div>

          {error && <div style={errorStyle}>{error}</div>}
          {success && <div style={successStyle}>{success}</div>}

          <form onSubmit={submit}>
            <div style={gridStyle}>
              <Field label="Admission Number *" value={admissionNumber} onChange={setAdmissionNumber} placeholder="e.g. STU-001" />
              <Field label="First Name *" value={firstName} onChange={setFirstName} placeholder="Student first name" />
              <Field label="Middle Name" value={middleName} onChange={setMiddleName} placeholder="Optional" />
              <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Optional" />
              <Field label="Mobile Number" value={phone} onChange={setPhone} placeholder="10 digit mobile number" />

              <label style={labelStyle}>
                <span>Batch</span>
                <select value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={loadingBatches} style={inputStyle}>
                  <option value="">
                    {loadingBatches ? "Loading batches..." : "Select batch"}
                  </option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                <span>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")} style={inputStyle}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div style={actionsStyle}>
              <button type="button" onClick={() => router.push("/admin/students")} style={secondaryButtonStyle}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Add Student"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label style={labelStyle}>
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </label>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f7f8ff",
  padding: "36px",
  color: "#11182f",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
};

const backButtonStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: "#5964ff",
  cursor: "pointer",
  padding: 0,
  marginBottom: 22,
  fontSize: 14,
  fontWeight: 600,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 24,
  padding: "34px",
  boxShadow: "0 18px 60px rgba(42, 52, 110, 0.08)",
  border: "1px solid #e8eaf5",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#5964ff",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "3px",
  marginBottom: 10,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 36,
  lineHeight: 1.15,
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#737b98",
  fontSize: 15,
};

const errorStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: "14px 18px",
  borderRadius: 12,
  background: "#fff1f1",
  color: "#b42318",
  border: "1px solid #f5c2c0",
};

const successStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: "14px 18px",
  borderRadius: 12,
  background: "#ecfdf3",
  color: "#067647",
  border: "1px solid #abefc6",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 20,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
  color: "#303752",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 12,
  border: "1px solid #dfe3f0",
  background: "#fff",
  padding: "0 14px",
  outline: "none",
  color: "#17203a",
  fontSize: 14,
  boxSizing: "border-box",
};

const actionsStyle: React.CSSProperties = {
  marginTop: 30,
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
};

const secondaryButtonStyle: React.CSSProperties = {
  height: 48,
  padding: "0 22px",
  borderRadius: 12,
  border: "1px solid #dfe3f0",
  background: "#fff",
  color: "#303752",
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  height: 48,
  padding: "0 24px",
  borderRadius: 12,
  border: 0,
  background: "linear-gradient(135deg, #5b5cf6, #4d8df7)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};
