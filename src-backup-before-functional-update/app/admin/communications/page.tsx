import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [
  { id: "MSG-001", title: "Fee Reminder", subtitle: "Parents", status: "Draft", meta: "124 recipients" }
];

export default function Page() {
  return (
    <AdminModulePage
      title="Communications"
      description="Manage messages and communication with students, parents and staff."
      icon="✉"
      addLabel="New Message"
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
