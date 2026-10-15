
"use client";

import Link from "next/link";

import { useCallback, useState } from "react";

type Accent = "purple" | "blue" | "green" | "orange" | "pink" | "indigo";

type Module = {

    number: string;

    category: string;

    title: string;

    description: string;

    tag: string;

    accent: Accent;

    icon: string;

};

const modules: Module[] = [

    {

        number: "01",

        category: "STUDENTS",

        title: "Student Management",

        description: "Manage student profiles, academic records, contacts and essential information from one place.",

        tag: "Smart records",

        accent: "purple",

        icon: "◎",

    },

    {

        number: "02",

        category: "ADMISSIONS",

        title: "Enquiry Manager",

        description: "Capture enquiries, track follow-ups and keep your admission pipeline organised.",

        tag: "Easy follow-up",

        accent: "blue",

        icon: "↗",

    },

    {

        number: "03",

        category: "DAILY TRACKING",

        title: "Attendance",

        description: "Record daily attendance quickly and keep accurate student attendance history.",

        tag: "Quick entry",

        accent: "green",

        icon: "✓",

    },

    {

        number: "04",

        category: "FINANCE",

        title: "Fees Management",

        description: "Track collections, pending fees, payment history and financial activity with clarity.",

        tag: "Live records",

        accent: "orange",

        icon: "₹",

    },

    {

        number: "05",

        category: "SCHEDULING",

        title: "Classes & Batches",

        description: "Organise batches, classes, schedules and student assignments without paperwork.",

        tag: "Smart planning",

        accent: "pink",

        icon: "▦",

    },

    {

        number: "06",

        category: "ANALYTICS",

        title: "Reports & Insights",

        description: "Understand institute activity through clear reports and useful management insights.",

        tag: "Instant reports",

        accent: "indigo",

        icon: "↗",

    },

];

const steps = [

    {

        number: "01",

        title: "Set up your institute",

        text: "Create your institute structure and organise the information you need.",

    },

    {

        number: "02",

        title: "Manage daily operations",

        text: "Handle students, attendance, fees, batches and enquiries from one platform.",

    },

    {

        number: "03",

        title: "Track and improve",

        text: "Use organised records and reports to understand what is happening.",

    },

];

const extendedFeatures = [

    {

        number: "01",

        title: "Smart Attendance",

        text: "QR, manual and structured attendance workflows with clear daily records.",

        tag: "Attendance",

        icon: "✓",

    },

    {

        number: "02",

        title: "Fees & Payments",

        text: "Track fee structures, collections, pending amounts, receipts and payment history.",

        tag: "Finance",

        icon: "₹",

    },

    {

        number: "03",

        title: "Exams & Results",

        text: "Create exams, record marks, publish results and review student performance.",

        tag: "Academics",

        icon: "A+",

    },

    {

        number: "04",

        title: "Communication",

        text: "Keep parents, students, teachers and administrators connected with timely updates.",

        tag: "Messaging",

        icon: "↗",

    },

    {

        number: "05",

        title: "Income & Expense",

        text: "Organise institute income and expenses with period-based financial visibility.",

        tag: "Finance",

        icon: "▣",

    },

    {

        number: "06",

        title: "Enquiry CRM",

        text: "Capture leads, assign follow-ups and track enquiry progress through admission.",

        tag: "Admissions",

        icon: "◎",

    },

    {

        number: "07",

        title: "Staff Management",

        text: "Manage staff roles, attendance, classes, leaves and operational responsibilities.",

        tag: "Staff",

        icon: "◉",

    },

    {

        number: "08",

        title: "Student & Parent Access",

        text: "Give students and parents a focused view of attendance, fees, homework and notices.",

        tag: "Portal",

        icon: "◌",

    },

    {

        number: "09",

        title: "Reports & Analytics",

        text: "Turn daily institute records into useful attendance, finance and performance reports.",

        tag: "Insights",

        icon: "↗",

    },

];

const adminAreas = [

    "Dashboard",

    "Students",

    "Attendance",

    "Batches",

    "Fees",

    "Fees Reports",

    "Finance",

    "Income / Expense",

    "Exams",

    "Reports",

];

const pricingPlans = [

    {

        id: "monthly-standard",

        name: "Monthly Standard",

        subtitle: "For institutes with up to 200 students",

        price: "₹1,499",

        period: "per month",

        students: "200 students",

        staff: "10 staff",

    },

    {

        id: "monthly-professional",

        name: "Monthly Professional",

        subtitle: "For growing institutes with up to 500 students",

        price: "₹2,999",

        period: "per month",

        students: "500 students",

        staff: "30 staff",

        popular: true,

    },

    {

        id: "six-month-standard",

        name: "6-Month Standard",

        subtitle: "Six-month plan for smaller institutes",

        price: "₹7,999",

        period: "per 6 months",

        students: "200 students",

        staff: "10 staff",

    },

    {

        id: "six-month-professional",

        name: "6-Month Professional",

        subtitle: "Six-month plan for growing institutes",

        price: "₹16,499",

        period: "per 6 months",

        students: "500 students",

        staff: "30 staff",

        popular: true,

    },

    {

        id: "yearly-standard",

        name: "Yearly Standard",

        subtitle: "Annual plan for smaller institutes",

        price: "₹15,499",

        period: "per year",

        students: "200 students",

        staff: "10 staff",

    },

    {

        id: "yearly-professional",

        name: "Yearly Professional",

        subtitle: "Annual plan for growing institutes",

        price: "₹30,999",

        period: "per year",

        students: "500 students",

        staff: "30 staff",

        popular: true,

    },

];

