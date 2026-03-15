import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

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
  if (!path) return <span className="text-gray-400">—</span>;
  const url = path.startsWith("http") ? path : `${apiBase}/uploads/${path.replace(/^public\/?/, "")}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-emerald-600 hover:text-emerald-800 font-medium text-sm inline-flex items-center gap-1"
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

  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const res = await fetch(`${apiBase}/api/owners`);
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
    fetchOwners();
  }, []);

  return (
    <div className="space-y-6">
      {/* Card header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800">
            Owners / Principal List
          </h1>
          <Link
            to="/admin/owner/form"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <i className="fas fa-plus" />
            Add Owner / Principal
          </Link>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <i className="fas fa-spinner fa-spin text-3xl" />
                <span>Loading owners…</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-red-800">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && owners.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-inbox text-4xl mb-3 opacity-50" />
              <p className="font-medium">No owners found</p>
              <p className="text-sm">Add an owner using the button above.</p>
            </div>
          )}

          {!loading && !error && owners.length > 0 && (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name Of Employer
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                      Registered ship owner address
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">
                      Validity Type
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">
                      Validity Date
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">
                      Agreement Type
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Agreement
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Manning Agreement
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Other
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => (
                    <tr
                      key={owner.id}
                      className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {(owner.principle_name || "—").toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {owner.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 hidden lg:table-cell max-w-xs truncate" title={owner.registered_ship_owner_address}>
                        {(owner.registered_ship_owner_address || "—").toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {owner.contact_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 hidden xl:table-cell">
                        {formatValidityType(owner.validity_type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 hidden xl:table-cell">
                        {formatDate(owner.validity_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 hidden xl:table-cell">
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
                        <Link
                          to={`/admin/owner/${owner.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800 font-medium"
                          onClick={() => {
                            if (window.confirm("Delete this owner?")) {
                              // TODO: DELETE /api/owners/:id
                            }
                          }}
                        >
                          Delete
                        </button>
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
