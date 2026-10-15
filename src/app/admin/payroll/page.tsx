
 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./payroll.module.css";

type Payroll = {
  id:string; institute_id:string; staff_name:string; pay_period:string;
  base_salary:number|string; bonus:number|string; deductions:number|string;
  net_amount:number|string; status:"Pending"|"Paid"|"On Hold"; paid_at:string|null; created_at:string;
};
const supabase=createClient();
const blank={staff_name:"",pay_period:new Date().toISOString().slice(0,7),base_salary:"",bonus:"0",deductions:"0",status:"Pending"};

function money(v:number|string){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v)||0);}

export default function PayrollPage(){
 const [rows,setRows]=useState<Payroll[]>([]);
 const [instituteId,setInstituteId]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("All");
 const [form,setForm]=useState(blank);
 const [editing,setEditing]=useState<string|null>(null);
 const [showForm,setShowForm]=useState(false);

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError)throw authError;
   if(!auth.user)throw new Error("Please sign in again.");
   const {data:profile,error:profileError}=await supabase.from("profiles").select("institute_id").eq("id",auth.user.id).single();
   if(profileError)throw profileError;
   if(!profile?.institute_id)throw new Error("Your profile has no institute_id.");
   setInstituteId(profile.institute_id);
   const {data,error:queryError}=await supabase.from("payroll").select("id,institute_id,staff_name,pay_period,base_salary,bonus,deductions,net_amount,status,paid_at,created_at").eq("institute_id",profile.institute_id).order("pay_period",{ascending:false});
   if(queryError)throw queryError;
   setRows((data??[]) as Payroll[]);
  }catch(e:unknown){setError(e instanceof Error?e.message:String(e));setRows([]);}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);

 const filtered=useMemo(()=>rows.filter(r=>(filter==="All"||r.status===filter)&&`${r.staff_name} ${r.pay_period} ${r.status}`.toLowerCase().includes(query.toLowerCase())),[rows,filter,query]);
 const totals=useMemo(()=>({net:filtered.reduce((s,r)=>s+Number(r.net_amount||0),0),paid:filtered.filter(r=>r.status==="Paid").reduce((s,r)=>s+Number(r.net_amount||0),0),pending:filtered.filter(r=>r.status==="Pending").reduce((s,r)=>s+Number(r.net_amount||0),0)}),[filtered]);
 const create=()=>{setEditing(null);setForm(blank);setShowForm(true);};
 const edit=(r:Payroll)=>{setEditing(r.id);setForm({staff_name:r.staff_name,pay_period:r.pay_period.slice(0,7),base_salary:String(r.base_salary),bonus:String(r.bonus??0),deductions:String(r.deductions??0),status:r.status});setShowForm(true);};
 const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError("");
  try{
   if(!instituteId)throw new Error("Institute is not loaded. Refresh and try again.");
   const base=Number(form.base_salary),bonus=Number(form.bonus||0),deductions=Number(form.deductions||0);
   if(!form.staff_name.trim())throw new Error("Staff name is required.");
   if(!Number.isFinite(base)||base<0||!Number.isFinite(bonus)||bonus<0||!Number.isFinite(deductions)||deductions<0)throw new Error("Salary, bonus and deductions must be valid non-negative numbers.");
   if(deductions>base+bonus)throw new Error("Deductions cannot exceed salary plus bonus.");
   const payload={institute_id:instituteId,staff_name:form.staff_name.trim(),pay_period:`${form.pay_period}-01`,base_salary:base,bonus,deductions,net_amount:base+bonus-deductions,status:form.status,paid_at:form.status==="Paid"?new Date().toISOString():null};
   const result=editing?await supabase.from("payroll").update(payload).eq("id",editing).eq("institute_id",instituteId):await supabase.from("payroll").insert(payload);
   if(result.error)throw result.error;
   setShowForm(false);setEditing(null);setForm(blank);await load();
  }catch(e:unknown){setError(e instanceof Error?e.message:String(e));}
  finally{setSaving(false);}
 };
 const remove=async(r:Payroll)=>{if(!confirm(`Delete payroll for ${r.staff_name}?`))return;const {error:e}=await supabase.from("payroll").delete().eq("id",r.id).eq("institute_id",instituteId);if(e)setError(e.message);else await load();};

 return <main className={styles.page}>
  <header className={styles.header}><div><span className={styles.eyebrow}>STAFF FINANCE</span><h1>Payroll</h1><p>Manage salary cycles, deductions and payment status.</p></div><button className={styles.primary} onClick={create}>＋ Create Payroll</button></header>
  {error&&<div className={styles.error} role="alert">{error}</div>}
  <section className={styles.stats}><div><span>Payroll records</span><strong>{rows.length}</strong></div><div><span>Net total (filtered)</span><strong>{money(totals.net)}</strong></div><div><span>Paid</span><strong>{money(totals.paid)}</strong></div><div><span>Pending</span><strong>{money(totals.pending)}</strong></div></section>
  <section className={styles.panel}><div className={styles.toolbar}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search staff or pay period…" aria-label="Search payroll"/><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter status">{["All","Pending","Paid","On Hold"].map(s=><option key={s}>{s}</option>)}</select><button onClick={()=>void load()} disabled={loading}>↻ Refresh</button></div>
   {loading?<p className={styles.empty}>Loading payroll…</p>:!filtered.length?<p className={styles.empty}>No payroll records found. Create a payroll record to begin.</p>:<div className={styles.tableWrap}><table><thead><tr><th>Staff</th><th>Pay period</th><th>Base salary</th><th>Bonus</th><th>Deductions</th><th>Net amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td>{r.staff_name}</td><td>{new Date(r.pay_period).toLocaleDateString("en-IN",{month:"short",year:"numeric"})}</td><td>{money(r.base_salary)}</td><td>{money(r.bonus)}</td><td>{money(r.deductions)}</td><td><strong>{money(r.net_amount)}</strong></td><td><span className={styles.badge}>{r.status}</span></td><td><div className={styles.row}><button onClick={()=>edit(r)}>Edit</button><button className={styles.danger} onClick={()=>void remove(r)}>Delete</button></div></td></tr>)}</tbody></table></div>}
  </section>
  {showForm&&<div className={styles.backdrop}><form className={styles.modal} onSubmit={save}><h2>{editing?"Edit Payroll":"Create Payroll"}</h2><label>Staff name<input required value={form.staff_name} onChange={e=>setForm({...form,staff_name:e.target.value})}/></label><label>Pay period<input required type="month" value={form.pay_period} onChange={e=>setForm({...form,pay_period:e.target.value})}/></label><div className={styles.two}><label>Base salary (₹)<input required type="number" min="0" step="0.01" value={form.base_salary} onChange={e=>setForm({...form,base_salary:e.target.value})}/></label><label>Bonus (₹)<input type="number" min="0" step="0.01" value={form.bonus} onChange={e=>setForm({...form,bonus:e.target.value})}/></label></div><div className={styles.two}><label>Deductions (₹)<input type="number" min="0" step="0.01" value={form.deductions} onChange={e=>setForm({...form,deductions:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{["Pending","Paid","On Hold"].map(s=><option key={s}>{s}</option>)}</select></label></div><p className={styles.hint}>Net salary: {money((Number(form.base_salary)||0)+(Number(form.bonus)||0)-(Number(form.deductions)||0))}</p><div className={styles.row}><button type="button" onClick={()=>setShowForm(false)}>Cancel</button><button className={styles.primary} disabled={saving}>{saving?"Saving…":"Save Payroll"}</button></div></form></div>}
 </main>;
}
