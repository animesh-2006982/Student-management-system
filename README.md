# StudentFlow / STUDIFY — Functional Admin Update

This update keeps the existing public StudentFlow landing UI and adds a functional admin workspace based on the supplied GrowCampus reference video and the existing STUDIFY admin structure.

## Reference examined
- Supplied GrowCampus walkthrough video: approximately 2m 46s.
- Visible reference areas include Dashboard, Families, Income/Expense, Staff Manager, Add Staff, Performance, Study Material, Reports, Academy Profile and Settings.
- The reference sidebar also exposes Batches, Students, Attendance, Tuition Fees, Exams, Enquiry Manager, Transport, Online Exams, Homework and Leave Manager.
- Public GrowCampus login page confirms the product positioning around student management, fees/finance, attendance/exams and reports/analytics.

## Functional work added
- Persistent browser data store using localStorage.
- Add / edit / view / duplicate / delete for modules.
- Search, status filters, page-size control, sorting and CSV export.
- Print-friendly reports and module tables.
- Dashboard KPIs calculated from stored records.
- Student, batch, family, attendance, fee, finance, staff, exam, performance, enquiry, transport, study material, online exam, homework, leave, payroll, library, inventory, communication, calendar, timetable, certificate, ID card, users, roles and audit-log modules.
- Academy Profile and Settings persistence.
- Notification center.
- Responsive mobile sidebar.
- Login/signup demo flow so the existing landing-page buttons resolve.

## Important
The uploaded project did not contain a usable Firebase configuration in the current source snapshot, so this build uses a browser-persistent data adapter rather than pretending to have a live Firebase backend. Replace the adapter in `src/lib/store.ts` with the project's real Firebase service once the complete Firebase-enabled source is supplied.

## Run

```bash
npm install
npm run dev
```

Then open:
- `/` — existing StudentFlow landing page
- `/login` — admin sign-in
- `/admin` — functional admin dashboard

The demo login accepts any non-empty email and password and stores a local session.
