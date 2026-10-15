"use client";



import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import {

  useCallback,

  useEffect,

  useMemo,

  useState,

} from "react";

import { createClient } from "@/lib/supabase/client";



const groups: {

  title: string;

  items: [string, string, string][];

}[] = [

  {

    title: "MAIN MENU",

    items: [["Dashboard", "/admin", "⌂"]],

  },

  {

    title: "ACADEMIC",

    items: [

      ["Batches", "/admin/batches", "▦"],

      ["Students", "/admin/students", "♙"],

      ["Families", "/admin/families", "⌂"],

      ["Attendance", "/admin/attendance", "✓"],

    ],

  },

  {

    title: "FINANCE",

    items: [

      ["Tuition Fees", "/admin/tuition-fees", "₹"],

      ["Income / Expense", "/admin/income-expense", "↔"],

    ],

  },

  {

    title: "MORE",

    items: [

      ["Staff Manager", "/admin/staff", "♟"],

      ["Staff Attendance", "/admin/staff-attendance", "◷"],

      ["Manage Exams", "/admin/exams", "▣"],

      ["Performance", "/admin/performance", "★"],

      ["Enquiry Manager", "/admin/enquiries", "?"],

      ["Transport", "/admin/transport", "▰"],

      ["Study Material", "/admin/study-material", "▥"],

      ["Online Exams", "/admin/online-exams", "◫"],

      ["Homework", "/admin/homework", "✎"],

      ["Leave Manager", "/admin/leave-manager", "◷"],

    ],

  },

  {

    title: "TOOLS",

    items: [

      ["Reports", "/admin/reports", "▤"],

      ["Library", "/admin/library", "▥"],

      ["Inventory", "/admin/inventory", "▣"],

      ["Communications", "/admin/communications", "✉"],

      ["Calendar", "/admin/calendar", "□"],

      ["Timetable", "/admin/timetable", "▦"],

      ["ID Cards", "/admin/id-cards", "▣"],

    ],

  },

  {

    title: "SYSTEM",

    items: [

      ["Academy Profile", "/admin/academy-profile", "◉"],

      ["Settings", "/admin/settings", "⚙"],

      ["Users", "/admin/users", "◎"],

      ["Roles & Permissions", "/admin/roles-permissions", "◇"],

      ["Audit Logs", "/admin/audit-logs", "⌁"],

    ],

  },

];



const THEME_KEY = "studentflow:theme";



