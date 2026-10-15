
 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./notice-board.module.css";

type Notice = {
  id: string;
  institute_id: string;
  title: string;
  content: string;
  audience: string;
  status: "Draft" | "Published" | "Archived";
  publish_at: string | null;
  created_at: string;
};

const supabase = createClient();
const blank = { title: "", content: "", audience: "All", status: "Draft", publish_at: "" };

export default function NoticeBoardPage() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [instituteId, setInstituteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Please sign in again.");
      const { data: profile, error: profileError } = await supabase
        .from("profiles").select("institute_id").eq("id", auth.user.id).single();
      if (profileError) throw profileError;
      if (!profile?.institute_id) throw new Error("Your profile has no institute_id.");
      setInstituteId(profile.institute_id);
      const { data, error: queryError } = await supabase.from("notices")
        .select("id,institute_id,title,content,audience,status,publish_at,created_at")
        .eq("institute_id", profile.institute_id).order("created_at", { ascending: false });
      if (queryError) throw queryError;
      setRows((data ?? []) as Notice[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => rows.filter((r) =>
    (filter === "All" || r.status === filter) &&
    `${r.title} ${r.content} ${r.audience}`.toLowerCase().includes(query.toLowerCase())
  ), [rows, filter, query]);

  const startCreate = () => { setEditing(null); setForm(blank); setShowForm(true); };
  const startEdit = (r: Notice) => {
    setEditing(r.id);
    setForm({ title: r.title, content: r.content, audience: r.audience, status: r.status,
      publish_at: r.publish_at ? new Date(r.publish_at).toISOString().slice(0,16) : "" });
    setShowForm(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (!instituteId) throw new Error("Institute is not loaded. Refresh and try again.");
      const payload = {
        institute_id: instituteId, title: form.title.trim(), content: form.content.trim(),
        audience: form.audience, status: form.status,
        publish_at: form.publish_at ? new Date(form.publish_at).toISOString() : null,
      };
      const result = editing
        ? await supabase.from("notices").update(payload).eq("id", editing).eq("institute_id", instituteId)
        : await supabase.from("notices").insert(payload);
      if (result.error) throw result.error;
      setShowForm(false); setEditing(null); setForm(blank); await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };

  const remove = async (r: Notice) => {
    if (!window.confirm(`Delete notice "${r.title}"?`)) return;
    setError("");
    const { error: deleteError } = await supabase.from("notices").delete()
      .eq("id", r.id).eq("institute_id", instituteId);
    if (deleteError) setError(deleteError.message); else await load();
  };

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>INSTITUTE COMMUNICATION</span><h1>Notice Board</h1>
        <p>Publish and manage institute announcements.</p></div>
      <button className={styles.primary} onClick={startCreate}>＋ Create Notice</button>
    </header>
    {error && <div className={styles.error} role="alert">{error}</div>}
    <section className={styles.stats}>
      <div><span>Total notices</span><strong>{rows.length}</strong></div>
      <div><span>Published</span><strong>{rows.filter(r=>r.status==="Published").length}</strong></div>
      <div><span>Drafts</span><strong>{rows.filter(r=>r.status==="Draft").length}</strong></div>
      <div><span>Archived</span><strong>{rows.filter(r=>r.status==="Archived").length}</strong></div>
    </section>
    <section className={styles.panel}>
      <div className={styles.toolbar}>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search notices..." aria-label="Search notices" />
        <select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter status">
          {["All","Draft","Published","Archived"].map(s=><option key={s}>{s}</option>)}
        </select>
        <button onClick={()=>void load()} disabled={loading}>↻ Refresh</button>
      </div>
      {loading ? <p className={styles.empty}>Loading notices…</p> : filtered.length === 0 ?
        <p className={styles.empty}>No notices found. Create your first notice.</p> :
        <div className={styles.list}>{filtered.map(r=><article className={styles.card} key={r.id}>
          <div className={styles.cardTop}><span className={styles.badge}>{r.status}</span><span>{r.audience}</span></div>
          <h2>{r.title}</h2><p>{r.content}</p>
          <small>{r.publish_at ? `Publish: ${new Date(r.publish_at).toLocaleString("en-IN")}` : `Created: ${new Date(r.created_at).toLocaleDateString("en-IN")}`}</small>
          <div className={styles.row}><button onClick={()=>startEdit(r)}>Edit</button><button className={styles.danger} onClick={()=>void remove(r)}>Delete</button></div>
        </article>)}</div>}
    </section>
    {showForm && <div className={styles.backdrop}><form className={styles.modal} onSubmit={save}>
      <h2>{editing ? "Edit Notice" : "Create Notice"}</h2>
      <label>Title<input required maxLength={180} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <label>Content<textarea required rows={5} value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></label>
      <div className={styles.two}><label>Audience<select value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}>{["All","Students","Parents","Staff"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{["Draft","Published","Archived"].map(x=><option key={x}>{x}</option>)}</select></label></div>
      <label>Publish date (optional)<input type="datetime-local" value={form.publish_at} onChange={e=>setForm({...form,publish_at:e.target.value})}/></label>
      <div className={styles.row}><button type="button" onClick={()=>setShowForm(false)}>Cancel</button><button className={styles.primary} disabled={saving}>{saving?"Saving…":"Save Notice"}</button></div>
    </form></div>}
  </main>;
}
