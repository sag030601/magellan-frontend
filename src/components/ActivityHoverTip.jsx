import { useState } from "react";
import { apiFetch } from "../lib/api";

function fmtWhen(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Hover tooltip — loads last activity for a candidate or resource.
 */
export default function ActivityHoverTip({
  candidateId,
  resourceType,
  resourceId,
  children,
  className = "",
  fallbackLog = null,
}) {
  const [log, setLog] = useState(fallbackLog);
  const [loaded, setLoaded] = useState(Boolean(fallbackLog));

  const load = async () => {
    if (loaded && log) return;
    if (fallbackLog) {
      setLog(fallbackLog);
      setLoaded(true);
      return;
    }
    const params = new URLSearchParams();
    if (candidateId) params.set("candidate_id", String(candidateId));
    if (resourceType) params.set("resource_type", resourceType);
    if (resourceId != null && resourceId !== "") params.set("resource_id", String(resourceId));
    if ([...params.keys()].length === 0) return;
    try {
      const res = await apiFetch(`/api/activity-logs/last?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLog(data.log || null);
      }
    } catch {
      setLog(null);
    } finally {
      setLoaded(true);
    }
  };

  const display = log || fallbackLog;

  return (
    <span
      className={`activity-hover-tip ${className}`.trim()}
      onMouseEnter={load}
      onFocus={load}
      tabIndex={0}
    >
      {children}
      {display && (
        <span className="activity-hover-tip-popover" role="tooltip">
          <span className="activity-hover-tip-popover-title">Last action</span>
          <span className="activity-hover-tip-popover-summary">{display.summary}</span>
          <span className="activity-hover-tip-popover-meta">
            {display.user_name || "Unknown user"} · {fmtWhen(display.created_at)}
          </span>
        </span>
      )}
    </span>
  );
}