export default function AdminShell({

  children,

}: {

  children: React.ReactNode;

}) {

  const pathname = usePathname();

  const router = useRouter();



  const [open, setOpen] = useState(false);

  const [notifications, setNotifications] = useState(false);

  const [profile, setProfile] = useState(false);

  const [search, setSearch] = useState("");

  const [count, setCount] = useState(0);

  const [darkMode, setDarkMode] = useState(false);



  const title = useMemo(() => {

    const item = groups

      .flatMap((group) => group.items)

      .find((item) => item[1] === pathname);



    return item?.[0] || "Dashboard";

  }, [pathname]);



  // Restore the saved theme and apply it to the whole document.

  useEffect(() => {

    try {

      const savedTheme = window.localStorage.getItem(THEME_KEY);

      const enabled = savedTheme === "dark";



      setDarkMode(enabled);

      document.documentElement.classList.toggle(

        "dark-more",

        enabled

      );

    } catch (error) {

      console.error("Unable to restore theme:", error);

    }

  }, []);



  const toggleTheme = useCallback(() => {

    setDarkMode((previous) => {

      const next = !previous;



      document.documentElement.classList.toggle(

        "dark-more",

        next

      );



      try {

        window.localStorage.setItem(

          THEME_KEY,

          next ? "dark" : "light"

        );

      } catch (error) {

        console.error("Unable to save theme:", error);

      }



      return next;

    });

  }, []);



  // Read the institute's notification count from Supabase.

  const refreshNotificationCount = useCallback(async () => {

    const supabase = createClient();



    try {

      const { data: authData, error: authError } =

        await supabase.auth.getUser();



      if (authError) throw authError;



      if (!authData.user) {

        setCount(0);

        return;

      }



      const { data: profileData, error: profileError } =

        await supabase

          .from("profiles")

          .select("institute_id")

          .eq("id", authData.user.id)

          .single();



      if (profileError) throw profileError;



      if (!profileData?.institute_id) {

        setCount(0);

        return;

      }



      const { count: total, error: countError } =

        await supabase

          .from("notifications")

          .select("id", {

            count: "exact",

            head: true,

          })

          .eq("institute_id", profileData.institute_id);



      if (countError) throw countError;



      setCount(total ?? 0);

    } catch (error) {

      console.error(

        "Unable to load notification count:",

        error

      );

      setCount(0);

    }

  }, []);



  useEffect(() => {

    let cancelled = false;

    let channel: ReturnType<

      ReturnType<typeof createClient>["channel"]

    > | null = null;



    async function initializeNotifications() {

      const supabase = createClient();



      try {

        const { data: authData, error: authError } =

          await supabase.auth.getUser();



        if (authError) throw authError;



        if (!authData.user) {

          if (!cancelled) setCount(0);

          return;

        }



        const { data: profileData, error: profileError } =

          await supabase

            .from("profiles")

            .select("institute_id")

            .eq("id", authData.user.id)

            .single();



        if (profileError) throw profileError;



        if (!profileData?.institute_id) {

          if (!cancelled) setCount(0);

          return;

        }



        const instituteId = profileData.institute_id;



        const updateCount = async () => {

          const { count: total, error: countError } =

            await supabase

              .from("notifications")

              .select("id", {

                count: "exact",

                head: true,

              })

              .eq("institute_id", instituteId);



          if (countError) {

            console.error(

              "Notification count query failed:",

              countError

            );

            return;

          }



          if (!cancelled) setCount(total ?? 0);

        };



        await updateCount();



        if (cancelled) return;



        channel = supabase

          .channel(`notifications-${instituteId}`)

          .on(

            "postgres_changes",

            {

              event: "*",

              schema: "public",

              table: "notifications",

              filter: `institute_id=eq.${instituteId}`,

            },

            () => {

              void updateCount();

            }

          )

          .subscribe();

      } catch (error) {

        console.error(

          "Notification initialization failed:",

          error

        );



        if (!cancelled) setCount(0);

      }

    }



    void initializeNotifications();



    const onFocus = () => {

      void refreshNotificationCount();

    };



    const onVisibilityChange = () => {

      if (document.visibilityState === "visible") {

        void refreshNotificationCount();

      }

    };



    window.addEventListener("focus", onFocus);

    document.addEventListener(

      "visibilitychange",

      onVisibilityChange

    );



    return () => {

      cancelled = true;



      window.removeEventListener("focus", onFocus);

      document.removeEventListener(

        "visibilitychange",

        onVisibilityChange

      );



      if (channel) {

        void createClient().removeChannel(channel);

      }

    };

  }, [refreshNotificationCount]);



  const doSearch = (

    event: React.FormEvent<HTMLFormElement>

  ) => {

    event.preventDefault();



    const query = search.trim();



    if (query) {

      router.push(

        `/admin/students?search=${encodeURIComponent(query)}`

      );

      setOpen(false);

    }

  };



  return (

    <div className="admin-shell">

      {open && (

        <button

          type="button"

          className="mobile-overlay"

          aria-label="Close menu"

          onClick={() => setOpen(false)}

        />

      )}



      {/* SIDEBAR */}

      <aside

        className={`admin-sidebar ${open ? "open" : ""}`}

      >

        <div className="brand-row">

          <div className="brand-logo">S</div>



          <div>

            <strong>STUDIFY</strong>

            <span>Student Management</span>

          </div>



          <button

            type="button"

            className="close-mobile"

            onClick={() => setOpen(false)}

            aria-label="Close menu"

          >

            ×

          </button>

        </div>



        <div className="institution-card">

          <div className="institution-avatar">A</div>



          <div>

            <strong>Your Institution</strong>

            <span>Administrator</span>

          </div>

        </div>



        <nav className="sidebar-nav">

          {groups.map((group) => (

            <div className="nav-group" key={group.title}>

              <div className="nav-group-title">

                {group.title}

              </div>



              {group.items.map(([label, href, icon]) => {

                const active =

                  href === "/admin"

                    ? pathname === "/admin"

                    : pathname === href ||

                      pathname.startsWith(`${href}/`);



                return (

                  <Link

                    key={href}

                    href={href}

                    onClick={() => setOpen(false)}

                    className={`nav-item ${

                      active ? "active" : ""

                    }`}

                  >

                    <span>{icon}</span>

                    {label}

                  </Link>

                );

              })}

            </div>

          ))}

        </nav>



        <div className="sidebar-status">

          <i />

          <div>

            <strong>System Active</strong>

            <span>All services running</span>

          </div>

        </div>

      </aside>



      {/* MAIN CONTENT */}

      <div className="admin-main">

        <header className="admin-header">

          <div className="header-left">

            <button

              type="button"

              className="menu-button"

              onClick={() => setOpen(true)}

              aria-label="Open menu"

            >

              <span />

              <span />

              <span />

            </button>



            <div>

              <div className="crumb">

                Dashboard{" "}

                {pathname !== "/admin" && (

                  <> / <b>{title}</b></>

                )}

              </div>



              <h1>{title}</h1>

            </div>

          </div>



          <div className="header-right">

            {/* GLOBAL SEARCH */}

            <form

              className="global-search"

              onSubmit={doSearch}

            >

              <input

                value={search}

                onChange={(event) =>

                  setSearch(event.target.value)

                }

                placeholder="Search students, admission no..."

                aria-label="Search students"

              />



              <button type="submit" aria-label="Search">

                ⌕

              </button>

            </form>



            {/* WORKING THEME TOGGLE */}

            <button

              type="button"

              className="header-icon theme-toggle"

              onClick={toggleTheme}

              aria-label={

                darkMode

                  ? "Switch to light mode"

                  : "Switch to dark mode"

              }

              title={

                darkMode

                  ? "Switch to light mode"

                  : "Switch to dark mode"

              }

              aria-pressed={darkMode}

            >

              {darkMode ? (

                <svg

                  width="21"

                  height="21"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke="currentColor"

                  strokeWidth="1.8"

                  strokeLinecap="round"

                  strokeLinejoin="round"

                  aria-hidden="true"

                >

                  <circle cx="12" cy="12" r="4" />

                  <path d="M12 2v2" />

                  <path d="M12 20v2" />

                  <path d="m4.93 4.93 1.42 1.42" />

                  <path d="m17.65 17.65 1.42 1.42" />

                  <path d="M2 12h2" />

                  <path d="M20 12h2" />

                  <path d="m6.35 17.65-1.42 1.42" />

                  <path d="m19.07 4.93-1.42 1.42" />

                </svg>

              ) : (

                <svg

                  width="21"

                  height="21"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke="currentColor"

                  strokeWidth="1.8"

                  strokeLinecap="round"

                  strokeLinejoin="round"

                  aria-hidden="true"

                >

                  <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />

                </svg>

              )}

            </button>



            {/* NOTIFICATIONS */}

            <div className="notification-wrap">

              <button

                type="button"

                className="header-icon notification-trigger"

                onClick={() => {

                  setNotifications((value) => !value);

                  setProfile(false);

                }}

                aria-label={`Notifications: ${count} total`}

                aria-expanded={notifications}

                aria-haspopup="true"

              >

                <svg

                  width="22"

                  height="22"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke="currentColor"

                  strokeWidth="1.8"

                  strokeLinecap="round"

                  strokeLinejoin="round"

                  aria-hidden="true"

                >

                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

                  <path d="M10 21h4" />

                </svg>



                {count > 0 && (

                  <span className="notification-count">

                    {count > 99 ? "99+" : count}

                  </span>

                )}

              </button>



              {notifications && (

                <div className="dropdown notification-box">

                  <strong>Notifications</strong>



                  <p>

                    {count === 0

                      ? "No notifications found."

                      : `${count} notification${

                          count === 1 ? "" : "s"

                        } in your institute.`}

                  </p>



                  <button

                    type="button"

                    onClick={() => {

                      setNotifications(false);

                      router.push("/admin/notifications");

                    }}

                  >

                    Open notifications

                  </button>



                  <button

                    type="button"

                    onClick={() => {

                      void refreshNotificationCount();

                    }}

                  >

                    ↻ Refresh count

                  </button>

                </div>

              )}

            </div>



            {/* PROFILE MENU */}

            <div className="profile-wrap">

              <button

                type="button"

                className="profile-btn"

                aria-haspopup="menu"

                aria-expanded={profile}

                onClick={() => {

                  setProfile((value) => !value);

                  setNotifications(false);

                }}

              >

                <div className="profile-avatar">A</div>



                <div>

                  <strong>Admin</strong>

                  <span>Administrator</span>

                </div>



                <em>⌄</em>

              </button>



              {profile && (

                <div

                  className="dropdown profile-box"

                  role="menu"

                >

                  <button

                    type="button"

                    role="menuitem"

                    onClick={() => {

                      setProfile(false);

                      router.push("/admin/my-profile");

                    }}

                  >

                    ◎ My Profile

                  </button>



                  <button

                    type="button"

                    role="menuitem"

                    onClick={() => {

                      setProfile(false);

                      router.push("/admin/settings");

                    }}

                  >

                    ⚙ Settings

                  </button>



                  <button

                    type="button"

                    role="menuitem"

                    onClick={async () => {

                      setProfile(false);



                      const supabase = createClient();

                      const { error } =

                        await supabase.auth.signOut();



                      if (error) {

                        console.error(

                          "Logout failed:",

                          error.message

                        );



                        window.alert(

                          "Logout failed. Please try again."

                        );

                        return;

                      }



                      window.localStorage.removeItem(

                        "studentflow:session"

                      );



                      router.replace("/login");

                    }}

                  >

                    ↪ Logout

                  </button>

                </div>

              )}

            </div>

          </div>

        </header>



        <main className="admin-content">

          {children}

        </main>

      </div>

    </div>

  );

}
