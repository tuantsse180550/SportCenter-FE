import { Button, Card, EmptyState, LoadingScreen, PageHeader } from "./UI.jsx";
import { errorText, errorDetailsText } from "../../utils/vietnamese.js";
export function ErrorMessage({ error }) { return error ? <div className="form-error" role="alert">{errorText(error.message, error)}{error.details && <pre>{errorDetailsText(error.details, error)}</pre>}</div> : null; }
export function AsyncPanel({ query, children }) { if (query.loading) return <LoadingScreen />; if (query.error) return <Card><ErrorMessage error={query.error} /><Button onClick={query.reload}>Thử lại</Button></Card>; return children(query.data); }
export function Unavailable({ title, detail }) { return <><PageHeader title={title} /><Card><EmptyState title="Tính năng này hiện chưa được hệ thống hỗ trợ." text={detail} /></Card></>; }
export function MissingProfile() { return <EmptyState title="Cần có hồ sơ thành viên" text="Vui lòng cung cấp mã tài khoản cho lễ tân để tạo hồ sơ thành viên." />; }
