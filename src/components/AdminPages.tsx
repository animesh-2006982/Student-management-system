"use client";



import {useEffect,useMemo,useState} from "react";



import {moduleMap,modules,Field} from "../lib/admin";

import {createClient} from "@/lib/supabase/client";



import {DataRecord,exportCsv,money,readRecords,removeRecord,upsertRecord,writeRecords} from "../lib/store";







function today(){return new Date().toISOString().slice(0,10)}



function seed(key:string){



 const now=new Date().toISOString();



 const samples:Record<string,DataRecord[]>={



  students:[],



  batches:[{id:'BAT-001',createdAt:now,updatedAt:now,name:'10th Class Morning',teacher:'Animesh Debnath',schedule:'Mon-Fri 5:00 PM',room:'Room 1',capacity:30,status:'Active'}],



  staff:[{id:'STF-001',createdAt:now,updatedAt:now,employeeNo:'STF-001',name:'Animesh Debnath',role:'Admin',phone:'+91 79865 79501',email:'admin@studentflow.local',joiningDate:today(),salary:25000,status:'Active'}]



 };



 return samples[key]||[];



}







export function AdminRouter({routeKey="dashboard",initialSearch=""}:{routeKey?:string;initialSearch?:string}){



 const key=routeKey||"dashboard";



 if(key==='dashboard') return <Dashboard/>;



 if(key==='reports') return <Reports/>;



 if(key==='academy-profile') return <AcademyProfile/>;



 if(key==='settings') return <Settings/>;



 if(key==='notifications') return <Notifications/>;



 const def=moduleMap[key];



 if(!def) return <NotFound/>;



 return <CrudModule def={def} initialSearch={initialSearch}/>;



}











