import { Badge } from "./UI.jsx";
export function RegistrationBadge({ status }) { return <Badge tone={status === "CONFIRMED" ? "green" : status === "PENDING_PAYMENT" ? "amber" : "slate"}>{status}</Badge>; }
