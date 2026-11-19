const STATUS_TONES = {
  CONFIRMED: 'green', SUCCESS: 'green', PRESENT: 'green', COMPLETED: 'green', RESOLVED: 'green', APPROVED: 'green', ACTIVE: 'green',
  CANCELLED: 'red', FAILED: 'red', ABSENT: 'red', INACTIVE: 'red', EXPIRED: 'red',
  PENDING_PAYMENT: 'amber', PENDING: 'amber', DRAFT: 'amber', IN_PROGRESS: 'amber', SCHEDULED: 'blue', NOT_STARTED: 'blue',
};

/** Design status badge with a dot. tone: green | red | amber | blue, or derived from `status`. */
export default function Badge({ children, status, tone }) {
  return (
    <span className={`badge ${tone || STATUS_TONES[status] || 'blue'}`}>
      <i />
      {children}
    </span>
  );
}