function Dashboard(){
 const [students,setStudents]=useState<DataRecord[]>([]);
 const [batches,setBatches]=useState<DataRecord[]>([]);
 const [families,setFamilies]=useState<DataRecord[]>([]);
 const [attendance,setAttendance]=useState<DataRecord[]>([]);
 const [fees,setFees]=useState<DataRecord[]>([]);
 const [feePayments,setFeePayments]=useState<DataRecord[]>([]);
 const [enquiries,setEnquiries]=useState<DataRecord[]>([]);
 const [staff,setStaff]=useState<DataRecord[]>([]);
 const [tx,setTx]=useState<DataRecord[]>([]);
 const [tick,setTick]=useState(0);
 const [accountName,setAccountName]=useState("Administrator");
 const [subscription,setSubscription]=useState<{
   planName:string;
   status:"confirmed"|"not-found"|"error";
   expiresAt:string|null;
   studentLimit:number|null;
   staffLimit:number|null;
 }>({planName:"",status:"not-found",expiresAt:null,studentLimit:null,staffLimit:null});

 useEffect(()=>{
   let cancelled=false;

   const loadDashboard=async()=>{
     // Match the same Supabase source used by the CRUD screens.
     const results=await Promise.allSettled([
       loadSupabaseModule("students"),
       loadSupabaseModule("batches"),
       loadSupabaseModule("families"),
       loadSupabaseModule("attendance"),
       loadSupabaseFinance(),
     ]);

     if(cancelled) return;

     if(results[0].status==="fulfilled") setStudents(results[0].value);
     else console.error("Dashboard students load failed:",results[0].reason);

     if(results[1].status==="fulfilled") setBatches(results[1].value);
     else console.error("Dashboard batches load failed:",results[1].reason);

     if(results[2].status==="fulfilled") setFamilies(results[2].value);
     else console.error("Dashboard families load failed:",results[2].reason);

     if(results[3].status==="fulfilled") setAttendance(results[3].value);
     else console.error("Dashboard attendance load failed:",results[3].reason);

     if(results[4].status==="fulfilled") {
       setFees(results[4].value.fees);
       setFeePayments(results[4].value.payments);
     } else {
       setFees([]);
       setFeePayments([]);
       console.error("Dashboard fee collection load failed:",results[4].reason);
     }

     // These modules are still stored locally by the current CRUD implementation.
     setEnquiries(readRecords("enquiries"));
     setStaff(readRecords("staff"));
     setTx(readRecords("income-expense"));
     setTick(v=>v+1);
   };

   void loadDashboard();

   const onLocalChange=()=>{
     setEnquiries(readRecords("enquiries"));
     setStaff(readRecords("staff"));
     setTx(readRecords("income-expense"));
     void loadDashboard();
   };
   const onFocus=()=>void loadDashboard();

   window.addEventListener("studentflow-data",onLocalChange);
   window.addEventListener("focus",onFocus);

   return ()=>{
     cancelled=true;
     window.removeEventListener("studentflow-data",onLocalChange);
     window.removeEventListener("focus",onFocus);
   };
 },[]);

 useEffect(()=>{
   let cancelled=false;
   const loadAccountOverview=async()=>{
     try{
       const supabase=createClient();
       const {data:{user},error:userError}=await supabase.auth.getUser();
       if(userError) throw userError;
       if(!user){
         if(!cancelled) setAccountName("Administrator");
         return;
       }
       const metadataName=String(user.user_metadata?.name||user.user_metadata?.full_name||"").trim();
       const fallbackName=String(user.email||"").split("@")[0].replace(/[._-]+/g," ").trim();
       if(!cancelled) setAccountName(metadataName||fallbackName||"Administrator");

       const response=await fetch("/api/my-subscription",{cache:"no-store"});
       const result=await response.json();
       if(!response.ok) throw new Error(result.error||"Could not load subscription.");
       if(!cancelled) setSubscription(result.subscription||{
         planName:"",status:"not-found",expiresAt:null,studentLimit:null,staffLimit:null
       });
     }catch(error){
       console.error("Dashboard account overview failed:",error);
       if(!cancelled) setSubscription(current=>({...current,status:"error"}));
     }
   };
   void loadAccountOverview();
   const onFocus=()=>void loadAccountOverview();
   window.addEventListener("focus",onFocus);
   return()=>{
     cancelled=true;
     window.removeEventListener("focus",onFocus);
   };
 },[]);

 const present=attendance.filter(r=>["present","late"].includes(String(r.status||"").toLowerCase())).length;
 const absent=attendance.filter(r=>String(r.status||"").toLowerCase()==="absent").length;
 const onLeave=attendance.filter(r=>String(r.status||"").toLowerCase()==="leave").length;
 const pending=fees.reduce((s,r)=>s+Math.max(0,Number(r.amount||0)-Number(r.discount||0)-Number(r.paid_amount||0)),0);
 // All-time collection comes from the fee records' paid_amount total. This
 // matches the Tuition Fees page and does not depend on today's payment date.
 const totalCollection=fees.reduce((s,r)=>s+Number(r.paid_amount||r.paid||0),0);
 const totalIncome=tx.filter(r=>String(r.type||"").toLowerCase()==="income").reduce((s,r)=>s+Number(r.amount||0),0);
 const totalExpense=tx.filter(r=>String(r.type||"").toLowerCase()==="expense").reduce((s,r)=>s+Number(r.amount||0),0);
 const activeStaff=staff.filter(r=>String(r.status||"").toLowerCase()==="active").length;
 const totalEnquiries=enquiries.length;
 const activeStudents=students.filter(r=>String(r.status||"").toLowerCase()==="active").length;
 const inactiveStudents=students.filter(r=>String(r.status||"").toLowerCase()==="inactive").length;
 const activeBatches=batches.filter(r=>String(r.status||"").toLowerCase()==="active").length;

 void families;
 void tick;

 return <div className="dashboard-page">
   <section className="dashboard-welcome"><div><span className="eyebrow">OVERVIEW</span><h2>Welcome back, <span>{accountName}</span> 👋</h2><p>Here&apos;s what&apos;s happening at your institution today. Supabase-backed modules sync with your database; other modules use their current local records.</p></div><div className="trial-card"><small>{subscription.status==="confirmed"?"SUBSCRIPTION PERIOD":"SUBSCRIPTION STATUS"}</small><strong>{subscription.status==="confirmed"&&subscription.expiresAt?`Valid until ${new Date(`${subscription.expiresAt}T00:00:00`).toLocaleDateString("en-GB")}`:subscription.status==="error"?"Unable to load subscription":"No confirmed plan found"}</strong>{subscription.status==="confirmed"?<><span>{subscription.planName}</span><span>Students: {students.length}/{subscription.studentLimit ?? "—"} · Staff: {staff.length}/{subscription.staffLimit ?? "—"}</span></>:<span>{subscription.status==="error"?"Please refresh the page or check your connection.":"Your confirmed plan will appear here after signing in with the email used for the payment request."}</span>}</div></section>

   <div className="kpi-grid">
    <Kpi icon="♙" label="Total Students" value={students.length} sub={`${activeStudents} Active · ${inactiveStudents} Inactive`} tone="purple" href="/admin/students"/>
    <Kpi icon="▦" label="Active Batches" value={activeBatches} sub={`${batches.length} total batches`} tone="orange" href="/admin/batches"/>
    <Kpi icon="₹" label="Total Collection" value={money(totalCollection)} sub={`Total collected from fees`} tone="green" href="/admin/tuition-fees"/>
    <Kpi icon="!" label="Total Dues" value={money(pending)} sub={`${fees.filter(r=>Number(r.amount||0)-Number(r.discount||0)-Number(r.paid_amount||0)>0).length} fee records pending`} tone="red" href="/admin/tuition-fees"/>
   </div>

   <div className="quick-stats">{[['Active Staff',activeStaff,'/admin/staff','dark'],['Total Admissions',students.length,'/admin/students','blue'],['Total Present',present,'/admin/attendance','green'],['Total Absent',absent,'/admin/attendance','red'],['Total On Leave',onLeave,'/admin/leave-manager','yellow'],['Total Enquiries',totalEnquiries,'/admin/enquiries','orange']].map(([l,v,h,t])=><a className={`quick-stat ${t}`} href={h as string} key={l as string}><strong>{v as any}</strong><span>{l as string}</span></a>)}</div>

   <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><span>RECENT ADMISSIONS</span><h3>Latest students</h3></div><a href="/admin/students">View all ↗</a></div>{students.slice(0,5).map(r=><div className="list-row" key={r.id}><div className="avatar-mini">{String(r.name||'S').charAt(0)}</div><div><strong>{r.name}</strong><span>{r.classBatch||'No batch'}</span></div><b>{r.status}</b></div>)}{!students.length&&<Empty text="No students yet" action="Add Student" href="/admin/students"/>}</section>

   <section className="panel"><div className="panel-head"><div><span>BATCH-WISE STUDENTS</span><h3>Current distribution</h3></div><a href="/admin/batches">Manage ↗</a></div>{batches.slice(0,5).map(b=>{const count=students.filter(s=>String(s.classBatch||"").toLowerCase()===String(b.name||"").toLowerCase()).length;return <div className="bar-row" key={b.id}><div><span>{b.name}</span><b>{count}/{b.capacity||0}</b></div><i><em style={{width:`${Math.min(100,(count/Math.max(1,Number(b.capacity||1)))*100)}%`}}/></i></div>})}{!batches.length&&<Empty text="No batches yet" action="Create Batch" href="/admin/batches"/>}</section></div>

   <section className="panel finance-summary"><div className="panel-head"><div><span>FINANCE SUMMARY</span><h3>Income & expense</h3></div><a href="/admin/income-expense">Full Report ↗</a></div><div className="finance-grid"><div><small>Total Income</small><strong>{money(totalIncome)}</strong></div><div><small>Total Expense</small><strong>{money(totalExpense)}</strong></div><div><small>Net Balance</small><strong>{money(totalIncome-totalExpense)}</strong></div><div><small>Total Dues</small><strong>{money(pending)}</strong></div></div></section>

   <section className="panel"><div className="panel-head"><div><span>QUICK ACTIONS</span><h3>Get things done faster</h3></div><span>6 actions</span></div><div className="quick-actions">{[['+','Add Student','/admin/students'],['▦','Create Batch','/admin/batches'],['✓','Mark Attendance','/admin/attendance'],['?','New Enquiry','/admin/enquiries'],['₹','Add Fee','/admin/tuition-fees'],['✎','Create Homework','/admin/homework']].map(([i,l,h])=><a key={l} href={h}><span>{i}</span><div><strong>{l}</strong><small>Open module</small></div><b>↗</b></a>)}</div></section>
 </div>
}

