
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "@/app/admin/settings/settings.css";

const supabase = createClient();

type SettingsData = {
  academyName: string;
  ownerName: string;
  email: string;
  phone: string;
  currency: string;
  dateFormat: string;
  timezone: string;
  academicYear: string;
  websiteName: string;
  websiteUrl: string;
  facebook: string;
  instagram: string;
  youtube: string;
  seoTitle: string;
  seoDescription: string;
};

const defaultSettings: SettingsData = {
  academyName: "Your Institution",
  ownerName: "Administrator",
  email: "",
  phone: "",
  currency: "₹",
  dateFormat: "DD-MM-YYYY",
  timezone: "Asia/Kolkata",
  academicYear: "2026-27",
  websiteName: "",
  websiteUrl: "",
  facebook: "",
  instagram: "",
  youtube: "",
  seoTitle: "",
  seoDescription: "",
};

type Section = "profile" | "general" | "website" | null;

export default function Page() {
  const [settings, setSettings] =
    useState<SettingsData>(defaultSettings);

  const [activeSection, setActiveSection] =
    useState<Section>(null);

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [instituteId, setInstituteId] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setError("");

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        if (!authData.user) {
          throw new Error("Please sign in again.");
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("institute_id")
            .eq("id", authData.user.id)
            .single();

        if (profileError) throw profileError;

        if (!profile?.institute_id) {
          throw new Error(
            "Your profile has no institute_id."
          );
        }

        const { data, error: settingsError } =
          await supabase
            .from("institute_settings")
            .select("settings")
            .eq("institute_id", profile.institute_id)
            .maybeSingle();

        if (settingsError) throw settingsError;

        if (!cancelled) {
          setInstituteId(profile.institute_id);

          if (
            data?.settings &&
            typeof data.settings === "object"
          ) {
            setSettings({
              ...defaultSettings,
              ...data.settings,
            });
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : String(e)
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(
    field: keyof SettingsData,
    value: string
  ) {
    setSettings((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSaved(false);
  }

  async function saveSettings() {
    if (!instituteId) {
      setError(
        "Institute is not loaded. Refresh the page and try again."
      );
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const { error: saveError } = await supabase
        .from("institute_settings")
        .upsert(
          {
            institute_id: instituteId,
            settings,
          },
          { onConflict: "institute_id" }
        );

      if (saveError) throw saveError;

      setSaved(true);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : String(e)
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetSettings() {
    const confirmed = window.confirm(
      "Reset all settings to default values?"
    );

    if (!confirmed) return;

    if (!instituteId) {
      setError(
        "Institute is not loaded. Refresh the page and try again."
      );
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const { error: resetError } = await supabase
        .from("institute_settings")
        .upsert(
          {
            institute_id: instituteId,
            settings: defaultSettings,
          },
          { onConflict: "institute_id" }
        );

      if (resetError) throw resetError;

      setSettings(defaultSettings);
      setSaved(true);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : String(e)
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page">
      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 10,
            background: "#fff0f1",
            color: "#b42336",
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: 10, color: "#667085" }}>
          Loading settings from Supabase…
        </div>
      )}

      <div className="settings-header">
        <div>
          <div className="settings-breadcrumb">
            Dashboard <span>/</span> Settings
          </div>

          <h1>⚙ Settings</h1>

          <p>
            Configure your institute, academic year
            and system preferences.
          </p>
        </div>

        <div className="settings-actions">
          {saved && (
            <span className="save-success">
              ✓ Settings saved
            </span>
          )}

          <button
            className="reset-btn"
            onClick={resetSettings}
            disabled={saving || loading}
          >
            Reset
          </button>

          <button
            className="save-btn"
            onClick={saveSettings}
            disabled={saving || loading}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="institute-banner">
        <div className="institute-icon">🏫</div>

        <div className="institute-info">
          <h2>
            {settings.academyName || "Your Institution"}
          </h2>

          <div className="owner">
            👤 {settings.ownerName || "Administrator"}
          </div>

          <div className="email">
            {settings.email || "No email configured"}
          </div>

          <div className="settings-badges">
            <span>Institute Settings</span>
            <span>
              📅 Academic year: {settings.academicYear}
            </span>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <button
          type="button"
          className="settings-card"
          onClick={() => setActiveSection("profile")}
        >
          <div className="settings-card-icon blue">
            🏢
          </div>
          <div>
            <h3>Academy Profile</h3>
            <p>
              Update academy name, contact details
              and owner information.
            </p>
          </div>
        </button>

        <button
          type="button"
          className="settings-card"
          onClick={() => setActiveSection("general")}
        >
          <div className="settings-card-icon green">
            ⚙
          </div>
          <div>
            <h3>General Settings</h3>
            <p>
              Currency, date format, timezone
              and academic year.
            </p>
          </div>
        </button>

        <button
          type="button"
          className="settings-card"
          onClick={() => setActiveSection("website")}
        >
          <div className="settings-card-icon red">
            🌐
          </div>
          <div>
            <h3>Website Settings</h3>
            <p>
              Website details, social links
              and SEO settings.
            </p>
          </div>
        </button>
      </div>

      {activeSection && (
        <section className="settings-editor">
          <div className="editor-header">
            <div>
              <span>SETTINGS</span>
              <h2>
                {activeSection === "profile"
                  ? "Academy Profile"
                  : activeSection === "general"
                  ? "General Settings"
                  : "Website Settings"}
              </h2>
            </div>

            <button
              type="button"
              className="close-editor"
              onClick={() => setActiveSection(null)}
            >
              ×
            </button>
          </div>

          {activeSection === "profile" && (
            <div className="form-grid">
              <Field
                label="Academy Name"
                value={settings.academyName}
                onChange={(v) =>
                  updateField("academyName", v)
                }
              />

              <Field
                label="Owner / Administrator"
                value={settings.ownerName}
                onChange={(v) =>
                  updateField("ownerName", v)
                }
              />

              <Field
                label="Email Address"
                type="email"
                value={settings.email}
                onChange={(v) => updateField("email", v)}
              />

              <Field
                label="Phone Number"
                value={settings.phone}
                onChange={(v) => updateField("phone", v)}
              />
            </div>
          )}

          {activeSection === "general" && (
            <div className="form-grid">
              <SelectField
                label="Currency Symbol"
                value={settings.currency}
                options={["₹", "$", "€", "£"]}
                onChange={(v) =>
                  updateField("currency", v)
                }
              />

              <SelectField
                label="Date Format"
                value={settings.dateFormat}
                options={[
                  "DD-MM-YYYY",
                  "MM-DD-YYYY",
                  "YYYY-MM-DD",
                ]}
                onChange={(v) =>
                  updateField("dateFormat", v)
                }
              />

              <SelectField
                label="Timezone"
                value={settings.timezone}
                options={[
                  "Asia/Kolkata",
                  "Asia/Dhaka",
                  "Asia/Dubai",
                  "UTC",
                ]}
                onChange={(v) =>
                  updateField("timezone", v)
                }
              />

              <Field
                label="Academic Year"
                value={settings.academicYear}
                onChange={(v) =>
                  updateField("academicYear", v)
                }
              />
            </div>
          )}

          {activeSection === "website" && (
            <div className="form-grid">
              <Field
                label="Website Name"
                value={settings.websiteName}
                onChange={(v) =>
                  updateField("websiteName", v)
                }
              />

              <Field
                label="Website URL"
                value={settings.websiteUrl}
                onChange={(v) =>
                  updateField("websiteUrl", v)
                }
              />

              <Field
                label="Facebook URL"
                value={settings.facebook}
                onChange={(v) =>
                  updateField("facebook", v)
                }
              />

              <Field
                label="Instagram URL"
                value={settings.instagram}
                onChange={(v) =>
                  updateField("instagram", v)
                }
              />

              <Field
                label="YouTube URL"
                value={settings.youtube}
                onChange={(v) =>
                  updateField("youtube", v)
                }
              />

              <Field
                label="SEO Title"
                value={settings.seoTitle}
                onChange={(v) =>
                  updateField("seoTitle", v)
                }
              />

              <div className="field full">
                <label htmlFor="seo-description">
                  SEO Description
                </label>
                <textarea
                  id="seo-description"
                  value={settings.seoDescription}
                  onChange={(e) =>
                    updateField(
                      "seoDescription",
                      e.target.value
                    )
                  }
                  rows={4}
                />
              </div>
            </div>
          )}

          <div className="editor-footer">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setActiveSection(null)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="save-btn"
              onClick={saveSettings}
              disabled={saving || loading}
            >
              {saving ? "Saving…" : "✓ Save Settings"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
