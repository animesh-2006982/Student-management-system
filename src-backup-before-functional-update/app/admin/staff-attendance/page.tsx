import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [

];

export default function Page() {
  return (
    <AdminModulePage
      title="Staff Attendance"
      description="Track staff attendance, absences and working days."
      icon="♙"
      addLabel="Mark Attendance"
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
