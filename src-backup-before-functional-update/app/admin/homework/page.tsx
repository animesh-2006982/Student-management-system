import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [
  { id: "HW-001", title: "Mathematics Practice", subtitle: "Batch A", status: "Active", meta: "Due 12 Oct" }
];

export default function Page() {
  return (
    <AdminModulePage
      title="Homework"
      description="Create, assign and track homework for batches and students."
      icon="▤"
      addLabel="Add Homework"
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
