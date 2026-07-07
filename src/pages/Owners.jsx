import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { documentHref } from "../lib/documentUrl";

function formatDate(val) {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : new Date(val * 1000);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatValidityType(val) {
  if (!val) return "—";
  return String(val).replace(/_/g, " ").toUpperCase();
}

function DocLink({ path, label = "Download" }) {
  if (!path) return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
  const url = documentHref(path);
  if (!url) return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:opacity-90 font-medium text-sm inline-flex items-center gap-1"
      style={{ color: "var(--accent)" }}
    >
      <i className="fas fa-download text-xs" />
      {label}
    </a>
  );
}

export default function Owners() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOwners = async () => {
    try {
      const res = await apiFetch("/api/owners");
      if (!res.ok) throw new Error("Failed to fetch owners");
      const data = await res.json();
      setOwners(data.owners || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this owner?")) return;
    try {
      const res = await apiFetch(`/api/owners/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await fetchOwners();
    } catch (err) {
      window.alert(err?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Card header */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Owners / Principal List
          </h1>
          <Link
            to="/admin/owner/form"
            className="btn btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-2 transition-colors"
          >
            <i className="fas fa-plus" />
            Add Owner / Principal
          </Link>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3" style={{ color: "var(--text-tertiary)" }}>
                <i className="fas fa-spinner fa-spin text-3xl" />
                <span>Loading owners…</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border px-4 py-3" style={{ background: "var(--bg-secondary)", borderColor: "var(--danger)", color: "var(--danger)" }}>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && owners.length === 0 && (
            <div className="text-center py-12" style={{ color: "var(--text-tertiary)" }}>
              <i className="fas fa-inbox text-4xl mb-3 opacity-50" />
              <p className="font-medium">No owners found</p>
              <p className="text-sm">Add an owner using the button above.</p>
            </div>
          )}

          {!loading && !error && owners.length > 0 && (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b" style={{ background: "linear-gradient(180deg, var(--marine-700), var(--marine-800))", color: "#fff", borderColor: "var(--border-primary)" }}>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                      Name Of Employer
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                      Registered ship owner address
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden xl:table-cell">
                      Validity Type
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden xl:table-cell">
                      Validity Date
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden xl:table-cell">
                      Agreement Type
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                      Agreement
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                      Manning Agreement
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                      Other
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => (
                    <tr
                      key={owner.id}
                      className="border-b hover:bg-[var(--bg-hover)] transition-colors"
                      style={{ borderColor: "var(--border-primary)" }}
                    >
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {(owner.principle_name || "—").toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                        {owner.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm hidden lg:table-cell max-w-xs truncate" style={{ color: "var(--text-primary)" }} title={owner.registered_ship_owner_address}>
                        {(owner.registered_ship_owner_address || "—").toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                        {owner.contact_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm hidden xl:table-cell" style={{ color: "var(--text-primary)" }}>
                        {formatValidityType(owner.validity_type)}
                      </td>
                      <td className="px-4 py-3 text-sm hidden xl:table-cell cell-nowrap" style={{ color: "var(--text-primary)" }} title={owner.validity_date != null ? String(owner.validity_date) : ""}>
                        {formatDate(owner.validity_date)}
                      </td>
                      <td className="px-4 py-3 text-sm hidden xl:table-cell" style={{ color: "var(--text-primary)" }}>
                        {owner.agreement_type ? String(owner.agreement_type).replace(/_/g, " ") : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <DocLink path={owner.agreement} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <DocLink path={owner.manager_chain_agreement} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <DocLink path={owner.other_document} />
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="action-icons-toolbar justify-content-end">
                          <Link to={`/admin/owner/${owner.id}/edit`} className="action-icon-btn action-icon-edit" title="Edit">
                            <i className="fas fa-pen" />
                          </Link>
                          <button
                            type="button"
                            className="action-icon-btn action-icon-delete"
                            title="Delete"
                            onClick={() => handleDelete(owner.id)}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
