import { getRecordAudit } from "../lib/auditDisplay";

/** Hover popover for created/updated audit on any record row. */
export default function RecordAuditPopover({ record, className = "" }) {
  const audit = getRecordAudit(record);
  const hasData = [audit.createdAt, audit.createdBy, audit.updatedAt, audit.updatedBy].some((v) => v !== "—");
  if (!hasData) return null;

  return (
    <div className={`record-audit-popover-wrap ${className}`.trim()} role="presentation">
      <div className="record-audit-popover" role="tooltip">
        <dl className="record-audit-popover-dl">
          <dt>Created</dt>
          <dd>{audit.createdAt}</dd>
          <dt>By</dt>
          <dd>{audit.createdBy}</dd>
          <dt>Updated</dt>
          <dd>{audit.updatedAt}</dd>
          <dt>By</dt>
          <dd>{audit.updatedBy}</dd>
        </dl>
      </div>
    </div>
  );
}