function Kpi({icon,label,value,sub,tone,href}:{icon:string;label:string;value:any;sub:string;tone:string;href:string}){return <a href={href} className={`kpi ${tone}`}><div className="kpi-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{sub}</small><b>↗</b></a>}



function Empty({text,action,href}:{text:string;action:string;href:string}){return <div className="empty"><div>⌂</div><strong>{text}</strong><span>Get started by creating your first record.</span><a href={href}>{action}</a></div>}









async function loadSupabaseFinance(): Promise<{fees: DataRecord[]; payments: DataRecord[]}> {
  const { supabase, instituteId } = await getSupabaseContext();

  // Fee balances come from tuition_fees. Payments are counted from the
  // payment ledger so the dashboard does not count the same fee repeatedly.
  const [feesResult, paymentsResult] = await Promise.allSettled([
    supabase
      .from("tuition_fees")
      .select("id,amount,paid_amount,discount")
      .eq("institute_id", instituteId),
    supabase
      .from("fee_payments")
      .select("id,amount,payment_date")
      .eq("institute_id", instituteId),
  ]);

  if (feesResult.status === "rejected") {
    throw new Error(`Tuition fees: ${String(feesResult.reason)}`);
  }
  const feeResponse = feesResult.value;
  if (feeResponse.error) {
    throw new Error(`Tuition fees: ${feeResponse.error.message}`);
  }

  let paymentRows: any[] = [];
  if (paymentsResult.status === "rejected") {
    console.error("Fee payments query failed:", paymentsResult.reason);
  } else if (paymentsResult.value.error) {
    console.error("Fee payments query failed:", paymentsResult.value.error.message);
  } else {
    paymentRows = paymentsResult.value.data || [];
  }

  const feeRows = feeResponse.data || [];
  const fees: DataRecord[] = (feeRows || []).map((row: any) => ({
    id: String(row.id),
    createdAt: "",
    updatedAt: "",
    amount: Number(row.amount || 0),
    paid_amount: Number(row.paid_amount || 0),
    discount: Number(row.discount || 0),
  }));

  const payments: DataRecord[] = paymentRows.map((row: any) => ({
    id: String(row.id),
    createdAt: "",
    updatedAt: "",
    amount: Number(row.amount || 0),
    payment_date: row.payment_date || "",
  }));

  return { fees, payments };
}


async function loadSupabaseStudents(): Promise<DataRecord[]> {

  const supabase = createClient();



  // Read the browser-persisted session first. If it is missing, try to
  // restore it from the stored refresh token before reporting a login error.
  let { data: { session } } = await supabase.auth.getSession();
  let user = session?.user ?? null;

  if (!user) {
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();
    if (!refreshError) {
      session = refreshed.session;
      user = session?.user ?? null;
    }
  }

  if (!user) {
    throw new Error("Your login session is missing or expired. Please sign in again.");
  }



  const { data: profile, error: profileError } = await supabase

    .from("profiles")

    .select("institute_id")

    .eq("id", user.id)

    .single();



  if (profileError || !profile?.institute_id) {

    throw new Error("Unable to load your institute profile.");

  }



  const { data, error } = await supabase

    .from("students")

    .select(`

      id,

      admission_number,

      first_name,

      middle_name,

      last_name,

      phone,

      status,

      created_at,

      updated_at,

      families (

        family_name,

        father_name,

        mother_name,

        guardian_name,

        phone,

        email

      ),

      batches (

        name

      )

    `)

    .eq("institute_id", profile.institute_id)

    .order("created_at", { ascending: false });



  if (error) throw new Error(error.message);



  return (data || []).map((student: any) => {

    const family = Array.isArray(student.families)

      ? student.families[0]

      : student.families;



    const batch = Array.isArray(student.batches)

      ? student.batches[0]

      : student.batches;



    const name = [

      student.first_name,

      student.middle_name,

      student.last_name,

    ].filter(Boolean).join(" ");



    return {

      id: student.id,

      createdAt: student.created_at,

      updatedAt: student.updated_at || student.created_at,

      admissionNo: student.admission_number,

      name,

      guardian:

        family?.guardian_name ||

        family?.father_name ||

        family?.mother_name ||

        "",

      mobile: student.phone || family?.phone || "",

      email: family?.email || "",

      classBatch: batch?.name || "",

      pendingFees: 0,

      status:

        String(student.status || "active").charAt(0).toUpperCase() +

        String(student.status || "active").slice(1),

    };

  });

}




async function getSupabaseContext() {
  const supabase = createClient();

  // Restore a persisted browser session if getUser() has no authenticated user.
  let { data: { session } } = await supabase.auth.getSession();
  let user = session?.user ?? null;

  if (!user) {
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();
    if (!refreshError) {
      session = refreshed.session;
      user = session?.user ?? null;
    }
  }

  if (!user) {
    throw new Error("Your login session is missing or expired. Please sign in again.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("institute_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.institute_id) {
    throw new Error("Unable to load your institute profile.");
  }

  return { supabase, instituteId: profile.institute_id as string };
}

async function loadSupabaseModule(key: string): Promise<DataRecord[]> {
  const { supabase, instituteId } = await getSupabaseContext();

  if (key === "students") {
    return loadSupabaseStudents();
  }

  if (key === "batches") {
    // Use the real database columns instead of requesting UI-only fields
    // such as teacher, room or capacity that may not exist in this schema.
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .eq("institute_id", instituteId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => {
      const startTime = String(row.start_time || "").slice(0, 5);
      const endTime = String(row.end_time || "").slice(0, 5);
      const schedule = row.schedule || [startTime, endTime].filter(Boolean).join(" - ");

      return {
        id: row.id,
        createdAt: row.created_at || "",
        updatedAt: row.updated_at || row.created_at || "",
        name: row.name || "",
        teacher: row.teacher || row.teacher_name || "",
        schedule,
        room: row.room || row.room_name || "",
        capacity: row.capacity ?? row.max_students ?? 0,
        status: row.status || "Active",
      };
    });
  }

  if (key === "families") {
    const [{ data: families, error: familyError }, { data: students, error: studentError }] =
      await Promise.all([
        supabase
          .from("families")
          .select(
            "id,family_name,father_name,mother_name,guardian_name,phone,alternate_phone,email,address,city,state,pincode,created_at,updated_at"
          )
          .eq("institute_id", instituteId)
          .order("created_at", { ascending: false }),
        supabase
          .from("students")
          .select("id,family_id")
          .eq("institute_id", instituteId),
      ]);

    if (familyError) throw new Error(familyError.message);
    if (studentError) throw new Error(studentError.message);

    const studentCount = new Map<string, number>();
    (students || []).forEach((student: any) => {
      if (!student.family_id) return;
      studentCount.set(
        student.family_id,
        (studentCount.get(student.family_id) || 0) + 1
      );
    });

    return (families || []).map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
      name:
        row.family_name ||
        row.guardian_name ||
        row.father_name ||
        row.mother_name ||
        "Family",
      familyName: row.family_name || "",
      fatherName: row.father_name || "",
      motherName: row.mother_name || "",
      guardianName: row.guardian_name || "",
      mobile: row.phone || "",
      alternatePhone: row.alternate_phone || "",
      email: row.email || "",
      address: row.address || "",
      city: row.city || "",
      state: row.state || "",
      pincode: row.pincode || "",
      students: String(studentCount.get(row.id) || 0),
    }));
  }

  if (key === "attendance") {
    const [
      { data: attendance, error: attendanceError },
      { data: students, error: studentError },
      { data: batches, error: batchError },
    ] = await Promise.all([
      supabase
        .from("attendance")
        .select("id,student_id,batch_id,attendance_date,status,remarks,marked_by,created_at")
        .eq("institute_id", instituteId)
        .order("attendance_date", { ascending: false }),
      supabase
        .from("students")
        .select("id,first_name,middle_name,last_name,admission_number")
        .eq("institute_id", instituteId),
      supabase
        .from("batches")
        .select("id,name")
        .eq("institute_id", instituteId),
    ]);

    if (attendanceError) throw new Error(attendanceError.message);
    if (studentError) throw new Error(studentError.message);
    if (batchError) throw new Error(batchError.message);

    const studentMap = new Map<string, any>();
    (students || []).forEach((student: any) => {
      const name = [
        student.first_name,
        student.middle_name,
        student.last_name,
      ]
        .filter(Boolean)
        .join(" ");

      studentMap.set(student.id, {
        name,
        admissionNumber: student.admission_number || "",
      });
    });

    const batchMap = new Map<string, string>();
    (batches || []).forEach((batch: any) => {
      batchMap.set(batch.id, batch.name || "");
    });

    return (attendance || []).map((row: any) => {
      const student = studentMap.get(row.student_id);

      return {
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.created_at,
        student: student?.name || row.student_id || "",
        admissionNo: student?.admissionNumber || "",
        batch: batchMap.get(row.batch_id) || "",
        date: row.attendance_date || "",
        status: row.status || "Present",
        remarks: row.remarks || "",
      };
    });
  }

  throw new Error(`Supabase connection is not configured for ${key}.`);
}

