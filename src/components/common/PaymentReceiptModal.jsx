import { Button, InfoGrid, Modal } from "./UI.jsx";
import { AsyncPanel } from "./AsyncPanel.jsx";
import { paymentService } from "../../services/index.js";
import { useQuery } from "../../store/useQuery.js";
import "./receipt.css";
export function PaymentReceiptModal({ paymentId, onClose }) {
  const query = useQuery(() => paymentService.getPaymentReceipt(paymentId), [paymentId]);
  return <Modal title="Biên nhận thanh toán" onClose={onClose}><AsyncPanel query={query}>{receipt => <><div className="payment-print-receipt"><h2>SPORT CENTER</h2><h3>Biên nhận thanh toán</h3><InfoGrid items={receipt.rows.map(row => Array.isArray(row) ? row : [row.label, row.value])} /></div><Button onClick={() => window.print()}>In / lưu biên nhận PDF</Button></>}</AsyncPanel></Modal>;
}
