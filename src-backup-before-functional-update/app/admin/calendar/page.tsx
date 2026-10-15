import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [
  { id: "EV-001", title: "Parent Meeting", subtitle: "Main Campus", status: "Scheduled", meta: "18 Oct" }
];

export default function Page() {
  return (
    <AdminModulePage
      title="Calendar"
      description="Manage institute events, holidays, meetings and activities."
      icon="□"
      addLabel="Add Event"
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
