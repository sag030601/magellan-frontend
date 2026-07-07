import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { documentHref } from "../lib/documentUrl";
import "./Vessels.css";

/** Column widths for table-layout: fixed; last column reserves space for action icons */
const VESSEL_LIST_COL_WIDTHS = [
  "11%",
  "10%",
  "5.5%",
  "4%",
  "4%",
  "4%",
  "4%",
  "7%",
  "6%",
  "8%",
  "6%",
  "7%",
  "6%",
  "7%",
  "80px",
];

function formatDate(val) {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : new Date(val * 1000);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function cell(val) {
  return val != null && String(val).trim() !== "" ? String(val).toUpperCase() : "—";
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
      className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-90"
      style={{ color: "var(--accent)" }}
    >
      <i className="fas fa-download text-xs" />
      {label}
    </a>
  );
}

function vesselDocPath(vessel, key) {
  if (key === "mlc_certificate") {
    return vessel.mlc_certificate || vessel.mlc_certificate_document || "";
  }
  return vessel[key] || "";
}

const DOC_LABELS = [
  { key: "sea_document", label: "Sea Document" },
  { key: "cba_document", label: "CBA Document" },
  { key: "policy_document", label: "Policy Document" },
  { key: "mlc_certificate", label: "MLC Certificate" },
  { key: "financial_security_document", label: "Financial Security Document" },
  { key: "dmlc_part_1", label: "DMLC Part 1" },
  { key: "dmlc_part_2", label: "DMLC Part 2" },
];

