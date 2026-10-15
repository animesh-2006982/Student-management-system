import AdminModulePage, {
  ModuleRow,
} from "@/components/admin/AdminModulePage";

import "@/components/admin/admin-module.css";

const rows: ModuleRow[] = [
  { id: "CERT-001", title: "Participation Certificate", subtitle: "Student Records", status: "Ready", meta: "2026" }
];

export default function Page() {
  return (
    <AdminModulePage
      title="Certificates"
      description="Create and manage student certificates and documents."
      icon="◇"
      addLabel="Create Certificate"
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
