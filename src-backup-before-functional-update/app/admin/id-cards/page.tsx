import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [
  { id: "ID-001", title: "Student ID Cards", subtitle: "1248 Students", status: "Ready", meta: "Batch-wise" }
];

export default function Page() {
  return (
    <AdminModulePage
      title="ID Cards"
      description="Generate and manage student and staff identity cards."
      icon="▤"
      addLabel="Create ID Card"
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
