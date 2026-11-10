import { PageHeader } from "../../components/common/UI.jsx";
import { ManagerAttendanceReport } from "../../components/common/ManagerAttendanceReport.jsx";

export function ReceptionistAttendancePage() {
  return <><PageHeader title="Quản lý điểm danh" subtitle="Tra cứu và xóa bản ghi điểm danh cần điều chỉnh." /><ManagerAttendanceReport /></>;
}
