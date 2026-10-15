import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [
  { id: "LV-001", title: "Student Leave Request", subtitle: "Class 8", status: "Pending", meta: "2 days" }
];

export default function Page() {
  return (
    <AdminModulePage
      title="Leave Manager"
      description="Manage student and staff leave requests and approvals."
      icon="▣"
      addLabel="Add Leave"
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
