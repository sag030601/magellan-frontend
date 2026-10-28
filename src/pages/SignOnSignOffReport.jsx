import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { downloadReportCsv, downloadReportPdf } from "../lib/reportExport";
import { buildExportTable, cap, daysRemaining, formatDate } from "../lib/signOnOffReportTable";
import { useAuth } from "../context/AuthContext";
import { fetchReportFilterOptions, fetchSignOnOffReport, queryKeys } from "../hooks/queries";
import {
  generatedFromResponse,
  readSignOnOffReportSession,
  writeSignOnOffReportSession,
} from "../lib/signOnOffReportSession";

export default function SignOnSignOffReport() {
  const { user } = useAuth();
  const userId = user?.id != null ? String(user.id) : "";
  const [formError, setFormError] = useState(null);
  const [generateError, setGenerateError] = useState(null);
  const [boundUserId, setBoundUserId] = useState(userId);
  const [filters, setFilters] = useState(() => readSignOnOffReportSession(userId).filters);
  const [generated, setGenerated] = useState(() => readSignOnOffReportSession(userId).generated);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    if (boundUserId === userId) return;
    const saved = readSignOnOffReportSession(userId);
    setBoundUserId(userId);
    setFilters(saved.filters);
    setGenerated(saved.generated);
    setGenerateError(null);
    setFormError(null);
  }, [userId, boundUserId]);

  useEffect(() => {
    if (!userId || boundUserId !== userId) return;
    writeSignOnOffReportSession(userId, { filters, generated });
  }, [userId, boundUserId, filters, generated]);
  const { data: optsData, isLoading: loadingOptions, isPlaceholderData, error: optsError } = useQuery({
    queryKey: [...queryKeys.reportFilterOptions, user?.id ?? null, filters.employer_principal || null],
    queryFn: () => fetchReportFilterOptions(filters.employer_principal),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
  const principals = optsData?.principals || [];
  const ranks = optsData?.ranks || [];
  const vesselNames = optsData?.vesselNames || [];
  const vesselTypes = optsData?.vesselTypes || [];
  const countries = optsData?.countries || [];

  // A Principal-restricted user is locked to their assigned Principal (also enforced by the API).
  const lockedPrincipalId = optsData?.locked_principal_id != null ? String(optsData.locked_principal_id) : "";
  const principalValue = lockedPrincipalId || filters.employer_principal;
  const vesselValue = !optsData || isPlaceholderData || vesselNames.includes(filters.vessel_name) ? filters.vessel_name : "";

  const reportMutation = useMutation({
    mutationFn: fetchSignOnOffReport,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "employer_principal" ? { vessel_name: "" } : {}),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!filters.status) { setFormError("Please select a type."); return; }
    setFormError(null);
    const payload = { ...filters, employer_principal: principalValue, vessel_name: vesselValue };
    reportMutation.mutate(payload, {
      onSuccess: (data) => {
        const next = generatedFromResponse(payload, data);
        if (!next) {
          setGenerateError("Failed to generate report");
          return;
        }
        setGenerateError(null);
        setGenerated(next);
      },
      onError: (err) => {
        setGenerateError(err?.message || "Failed to generate report");
      },
    });
  };

  const loadingReport = reportMutation.isPending;
  const error = formError || generateError || optsError?.message || null;
  const result = generated?.result || null;
  const { records = [], reportType, from, to } = result || {};
  const hasRecords = records.length > 0;

  const exportCsv = () => {
    if (!hasRecords) return;
    const { headers, rows, baseName } = buildExportTable(reportType, records);
    downloadReportCsv(headers, rows, `${baseName}.csv`);
  };

  const exportPdf = async () => {
    if (!hasRecords || exportingPdf) return;
    setExportingPdf(true);
    try {
      const { headers, rows, baseName } = buildExportTable(reportType, records);
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
            {error && (
              <div className="rounded-lg border px-4 py-3 text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--danger)", color: "var(--danger)" }}>{error}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Name of Employer/Principal</label>
                <select
                  name="employer_principal"
                  value={principalValue}
                  onChange={handleChange}
                  disabled={Boolean(lockedPrincipalId)}
                  className={fieldCls}
                  style={fieldStyle}
                >
                  {!lockedPrincipalId && <option value="">Select Employer/Principal</option>}
                  {principals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Vessel Name</label>
                <select name="vessel_name" value={vesselValue} onChange={handleChange} className={fieldCls} style={fieldStyle}>
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
      {generated && (
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
