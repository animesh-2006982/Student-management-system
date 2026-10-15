import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [
  { id: "AS-001", title: "Science Project", subtitle: "Batch B", status: "Active", meta: "20 Oct" }
];

export default function Page() {
  return (
    <AdminModulePage
      title="Assignments"
      description="Create assignments, deadlines and submission tracking."
      icon="✎"
      addLabel="Add Assignment"
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
