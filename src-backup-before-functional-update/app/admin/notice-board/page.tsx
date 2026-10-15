import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [
  { id: "NT-001", title: "Annual Examination Notice", subtitle: "All Students", status: "Published", meta: "Today" }
];

export default function Page() {
  return (
    <AdminModulePage
      title="Notice Board"
      description="Publish notices and important institute announcements."
      icon="⚑"
      addLabel="Create Notice"
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
