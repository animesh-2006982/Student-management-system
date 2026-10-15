"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./academy-profile.module.css";

type Academy = {
  id: string;
  name: string | null;
  email: string | null;
  institute_type: string | null;
  registration_number: string | null;
  established_year: number | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  website: string | null;
  logo_url: string | null;
};

type AcademyForm = {
  name: string;
  email: string;
  institute_type: string;
  registration_number: string;
  established_year: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website: string;
  logo_url: string;
};

const supabase = createClient();

const initialForm: AcademyForm = {
  name: "",
  email: "",
  institute_type: "Coaching Institute",
  registration_number: "",
  established_year: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  website: "",
  logo_url: "",
};

const academyColumns =
  "id,name,email,institute_type,registration_number,established_year,phone,address,city,state,pincode,website,logo_url";

export default function AcademyProfilePage() {
  const [form, setForm] = useState<AcademyForm>(initialForm);
  const [instituteId, setInstituteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  async function loadAcademy() {
    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in again to continue.");
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("institute_id")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (!profile?.institute_id) {
        throw new Error(
          "No institute is linked to this account."
        );
      }

      const currentInstituteId: string = profile.institute_id;
      setInstituteId(currentInstituteId);

      const { data, error: academyError } = await supabase
        .from("institutes")
        .select(academyColumns)
        .eq("id", currentInstituteId)
        .single();

      if (academyError) {
        throw new Error(academyError.message);
      }

      const academy = data as Academy;

      setForm({
        name: academy.name || "",
        email: academy.email || "",
        institute_type:
          academy.institute_type || "Coaching Institute",
        registration_number:
          academy.registration_number || "",
        established_year:
          academy.established_year?.toString() || "",
        phone: academy.phone || "",
        address: academy.address || "",
        city: academy.city || "",
        state: academy.state || "",
        pincode: academy.pincode || "",
        website: academy.website || "",
        logo_url: academy.logo_url || "",
      });
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not load academy profile."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAcademy();
  }, []);

  function updateField(
    field: keyof AcademyForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveAcademy(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    if (!instituteId) {
      setMessage("Institute information is not loaded. Refresh the page.");
      setMessageType("error");
      return;
    }

    if (!form.name.trim()) {
      setMessage("Academy name is required.");
      setMessageType("error");
      return;
    }

    if (form.established_year) {
      const year = Number(form.established_year);

      if (
        !Number.isInteger(year) ||
        year < 1800 ||
        year > new Date().getFullYear()
      ) {
        setMessage("Enter a valid establishment year.");
        setMessageType("error");
        return;
      }
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Session expired. Please log in again.");
      }

      // Verify the institute is still linked to this user.
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("institute_id")
          .eq("id", user.id)
          .single();

      if (
        profileError ||
        profile?.institute_id !== instituteId
      ) {
        throw new Error(
          "Institute verification failed. Refresh and try again."
        );
      }

      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        institute_type: form.institute_type || null,
        registration_number:
          form.registration_number.trim() || null,
        established_year: form.established_year
          ? Number(form.established_year)
          : null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
        website: form.website.trim() || null,
        logo_url: form.logo_url.trim() || null,
      };

      const { data, error: saveError } = await supabase
        .from("institutes")
        .update(payload)
        .eq("id", instituteId)
        .select("id");

      if (saveError) {
        throw new Error(saveError.message);
      }

      if (!data || data.length === 0) {
        throw new Error(
          "No changes were saved. Check your institute permissions."
        );
      }

      setMessage("Academy profile saved successfully.");
      setMessageType("success");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not save academy profile."
      );
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  const initials =
    form.name.trim().charAt(0).toUpperCase() || "A";

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <span className={styles.spinner} />
          Loading Academy Profile...
        </div>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            SYSTEM <span>/</span> ACADEMY PROFILE
          </div>

          <h1>Academy Profile</h1>

          <p>
            Manage your academy details, contact information
            and institutional branding.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void loadAcademy()}
          disabled={saving}
        >
          ↻ Refresh
        </button>
      </header>

      {message && (
        <div
          className={`${styles.alert} ${
            messageType === "error"
              ? styles.alertError
              : styles.alertSuccess
          }`}
          role="status"
        >
          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      <section className={styles.identityCard}>
        <div className={styles.logo}>
          {form.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logo_url}
              alt="Academy logo"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        <div className={styles.identityInfo}>
          <h2>{form.name || "Your Academy Name"}</h2>

          <p>
            {form.institute_type || "Institute"}
            {form.city ? ` · ${form.city}` : ""}
            {form.state ? `, ${form.state}` : ""}
          </p>

          <span className={styles.connected}>
            <span /> Institute profile connected
          </span>
        </div>

        <div className={styles.identityTag}>
          STUDENTFLOW
        </div>
      </section>

      <form onSubmit={saveAcademy}>
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionIcon}>▤</div>

            <div>
              <h2>Basic Information</h2>
              <p>Official identity of your institution.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Academy Name <b>*</b></span>

              <input
                value={form.name}
                onChange={(event) =>
                  updateField("name", event.target.value)
                }
                placeholder="Enter academy name"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Institute Type</span>

              <select
                value={form.institute_type}
                onChange={(event) =>
                  updateField(
                    "institute_type",
                    event.target.value
                  )
                }
              >
                <option>Coaching Institute</option>
                <option>School</option>
                <option>College</option>
                <option>Training Centre</option>
                <option>Computer Institute</option>
                <option>Art Academy</option>
                <option>Music Academy</option>
                <option>Dance Academy</option>
                <option>Other</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Registration Number</span>

              <input
                value={form.registration_number}
                onChange={(event) =>
                  updateField(
                    "registration_number",
                    event.target.value
                  )
                }
                placeholder="Registration or affiliation number"
              />
            </label>

            <label className={styles.field}>
              <span>Establishment Year</span>

              <input
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                value={form.established_year}
                onChange={(event) =>
                  updateField(
                    "established_year",
                    event.target.value
                  )
                }
                placeholder="e.g. 2020"
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionIcon}>☎</div>

            <div>
              <h2>Contact Information</h2>
              <p>How students and families can reach you.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Official Email</span>

              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  updateField("email", event.target.value)
                }
                placeholder="academy@example.com"
              />
            </label>

            <label className={styles.field}>
              <span>Phone Number</span>

              <input
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  updateField("phone", event.target.value)
                }
                placeholder="Enter phone number"
              />
            </label>

            <label className={styles.field}>
              <span>Website URL</span>

              <input
                type="url"
                value={form.website}
                onChange={(event) =>
                  updateField("website", event.target.value)
                }
                placeholder="https://example.com"
              />
            </label>

            <label className={styles.field}>
              <span>PIN Code</span>

              <input
                inputMode="numeric"
                value={form.pincode}
                onChange={(event) =>
                  updateField("pincode", event.target.value)
                }
                placeholder="Enter PIN code"
              />
            </label>

            <label
              className={`${styles.field} ${styles.fullWidth}`}
            >
              <span>Full Address</span>

              <textarea
                rows={3}
                value={form.address}
                onChange={(event) =>
                  updateField("address", event.target.value)
                }
                placeholder="Building, street, locality..."
              />
            </label>

            <label className={styles.field}>
              <span>City</span>

              <input
                value={form.city}
                onChange={(event) =>
                  updateField("city", event.target.value)
                }
                placeholder="Enter city"
              />
            </label>

            <label className={styles.field}>
              <span>State</span>

              <input
                value={form.state}
                onChange={(event) =>
                  updateField("state", event.target.value)
                }
                placeholder="Enter state"
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionIcon}>✦</div>

            <div>
              <h2>Academy Branding</h2>
              <p>Configure your academy logo.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label
              className={`${styles.field} ${styles.fullWidth}`}
            >
              <span>Logo Image URL</span>

              <input
                type="url"
                value={form.logo_url}
                onChange={(event) =>
                  updateField("logo_url", event.target.value)
                }
                placeholder="https://example.com/logo.png"
              />

              <small>
                Enter a publicly accessible image URL. This
                field saves a URL; it does not upload a file.
              </small>
            </label>
          </div>
        </section>

        <footer className={styles.formFooter}>
          <div>
            <strong>Keep your academy details up to date.</strong>
            <p>
              Your changes are saved to your linked institute.
            </p>
          </div>

          <button
            type="submit"
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? "Saving Changes..." : "Save Academy Profile"}
          </button>
        </footer>
      </form>
    </main>
  );
}