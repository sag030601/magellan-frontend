import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "../lib/api";

const PATH_MAP = {
  "/admin/country": { key: "country", title: "Country" },
  "/admin/state": { key: "state", title: "State" },
  "/admin/city": { key: "city", title: "City" },
  "/admin/availability-status": { key: "availability-status", title: "Availability Status" },
  "/admin/seafarers-document-type": { key: "seafarers-document-type", title: "Seafarers Document Type" },
  "/admin/pre-medical-document-type": { key: "pre-medical-document-type", title: "Pre-Medical Document Type" },
  "/admin/travel-document-type": { key: "travel-document-type", title: "Travel Document Type" },
  "/admin/signoff-document-type": { key: "signoff-document-type", title: "Signoff Document Type" },
  "/admin/global-lookups": { key: "global-lookups", title: "Global Lookups" },
};

export default function MasterData() {
  const location = useLocation();
  const page = useMemo(() => PATH_MAP[location.pathname] || { key: "global-lookups", title: "Master Data" }, [location.pathname]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/master-data/${page.key}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setPageNo(1);
    } catch (e) {
      setRows([]);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setName("");
    setType("");
    setEditing(null);
    load();
  }, [page.key]);

  const onSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = { name: name.trim() };
      if (page.key === "global-lookups") payload.type = type.trim();
      const path = editing ? `/api/master-data/${page.key}/${editing.id}` : `/api/master-data/${page.key}`;
      const method = editing ? "PUT" : "POST";
      const res = await apiFetch(path, { method, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      setName("");
      setType("");
      setEditing(null);
      await load();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setEditing(row);
    setName(String(row.name ?? ""));
    setType(String(row.type ?? ""));
  };

  const onDelete = async (row) => {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    try {
      const res = await apiFetch(`/api/master-data/${page.key}/${row.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(pageNo, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedRows = rows.slice(start, start + pageSize);

  return (
    <div
      className="space-y-4 max-w-[100%]"
      style={{
        overflowX: "hidden",
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        className="rounded-xl overflow-hidden flex flex-col flex-1 min-h-0"
        style={{
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-sm)",
          border: "1px solid var(--border-primary)",
        }}
      >
        <div
          className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b"
          style={{ borderColor: "var(--border-primary)", background: "linear-gradient(to right, var(--bg-secondary), var(--bg-card))" }}
        >
          <div>
            <h1 className="text-xl font-bold tracking-tight m-0" style={{ color: "var(--text-primary)" }}>{page.title}</h1>
            <p className="text-xs m-0 mt-1" style={{ color: "var(--text-tertiary)" }}>Manage master data entries</p>
          </div>
        </div>

        <form
          className="px-4 py-3 border-b d-flex gap-2 align-items-center flex-wrap"
          style={{ borderColor: "var(--border-primary)", background: "var(--bg-card)" }}
          onSubmit={onSave}
        >
          <input className="form-control" style={{ flex: "1 1 240px", minWidth: 0 }} placeholder={`Enter ${page.title} name`} value={name} onChange={(e) => setName(e.target.value)} />
          {page.key === "global-lookups" && (
            <input className="form-control" style={{ flex: "1 1 220px", minWidth: 0 }} placeholder="Type (optional)" value={type} onChange={(e) => setType(e.target.value)} />
          )}
          <button className="btn btn-primary" type="submit" disabled={saving || !name.trim()}>
            {saving ? "Saving..." : editing ? "Update" : "Add"}
          </button>
          {editing && (
            <button className="btn btn-secondary" type="button" onClick={() => { setEditing(null); setName(""); setType(""); }}>
              Cancel
            </button>
          )}
        </form>

        {error && (
          <div className="mx-4 my-2 rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <div
          className="d-flex align-items-center justify-content-between px-4 py-2 border-b"
          style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{total} records</span>
          <select className="form-control" style={{ width: 100 }} value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPageNo(1); }}>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>

        <div className="table-responsive flex-1 min-h-0" style={{ overflowY: "auto", overflowX: "hidden" }}>
          {loading ? (
            <div className="p-6 text-sm" style={{ color: "var(--text-tertiary)" }}>Loading…</div>
          ) : (
            <table className="table w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Name</th>
                  {page.key === "global-lookups" && (
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Type</th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right users-actions-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={page.key === "global-lookups" ? 4 : 3} className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                      No records found
                    </td>
                  </tr>
                ) : pagedRows.map((row) => (
                  <tr key={row.id} className="border-b" style={{ borderColor: "var(--border-primary)" }}>
                    <td className="px-4 py-3 text-sm cell-nowrap" style={{ color: "var(--text-primary)" }}>{row.id}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{row.name ?? "—"}</td>
                    {page.key === "global-lookups" && (
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{row.type ?? "—"}</td>
                    )}
                    <td className="px-4 py-3 text-sm text-right users-actions-cell">
                      <div className="action-icons-toolbar users-actions-toolbar">
                        <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => onEdit(row)}>
                          <i className="fas fa-pen" />
                        </button>
                        <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => onDelete(row)}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div
          className="d-flex align-items-center justify-content-end gap-2 px-4 py-2 border-t"
          style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}
        >
          <button type="button" className="btn btn-secondary btn-sm" disabled={currentPage <= 1} onClick={() => setPageNo((p) => Math.max(1, p - 1))}>Prev</button>
          <span className="text-xs cell-nowrap" style={{ color: "var(--text-secondary)" }}>{currentPage} / {totalPages}</span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={currentPage >= totalPages} onClick={() => setPageNo((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
}
