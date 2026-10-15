import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [
  { id: "NOT-001", title: "Exam Schedule Update", subtitle: "Students", status: "Published", meta: "Today" }
];

export default function Page() {
  return (
    <AdminModulePage
      title="Notifications"
      description="Manage system and institute notifications."
      icon="◉"
      addLabel="Create Notification"
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
