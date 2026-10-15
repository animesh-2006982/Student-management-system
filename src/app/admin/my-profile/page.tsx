"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./my-profile.module.css";

type ProfileRow = {
  id: string;
  institute_id: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
};

type InstituteRow = {
  id: string;
  name: string | null;
};

const supabase = createClient();
const AVATAR_BUCKET = "profile-avatars";

function getInitials(name: string, email: string) {
  const value = name.trim() || email.trim() || "A";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyProfilePage() {
  const fileInput = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Administrator");
  const [accountStatus, setAccountStatus] = useState("Active");
  const [instituteId, setInstituteId] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [lastSignIn, setLastSignIn] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function loadProfile() {
    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Your session has expired. Please log in again.");
      }

      setUserId(user.id);
      setEmail(user.email || "");
      setCreatedAt(user.created_at || "");
      setLastSignIn(user.last_sign_in_at || "");

      const metadata = user.user_metadata || {};
      setAvatarUrl(
        typeof metadata.avatar_url === "string"
          ? metadata.avatar_url
          : typeof metadata.picture === "string"
            ? metadata.picture
            : ""
      );

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,institute_id,full_name,email,role,status")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error(`Could not load your profile: ${profileError.message}`);
      }

      const row = profile as ProfileRow;
      setName(
        row.full_name ||
          (typeof metadata.name === "string" ? metadata.name : "") ||
          (user.email ? user.email.split("@")[0] : "")
      );
      setEmail(row.email || user.email || "");
      setRole(row.role || "Administrator");
      setAccountStatus(row.status || "Active");
      setInstituteId(row.institute_id || "");

      if (row.institute_id) {
        const { data: institute, error: instituteError } = await supabase
          .from("institutes")
          .select("id,name")
          .eq("id", row.institute_id)
          .maybeSingle();

        if (!instituteError && institute) {
          setInstituteName((institute as InstituteRow).name || "Institute");
        } else {
          setInstituteName("Institute");
        }
      } else {
        setInstituteName("Not linked");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load your profile."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    if (!name.trim()) {
      setMessage("Full name is required.");
      setMessageType("error");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== userId) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const { data: updatedRows, error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", user.id)
        .select("id");

      if (profileUpdateError) {
        throw new Error(`Could not save profile name: ${profileUpdateError.message}`);
      }

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(
          "No profile row was updated. Check the profiles table UPDATE policy."
        );
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: { name: name.trim(), avatar_url: avatarUrl || null },
      });

      if (metadataError) {
        throw new Error(
          `Name saved in profile, but account metadata could not sync: ${metadataError.message}`
        );
      }

      setMessage("Your profile has been updated successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save your profile."
      );
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;

    setMessage("");
    setMessageType("");

    if (!userId) {
      setMessage("Your account is not loaded yet. Refresh and try again.");
      setMessageType("error");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Choose a JPG, PNG or WebP image.");
      setMessageType("error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Profile picture must be 2 MB or smaller.");
      setMessageType("error");
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== userId) {
        throw new Error("Please log in again before uploading a picture.");
      }

      const extension = file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";

      const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);

      const newAvatarUrl = data.publicUrl;

      const { error: metadataError } = await supabase.auth.updateUser({
        data: { name: name.trim(), avatar_url: newAvatarUrl },
      });

      if (metadataError) {
        throw new Error(
          `Image uploaded, but profile picture could not be linked: ${metadataError.message}`
        );
      }

      setAvatarUrl(newAvatarUrl);
      setMessage("Profile picture updated successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload profile picture."
      );
      setMessageType("error");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Loading your profile...</div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>SYSTEM / MY PROFILE</div>
          <h1>My Profile</h1>
          <p>View and update your personal account details.</p>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => void loadProfile()}
          disabled={saving || uploading}
        >
          ↻ Refresh
        </button>
      </header>

      {message && (
        <div
          className={`${styles.alert} ${
            messageType === "error" ? styles.alertError : styles.alertSuccess
          }`}
          role="status"
        >
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <section className={styles.heroCard}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Your profile"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span>{getInitials(name, email)}</span>
            )}
          </div>

          <button
            type="button"
            className={styles.changePhoto}
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Change photo"}
          </button>

          <input
            ref={fileInput}
            className={styles.hiddenInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void uploadAvatar(event.target.files?.[0])}
          />
        </div>

        <div className={styles.heroInfo}>
          <span className={styles.eyebrow}>ADMINISTRATOR ACCOUNT</span>
          <h2>{name || "Administrator"}</h2>
          <p>{email || "No email available"}</p>
          <div className={styles.badges}>
            <span className={styles.roleBadge}>{role}</span>
            <span className={styles.statusBadge}>
              <i />
              {accountStatus}
            </span>
          </div>
        </div>
      </section>

      <form onSubmit={saveProfile}>
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionIcon}>◎</div>
            <div>
              <h2>Personal Information</h2>
              <p>Update your account display name. Email and role are read-only.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Full Name <b>*</b></span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                required
                maxLength={120}
              />
            </label>

            <label className={styles.field}>
              <span>Email Address</span>
              <input type="email" value={email} readOnly />
            </label>

            <label className={styles.field}>
              <span>Account Role</span>
              <input value={role} readOnly />
            </label>

            <label className={styles.field}>
              <span>Account Status</span>
              <input value={accountStatus} readOnly />
            </label>
          </div>

          <div className={styles.formFooter}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={saving || uploading}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </section>
      </form>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div className={styles.sectionIcon}>⌂</div>
          <div>
            <h2>Institute Information</h2>
            <p>Institute linked to your administrator account.</p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.readonlyField}>
            <span>Institute Name</span>
            <strong>{instituteName || "Not available"}</strong>
          </div>
          <div className={styles.readonlyField}>
            <span>Institute ID</span>
            <strong className={styles.idValue}>{instituteId || "Not linked"}</strong>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div className={styles.sectionIcon}>◷</div>
          <div>
            <h2>Account Details</h2>
            <p>Read-only information from your authenticated account.</p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.readonlyField}>
            <span>User ID</span>
            <strong className={styles.idValue}>{userId || "Not available"}</strong>
          </div>
          <div className={styles.readonlyField}>
            <span>Account Created</span>
            <strong>{formatDate(createdAt)}</strong>
          </div>
          <div className={styles.readonlyField}>
            <span>Last Sign In</span>
            <strong>{formatDate(lastSignIn)}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
