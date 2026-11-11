import { PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { PaymentHistory } from "../../components/common/PaymentHistory.jsx";
import { paymentService } from "../../services/index.js";
import { useQuery } from "../../store/useQuery.js";
export function ReceptionistInvoicesPage() {
  const query = useQuery(() => paymentService.listPayments());
  return <><PageHeader title="Biên nhận học phí" subtitle="Tra cứu giao dịch thành công, in hoặc lưu PDF từ dữ liệu thanh toán đã được máy chủ xác nhận." /><AsyncPanel query={query}>{payments => <PaymentHistory payments={payments.filter(row => row.status === "SUCCESS")} />}</AsyncPanel></>;
}
