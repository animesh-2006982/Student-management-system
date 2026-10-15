import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [
  { id: "TT-001", title: "Class 8 - Morning", subtitle: "Mathematics", status: "Active", meta: "09:00 AM" }
];

export default function Page() {
  return (
    <AdminModulePage
      title="Timetable"
      description="Create class schedules and manage daily academic timing."
      icon="▦"
      addLabel="Add Schedule"
      rows={rows}
      stats={[
        { label: "Total", value: "0", tone: "purple" },
        { label: "Active", value: "0", tone: "green" },
        { label: "Pending", value: "0", tone: "orange" },
        { label: "This month", value: "0", tone: "blue" },
      ]}
    />
  );
}
