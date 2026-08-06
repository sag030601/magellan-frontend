import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { downloadReportCsv, downloadReportPdf } from "../lib/reportExport";
import { fetchReportFilterOptions, fetchSignOnOffReport, queryKeys } from "../hooks/queries";
import { readListFilterMemory, writeListFilterMemory } from "../lib/listFilterMemory";

const FILTER_MEMORY_KEY = "sign-on-off-report";
const EMPTY_FILTERS = {
  employer_principal: "",
  vessel_name: "",
  rank: "",
  status: "",
  nationality: "",
  vessel_type: "",
  from_date: "",
  to_date: "",
};
function formatDate(val) {
  if (!val) return "—";
  const d = typeof val === "number" ? new Date(val * 1000) : new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function toEpochMillis(val) {
  if (!val) return null;
  const d = typeof val === "number" ? new Date(val * 1000) : new Date(val);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function daysRemaining(signOffDue) {
  if (!signOffDue) return "—";
  try {
    const ms = toEpochMillis(signOffDue);
    if (!ms) return "—";
    const due = new Date(ms);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due <= today) return "0Y 0M 0D";
    let totalMonths = (due.getFullYear() - today.getFullYear()) * 12 + (due.getMonth() - today.getMonth());
    if (due.getDate() < today.getDate()) totalMonths -= 1;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const from = new Date(today.getFullYear(), today.getMonth() + totalMonths, today.getDate());
    const days = Math.max(0, Math.round((due - from) / 86400000));
    return `${years}Y ${months}M ${days}D`;
  } catch {
    return "—";
  }
}

function cap(str) {
  return str != null && String(str).trim() !== "" ? String(str).toUpperCase() : "—";
}

function buildExportTable(reportType, records, to) {
  const today = new Date().toISOString().slice(0, 10);

  if (reportType === "signOn") {
    return {
      headers: ["Crew ID", "Crew Name", "Rank", "Nationality", "Current Ship", "DOB", "Place of Birth", "Passport No.", "PPT Issue", "PPT Expiry", "CDC No.", "CDC Issue", "CDC Expiry", "Contract Start", "Sign On Date", "Sign Off Due"],
      rows: records.map((r) => [
        r.candidate_id, `${cap(r.given_name)} ${cap(r.surname)}`, cap(r.rank_name), cap(r.nationality_name), cap(r.vessel_name),
        formatDate(r.date_of_birth), cap(r.place_of_birth), r.passport_number ?? "", formatDate(r.passport_issue_date), formatDate(r.passport_expiry_date),
        r.cdc_number ?? "", formatDate(r.cdc_issue_date), formatDate(r.cdc_expiry_date),
        formatDate(r.contract_start_date), formatDate(r.sign_on_date), formatDate(r.sign_off_due),
      ]),
      baseName: `sign-on-report-${today}`,
    };
  }

  if (reportType === "allSignOn") {
    return {
      headers: ["Crew ID", "Crew Name", "Rank", "DOB", "Current Ship", "Status", "Contract Start", "Sign On Date", "Sign Off Due", "Days Remaining"],
      rows: records.map((r) => {
        const status = r.availability_status_name
          ? String(r.availability_status_name).toUpperCase()
          : "—";
        return [r.candidate_id, `${cap(r.given_name)} ${cap(r.surname)}`, cap(r.rank_name), formatDate(r.date_of_birth), cap(r.vessel_name), status, formatDate(r.contract_start_date), formatDate(r.sign_on_date), formatDate(r.sign_off_due), daysRemaining(r.sign_off_due)];
      }),
      baseName: `all-sign-on-report-${today}`,
    };
  }

  return {
    headers: ["Crew ID", "Crew Name", "Rank", "DOB", "Current/Previous Ship", "Status", "Sign On Date", "Sign Off Date", "Contract Days", "Sign Off Reason"],
    rows: records.map((r) => [
      r.candidate_id, `${cap(r.given_name)} ${cap(r.surname)}`, cap(r.rank_name), formatDate(r.date_of_birth), cap(r.vessel_name),
      r.availability_status_name ? String(r.availability_status_name).toUpperCase() : "ON-LEAVE",
      formatDate(r.sign_on_date), formatDate(r.sign_off_date), daysRemaining(r.sign_off_due), cap(r.sign_off_reason),
    ]),
    baseName: `sign-off-report-${today}`,
  };
}

export default function SignOnSignOffReport() {
  const saved = readListFilterMemory(FILTER_MEMORY_KEY);
  const [formError, setFormError] = useState(null);
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, ...(saved?.filters || {}) }));
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    writeListFilterMemory(FILTER_MEMORY_KEY, { filters });
  }, [filters]);

  const { data: optsData, isLoading: loadingOptions, error: optsError } = useQuery({
    queryKey: queryKeys.reportFilterOptions,
    queryFn: fetchReportFilterOptions,
    staleTime: 5 * 60 * 1000,
  });
  const principals = optsData?.principals || [];
  const ranks = optsData?.ranks || [];
  const vesselNames = optsData?.vesselNames || [];
  const vesselTypes = optsData?.vesselTypes || [];
  const countries = optsData?.countries || [];

  const reportMutation = useMutation({
    mutationFn: fetchSignOnOffReport,
  });

  const handleChange = (e) => setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!filters.status) { setFormError("Please select a type."); return; }
    setFormError(null);
    reportMutation.reset();
    reportMutation.mutate(filters);
  };

  const result = reportMutation.data;
  const loadingReport = reportMutation.isPending;
  const error = formError || optsError?.message || (!result && reportMutation.error?.message) || null;
  const { records = [], reportType, from, to } = result || {};
  const hasRecords = records.length > 0;

  const exportCsv = () => {
    if (!hasRecords) return;
    const { headers, rows, baseName } = buildExportTable(reportType, records, to);
    downloadReportCsv(headers, rows, `${baseName}.csv`);
  };

  const exportPdf = async () => {
    if (!hasRecords || exportingPdf) return;
    setExportingPdf(true);
    try {
      const { headers, rows, baseName } = buildExportTable(reportType, records, to);
      await downloadReportPdf({ headers, rows, filename: `${baseName}.pdf` });
    } finally {
      setExportingPdf(false);
    }
  };

  const fieldStyle = { borderColor: "var(--border-primary)", background: "var(--bg-input)", color: "var(--text-primary)" };
  const fieldCls = "w-full h-9 rounded-lg border px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:border-[var(--border-focus)] focus:ring-[color:var(--border-focus)]";

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border-primary)", background: "linear-gradient(to right, var(--bg-secondary), var(--bg-card))" }}>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Report List</h1>
        </div>
      </div>

      {/* Filter form */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && !result && (
              <div className="rounded-lg border px-4 py-3 text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--danger)", color: "var(--danger)" }}>{error}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Name of Employer/Principal</label>
                <select name="employer_principal" value={filters.employer_principal} onChange={handleChange} className={fieldCls} style={fieldStyle}>
                  <option value="">Select Employer/Principal</option>
                  {principals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Vessel Name</label>
                <select name="vessel_name" value={filters.vessel_name} onChange={handleChange} className={fieldCls} style={fieldStyle}>
                  <option value="">Select Vessel Name</option>
                  {vesselNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Rank</label>
                <select name="rank" value={filters.rank} onChange={handleChange} className={fieldCls} style={fieldStyle}>
                  <option value="">Select Rank</option>
                  {ranks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Types <span style={{ color: "var(--danger)" }}>*</span></label>
                <select name="status" value={filters.status} onChange={handleChange} required className={fieldCls} style={fieldStyle}>
                  <option value="">Select Type</option>
                  <option value="sign-on">Signed on (history)</option>
                  <option value="13">On-board with us</option>
                  <option value="sign-off">Sign Off (History)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Nationality</label>
                <select name="nationality" value={filters.nationality} onChange={handleChange} className={fieldCls} style={fieldStyle}>
                  <option value="">Select Nationality</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Vessel Type</label>
                <select name="vessel_type" value={filters.vessel_type} onChange={handleChange} className={fieldCls} style={fieldStyle}>
                  <option value="">Select Vessel Type</option>
                  {vesselTypes.map((vt) => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>From Date</label>
                <input type="date" name="from_date" value={filters.from_date} onChange={handleChange} className={fieldCls} style={fieldStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>To Date</label>
                <input type="date" name="to_date" value={filters.to_date} onChange={handleChange} className={fieldCls} style={fieldStyle} />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={loadingReport} className="btn btn-primary h-9 px-4 text-sm font-medium rounded-lg disabled:opacity-60">
                {loadingReport ? "Generating…" : "Generate"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Report result */}
      {result && (
        <div className="rounded-xl print:shadow-none print:border" style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-primary)" }}>
          <div className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Report Details</h2>
              {from && to && <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>Period – {formatDate(from)} to {formatDate(to)}</p>}
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <button type="button" onClick={exportCsv} disabled={!hasRecords} className="px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:opacity-90" style={{ background: "var(--accent)" }}>
                Download CSV
              </button>
              <button type="button" onClick={exportPdf} disabled={!hasRecords || exportingPdf} className="px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:opacity-90" style={{ background: "var(--danger)" }}>
                {exportingPdf ? "Preparing PDF…" : "Download PDF"}
              </button>
            </div>
          </div>
          <div className="p-6 overflow-x-auto">
            {!hasRecords && (
              <div className="py-12 text-center rounded-lg" style={{ color: "var(--text-tertiary)", background: "var(--bg-secondary)" }}>No records found for the selected criteria.</div>
            )}

            {hasRecords && reportType === "signOn" && (
              <table className="w-full text-left border-collapse text-sm min-w-[1050px]" style={{ color: "var(--text-primary)" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(180deg, var(--marine-700), var(--marine-800))", color: "#fff" }}>
                    {["Crew ID", "Crew Name", "Rank", "Nationality", "Current Ship", "DOB", "Place of Birth", "Passport No.", "PPT Issue", "PPT Expiry", "CDC No.", "CDC Issue", "CDC Expiry", "Contract Start", "Sign On Date", "Sign Off Due"].map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.doc_id || r.candidate_id} className="border-b hover:bg-[var(--bg-hover)]" style={{ borderColor: "var(--border-primary)" }}>
                      <td className="px-3 py-2"><Link to={`/admin/candidates/${r.candidate_id}`} state={{ from: "reports", backTo: "/admin/report", backLabel: "Back to Reports" }} className="hover:underline font-medium" style={{ color: "var(--accent)" }}>{cap(r.candidate_id)}</Link></td>
                      <td className="px-3 py-2">{cap(r.given_name)} {cap(r.surname)}</td>
                      <td className="px-3 py-2">{cap(r.rank_name)}</td>
                      <td className="px-3 py-2">{cap(r.nationality_name)}</td>
                      <td className="px-3 py-2">{cap(r.vessel_name)}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.date_of_birth)}</td>
                      <td className="px-3 py-2">{cap(r.place_of_birth)}</td>
                      <td className="px-3 py-2">{r.passport_number ?? "—"}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.passport_issue_date)}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.passport_expiry_date)}</td>
                      <td className="px-3 py-2">{r.cdc_number ?? "—"}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.cdc_issue_date)}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.cdc_expiry_date)}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.contract_start_date)}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.sign_on_date)}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.sign_off_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {hasRecords && reportType === "allSignOn" && (
              <table className="w-full text-left border-collapse text-sm min-w-[800px]" style={{ color: "var(--text-primary)" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(180deg, var(--marine-700), var(--marine-800))", color: "#fff" }}>
                    {["Crew ID", "Crew Name", "Rank", "DOB", "Current Ship", "Status", "Contract Start", "Sign On Date", "Sign Off Due", "Days Remaining"].map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const statusLabel = r.availability_status_name
                      ? String(r.availability_status_name).toUpperCase()
                      : "—";
                    return (
                      <tr key={r.doc_id || r.candidate_id} className="border-b hover:bg-[var(--bg-hover)]" style={{ borderColor: "var(--border-primary)" }}>
                        <td className="px-3 py-2"><Link to={`/admin/candidates/${r.candidate_id}`} state={{ from: "reports", backTo: "/admin/report", backLabel: "Back to Reports" }} className="hover:underline font-medium" style={{ color: "var(--accent)" }}>{cap(r.candidate_id)}</Link></td>
                        <td className="px-3 py-2">{cap(r.given_name)} {cap(r.surname)}</td>
                        <td className="px-3 py-2">{cap(r.rank_name)}</td>
                        <td className="px-3 py-2 cell-nowrap">{formatDate(r.date_of_birth)}</td>
                        <td className="px-3 py-2">{cap(r.vessel_name)}</td>
                        <td className="px-3 py-2">{statusLabel}</td>
                        <td className="px-3 py-2 cell-nowrap">{formatDate(r.contract_start_date)}</td>
                        <td className="px-3 py-2 cell-nowrap">{formatDate(r.sign_on_date)}</td>
                        <td className="px-3 py-2 cell-nowrap">{formatDate(r.sign_off_due)}</td>
                        <td className="px-3 py-2 cell-nowrap">{daysRemaining(r.sign_off_due)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {hasRecords && reportType === "signOff" && (
              <table className="w-full text-left border-collapse text-sm min-w-[800px]" style={{ color: "var(--text-primary)" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(180deg, var(--marine-700), var(--marine-800))", color: "#fff" }}>
                    {["Crew ID", "Crew Name", "Rank", "DOB", "Current/Previous Ship", "Status", "Sign On Date", "Sign Off Date", "Contract Days", "Sign Off Reason"].map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.doc_id || r.candidate_id} className="border-b hover:bg-[var(--bg-hover)]" style={{ borderColor: "var(--border-primary)" }}>
                      <td className="px-3 py-2"><Link to={`/admin/candidates/${r.candidate_id}`} state={{ from: "reports", backTo: "/admin/report", backLabel: "Back to Reports" }} className="hover:underline font-medium" style={{ color: "var(--accent)" }}>{cap(r.candidate_id)}</Link></td>
                      <td className="px-3 py-2">{cap(r.given_name)} {cap(r.surname)}</td>
                      <td className="px-3 py-2">{cap(r.rank_name)}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.date_of_birth)}</td>
                      <td className="px-3 py-2">{cap(r.vessel_name)}</td>
                      <td className="px-3 py-2">{r.availability_status_name ? String(r.availability_status_name).toUpperCase() : "ON-LEAVE"}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.sign_on_date)}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.sign_off_date)}</td>
                      <td className="px-3 py-2 cell-nowrap">{daysRemaining(r.sign_off_due)}</td>
                      <td className="px-3 py-2">{cap(r.sign_off_reason)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {loadingOptions && <div className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>Loading filter options…</div>}
    </div>
  );
}
