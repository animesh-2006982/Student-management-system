"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useMemo,useState} from "react";
import {readRecords} from "../lib/store";

const groups: {title:string;items:[string,string,string][]}[]=[
 {title:"MAIN MENU",items:[['Dashboard','/admin','⌂']]},
 {title:"ACADEMIC",items:[['Batches','/admin/batches','▦'],['Students','/admin/students','♙'],['Families','/admin/families','⌂'],['Attendance','/admin/attendance','✓']]},
 {title:"FINANCE",items:[['Tuition Fees','/admin/tuition-fees','₹'],['Income / Expense','/admin/income-expense','↔']]},
 {title:"MORE",items:[['Staff Manager','/admin/staff','♟'],['Manage Exams','/admin/exams','▣'],['Performance','/admin/performance','★'],['Enquiry Manager','/admin/enquiries','?'],['Transport','/admin/transport','▰'],['Study Material','/admin/study-material','▥'],['Online Exams','/admin/online-exams','◫'],['Homework','/admin/homework','✎'],['Leave Manager','/admin/leave-manager','◷']]},
 {title:"TOOLS",items:[['Reports','/admin/reports','▤'],['Library','/admin/library','▥'],['Inventory','/admin/inventory','▣'],['Communications','/admin/communications','✉'],['Calendar','/admin/calendar','□'],['Timetable','/admin/timetable','▦'],['Certificates','/admin/certificates','▤'],['ID Cards','/admin/id-cards','▣']]},
 {title:"SYSTEM",items:[['Academy Profile','/admin/academy-profile','◉'],['Settings','/admin/settings','⚙'],['Users','/admin/users','◎'],['Roles & Permissions','/admin/roles-permissions','◇'],['Audit Logs','/admin/audit-logs','⌁']]}
] as const;

export default function AdminShell({children}:{children:React.ReactNode}){
 const pathname=usePathname(); const router=useRouter(); const [open,setOpen]=useState(false); const [notifications,setNotifications]=useState(false); const [profile,setProfile]=useState(false); const [search,setSearch]=useState(""); const [count,setCount]=useState(0);
 const title=useMemo(()=>{const item=groups.flatMap(g=>g.items).find(x=>x[1]===pathname); return item?.[0]||"Dashboard"},[pathname]);
 useEffect(()=>{const refresh=()=>{const n=readRecords("notifications");setCount(n.filter(x=>x.status!=="Read"&&x.status!=="Archived").length)}; refresh(); window.addEventListener("studentflow-data",refresh); return()=>window.removeEventListener("studentflow-data",refresh)},[]);
 const doSearch=(e:any)=>{e.preventDefault(); const q=search.trim(); if(q) router.push(`/admin/students?search=${encodeURIComponent(q)}`)};
 return <div className="admin-shell">
   {open&&<button className="mobile-overlay" aria-label="Close menu" onClick={()=>setOpen(false)}/>} 
   <aside className={`admin-sidebar ${open?'open':''}`}>
    <div className="brand-row"><div className="brand-logo">S</div><div><strong>STUDIFY</strong><span>Student Management</span></div><button className="close-mobile" onClick={()=>setOpen(false)}>×</button></div>
    <div className="institution-card"><div className="institution-avatar">A</div><div><strong>Your Institution</strong><span>Administrator</span></div></div>
    <nav className="sidebar-nav">{groups.map(g=><div className="nav-group" key={g.title}><div className="nav-group-title">{g.title}</div>{g.items.map(([label,href,icon])=>{const active=href==='/admin'?pathname==='/admin':pathname===href||pathname.startsWith(href+'/');return <Link key={href} href={href} onClick={()=>setOpen(false)} className={`nav-item ${active?'active':''}`}><span>{icon}</span>{label}</Link>})}</div>)}</nav>
    <div className="sidebar-premium"><div className="premium-icon">♛</div><strong>Go Premium</strong><p>Unlock all features & get priority support.</p><button onClick={()=>router.push('/admin/settings')}>Upgrade Now ↗</button></div>
    <div className="sidebar-status"><i/> <div><strong>System Active</strong><span>All services running</span></div></div>
   </aside>
   <div className="admin-main">
    <header className="admin-header">
      <div className="header-left"><button className="menu-button" onClick={()=>setOpen(true)}><span/><span/><span/></button><div><div className="crumb">Dashboard {pathname!=='/admin'&&<>/ <b>{title}</b></>}</div><h1>{title}</h1></div></div>
      <div className="header-right">
        <form className="global-search" onSubmit={doSearch}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students, admission no..."/><button>⌕</button></form>
        <button className="header-icon" onClick={()=>document.documentElement.classList.toggle('dark-more')} aria-label="Toggle contrast">◐</button>
        <div className="notification-wrap"><button className="header-icon" onClick={()=>setNotifications(v=>!v)} aria-label="Notifications">♢{count>0&&<b>{count}</b>}</button>{notifications&&<div className="dropdown notification-box"><strong>Notifications</strong><p>{count?`${count} unread notification${count>1?'s':''}`:'No new notifications.'}</p><button onClick={()=>router.push('/admin/notifications')}>Open notifications</button></div>}</div>
        <div className="profile-wrap"><button className="profile-btn" onClick={()=>setProfile(v=>!v)}><div className="profile-avatar">A</div><div><strong>Admin</strong><span>Administrator</span></div><em>⌄</em></button>{profile&&<div className="dropdown profile-box"><button onClick={()=>router.push('/admin/academy-profile')}>◎ My Profile</button><button onClick={()=>router.push('/admin/settings')}>⚙ Settings</button><button onClick={()=>{localStorage.removeItem('studentflow:session');router.push('/login')}}>↪ Logout</button></div>}</div>
      </div>
    </header>
    <main className="admin-content">{children}</main>
   </div>
 </div>
}
