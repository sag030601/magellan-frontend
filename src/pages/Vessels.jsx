import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

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
  if (!path) return <span className="text-slate-400">—</span>;
  const url = path.startsWith("http") ? path : `${apiBase}/uploads/${path.replace(/^public\/?/, "")}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-800"
    >
      <i className="fas fa-download text-xs" />
      {label}
    </a>
  );
}

const DOC_LABELS = [
  { key: "sea_document", label: "Sea Document" },
  { key: "cba_document", label: "CBA Document" },
  { key: "policy_document", label: "Policy Document" },
  { key: "financial_security_document", label: "Financial Security Document" },
  { key: "dmlc_part_1", label: "DMLC Part 1" },
  { key: "dmlc_part_2", label: "DMLC Part 2" },
];

function DocumentsModal({ vessel, onClose }) {
  if (!vessel) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <h3 className="text-lg font-semibold text-slate-800">Vessel Documents</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          <ul className="space-y-3">
            {DOC_LABELS.map(({ key, label }) => (
              <li key={key} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className="flex-shrink-0">
                  <DocLink path={vessel[key]} />
                </span>
              </li>
            ))}
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

  useEffect(() => {
    const fetchVessels = async () => {
      try {
        const res = await fetch(`${apiBase}/api/vessels`);
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
    fetchVessels();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Vessel List
          </h1>
          <Link
            to="/admin/vessel/form"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors shadow-sm"
          >
            <i className="fas fa-plus" />
            Add Vessel
          </Link>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <i className="fas fa-spinner fa-spin text-3xl text-indigo-500" />
                <span className="text-sm font-medium">Loading vessels…</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-5 py-4 text-red-800">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          )}

          {!loading && !error && vessels.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <i className="fas fa-ship text-5xl mb-4 opacity-40" />
              <p className="font-medium">No vessels found</p>
              <p className="text-sm mt-1">Add a vessel using the button above.</p>
            </div>
          )}

          {!loading && !error && vessels.length > 0 && (
            <div className="overflow-x-auto -mx-6 sm:mx-0 rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Employer</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Ship Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">IMO No.</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Official No.</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Call Sign</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Gross Tonnage</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Kilo Watt</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Ship Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Ship Flag</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">P & I Policy No.</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Policy Validity</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">MLC Cert. No.</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">MLC Issue Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Financial Security Doc No.</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vessels.map((vessel) => (
                    <tr
                      key={vessel.id}
                      className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-800">{cell(vessel.employer)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{cell(vessel.ship_name)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{cell(vessel.imo_number)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{cell(vessel.official_number)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{cell(vessel.call_sign)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{cell(vessel.gross_tonnage)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{cell(vessel.kilo_watt)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{cell(vessel.ship_type)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{cell(vessel.ship_flag)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{cell(vessel.policy_number)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{cell(vessel.policy_validity)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{cell(vessel.mlc_certificate_number)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(vessel.mlc_issue_date) === "—" ? cell(vessel.mlc_issue_date) : formatDate(vessel.mlc_issue_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{cell(vessel.financial_security_document_number)}</td>
                      <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                        <Link
                          to={`/admin/vessel/${vessel.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium mr-3"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDocModalVessel(vessel)}
                          className="text-slate-600 hover:text-slate-800 font-medium mr-3"
                        >
                          Documents
                        </button>
                        <Link
                          to={`/admin/vessel/delete/${vessel.id}`}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </Link>
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
