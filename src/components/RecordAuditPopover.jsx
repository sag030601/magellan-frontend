import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getRecordAudit } from "../lib/auditDisplay";

const GAP = 8;
const TOOLTIP_WIDTH = 240;

/**
 * Hover tooltip for created/updated audit. Rendered in a portal so table
 * scroll containers can't clip it. Parent should use `.action-audit-hover`.
 */
export default function RecordAuditPopover({ record }) {
  const anchorRef = useRef(null);
  const tipRef = useRef(null);
  const [pos, setPos] = useState(null);

  const audit = getRecordAudit(record);
  const hasData = [audit.createdAt, audit.createdBy, audit.updatedAt, audit.updatedBy].some((v) => v !== "—");

  const place = useCallback(() => {
    const host = anchorRef.current?.parentElement;
    if (!host) return;
    const r = host.getBoundingClientRect();
    const tipHeight = tipRef.current?.offsetHeight || 96;
    const above = r.top - GAP - tipHeight >= 8;
    const half = TOOLTIP_WIDTH / 2;
    const left = Math.min(
      Math.max(r.left + r.width / 2, half + 8),
      window.innerWidth - half - 8,
    );
    setPos({
      left,
      top: above ? r.top - GAP : r.bottom + GAP,
      placement: above ? "top" : "bottom",
    });
  }, []);

  useEffect(() => {
    const host = anchorRef.current?.parentElement;
    if (!host || !hasData) return undefined;

    const show = () => place();
    const hide = () => setPos(null);

    host.addEventListener("mouseenter", show);
    host.addEventListener("mouseleave", hide);
    host.addEventListener("focusin", show);
    host.addEventListener("focusout", hide);
    return () => {
      host.removeEventListener("mouseenter", show);
      host.removeEventListener("mouseleave", hide);
      host.removeEventListener("focusin", show);
      host.removeEventListener("focusout", hide);
    };
  }, [hasData, place]);

  useEffect(() => {
    if (!pos) return undefined;
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [pos, place]);

  if (!hasData) return null;

  return (
    <>
      <span ref={anchorRef} className="record-audit-anchor" aria-hidden="true" />
      {pos
        ? createPortal(
          <div
            ref={tipRef}
            className={`record-audit-tooltip is-${pos.placement}`}
            role="tooltip"
            style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
          >
            <div className="record-audit-tooltip-title">Audit</div>
            <div className="record-audit-tooltip-row">
              <span className="record-audit-tooltip-label">Created</span>
              <span className="record-audit-tooltip-value">
                <span className="record-audit-tooltip-when">{audit.createdAt}</span>
                <span className="record-audit-tooltip-by">{audit.createdBy}</span>
              </span>
            </div>
            <div className="record-audit-tooltip-row">
              <span className="record-audit-tooltip-label">Updated</span>
              <span className="record-audit-tooltip-value">
                <span className="record-audit-tooltip-when">{audit.updatedAt}</span>
                <span className="record-audit-tooltip-by">{audit.updatedBy}</span>
              </span>
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