async function saveSupabaseModule(
  key: string,
  form: Record<string, any>,
  editingId?: string
) {
  const { supabase, instituteId } = await getSupabaseContext();

  if (key === "batches") {
    const scheduleText = String(form.schedule || "").trim();
    const timeMatches = scheduleText.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/g) || [];
    const startTime = String(form.start_time || timeMatches[0] || "09:00").slice(0, 5);
    const endTime = String(form.end_time || timeMatches[1] || "10:00").slice(0, 5);
    const batchName = String(form.name || "").trim();

    if (!batchName) {
      return { error: { message: "Batch name is required." } };
    }

    // These are the confirmed core batch columns. Do not send UI-only fields
    // (teacher/room/capacity/status) as database columns unless schema confirms them.
    const payload = {
      institute_id: instituteId,
      name: batchName,
      start_time: startTime,
      end_time: endTime,
    };

    return editingId
      ? supabase.from("batches").update(payload).eq("id", editingId).eq("institute_id", instituteId)
      : supabase.from("batches").insert(payload);
  }

  if (key === "families") {
    const payload = {
      institute_id: instituteId,
      family_name:
        String(
          form.familyName || form.name || ""
        ).trim() || "Family",
      father_name: String(
        form.fatherName || ""
      ).trim() || null,
      mother_name: String(
        form.motherName || ""
      ).trim() || null,
      guardian_name: String(
        form.guardianName || form.name || ""
      ).trim() || null,
      phone: String(
        form.mobile || ""
      ).trim() || null,
      alternate_phone: String(
        form.alternatePhone || ""
      ).trim() || null,
      email: String(
        form.email || ""
      ).trim() || null,
      address: String(
        form.address || ""
      ).trim() || null,
      city: String(
        form.city || ""
      ).trim() || null,
      state: String(
        form.state || ""
      ).trim() || null,
      pincode: String(
        form.pincode || ""
      ).trim() || null,
    };

    return editingId
      ? supabase
          .from("families")
          .update(payload)
          .eq("id", editingId)
          .eq("institute_id", instituteId)
      : supabase
          .from("families")
          .insert(payload);
  }

  if (key === "attendance") {
    const studentValue = String(form.student || "").trim();
    const batchValue = String(form.batch || "").trim();

    if (!studentValue) {
      return { error: { message: "Student is required." } };
    }

    const { data: students, error: studentError } = await supabase
      .from("students")
      .select("id,first_name,middle_name,last_name,admission_number")
      .eq("institute_id", instituteId);

    if (studentError) return { error: studentError };

    const student = (students || []).find((item: any) => {
      const name = [
        item.first_name,
        item.middle_name,
        item.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        name === studentValue.toLowerCase() ||
        String(item.admission_number || "").toLowerCase() ===
          studentValue.toLowerCase()
      );
    });

    if (!student) {
      return {
        error: {
          message:
            "Student not found. Enter the student's full name or admission number.",
        },
      };
    }

    let batchId: string | null = null;

    if (batchValue) {
      const { data: batches, error: batchError } = await supabase
        .from("batches")
        .select("id,name")
        .eq("institute_id", instituteId);

      if (batchError) return { error: batchError };

      const batch = (batches || []).find(
        (item: any) =>
          String(item.name || "").toLowerCase() === batchValue.toLowerCase()
      );

      if (!batch) {
        return {
          error: {
            message: "Batch not found. Enter the exact batch name.",
          },
        };
      }

      batchId = batch.id;
    }

    const payload = {
      institute_id: instituteId,
      student_id: student.id,
      batch_id: batchId,
      attendance_date: String(form.date || today()),
      status: String(form.status || "Present").toLowerCase(),
      remarks: String(form.remarks || "").trim() || null,
      marked_by: (await supabase.auth.getUser()).data.user?.id || null,
    };

    return editingId
      ? supabase
          .from("attendance")
          .update(payload)
          .eq("id", editingId)
          .eq("institute_id", instituteId)
      : supabase
          .from("attendance")
          .insert(payload);
  }

  if (key === "students") {
    const fullName = String(form.name || "").trim();
    const admissionNumber = String(form.admissionNo || "").trim();
    const phone = String(form.mobile || "").trim() || null;
    const status = String(form.status || "Active").trim().toLowerCase();
    const guardianName = String(form.guardian || "").trim();
    const familyEmail = String(form.email || "").trim() || null;
    const batchName = String(form.classBatch || "").trim();

    if (!fullName) {
      return {
        error: {
          message: "Student name is required.",
        },
      };
    }

    if (!admissionNumber) {
      return {
        error: {
          message: "Admission number is required.",
        },
      };
    }

    const parts = fullName.split(/\s+/).filter(Boolean);

    let batchId: string | null = null;

    if (batchName) {
      const { data: batches, error: batchError } = await supabase
        .from("batches")
        .select("id,name,course_name,subject,description")
        .eq("institute_id", instituteId);

      if (batchError) {
        return { error: batchError };
      }

      const normalizedBatchName = batchName
        .trim()
        .toLowerCase();

      const batch = (batches || []).find((item: any) => {
        const values = [
          item.name,
          item.course_name,
          item.subject,
          item.description,
        ]
          .filter(Boolean)
          .map((value: any) =>
            String(value).trim().toLowerCase()
          );

        return values.some((value: string) => {
          return (
            value === normalizedBatchName ||
            value.includes(normalizedBatchName) ||
            normalizedBatchName.includes(value)
          );
        });
      });

      if (!batch) {
        return {
          error: {
            message:
              `Batch/Class "${batchName}" was not found. ` +
              `Use the actual batch name (for example "morning") ` +
              `or leave Class / Batch empty.`,
          },
        };
      }

      batchId = batch.id;
    }

    let familyId: string | null = null;

    /*
      Guardian, mobile and email belong to the families table.
      We keep the student UI unchanged but save those details
      to the correct family record.
    */
    if (editingId) {
      const { data: currentStudent, error: currentStudentError } =
        await supabase
          .from("students")
          .select("family_id")
          .eq("id", editingId)
          .eq("institute_id", instituteId)
          .maybeSingle();

      if (currentStudentError) {
        return { error: currentStudentError };
      }

      familyId = currentStudent?.family_id || null;
    }

    if (guardianName || phone || familyEmail) {
      if (!familyId) {
        let familyQuery = supabase
          .from("families")
          .select("id")
          .eq("institute_id", instituteId);

        if (guardianName) {
          familyQuery = familyQuery.ilike(
            "guardian_name",
            guardianName
          );
        } else if (familyEmail) {
          familyQuery = familyQuery.ilike(
            "email",
            familyEmail
          );
        } else if (phone) {
          familyQuery = familyQuery.eq(
            "phone",
            phone
          );
        }

        const { data: existingFamilies, error: familyLookupError } =
          await familyQuery.limit(1);

        if (familyLookupError) {
          return { error: familyLookupError };
        }

        familyId = existingFamilies?.[0]?.id || null;
      }

      const familyPayload = {
        institute_id: instituteId,
        family_name:
          String(form.familyName || "").trim() ||
          guardianName ||
          `${fullName} Family`,
        guardian_name: guardianName || null,
        phone,
        email: familyEmail,
      };

      if (familyId) {
        const { error: familyUpdateError } = await supabase
          .from("families")
          .update(familyPayload)
          .eq("id", familyId)
          .eq("institute_id", instituteId);

        if (familyUpdateError) {
          return { error: familyUpdateError };
        }
      } else {
        const { data: newFamily, error: familyInsertError } = await supabase
          .from("families")
          .insert(familyPayload)
          .select("id")
          .single();

        if (familyInsertError) {
          return { error: familyInsertError };
        }

        familyId = newFamily?.id || null;
      }
    }

    const payload: Record<string, any> = {
      institute_id: instituteId,
      admission_number: admissionNumber,
      first_name: parts[0] || "",
      middle_name:
        parts.length > 2 ? parts.slice(1, -1).join(" ") : null,
      last_name: parts.length > 1 ? parts[parts.length - 1] : null,
      phone,
      status,
    };

    if (batchName) {
      payload.batch_id = batchId;
    }

    if (guardianName || phone || familyEmail) {
      payload.family_id = familyId;
    }

    if (!editingId) {
      return supabase
        .from("students")
        .insert(payload);
    }

    return supabase
      .from("students")
      .update(payload)
      .eq("id", editingId)
      .eq("institute_id", instituteId);
  }

  return { error: { message: `Unsupported Supabase module: ${key}` } };
}

