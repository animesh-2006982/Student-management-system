"use client";

import Link from "next/link";
import { useCallback } from "react";

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

function goToLogin() {
  window.location.href = "/login";
}

function ModuleIcon({ icon }: { icon: string }) {
  return <div className="moduleVisual">{icon}</div>;
}

export default function MainPage() {
  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  return (
    <main className="studentFlowPage">
      <nav className="siteNav">
        <Link href="/" className="brand">
          <span className="brandMark">S</span>
          <span>StudentFlow</span>
        </Link>

        <div className="navLinks">
          <button onClick={() => scrollTo("features")}>Features</button>
          <button onClick={() => scrollTo("workflow")}>Workflow</button>
          <button onClick={() => scrollTo("about")}>About</button>
        </div>

        <div className="navActions">
          <button className="navLogin" onClick={goToLogin}>
            Login
          </button>
          <Link href="/signup" className="navSignup">
            Get started
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="heroGlow heroGlowOne" />
        <div className="heroGlow heroGlowTwo" />

        <div className="heroInner">
          <div className="heroCopy">
            <div className="eyebrow">
              <span className="eyebrowDot" />
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
              <Link href="/admin" className="buttonPrimary">
                Open Dashboard <span>→</span>
              </Link>
              <Link href="/signup" className="buttonSecondary">
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
                <i style={{ height: "42%" }} />
                <i style={{ height: "58%" }} />
                <i style={{ height: "50%" }} />
                <i style={{ height: "72%" }} />
                <i style={{ height: "64%" }} />
                <i style={{ height: "84%" }} />
                <i style={{ height: "76%" }} />
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
          {modules.map((item) => (
            <article className={`moduleCard ${item.accent}`} key={item.number}>
              <div className="moduleCardTop">
                <span>{item.number}</span>
                <span className="moduleStatus"><i /> Active</span>
              </div>

              <ModuleIcon icon={item.icon} />

              <div className="moduleCardBody">
                <span className="moduleCategory">{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="moduleTag">{item.tag}</span>
              </div>
            </article>
          ))}
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

            {steps.map((step, index) => (
              <div className="workflowRow" key={step.number}>
                <span className="workflowNumber">{step.number}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
                <span className="workflowArrow">{index === steps.length - 1 ? "✓" : "→"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

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
          {steps.map((step, index) => (
            <div className="processCard" key={step.number}>
              <span className="processNumber">{step.number}</span>
              <div className="processIcon">{index + 1}</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
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

      <section className="ctaSection">
        <div className="ctaGlow" />
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
    </main>
  );
}