function DocumentsModal({ vessel, onClose }) {
  if (!vessel) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "color-mix(in srgb, var(--text-primary) 55%, transparent)" }} onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden animate-fade-in-up" style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-primary)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}>
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Vessel Documents</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Close"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          <ul className="space-y-3">
            {DOC_LABELS.map(({ key, label }) => {
              const p = vesselDocPath(vessel, key);
              return (
                <li key={key} className="flex items-center justify-between gap-4 py-2 border-b last:border-0" style={{ borderColor: "var(--border-primary)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</span>
                  <span className="flex-shrink-0">
                    {p ? (
                      <DocLink path={p} />
                    ) : (
                      <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>N/A</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Vessels() {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docModalVessel, setDocModalVessel] = useState(null);

  const fetchVessels = async () => {
    try {
      const res = await apiFetch("/api/vessels");
      if (!res.ok) throw new Error("Failed to fetch vessels");
      const data = await res.json();
      setVessels(data.vessels || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setVessels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVessels();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vessel? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/api/vessels/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Delete failed");
      }
      setDocModalVessel(null);
      await fetchVessels();
    } catch (e) {
      window.alert(e?.message || "Delete failed");
    }
  };

  return (
    <div className="vessels-page space-y-6">
      <div className="rounded-none overflow-hidden" style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b" style={{ borderColor: "var(--border-primary)", background: "linear-gradient(to right, var(--bg-secondary), var(--bg-card))" }}>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Vessel List
          </h1>
          <Link
            to="/admin/vessel/form"
            className="btn btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-2 transition-colors"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <i className="fas fa-plus" />
            Add Vessel
          </Link>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3" style={{ color: "var(--text-tertiary)" }}>
                <i className="fas fa-spinner fa-spin text-3xl" style={{ color: "var(--accent)" }} />
                <span className="text-sm font-medium">Loading vessels…</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-none border px-5 py-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--danger)", color: "var(--danger)" }}>
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          )}

          {!loading && !error && vessels.length === 0 && (
            <div className="text-center py-16" style={{ color: "var(--text-tertiary)" }}>
              <i className="fas fa-ship text-5xl mb-4 opacity-40" />
              <p className="font-medium">No vessels found</p>
              <p className="text-sm mt-1">Add a vessel using the button above.</p>
            </div>
          )}

          {!loading && !error && vessels.length > 0 && (
            <div className="vessels-table-wrap border" style={{ borderColor: "var(--border-primary)" }}>
              <table className="vessels-table w-full text-left border-collapse">
                <colgroup>
                  {VESSEL_LIST_COL_WIDTHS.map((w, i) => (
                    <col key={i} style={{ width: w }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b" style={{ background: "linear-gradient(180deg, var(--marine-700), var(--marine-800))", color: "#fff", borderColor: "var(--border-primary)" }}>
                    <th className="font-semibold uppercase tracking-wider">Employer</th>
                    <th className="font-semibold uppercase tracking-wider">Ship Name</th>
                    <th className="font-semibold uppercase tracking-wider">IMO No.</th>
                    <th className="font-semibold uppercase tracking-wider">Official No.</th>
                    <th className="font-semibold uppercase tracking-wider">Call Sign</th>
                    <th className="font-semibold uppercase tracking-wider">Gross Tonnage</th>
                    <th className="font-semibold uppercase tracking-wider">Kilo Watt</th>
                    <th className="font-semibold uppercase tracking-wider">Ship Type</th>
                    <th className="font-semibold uppercase tracking-wider">Ship Flag</th>
                    <th className="font-semibold uppercase tracking-wider">P & I Policy No.</th>
                    <th className="font-semibold uppercase tracking-wider">Policy Validity</th>
                    <th className="font-semibold uppercase tracking-wider">MLC Cert. No.</th>
                    <th className="font-semibold uppercase tracking-wider">MLC Issue Date</th>
                    <th className="font-semibold uppercase tracking-wider">Financial Security Doc No.</th>
                    <th className="font-semibold uppercase tracking-wider text-right vessels-col-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vessels.map((vessel) => (
                    <tr
                      key={vessel.id}
                      className="border-b hover:bg-[var(--bg-hover)] transition-colors"
                      style={{ borderColor: "var(--border-primary)" }}
                    >
                      <td style={{ color: "var(--text-primary)" }} title={vessel.employer != null && String(vessel.employer).trim() !== "" ? String(vessel.employer) : undefined}>
                        {cell(vessel.employer)}
                      </td>
                      <td className="font-medium" style={{ color: "var(--text-primary)" }} title={vessel.ship_name != null && String(vessel.ship_name).trim() !== "" ? String(vessel.ship_name) : undefined}>
                        {cell(vessel.ship_name)}
                      </td>
                      <td style={{ color: "var(--text-primary)" }} title={vessel.imo_number != null && String(vessel.imo_number).trim() !== "" ? String(vessel.imo_number) : undefined}>
                        {cell(vessel.imo_number)}
                      </td>
                      <td style={{ color: "var(--text-primary)" }} title={vessel.official_number != null && String(vessel.official_number).trim() !== "" ? String(vessel.official_number) : undefined}>
                        {cell(vessel.official_number)}
                      </td>
                      <td style={{ color: "var(--text-primary)" }} title={vessel.call_sign != null && String(vessel.call_sign).trim() !== "" ? String(vessel.call_sign) : undefined}>
                        {cell(vessel.call_sign)}
                      </td>
                      <td style={{ color: "var(--text-primary)" }} title={vessel.gross_tonnage != null && String(vessel.gross_tonnage).trim() !== "" ? String(vessel.gross_tonnage) : undefined}>
                        {cell(vessel.gross_tonnage)}
                      </td>
                      <td style={{ color: "var(--text-primary)" }} title={vessel.kilo_watt != null && String(vessel.kilo_watt).trim() !== "" ? String(vessel.kilo_watt) : undefined}>
                        {cell(vessel.kilo_watt)}
                      </td>
                      <td style={{ color: "var(--text-primary)" }} title={vessel.ship_type != null && String(vessel.ship_type).trim() !== "" ? String(vessel.ship_type) : undefined}>
                        {cell(vessel.ship_type)}
                      </td>
                      <td style={{ color: "var(--text-primary)" }} title={vessel.ship_flag != null && String(vessel.ship_flag).trim() !== "" ? String(vessel.ship_flag) : undefined}>
                        {cell(vessel.ship_flag)}
                      </td>
                      <td style={{ color: "var(--text-primary)" }} title={vessel.policy_number != null && String(vessel.policy_number).trim() !== "" ? String(vessel.policy_number) : undefined}>
                        {cell(vessel.policy_number)}
                      </td>
                      <td className="cell-nowrap" style={{ color: "var(--text-primary)" }} title={vessel.policy_validity != null ? String(vessel.policy_validity) : ""}>
                        {formatDate(vessel.policy_validity) === "—" ? cell(vessel.policy_validity) : formatDate(vessel.policy_validity)}
                      </td>
                      <td style={{ color: "var(--text-primary)" }} title={vessel.mlc_certificate_number != null && String(vessel.mlc_certificate_number).trim() !== "" ? String(vessel.mlc_certificate_number) : undefined}>
                        {cell(vessel.mlc_certificate_number)}
                      </td>
                      <td className="cell-nowrap" style={{ color: "var(--text-primary)" }} title={vessel.mlc_issue_date != null ? String(vessel.mlc_issue_date) : ""}>
                        {formatDate(vessel.mlc_issue_date) === "—" ? cell(vessel.mlc_issue_date) : formatDate(vessel.mlc_issue_date)}
                      </td>
                      <td style={{ color: "var(--text-primary)" }} title={vessel.financial_security_document_number != null && String(vessel.financial_security_document_number).trim() !== "" ? String(vessel.financial_security_document_number) : undefined}>
                        {cell(vessel.financial_security_document_number)}
                      </td>
                      <td className="text-right vessels-col-action">
                        <div className="action-icons-toolbar justify-content-end">
                          <Link to={`/admin/vessel/${vessel.id}/edit`} className="action-icon-btn action-icon-edit" title="Edit">
                            <i className="fas fa-pen" />
                          </Link>
                          <button type="button" onClick={() => setDocModalVessel(vessel)} className="action-icon-btn action-icon-docs" title="Documents">
                            <i className="fas fa-file-alt" />
                          </button>
                          <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleDelete(vessel.id)}>
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

      {docModalVessel && (
        <DocumentsModal vessel={docModalVessel} onClose={() => setDocModalVessel(null)} />
      )}
    </div>
  );
}
