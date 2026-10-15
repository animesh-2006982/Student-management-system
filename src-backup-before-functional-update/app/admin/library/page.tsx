import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [
  { id: "BK-001", title: "Computer Fundamentals", subtitle: "Library", status: "Available", meta: "12 copies" }
];

export default function Page() {
  return (
    <AdminModulePage
      title="Library"
      description="Manage books, issues, returns and library records."
      icon="▥"
      addLabel="Add Book"
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