const reviewCards = [

    {

        quote: "A single place for student records, fees, attendance and daily institute operations.",

        role: "Example institute owner",

    },

    {

        quote: "The dashboard makes it easier to understand what needs attention without checking multiple registers.",

        role: "Example administrator",

    },

    {

        quote: "Students, batches and enquiries can follow the same organised workflow instead of separate files.",

        role: "Example academic coordinator",

    },

    {

        quote: "Clear reports help the management team review institute activity more consistently.",

        role: "Example institute director",

    },

];

function goToLogin() {

    window.location.href = "/login";

}

function ModuleIcon({ icon }: {

    icon: string;

}) {

    return <div className="moduleVisual">{icon}</div>;

}

export default function MainPage() {

    const [menuOpen, setMenuOpen] = useState(false);

    const scrollTo = useCallback((id: string) => {

        document.getElementById(id)?.scrollIntoView({

            behavior: "smooth",

            block: "start",

        });

    }, []);

    return (<main className="studentFlowPage">

      <nav className="siteNav">

        <Link href="/" className="brand">

          <span className="brandMark">S</span>

          <span>StudentFlow</span>

        </Link>

        <div className="navLinks">

          <button type="button" onClick={() => scrollTo("features")}>Features</button>

          <button type="button" onClick={() => scrollTo("admin-panel")}>Admin Panel</button>

          <button type="button" onClick={() => scrollTo("communication")}>Communication</button>

          <button type="button" onClick={() => scrollTo("whatsapp-bot")}>WhatsApp Support</button>

          <button type="button" onClick={() => scrollTo("pricing")}>Pricing</button>

          <button type="button" onClick={() => scrollTo("reviews")}>Reviews</button>

          <button type="button" onClick={() => scrollTo("subscription-contact")}>Contact</button>

        </div>

        <div className="navActions">

          <button type="button" className="navLogin" onClick={goToLogin}>

            Login

          </button>

          <Link href="/subscribe" className="navSignup">

            Get started

          </Link>

        </div>

        <button type="button" className={`tabletMenuButton${menuOpen ? " active" : ""}`} onClick={() => setMenuOpen((open) => !open)} aria-label="Open navigation menu" aria-expanded={menuOpen}>

          <span />

          <span />

          <span />

          <span />

        </button>

        {menuOpen && (<div className="tabletMenu">

            <button type="button" onClick={() => { setMenuOpen(false); scrollTo("features"); }}>

              <span>Features</span><span>→</span>

            </button>

            <button type="button" onClick={() => { setMenuOpen(false); scrollTo("admin-panel"); }}>

              <span>Admin Panel</span><span>→</span>

            </button>

            <button type="button" onClick={() => { setMenuOpen(false); scrollTo("communication"); }}>

              <span>Communication</span><span>→</span>

            </button>

            <button type="button" onClick={() => { setMenuOpen(false); scrollTo("workflow"); }}>

              <span>How It Works</span><span>→</span>

            </button>

            <button type="button" onClick={() => { setMenuOpen(false); scrollTo("pricing"); }}>

              <span>Pricing</span><span>→</span>

            </button>

            <button type="button" onClick={() => { setMenuOpen(false); scrollTo("reviews"); }}>

              <span>Reviews</span><span>→</span>

            </button>

            <button type="button" onClick={() => { setMenuOpen(false); scrollTo("subscription-contact"); }}>

              <span>Contact</span><span>→</span>

            </button>

            <button type="button" onClick={() => { setMenuOpen(false); goToLogin(); }}>

              <span>Login</span><span>→</span>

            </button>

            <Link href="/subscribe" className="tabletMenuSignup" onClick={() => setMenuOpen(false)}>

              <span>Get Started</span><span>↗</span>

            </Link>

          </div>)}

      </nav>

      <section className="hero">

        <div className="heroGlow heroGlowOne"/>

        <div className="heroGlow heroGlowTwo"/>

        <div className="heroInner">

          <div className="heroCopy">

            <div className="eyebrow">

              <span className="eyebrowDot"/>

              SMART INSTITUTE MANAGEMENT

            </div>

            <h1>

              Run your institute

              <br />

              <span>with clarity.</span>

            </h1>

            <p>

              StudentFlow brings students, admissions, attendance, fees,

              batches and reports into one clean management platform.

            </p>

            <div className="heroActions">

              <div

                className="buttonPrimary"

                aria-disabled="true"

                title="Dashboard preview only"

                style={{ cursor: "default", pointerEvents: "none" }}

              >

                Open Dashboard <span>→</span>

              </div>

              <Link href="/subscribe" className="buttonSecondary">

                Create Account

              </Link>

            </div>

            <div className="heroTrust">

              <span>●</span> Built for modern educational institutes

            </div>

          </div>

          <div className="heroDashboard" aria-hidden="true">

            <div className="dashboardTop">

              <div>

                <span className="miniLabel">OVERVIEW</span>

                <strong>Institute Dashboard</strong>

              </div>

              <span className="livePill">

                <i /> Live

              </span>

            </div>

            <div className="dashboardStats">

              <div className="dashStat purpleStat">

                <span>Students</span>

                <strong>1,248</strong>

                <small>+12 this month</small>

              </div>

              <div className="dashStat blueStat">

                <span>Attendance</span>

                <strong>92.4%</strong>

                <small>Today</small>

              </div>

              <div className="dashStat greenStat">

                <span>Fees collected</span>

                <strong>₹2.84L</strong>

                <small>This month</small>

              </div>

            </div>

            <div className="dashboardChart">

              <div className="chartHeader">

                <span>Monthly activity</span>

                <span>2026</span>

              </div>

              <div className="chartBars">

                <i style={{ height: "42%" }}/>

                <i style={{ height: "58%" }}/>

                <i style={{ height: "50%" }}/>

                <i style={{ height: "72%" }}/>

                <i style={{ height: "64%" }}/>

                <i style={{ height: "84%" }}/>

                <i style={{ height: "76%" }}/>

              </div>

            </div>

            <div className="dashboardBottom">

              <span><b /> Students</span>

              <span><b /> Fees</span>

              <span><b /> Attendance</span>

            </div>

          </div>

        </div>

        <div className="heroStats">

          <div><strong>06+</strong><span>Core modules</span></div>

          <div><strong>01</strong><span>Unified dashboard</span></div>

          <div><strong>24/7</strong><span>Accessible system</span></div>

        </div>

      </section>

      <section id="features" className="section featuresSection">

        <div className="sectionHeading">

          <span className="sectionKicker">CORE MODULES</span>

          <h2>

            Everything your institute needs,

            <br />

            <span>in one system.</span>

          </h2>

          <p>

            Designed around the everyday work of schools, coaching centres and

            educational institutes.

          </p>

        </div>

        <div className="moduleGrid">

          {modules.map((item) => (<article className={`moduleCard ${item.accent}`} key={item.number}>

              <div className="moduleCardTop">

                <span>{item.number}</span>

                <span className="moduleStatus"><i /> Active</span>

              </div>

              <ModuleIcon icon={item.icon}/>

              <div className="moduleCardBody">

                <span className="moduleCategory">{item.category}</span>

                <h3>{item.title}</h3>

                <p>{item.description}</p>

                <span className="moduleTag">{item.tag}</span>

              </div>

            </article>))}

        </div>

      </section>

      <section id="admin-panel" className="section adminModulesSection" style={{ background: "#f8faff" }}>

        <div className="sectionHeading">

          <span className="sectionKicker">WEB DASHBOARD</span>

          <h2>

            Powerful Admin Panel

          </h2>

          <p>

            Complete web dashboard to manage your institute. Real-time data, beautiful interface.

          </p>

        </div>

        <div

          className="adminModulesGrid"

          style={{

            display: "grid",

            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",

            gap: 16,

            maxWidth: 1120,

            margin: "0 auto",

          }}

        >

          {[

            { number: "01", title: "Dashboard", description: "Institute overview, totals, recent activity and key statistics.", icon: "▦" },

            { number: "02", title: "Students", description: "Student profiles, academic details and contact records.", icon: "♙" },

            { number: "03", title: "Families & Parents", description: "Family information and linked student records.", icon: "♧" },

            { number: "04", title: "Attendance", description: "Daily attendance entry and attendance history.", icon: "✓" },

            { number: "05", title: "Batches & Classes", description: "Organise batches, class schedules and student assignments.", icon: "▤" },

            { number: "06", title: "Tuition Fees", description: "Fee plans, collections, dues and payment records.", icon: "₹" },

            { number: "07", title: "Fees Reports", description: "Review fee collections, pending payments and summaries.", icon: "▥" },

            { number: "08", title: "Income & Expense", description: "Track income, expenses, categories and profit/loss summaries.", icon: "⇄" },

            { number: "09", title: "Staff Manager", description: "Maintain staff profiles, roles and work information.", icon: "♙" },

            { number: "10", title: "Enquiry Manager", description: "Capture enquiries, follow up with leads and track admissions.", icon: "↗" },

            { number: "11", title: "Performance", description: "Review student progress, marks and performance trends.", icon: "⌁" },

            { number: "12", title: "Study Material", description: "Organise learning resources and share study materials.", icon: "▣" },

            { number: "13", title: "Online Exams", description: "Create exams, manage questions and review student results.", icon: "A+" },

            { number: "14", title: "Audit Logs", description: "Review recorded activities and administrative changes.", icon: "◷" },

            { number: "15", title: "Reports & Analytics", description: "View organised reports across institute operations.", icon: "▥" },

          ].map((item) => (

            <article

              key={item.number}

              style={{

                padding: "22px 20px",

                border: "1px solid #e5eaf3",

                borderRadius: 16,

                background: "#ffffff",

                boxShadow: "0 8px 24px rgba(24, 39, 75, 0.045)",

                minHeight: 155,

              }}

            >

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>

                <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 12, background: "#eef2ff", color: "#5145cd", fontSize: 19, fontWeight: 800 }}>

                  {item.icon}

                </span>

                <span style={{ color: "#9aa4b5", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>{item.number}</span>

              </div>

              <h3 style={{ margin: "0 0 8px", color: "#172033", fontSize: 16, fontWeight: 750 }}>{item.title}</h3>

              <p style={{ margin: 0, color: "#667085", fontSize: 13, lineHeight: 1.65 }}>{item.description}</p>

            </article>

          ))}

        </div>

        <div style={{ textAlign: "center", marginTop: 30 }}>

          <Link href="/subscribe" className="buttonPrimary">

            Open Admin Panel <span>→</span>

          </Link>

        </div>

      </section>

      <section className="section" aria-label="Trusted institutes">

        <div className="sectionHeading">

          <span className="sectionKicker">OUR NETWORK</span>

          <h2>

            Built for

            <br />

            <span>educational institutes.</span>

          </h2>

          <p>

            StudentFlow is designed for coaching centres, tuition classes,

            schools and growing educational teams that want their daily

            operations in one place.

          </p>

        </div>

        <div className="processGrid">

          <div className="processCard">

            <span className="processNumber">01</span>

            <div className="processIcon">C</div>

            <h3>Coaching Centres</h3>

            <p>Manage students, batches, fees, attendance and enquiries together.</p>

          </div>

          <div className="processCard">

            <span className="processNumber">02</span>

            <div className="processIcon">S</div>

            <h3>Schools</h3>

            <p>Keep academic and administrative records structured and accessible.</p>

          </div>

          <div className="processCard">

            <span className="processNumber">03</span>

            <div className="processIcon">T</div>

            <h3>Tuition Institutes</h3>

            <p>Reduce repetitive work across attendance, fees and student follow-ups.</p>

          </div>

          <div className="processCard">

            <span className="processNumber">04</span>

            <div className="processIcon">I</div>

            <h3>Growing Institutes</h3>

            <p>Start with essentials and expand modules as your institute grows.</p>

          </div>

        </div>

      </section>

      <section id="communication" className="aboutSection">

        <div className="aboutCard">

          <div>

            <span className="sectionKicker">COMMUNICATION</span>

            <h2>

              Keep parents

              <br />

              <span>in the loop.</span>

            </h2>

          </div>

          <div className="aboutContent">

            <p>

              StudentFlow can organise parent and student communication around

              the information they need: fees, attendance, results, homework,

              notices and important institute updates.

            </p>

            <div className="featureChecks">

              <div><b>✓</b><span>Fees summary & payment history</span></div>

              <div><b>✓</b><span>Today's attendance</span></div>

              <div><b>✓</b><span>Exam results & reports</span></div>

              <div><b>✓</b><span>Notices & homework updates</span></div>

              <div><b>✓</b><span>Custom institute messages</span></div>

            </div>

          </div>

        </div>

      </section>

            <section id="whatsapp-bot" className="aboutSection chatbotSection"><div className="aboutCard chatbotCard"><div className="chatbotIntro"><span className="sectionKicker">PARENT & STUDENT SUPPORT</span><h2>Important updates, <br /><span>right on WhatsApp.</span></h2><p>Give families a simple way to review institute information and receive timely updates. Live messaging requires approved WhatsApp Business/API integration.</p><div className="featureChecks"><div><b>✓</b><span>Fee summaries and payment history</span></div><div><b>✓</b><span>Attendance, results and notices</span></div><div><b>✓</b><span>Homework and institute announcements</span></div><div><b>✓</b><span>Mobile-friendly family access</span></div></div></div><div className="chatWindow"><div className="chatWindowTop"><span className="chatAvatar">S</span><span><strong>STUDY ARENA</strong><small>Institute support · Example preview</small></span><i>●</i></div><div className="chatMessages"><div className="chatBubble received">Welcome to STUDY ARENA! Choose the information you need.<small>11:27 AM</small></div><div className="chatBubble sent">Fees summary<small>11:28 AM ✓✓</small></div><div className="chatBubble received"><strong>Fee summary</strong><br />Student: Example Student<br />Paid: ₹12,000<br />Pending: ₹3,000<small>11:28 AM</small></div><div className="chatQuickReplies"><span>Attendance</span><span>Exam results</span><span>Notices</span></div></div><div className="chatComposer"><span>Type a message…</span><b>➤</b></div><p className="chatDisclaimer">Illustrative preview only — live messaging needs WhatsApp Business/API setup.</p></div></div></section>

    <section className="section">

        <div className="sectionHeading">

          <span className="sectionKicker">FEATURES</span>

          <h2>

            Everything your institute needs,

            <br />

            <span>in one system.</span>

          </h2>

          <p>

            From attendance and fees to staff, enquiries, exams and reports,

            keep the core work of your institute connected.

          </p>

        </div>

        <div className="moduleGrid">

          {extendedFeatures.map((item) => (<article className="moduleCard purple" key={item.number}>

              <div className="moduleCardTop">

                <span>{item.number}</span>

                <span className="moduleStatus"><i /> Active</span>

              </div>

              <div className="moduleVisual">{item.icon}</div>

              <div className="moduleCardBody">

                <span className="moduleCategory">{item.tag}</span>

                <h3>{item.title}</h3>

                <p>{item.text}</p>

                <span className="moduleTag">Included</span>

              </div>

            </article>))}

        </div>

      </section>

      <section className="processSection">

        <div className="sectionHeading">

          <span className="sectionKicker">REFER & GROW</span>

          <h2>

            Grow your institute

            <br />

            <span>network.</span>

          </h2>

          <p>

            Share StudentFlow with another institute and keep your professional

            network connected around better institute management.

          </p>

        </div>

        <div className="processGrid">

          <div className="processCard">

            <span className="processNumber">01</span>

            <div className="processIcon">1</div>

            <h3>Share</h3>

            <p>Share StudentFlow with another institute or education team.</p>

          </div>

          <div className="processCard">

            <span className="processNumber">02</span>

            <div className="processIcon">2</div>

            <h3>They Get Started</h3>

            <p>They create an account and begin organising their institute.</p>

          </div>

          <div className="processCard">

            <span className="processNumber">03</span>

            <div className="processIcon">3</div>

            <h3>Stay Connected</h3>

            <p>Keep a growing network of institutes using structured workflows.</p>

          </div>

        </div>

      </section>

      <section id="workflow" className="workflowSection">

        <div className="workflowInner">

          <div className="workflowCopy">

            <span className="sectionKicker">ONE PLATFORM</span>

            <h2>

              Less paperwork.

              <br />

              <span>More control.</span>

            </h2>

            <p>

              Keep your institute operations connected instead of switching

              between registers, spreadsheets and separate tools.

            </p>

            <div className="featureChecks">

              <div><b>✓</b><span>Centralised student records</span></div>

              <div><b>✓</b><span>Faster daily operations</span></div>

              <div><b>✓</b><span>Organised admissions and enquiries</span></div>

              <div><b>✓</b><span>Clear financial and performance reports</span></div>

            </div>

          </div>

          <div className="workflowCard">

            <div className="workflowCardHeader">

              <span>MANAGEMENT FLOW</span>

              <em>StudentFlow</em>

            </div>

            {steps.map((step, index) => (<div className="workflowRow" key={step.number}>

                <span className="workflowNumber">{step.number}</span>

                <div>

                  <strong>{step.title}</strong>

                  <p>{step.text}</p>

                </div>

                <span className="workflowArrow">{index === steps.length - 1 ? "✓" : "→"}</span>

              </div>))}

          </div>

        </div>

      </section>

            <section id="app-preview" className="section appPreviewSection"><div className="sectionHeading"><span className="sectionKicker">MADE FOR EVERY SCREEN</span><h2>A clearer view of <br /><span>daily institute work.</span></h2><p>A look at the web dashboard and institute records. Sample values are illustrative, not live institute data.</p></div><div className="appPreviewGrid"><article className="appPreviewCard"><div className="appPreviewToolbar"><span>● ● ●</span><b>Dashboard</b><small>Overview</small></div><div className="appPreviewMetrics"><div><small>Total students</small><strong>1,248</strong></div><div><small>Attendance</small><strong>92.4%</strong></div><div><small>Fees status</small><strong>Updated</strong></div></div><div className="appPreviewChart"><span style={{ height: "38%" }}/><span style={{ height: "55%" }}/><span style={{ height: "48%" }}/><span style={{ height: "70%" }}/><span style={{ height: "62%" }}/><span style={{ height: "86%" }}/><span style={{ height: "76%" }}/></div><p>Dashboard preview · sample values</p></article><article className="appPreviewCard"><div className="appPreviewToolbar"><span>● ● ●</span><b>Institute records</b><small>Overview</small></div><div className="previewStudent"><i>AR</i><span><strong>Student profiles</strong><small>Contact and batch details</small></span><b>→</b></div><div className="previewStudent"><i>SK</i><span><strong>Attendance history</strong><small>Daily records</small></span><b>→</b></div><div className="previewStudent"><i>MP</i><span><strong>Fee information</strong><small>Paid and pending</small></span><b>→</b></div><div className="previewStudent"><i>NT</i><span><strong>Study materials</strong><small>Resources and notices</small></span><b>→</b></div><p>Interface preview · sample records</p></article></div></section>

    <section className="processSection">

        <div className="sectionHeading">

          <span className="sectionKicker">SIMPLE PROCESS</span>

          <h2>

            From setup to

            <br />

            <span>smooth operations.</span>

          </h2>

          <p>Start with the essentials and expand your system as your institute grows.</p>

        </div>

        <div className="processGrid">

          {steps.map((step, index) => (<div className="processCard" key={step.number}>

              <span className="processNumber">{step.number}</span>

              <div className="processIcon">{index + 1}</div>

              <h3>{step.title}</h3>

              <p>{step.text}</p>

            </div>))}

        </div>

      </section>

      <section id="about" className="aboutSection">

        <div className="aboutCard">

          <div>

            <span className="sectionKicker">MADE FOR MODERN INSTITUTES</span>

            <h2>

              Your institute.

              <br />

              <span>Your system.</span>

            </h2>

          </div>

          <div className="aboutContent">

            <p>

              StudentFlow is a focused management interface for keeping

              academic and administrative work organised, accessible and easy

              to operate.

            </p>

            <button className="darkButton" onClick={goToLogin}>

              Enter StudentFlow <span>→</span>

            </button>

          </div>

        </div>

      </section>

      <section id="pricing" className="processSection">

        <div className="sectionHeading">

          <span className="sectionKicker">SUBSCRIPTION PLANS</span>

          <h2>

            Choose the plan

            <br />

            <span>that fits your institute.</span>

          </h2>

          <p>

            Every plan includes the core StudentFlow management experience.

            Select a plan to review the full details on our subscription page.

          </p>

        </div>

        <div

          className="processGrid subscriptionPlanGrid"

          style={{

            display: "grid",

            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",

            gap: 22,

            maxWidth: 1160,

            margin: "0 auto",

            alignItems: "stretch",

          }}

        >

          {pricingPlans.map((plan, index) => (<article

              className="processCard subscriptionPlanCard"

              key={plan.id}

              style={{

                position: "relative",

                display: "flex",

                flexDirection: "column",

                minWidth: 0,

                padding: "32px 30px",

                border: "1px solid #e4eaf5",

                borderRadius: 22,

                background: "#ffffff",

                color: "#667596",

                boxShadow: "0 14px 40px rgba(34, 58, 100, 0.07)",

                textAlign: "left",

                overflow: "hidden",

              }}

            >

              <span className="processNumber" style={{ color: "#8290b2", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 22 }}>{String(index + 1).padStart(2, "0")}</span>

              {plan.popular && <span className="subscriptionPopular" style={{ position: "absolute", top: 20, right: 20, background: "linear-gradient(135deg, #7956f5, #5940dc)", color: "#fff", borderRadius: 11, padding: "9px 13px", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", boxShadow: "0 6px 16px rgba(101, 73, 230, 0.22)" }}>POPULAR</span>}

              <div className="processIcon" style={{ display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #f5eaff, #eaf1ff)", color: "#6250ed", fontSize: 27, fontWeight: 800, marginBottom: 22 }}>₹</div>

              <h3 style={{ color: "#141d35", fontSize: 22, lineHeight: 1.3, fontWeight: 800, margin: "0 0 16px" }}>{plan.name}</h3>

              <p style={{ color: "#7180a1", fontSize: 13, margin: "0 0 12px" }}><strong style={{ color: "#3167f5", fontSize: 30, fontWeight: 850 }}>{plan.price}</strong> · {plan.period}</p>

              <p style={{ color: "#7482a1", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>{plan.subtitle}</p>

              <div className="featureChecks">

                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#687797", fontSize: 14, lineHeight: 1.45 }}><b style={{ display: "grid", placeItems: "center", flex: "0 0 28px", width: 28, height: 28, borderRadius: "50%", background: "#e0fbef", color: "#0ba765", fontSize: 14 }}>✓</b><span>{plan.students}</span></div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#687797", fontSize: 14, lineHeight: 1.45 }}><b style={{ display: "grid", placeItems: "center", flex: "0 0 28px", width: 28, height: 28, borderRadius: "50%", background: "#e0fbef", color: "#0ba765", fontSize: 14 }}>✓</b><span>{plan.staff}</span></div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#687797", fontSize: 14, lineHeight: 1.45 }}><b style={{ display: "grid", placeItems: "center", flex: "0 0 28px", width: 28, height: 28, borderRadius: "50%", background: "#e0fbef", color: "#0ba765", fontSize: 14 }}>✓</b><span>Student and family management</span></div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#687797", fontSize: 14, lineHeight: 1.45 }}><b style={{ display: "grid", placeItems: "center", flex: "0 0 28px", width: 28, height: 28, borderRadius: "50%", background: "#e0fbef", color: "#0ba765", fontSize: 14 }}>✓</b><span>Attendance and batch management</span></div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#687797", fontSize: 14, lineHeight: 1.45 }}><b style={{ display: "grid", placeItems: "center", flex: "0 0 28px", width: 28, height: 28, borderRadius: "50%", background: "#e0fbef", color: "#0ba765", fontSize: 14 }}>✓</b><span>Fees, reports and audit logs</span></div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#687797", fontSize: 14, lineHeight: 1.45 }}><b style={{ display: "grid", placeItems: "center", flex: "0 0 28px", width: 28, height: 28, borderRadius: "50%", background: "#e0fbef", color: "#0ba765", fontSize: 14 }}>✓</b><span>Study materials and online exams</span></div>

              </div>

              <Link href={`/subscribe?plan=${encodeURIComponent(plan.id)}`} className="buttonSecondary subscriptionPlanButton" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", marginTop: "auto", padding: "17px 20px", borderRadius: 15, border: "1px solid #2e64f5", background: "linear-gradient(135deg, #3472ff, #2458ee)", color: "#ffffff", fontWeight: 750, textDecoration: "none", boxShadow: "0 10px 22px rgba(49, 100, 245, 0.18)" }}>

                View Plan & Subscribe <span>→</span>

              </Link>

            </article>))}

        </div>

        <p className="subscriptionFootnote">

          Domain, setup and support arrangements are confirmed during subscription enquiries.

          Online payment is not enabled yet.

        </p>

      </section>

      <section id="subscription-contact" className="aboutSection subscriptionContactSection">

        <div className="aboutCard subscriptionContactCard">

          <div>

            <span className="sectionKicker">SUBSCRIPTION SUPPORT</span>

            <h2>Need help choosing a plan?<br /><span>Talk to our team.</span></h2>

            <p>Contact us for plan details, domain requirements, setup and subscription enquiries.</p>

          </div>

          <div className="subscriptionContactGrid">

            <a className="subscriptionContactItem" href="https://wa.me/919863795417?text=Hello%20STUDY%20ARENA%2C%20I%20am%20interested%20in%20your%20subscription%20plans.%20Please%20share%20more%20details." target="_blank" rel="noreferrer">

              <span className="subscriptionContactIcon whatsappContactIcon">◉</span>

              <span><strong>Chat on WhatsApp</strong><small>9863795417 · Send an enquiry</small></span>

              <b>↗</b>

            </a>

            <a className="subscriptionContactItem" href="mailto:animeshdebnath445@gmail.com?subject=STUDY%20ARENA%20Subscription%20Enquiry&body=Hello%20STUDY%20ARENA%2C%0A%0AI%20would%20like%20to%20know%20more%20about%20your%20subscription%20plans.">

              <span className="subscriptionContactIcon emailContactIcon">✉</span>

              <span><strong>Email us</strong><small>animeshdebnath445@gmail.com</small></span>

              <b>↗</b>

            </a>

            <a className="subscriptionContactItem" href="tel:+919863795417">

              <span className="subscriptionContactIcon callContactIcon">☎</span>

              <span><strong>Call our team</strong><small>+91 98637 95417</small></span>

              <b>↗</b>

            </a>

            <a className="subscriptionContactItem" href="https://www.instagram.com/animesh.d_/" target="_blank" rel="noreferrer">

              <span className="subscriptionContactIcon instagramContactIcon">◎</span>

              <span><strong>Instagram</strong><small>@animesh.d_</small></span>

              <b>↗</b>

            </a>

          </div>

        </div>

      </section>

      <section id="reviews" className="section">

        <div className="sectionHeading">

          <span className="sectionKicker">REVIEWS</span>

          <h2>

            Built around

            <br />

            <span>real institute workflows.</span>

          </h2>

          <p>

            This section is ready for your real StudentFlow customer reviews.

            The cards below are example placeholders, not verified testimonials.

          </p>

        </div>

        <div className="moduleGrid">

          {reviewCards.map((review, index) => (<article className="moduleCard blue" key={review.role}>

              <div className="moduleCardTop">

                <span>0{index + 1}</span>

                <span className="moduleStatus"><i /> Example</span>

              </div>

              <div className="moduleVisual">“</div>

              <div className="moduleCardBody">

                <span className="moduleCategory">FEEDBACK</span>

                <h3>Institute experience</h3>

                <p>{review.quote}</p>

                <span className="moduleTag">{review.role}</span>

              </div>

            </article>))}

        </div>

      </section>

      <section className="ctaSection">

        <div className="ctaGlow"/>

        <div className="ctaContent">

          <span className="sectionKicker lightKicker">READY TO START?</span>

          <h2>

            Make institute management

            <br />

            <span>simple again.</span>

          </h2>

          <p>Open your dashboard and start managing your institute from one place.</p>

          <button className="ctaButton" onClick={goToLogin}>

            Get Started <span>↗</span>

          </button>

        </div>

      </section>

      <footer className="siteFooter">

        <div className="footerMain">

          <div className="footerBrand">

            <span className="brandMark">S</span>

            <div>

              <strong>StudentFlow</strong>

              <span>Smart management for modern educational institutes.</span>

            </div>

          </div>

          <div className="footerLinks">

            <button onClick={() => scrollTo("features")}>Features</button>

            <button onClick={() => scrollTo("workflow")}>Workflow</button>

            <button onClick={() => scrollTo("about")}>About</button>

            <button onClick={goToLogin}>Login</button>

          </div>

        </div>

        <div className="footerBottom">

          <span>© 2026 StudentFlow. All rights reserved.</span>

          <span>Built for better institute management.</span>

        </div>

      </footer>

          <style jsx global>{`.chatbotCard{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.85fr);gap:clamp(24px,5vw,64px);align-items:center}.chatWindow{overflow:hidden;border:1px solid #dce6df;border-radius:22px;background:#f0f7f1;box-shadow:0 22px 65px rgba(20,50,35,.12);color:#17352a}.chatWindowTop{display:flex;align-items:center;gap:12px;padding:16px;background:#fff;border-bottom:1px solid #e1e9e3}.chatAvatar{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:#173f32;color:#fff;font-weight:800}.chatWindowTop strong,.chatWindowTop small{display:block}.chatWindowTop small{font-size:11px;color:#75857b;margin-top:3px}.chatWindowTop i{margin-left:auto;color:#27a568;font-size:10px}.chatMessages{padding:20px 14px;min-height:300px;background:linear-gradient(135deg,#eaf3e9,#f7f8f2)}.chatBubble{max-width:88%;padding:12px 14px;margin-bottom:12px;border-radius:13px;background:#fff;font-size:13px;line-height:1.65;box-shadow:0 2px 7px #153b2410}.chatBubble small{display:block;text-align:right;color:#8a998e;font-size:10px;margin-top:4px}.chatBubble.sent{margin-left:auto;background:#d7f7d2}.chatQuickReplies{display:flex;flex-wrap:wrap;gap:7px}.chatQuickReplies span{border:1px solid #b9d7c0;border-radius:20px;background:#fff;padding:7px 10px;font-size:11px}.chatComposer{display:flex;justify-content:space-between;align-items:center;margin:0 12px 10px;padding:12px 14px;border-radius:24px;background:#fff;color:#8a998e;font-size:12px}.chatComposer b{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#1d8d5c;color:#fff}.chatDisclaimer{margin:0;padding:0 14px 14px;font-size:10px;color:#75857b}.appPreviewGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:stretch}.appPreviewCard{padding:18px;border:1px solid #e3e8f0;border-radius:20px;background:#fff;box-shadow:0 12px 40px #1b2c4610;min-width:0}.appPreviewToolbar{display:flex;align-items:center;gap:9px;padding-bottom:16px;border-bottom:1px solid #edf0f5;font-size:11px;color:#9aa4b4}.appPreviewToolbar b{color:#27354a;font-size:13px}.appPreviewToolbar small{margin-left:auto}.appPreviewMetrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.appPreviewMetrics div{padding:12px;border-radius:12px;background:#f6f7fb}.appPreviewMetrics small,.appPreviewMetrics strong{display:block}.appPreviewMetrics small{font-size:10px;color:#7d8798}.appPreviewMetrics strong{font-size:20px;margin-top:6px;color:#27354a}.appPreviewChart{height:125px;display:flex;align-items:flex-end;gap:10px;padding:16px 10px 4px;margin-top:14px;border-bottom:1px solid #e8ebf1}.appPreviewChart span{flex:1;border-radius:5px 5px 0 0;background:linear-gradient(180deg,#8e7cf4,#4d67d8)}.appPreviewCard>p{font-size:10px;color:#9099a8;margin:14px 0 0}.previewStudent{display:flex;align-items:center;gap:10px;padding:15px 0;border-bottom:1px solid #edf0f5}.previewStudent i{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#eeebff;color:#6250c7;font-style:normal;font-weight:800;font-size:11px}.previewStudent span{min-width:0;flex:1}.previewStudent strong,.previewStudent small{display:block}.previewStudent strong{font-size:12px;color:#2b3547}.previewStudent small{font-size:10px;color:#9099a8;margin-top:4px}.previewStudent>b{color:#8d96a7}.appPreviewPhone{display:flex;flex-direction:column;align-items:center;background:linear-gradient(145deg,#f7f5ff,#f2f6ff)}.phoneFrame{width:min(100%,235px);min-height:340px;border:6px solid #22283a;border-radius:30px;padding:20px 13px 12px;background:#fff;position:relative;box-shadow:0 16px 35px #22283a20}.phoneNotch{position:absolute;top:0;left:50%;transform:translateX(-50%);width:72px;height:13px;border-radius:0 0 10px 10px;background:#22283a}.phoneBrand{font-size:10px;font-weight:900;letter-spacing:1px;color:#6652c7;margin:8px 0 20px}.phoneWelcome{font-size:10px;color:#7b8496}.phoneWelcome strong{display:block;font-size:15px;color:#242d40;margin-top:6px}.phoneStat{display:flex;justify-content:space-between;gap:8px;padding:13px 10px;margin-top:10px;border-radius:12px;background:#f6f5ff;font-size:10px;color:#727c8f}.phoneStat b{color:#4d43a6}.phoneNav{display:flex;justify-content:space-around;border-top:1px solid #edf0f5;margin-top:18px;padding-top:12px;color:#6453c6}.phoneNav span{font-size:15px;text-align:center}.phoneNav small{display:block;font-size:8px;color:#778196;margin-top:3px}@media(max-width:850px){.chatbotCard{grid-template-columns:1fr}.appPreviewGrid{grid-template-columns:1fr}.appPreviewCard{max-width:560px;width:100%;margin-inline:auto}}@media(max-width:1000px){.subscriptionPlanGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:640px){.subscriptionPlanGrid{grid-template-columns:1fr!important}.subscriptionPlanCard{padding:26px 22px!important}}`}</style>

    </main>);

}

