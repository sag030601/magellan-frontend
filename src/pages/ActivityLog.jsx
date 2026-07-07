import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

function fmtWhen(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

const ACTION_BADGE = {
  create: "status-badge--ok",
  upload: "status-badge--ok",
  update: "status-badge--warn",
  delete: "status-badge--danger",
  login: "status-badge--neutral",
};

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    q: "",
    action: "",
    resource_type: "",
    candidate_id: "",
    from: "",
    to: "",
  });
  const [filterOpts, setFilterOpts] = useState({ actions: [], resourceTypes: [] });

  const loadFilters = useCallback(async () => {
    try {
      const res = await apiFetch("/api/activity-logs/filters");
      if (res.ok) setFilterOpts(await res.json());
    } catch {
      /* optional */
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      Object.entries(filters).forEach(([k, v]) => {
        if (v != null && String(v).trim() !== "") params.set(k, String(v).trim());
      });
      const res = await apiFetch(`/api/activity-logs?${params}`);
      if (!res.ok) throw new Error("Failed to load activity log");
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message || "Failed to load activity log");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { loadFilters(); }, [loadFilters]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const fieldCls = "h-9 rounded-lg border px-3 text-sm w-full";
  const fieldStyle = { borderColor: "var(--border-primary)", background: "var(--bg-input)", color: "var(--text-primary)" };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="rounded-lg overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-md)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}>
          <h1 className="text-lg font-bold m-0" style={{ color: "var(--text-primary)" }}>Activity Log</h1>
          <p className="text-sm mt-1 mb-0" style={{ color: "var(--text-tertiary)" }}>
            Enterprise audit trail — user actions across candidates, documents, crew sign-on/off, vessels, and more.
          </p>
        </div>

        <div className="p-5 border-b" style={{ borderColor: "var(--border-primary)" }}>
          <form
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3"
            onSubmit={(e) => { e.preventDefault(); setPage(1); loadLogs(); }}
          >
            <input className={fieldCls} style={fieldStyle} name="q" value={filters.q} onChange={onFilterChange} placeholder="Search summary, user, path…" />
            <select className={fieldCls} style={fieldStyle} name="action" value={filters.action} onChange={onFilterChange}>
              <option value="">All actions</option>
              {filterOpts.actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className={fieldCls} style={fieldStyle} name="resource_type" value={filters.resource_type} onChange={onFilterChange}>
              <option value="">All resources</option>
              {filterOpts.resourceTypes.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
            </select>
            <input className={fieldCls} style={fieldStyle} name="candidate_id" value={filters.candidate_id} onChange={onFilterChange} placeholder="Crew ID" />
            <input className={fieldCls} style={fieldStyle} type="date" name="from" value={filters.from} onChange={onFilterChange} />
            <input className={fieldCls} style={fieldStyle} type="date" name="to" value={filters.to} onChange={onFilterChange} />
            <div className="xl:col-span-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setFilters({ q: "", action: "", resource_type: "", candidate_id: "", from: "", to: "" }); setPage(1); }}
              >
                Clear
              </button>
              <button type="submit" className="btn btn-primary btn-sm">Apply</button>
            </div>
          </form>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--bg-secondary)" }}>
            {error}
          </div>
        )}

        <div className="p-5 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>Loading activity log…</div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>No activity records found.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm min-w-[960px]">
              <thead>
                <tr className="table-brand-header">
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Summary</th>
                  <th className="px-3 py-2">Crew</th>
                  <th className="px-3 py-2">Resource</th>
                  <th className="px-3 py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b" style={{ borderColor: "var(--border-primary)" }}>
                    <td className="px-3 py-2 cell-nowrap" style={{ color: "var(--text-secondary)" }}>{fmtWhen(log.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium" style={{ color: "var(--text-primary)" }}>{log.user_name || "—"}</div>
                      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{log.user_email || ""}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`status-badge-pill ${ACTION_BADGE[log.action] || "status-badge--neutral"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--text-primary)" }}>{log.summary}</td>
                    <td className="px-3 py-2">
                      {log.candidate_id ? (
                        <Link to={`/admin/candidates/${log.candidate_id}`} className="hover:underline font-medium" style={{ color: "var(--accent)" }}>
                          {log.candidate_id}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {log.resource_type?.replace(/_/g, " ")}
                      {log.resource_id ? ` #${log.resource_id}` : ""}
                    </td>
                    <td className="px-3 py-2 text-xs cell-nowrap" style={{ color: "var(--text-tertiary)" }}>{log.ip_address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="px-5 py-3 flex items-center justify-between border-t text-sm" style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
            <span>{total} record{total === 1 ? "" : "s"}</span>
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
