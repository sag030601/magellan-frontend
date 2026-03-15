import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function daysRemaining(signOffDue) {
  if (!signOffDue) return "—";
  try {
    const signOffDate = new Date(signOffDue);
    signOffDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (signOffDate <= today) return "0Y 0M 0D";
    const y = signOffDate.getFullYear() - today.getFullYear();
    const m = signOffDate.getMonth() - today.getMonth();
    const d = signOffDate.getDate() - today.getDate();
    let totalMonths = y * 12 + m;
    if (d < 0) totalMonths -= 1;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const from = new Date(today.getFullYear(), today.getMonth() + totalMonths, today.getDate());
    let days = Math.round((signOffDate - from) / (24 * 60 * 60 * 1000));
    if (days < 0) days = 0;
    return `${years}Y ${months}M ${days}D`;
  } catch (_) {
    return "—";
  }
}

function cap(str) {
  return str != null && String(str).trim() !== "" ? String(str).toUpperCase() : "—";
}

export default function SignOnSignOffReport() {
  const [ranks, setRanks] = useState([]);
  const [vesselNames, setVesselNames] = useState([]);
  const [vesselTypes, setVesselTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    rank: "",
    vessel_name: "",
    status: "",
    from_date: "",
    to_date: "",
    nationality: "",
    vessel_type: "",
  });

  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(`${apiBase}/api/reports/filter-options`);
        if (!res.ok) throw new Error("Failed to load filter options");
        const data = await res.json();
        setRanks(data.ranks || []);
        setVesselNames(data.vesselNames || []);
        setVesselTypes(data.vesselTypes || []);
        setCountries(data.countries || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!filters.status) {
      setError("Please select a status.");
      return;
    }
    setError(null);
    setLoadingReport(true);
    try {
      const params = new URLSearchParams();
      if (filters.rank) params.set("rank", filters.rank);
      if (filters.vessel_name) params.set("vessel_name", filters.vessel_name);
      params.set("status", filters.status);
      if (filters.from_date) params.set("from_date", filters.from_date);
      if (filters.to_date) params.set("to_date", filters.to_date);
      if (filters.nationality) params.set("nationality", filters.nationality);
      if (filters.vessel_type) params.set("vessel_type", filters.vessel_type);
      const res = await fetch(`${apiBase}/api/reports/sign-on-off?${params}`);
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const { records = [], reportType, from, to } = result || {};
  const hasRecords = records.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Report List</h1>
        </div>
      </div>

      {/* Filter form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && !result && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-red-800 text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rank</label>
                <select
                  name="rank"
                  value={filters.rank}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Rank</option>
                  {ranks.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vessel Name</label>
                <select
                  name="vessel_name"
                  value={filters.vessel_name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Vessel Name</option>
                  {vesselNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status <span className="text-red-500">*</span></label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Status</option>
                  <option value="sign-on">Signed on</option>
                  <option value="13">Onboard with us</option>
                  <option value="14">Signed off</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
                <input
                  type="date"
                  name="from_date"
                  value={filters.from_date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
                <input
                  type="date"
                  name="to_date"
                  value={filters.to_date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nationality</label>
                <select
                  name="nationality"
                  value={filters.nationality}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Nationality</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vessel Type</label>
                <select
                  name="vessel_type"
                  value={filters.vessel_type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Vessel Type</option>
                  {vesselTypes.map((vt) => (
                    <option key={vt.id} value={vt.id}>{vt.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loadingReport}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingReport ? "Generating…" : "Generate"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Report result */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/80">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Report Details</h2>
              {from && to && (
                <p className="text-sm text-slate-500 mt-0.5">
                  Period – {formatDate(from)} to {formatDate(to)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 print:hidden"
              >
                <i className="fas fa-file-pdf mr-2" />
                Print PDF
              </button>
            </div>
          </div>
          <div className="p-6 overflow-x-auto">
            {!hasRecords && (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg">
                No records found for the selected criteria.
              </div>
            )}

            {hasRecords && reportType === "signOn" && (
              <table className="w-full text-left border-collapse text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-indigo-600 text-white">
                    <th className="px-3 py-2 font-semibold">Crew ID</th>
                    <th className="px-3 py-2 font-semibold">Crew Name</th>
                    <th className="px-3 py-2 font-semibold">Rank</th>
                    <th className="px-3 py-2 font-semibold">Nationality</th>
                    <th className="px-3 py-2 font-semibold">Date of Birth</th>
                    <th className="px-3 py-2 font-semibold">Place of Birth</th>
                    <th className="px-3 py-2 font-semibold">Passport No.</th>
                    <th className="px-3 py-2 font-semibold">PPT Issue</th>
                    <th className="px-3 py-2 font-semibold">PPT Expiry</th>
                    <th className="px-3 py-2 font-semibold">CDC No.</th>
                    <th className="px-3 py-2 font-semibold">CDC Issue</th>
                    <th className="px-3 py-2 font-semibold">CDC Expiry</th>
                    <th className="px-3 py-2 font-semibold">Sign On Date</th>
                    <th className="px-3 py-2 font-semibold">Sign Off Due</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.doc_id || r.candidate_id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="px-3 py-2">
                        <Link to={`/admin/candidates/${r.candidate_id}`} className="text-indigo-600 hover:underline font-medium">
                          {cap(r.candidate_id)}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{cap(r.given_name)} {cap(r.surname)}</td>
                      <td className="px-3 py-2">{cap(r.rank_name)}</td>
                      <td className="px-3 py-2">{cap(r.nationality_name)}</td>
                      <td className="px-3 py-2">{formatDate(r.date_of_birth)}</td>
                      <td className="px-3 py-2">{cap(r.place_of_birth)}</td>
                      <td className="px-3 py-2">{r.passport_number ?? "—"}</td>
                      <td className="px-3 py-2">{formatDate(r.passport_issue_date)}</td>
                      <td className="px-3 py-2">{formatDate(r.passport_expiry_date)}</td>
                      <td className="px-3 py-2">{r.cdc_number ?? "—"}</td>
                      <td className="px-3 py-2">{formatDate(r.cdc_issue_date)}</td>
                      <td className="px-3 py-2">{formatDate(r.cdc_expiry_date)}</td>
                      <td className="px-3 py-2">{formatDate(r.sign_on_date)}</td>
                      <td className="px-3 py-2">{formatDate(r.sign_off_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {hasRecords && reportType === "allSignOn" && (
              <table className="w-full text-left border-collapse text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-indigo-600 text-white">
                    <th className="px-3 py-2 font-semibold">Crew ID</th>
                    <th className="px-3 py-2 font-semibold">Crew Name</th>
                    <th className="px-3 py-2 font-semibold">Rank</th>
                    <th className="px-3 py-2 font-semibold">DOB</th>
                    <th className="px-3 py-2 font-semibold">Current Ship</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Contract Start</th>
                    <th className="px-3 py-2 font-semibold">Sign On Date</th>
                    <th className="px-3 py-2 font-semibold">Sign Off Due</th>
                    <th className="px-3 py-2 font-semibold">Days Remaining</th>
                    <th className="px-3 py-2 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const toTime = filters.to_date ? new Date(filters.to_date).getTime() : null;
                    const signOnTime = r.sign_on_date ? new Date(r.sign_on_date).getTime() : null;
                    const signOffDueTime = r.sign_off_due ? new Date(r.sign_off_due).getTime() : null;
                    let statusLabel = "—";
                    if (from && to && toTime && signOnTime && signOffDueTime) {
                      statusLabel = toTime >= signOnTime && toTime <= signOffDueTime ? "ON-BOARD" : "ON-LEAVE";
                    }
                    return (
                      <tr key={r.doc_id || r.candidate_id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="px-3 py-2">
                          <Link to={`/admin/candidates/${r.candidate_id}`} className="text-indigo-600 hover:underline font-medium">
                            {cap(r.candidate_id)}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{cap(r.given_name)} {cap(r.surname)}</td>
                        <td className="px-3 py-2">{cap(r.rank_name)}</td>
                        <td className="px-3 py-2">{formatDate(r.date_of_birth)}</td>
                        <td className="px-3 py-2">{cap(r.vessel_name)}</td>
                        <td className="px-3 py-2">{statusLabel}</td>
                        <td className="px-3 py-2">{formatDate(r.contract_start_date)}</td>
                        <td className="px-3 py-2">{formatDate(r.sign_on_date)}</td>
                        <td className="px-3 py-2">{formatDate(r.sign_off_due)}</td>
                        <td className="px-3 py-2">{daysRemaining(r.sign_off_due)}</td>
                        <td className="px-3 py-2">{cap(r.remark)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {hasRecords && reportType === "signOff" && (
              <table className="w-full text-left border-collapse text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-indigo-600 text-white">
                    <th className="px-3 py-2 font-semibold">Crew ID</th>
                    <th className="px-3 py-2 font-semibold">Crew Name</th>
                    <th className="px-3 py-2 font-semibold">Rank</th>
                    <th className="px-3 py-2 font-semibold">DOB</th>
                    <th className="px-3 py-2 font-semibold">Current/Previous Ship</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Sign On Date</th>
                    <th className="px-3 py-2 font-semibold">Sign Off Date</th>
                    <th className="px-3 py-2 font-semibold">Contract Days</th>
                    <th className="px-3 py-2 font-semibold">Sign Off Reason</th>
                    <th className="px-3 py-2 font-semibold">Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.doc_id || r.candidate_id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="px-3 py-2">
                        <Link to={`/admin/candidates/${r.candidate_id}`} className="text-indigo-600 hover:underline font-medium">
                          {cap(r.candidate_id)}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{cap(r.given_name)} {cap(r.surname)}</td>
                      <td className="px-3 py-2">{cap(r.rank_name)}</td>
                      <td className="px-3 py-2">{formatDate(r.date_of_birth)}</td>
                      <td className="px-3 py-2">{cap(r.vessel_name)}</td>
                      <td className="px-3 py-2">ON-LEAVE</td>
                      <td className="px-3 py-2">{formatDate(r.sign_on_date)}</td>
                      <td className="px-3 py-2">{formatDate(r.sign_off_date)}</td>
                      <td className="px-3 py-2">{daysRemaining(r.sign_off_due)}</td>
                      <td className="px-3 py-2">{cap(r.sign_off_reason)}</td>
                      <td className="px-3 py-2">{formatDate(r.availability_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {loadingOptions && (
        <div className="text-center py-8 text-slate-500 text-sm">Loading filter options…</div>
      )}
    </div>
  );
}