async function deleteSupabaseModule(key: string, id: string) {
  const { supabase, instituteId } = await getSupabaseContext();
  return supabase.from(key).delete().eq("id", id).eq("institute_id", instituteId);
}

function CrudModule({def,initialSearch}:{def:any;initialSearch:string}){
  const supabaseKeys = ["students","batches","families","attendance"];

  const [rows,setRows]=useState<DataRecord[]>([]);
  const [q,setQ]=useState(initialSearch);
  const [status,setStatus]=useState("All");
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState<DataRecord|null>(null);
  const [viewing,setViewing]=useState<DataRecord|null>(null);
  const [form,setForm]=useState<Record<string,any>>({});
  const [pageSize,setPageSize]=useState(10);
  const [sort,setSort]=useState<"asc"|"desc">("asc");
  const [loadError,setLoadError]=useState("");

  const load=async()=>{
    setLoadError("");

    if(supabaseKeys.includes(def.key)){
      try{
        const r=await loadSupabaseModule(def.key);
        setRows(r);
      }catch(error){
        console.error(`${def.key} module error:`,error);
        setRows([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load records.");
      }
      return;
    }

    let r=readRecords(def.key);

    if(!r.length){
      const s=seed(def.key);
      if(s.length){
        writeRecords(def.key,s);
        r=s;
      }
    }

    setRows(r);
  };

  useEffect(()=>{
    void load();

    const f=()=>void load();
    window.addEventListener("studentflow-data",f);

    return()=>window.removeEventListener("studentflow-data",f);
  },[def.key]);

  const statusField=def.fields.find((f:Field)=>f.key==="status");

  const filtered=useMemo(
    ()=>rows.filter(r=>{
      const hay=JSON.stringify(r).toLowerCase();
      return (
        (!q||hay.includes(q.toLowerCase())) &&
        (!statusField||status==="All"||r.status===status)
      );
    }),
    [rows,q,status,statusField]
  );

  const shown=[...filtered]
    .sort(
      (a,b)=>
        String(a.name||a.title||a.student||a.staff||a.id).localeCompare(
          String(b.name||b.title||b.student||b.staff||b.id)
        )*(sort==="asc"?1:-1)
    )
    .slice(0,pageSize);

  const openAdd=()=>{
    if(def.key==="students"){
      window.location.href="/admin/students/add";
      return;
    }

    const init:any={};

    def.fields.forEach((f:Field)=>{
      if(f.key==="date"||f.key==="dueDate"){
        init[f.key]=today();
      }else if(f.key==="status"){
        init[f.key]=f.options?.[0]||"";
      }else{
        init[f.key]="";
      }
    });

    setForm(init);
    setEditing(null);
    setModal(true);
  };

  const openEdit=(r:DataRecord)=>{
    setForm({...r});
    setEditing(r);
    setModal(true);
  };

  const save=async()=>{
    for(const f of def.fields){
      if(f.required&&!String(form[f.key]??"").trim()){
        alert(`${f.label} is required`);
        return;
      }
    }

    if(supabaseKeys.includes(def.key)){
      try{
        const result=await saveSupabaseModule(
          def.key,
          form,
          editing?.id
        );

        if(result.error){
          alert(result.error.message);
          return;
        }

        setModal(false);
        setEditing(null);
        await load();
        return;
      }catch(error){
        console.error(error);
        alert(error instanceof Error ? error.message : "Unable to save record.");
        return;
      }
    }

    upsertRecord(def.key,form,editing?.id);
    setModal(false);
    setEditing(null);
    await load();
  };

  const deleteRow=async(id:string)=>{
    if(!confirm("Delete this record? This action cannot be undone.")) return;

    if(supabaseKeys.includes(def.key)){
      try{
        const result=await deleteSupabaseModule(def.key,id);

        if(result.error){
          alert(result.error.message);
          return;
        }

        await load();
      }catch(error){
        console.error(error);
        alert(error instanceof Error ? error.message : "Unable to delete record.");
      }
      return;
    }

    removeRecord(def.key,id);
    await load();
  };

  const duplicate=(r:DataRecord)=>{
    if(def.key==="students"){
      window.location.href="/admin/students/add";
      return;
    }

    if(supabaseKeys.includes(def.key)){
      const {
        id:_id,
        createdAt:_createdAt,
        updatedAt:_updatedAt,
        ...copy
      }=r;

      setForm({
        ...copy,
        ...(def.key==="batches"&&{
          name:r.name?`${r.name} Copy`:"",
        }),
      });
      setEditing(null);
      setModal(true);
      return;
    }

    const {
      id:_id,
      createdAt:_createdAt,
      updatedAt:_updatedAt,
      ...x
    }=r;

    upsertRecord(
      def.key,
      {...x,name:x.name?`${x.name} Copy`:undefined}
    );

    void load();
  };

  const metric=
    def.key==="tuition-fees"
      ?money(
          rows.reduce(
            (s,r)=>
              s+
              Math.max(
                0,
                Number(r.amount||0)-Number(r.paid||0)
              ),
            0
          )
        )
      :rows.length;

  return (
    <div className="module-page">
      <div className="module-hero">
        <div>
          <span className="eyebrow">{def.title.toUpperCase()}</span>
          <h2>{def.title}</h2>
          <p>{def.description}</p>
        </div>

        <div className="hero-actions">
          <button
            className="secondary-btn"
            onClick={()=>window.print()}
          >
            Print
          </button>

          <button
            className="primary-btn"
            onClick={openAdd}
          >
            ＋ {def.addLabel}
          </button>
        </div>
      </div>

      {loadError&&(
        <div
          style={{
            margin:"0 0 20px",
            padding:"14px 18px",
            borderRadius:14,
            background:"#fff1f1",
            border:"1px solid #ffc4c4",
            color:"#c62828",
          }}
        >
          {loadError}
        </div>
      )}

      <div className="module-metrics">
        <div>
          <span>Total Records</span>
          <strong>{rows.length}</strong>
          <small>All records</small>
        </div>

        <div>
          <span>Filtered</span>
          <strong>{filtered.length}</strong>
          <small>Current view</small>
        </div>

        <div>
          <span>{def.key==="tuition-fees"?"Outstanding":"Active / Open"}</span>
          <strong>{metric}</strong>
          <small>Live calculation</small>
        </div>

        <div>
          <span>Last update</span>
          <strong>
            {rows[0]?.updatedAt
              ?new Date(rows[0].updatedAt).toLocaleDateString("en-IN")
              :"—"}
          </strong>
          <small>{supabaseKeys.includes(def.key)?"Supabase":"Local records"}</small>
        </div>
      </div>

      <ContextActions
        keyName={def.key}
        openAdd={openAdd}
      />

      <section className="data-panel">
        <div className="data-toolbar">
          <div className="tabs">
            <button
              className={status==="All"?"on":""}
              onClick={()=>setStatus("All")}
            >
              All ({rows.length})
            </button>

            {statusField?.options?.slice(0,3).map((s:string)=>(
              <button
                key={s}
                className={status===s?"on":""}
                onClick={()=>setStatus(s)}
              >
                {s} ({rows.filter(r=>r.status===s).length})
              </button>
            ))}
          </div>

          <div className="toolbar-right">
            <select
              value={pageSize}
              onChange={e=>setPageSize(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>

            <button
              onClick={()=>exportCsv(`${def.key}.csv`,filtered)}
            >
              Copy/CSV
            </button>

            <button onClick={()=>window.print()}>
              PDF / Print
            </button>

            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder={`Search ${def.title.toLowerCase()}...`}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>

                {def.fields.slice(0,6).map((f:Field)=>(
                  <th
                    key={f.key}
                    onClick={()=>setSort(v=>v==="asc"?"desc":"asc")}
                  >
                    {f.label} ↕
                  </th>
                ))}

                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {shown.map((r,i)=>(
                <tr key={r.id}>
                  <td>{i+1}</td>

                  {def.fields.slice(0,6).map((f:Field)=>(
                    <td key={f.key}>
                      {f.key==="status" ? (
                        <span
                          className={`pill ${String(r[f.key]||"")
                            .toLowerCase()
                            .replaceAll(" ","-")}`}
                        >
                          {r[f.key]||"—"}
                        </span>
                      ) : (
                        f.key.toLowerCase().includes("amount")||
                        f.key.toLowerCase().includes("fees")||
                        f.key==="paid"||
                        f.key==="salary"
                      ) ? (
                        money(r[f.key])
                      ) : (
                        String(r[f.key]??"—")
                      )}
                    </td>
                  ))}

                  <td>
                    <div className="row-actions">
                      <button onClick={()=>setViewing(r)}>◉</button>
                      <button onClick={()=>openEdit(r)}>✎</button>
                      <button onClick={()=>duplicate(r)}>⧉</button>
                      <button
                        className="danger"
                        onClick={()=>deleteRow(r.id)}
                      >
                        ⌫
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!shown.length&&(
                <tr>
                  <td colSpan={8}>
                    <Empty
                      text={
                        loadError
                          ? "Unable to load records"
                          : `No ${def.title.toLowerCase()} found`
                      }
                      action={def.addLabel}
                      href="#"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal&&(
        <Modal
          title={editing?`Edit ${def.title}`:def.addLabel}
          fields={def.fields}
          form={form}
          setForm={setForm}
          onClose={()=>{
            setModal(false);
            setEditing(null);
          }}
          onSave={save}
        />
      )}

      {viewing&&(
        <ViewModal
          row={viewing}
          fields={def.fields}
          onClose={()=>setViewing(null)}
        />
      )}
    </div>
  );
}

function ContextActions({keyName,openAdd}:{keyName:string;openAdd:()=>void}){const sets:Record<string,[string,string][]>={staff:[["Mark Attendance","/admin/staff-attendance"],["Attendance Report","/admin/reports"],["Salary Report","/admin/payroll"]],performance:[["Bulk Rating","/admin/performance"],["Individual Rating","/admin/performance"],["By Batch","/admin/performance"]],"study-material":[["New Folder","/admin/study-material"],["Add Material","/admin/study-material"]],"online-exams":[["Create Exam","/admin/online-exams"],["Publish","/admin/online-exams"]],"income-expense":[["Add Income","/admin/income-expense"],["Add Expense","/admin/income-expense"],["Full Report","/admin/reports"]],families:[["Multi-Student Families","/admin/families"],["Single-Student Families","/admin/families"]],attendance:[["Daily Report","/admin/reports"],["Monthly Summary","/admin/reports"],["Absentee List","/admin/reports"]],exams:[["Result Entry","/admin/exams"],["Schedule Exam","/admin/exams"]],homework:[["Create Homework","/admin/homework"],["Track Completion","/admin/homework"]],"leave-manager":[["Pending Requests","/admin/leave-manager"],["Approved","/admin/leave-manager"]]};const actions=sets[keyName];if(!actions)return null;return <div className="context-actions">{actions.map(([label,href])=><a href={href} key={label} onClick={(e)=>{if(label.startsWith('Add ')||label.startsWith('Create ')||label==='New Folder'||label==='Mark Attendance'){if(href===`/admin/${keyName}`){e.preventDefault();openAdd()}}}}>{label}<b>↗</b></a>)}</div>}



function Modal({title,fields,form,setForm,onClose,onSave}:{title:string;fields:Field[];form:any;setForm:any;onClose:()=>void;onSave:()=>void}){return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><span>RECORD FORM</span><h3>{title}</h3></div><button onClick={onClose}>×</button></div><div className="form-grid">{fields.map(f=><label key={f.key} className={f.type==='textarea'?'full':''}>{f.label}{f.required&&' *'}{f.type==='select'?<select value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}><option value="">Select</option>{f.options?.map(o=><option key={o}>{o}</option>)}</select>:f.type==='textarea'?<textarea rows={4} value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}/>:<input type={f.type||'text'} value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})} />}</label>)}</div><div className="modal-actions"><button onClick={onClose}>Cancel</button><button className="primary-btn" onClick={onSave}>Save Record</button></div></div></div>}



function ViewModal({row,fields,onClose}:{row:DataRecord;fields:Field[];onClose:()=>void}){return <div className="modal-backdrop"><div className="modal view-modal"><div className="modal-head"><div><span>RECORD DETAILS</span><h3>{row.name||row.title||row.student||row.staff||row.id}</h3></div><button onClick={onClose}>×</button></div><div className="detail-grid">{fields.map(f=><div key={f.key}><span>{f.label}</span><strong>{f.key.toLowerCase().includes('amount')||f.key.toLowerCase().includes('fees')||f.key==='paid'||f.key==='salary'?money(row[f.key]):String(row[f.key]??'—')}</strong></div>)}</div><div className="modal-actions"><button className="primary-btn" onClick={onClose}>Close</button></div></div></div>}







function Reports(){const students=readRecords('students'),attendance=readRecords('attendance'),fees=readRecords('tuition-fees'),tx=readRecords('income-expense'),staff=readRecords('staff');const cards=[['Student Reports','Student data, strength & demographics','/admin/students',['Student List','Active Students','Inactive Students']],['Attendance Reports','Daily, monthly & batch-wise attendance','/admin/attendance',['Daily Report','Monthly Summary','Absentee List']],['Fees Reports','Collection, pending & payment analysis','/admin/tuition-fees',['Collection Report','Pending Fees','Daily Collection']],['Finance Reports','Income, expense & profit analysis','/admin/income-expense',['Financial Summary','Income Report','Daily Transactions']],['Exam Reports','Results and subject analysis','/admin/exams',['Exam Results','Subject Analysis','All Exams']],['Staff Reports','Staff attendance & salary','/admin/staff',['Staff List','Attendance Report','Salary Report']]];return <div className="module-page"><div className="module-hero"><div><span className="eyebrow">REPORTS</span><h2>Reports</h2><p>All your core reports in one place.</p></div></div><div className="report-summary"><div><b>{students.length}</b><span>Students</span></div><div><b>{attendance.length}</b><span>Attendance records</span></div><div><b>{fees.length}</b><span>Fee records</span></div><div><b>{tx.length}</b><span>Transactions</span></div><div><b>{staff.length}</b><span>Staff</span></div></div><div className="report-grid">{cards.map(c=><section className="report-card" key={c[0] as string}><span>{c[0] as string}</span><h3>{c[1] as string}</h3><div>{(c[3] as string[]).map(x=><a href={c[2] as string} key={x}>{x}<b>↗</b></a>)}</div><button onClick={()=>window.print()}>Print Report</button></section>)}</div></div>}



function AcademyProfile(){const [saved,setSaved]=useState(false);const [form,setForm]=useState(()=>readRecords('academy-profile')[0]||{name:'Your Institution',director:'Animesh Debnath',email:'',mobile:'',address:'',academicYear:'2026-27'});const save=()=>{upsertRecord('academy-profile',form,(form as any).id);setSaved(true);setTimeout(()=>setSaved(false),1800)};return <div className="module-page"><div className="module-hero"><div><span className="eyebrow">ACADEMY PROFILE</span><h2>Academy Profile</h2><p>Update your academy information.</p></div></div><section className="settings-card"><div className="settings-title"><div><span>ACADEMY DETAILS</span><h3>Institute information</h3></div></div><div className="form-grid">{[['name','Academy name'],['director','Director name'],['email','Email'],['mobile','Mobile'],['address','Address'],['academicYear','Academic year']].map(([k,l])=><label key={k}>{l}<input value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}</div><button className="primary-btn" onClick={save}>{saved?'✓ Saved':'Save Changes'}</button></section><section className="report-summary"><div><b>ACTIVE</b><span>Subscription</span></div><div><b>2026-27</b><span>Academic year</span></div><div><b>LOCAL</b><span>Data storage</span></div></section></div>}



function Settings(){const [form,setForm]=useState(()=>readRecords('settings')[0]||{theme:'Dark',timezone:'Asia/Kolkata',academicYear:'2026-27',currency:'INR',attendanceMode:'Daily'});const save=()=>upsertRecord('settings',form,(form as any).id);return <div className="module-page"><div className="module-hero"><div><span className="eyebrow">SYSTEM</span><h2>Settings</h2><p>Configure institute and system preferences.</p></div></div><section className="settings-card"><div className="settings-title"><div><span>GENERAL SETTINGS</span><h3>System configuration</h3></div></div><div className="form-grid"><label>Theme<select value={form.theme} onChange={e=>setForm({...form,theme:e.target.value})}><option>Dark</option><option>Light</option></select></label><label>Timezone<input value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})}/></label><label>Academic year<input value={form.academicYear} onChange={e=>setForm({...form,academicYear:e.target.value})}/></label><label>Currency<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option>INR</option><option>USD</option></select></label><label>Attendance mode<select value={form.attendanceMode} onChange={e=>setForm({...form,attendanceMode:e.target.value})}><option>Daily</option><option>Period-wise</option></select></label></div><button className="primary-btn" onClick={save}>Save Settings</button></section></div>}



function Notifications(){const [rows,setRows]=useState(()=>readRecords('notifications'));const mark=()=>{writeRecords('notifications',rows.map(r=>({...r,status:'Read'})));setRows(readRecords('notifications'))};return <div className="module-page"><div className="module-hero"><div><span className="eyebrow">SYSTEM</span><h2>Notifications</h2><p>System alerts and generated activity notifications.</p></div><button className="primary-btn" onClick={mark}>Mark all read</button></div><section className="data-panel notification-list">{rows.length?rows.map(r=><div className="notification-row" key={r.id}><div>♢</div><section><strong>{r.title||'Notification'}</strong><p>{r.message||r.details||'System notification'}</p></section><span>{r.status||'Unread'}</span></div>):<Empty text="No notifications" action="Go to dashboard" href="/admin"/>}</section></div>}



function NotFound(){return <div className="module-page"><section className="empty large"><div>404</div><strong>Module not found</strong><span>Use the sidebar to open a supported module.</span><a href="/admin">Back to dashboard</a></section></div>}


