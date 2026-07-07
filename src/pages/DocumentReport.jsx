import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { downloadReportCsv, downloadReportPdf } from "../lib/reportExport";

function formatDate(value) {
  if (!value && value !== 0) return "";
  const d = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

function upper(v) {
  return v == null ? "" : String(v).toUpperCase();
}

const DOCUMENT_HEADERS = [
  "Candidate No.",
  "Candidate Name",
  "Rank",
  "Nationality",
  "Status",
  "Vessel Name",
  "DOB",
  "Document Category",
  "Document Name/Type",
  "Certificate No.",
  "Issue Date",
  "Expiry Date",
];

function buildDocumentExportRows(records, reportType) {
  return records.map((r) => [
    upper(r.candidate_id),
    `${upper(r.given_name)} ${upper(r.surname)}`.trim(),
    upper(r.rank_name),
    upper(r.nationality_name),
    upper(r.availability_status_name),
    upper(r.vessel_name),
    formatDate(r.date_of_birth),
    reportType || "",
    r.document_name || r.type || "",
    r.certificate_number || r.document_number || "",
    formatDate(r.issue_date || r.original_issue_date),
    formatDate(r.expiry_date),
  ]);
}

export default function DocumentReport() {
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState([]);
  const [reportType, setReportType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  const [options, setOptions] = useState({
    ranks: [],
    status: [],
    vesselNames: [],
    documentCategory: [],
    documentType: [],
  });

  const [filters, setFilters] = useState({
    candidate_id: "",
    rank: "",
    status: "",
    vessel_name: "",
    document_category: "",
    document_name: "",
    from_date: "",
    to_date: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/reports/document-filter-options");
        if (!res.ok) throw new Error("Failed to load report options");
        const data = await res.json();
        setOptions({
          ranks: data.ranks || [],
          status: data.status || [],
          vesselNames: data.vesselNames || [],
          documentCategory: data.documentCategory || [],
          documentType: data.documentType || [],
        });
      } catch (e) {
        setError(e.message || "Failed to load options");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const documentNameOptions = useMemo(() => {
    const byName = options.documentType || [];
    const stcw = byName
      .filter((d) => !["VISA Copy", "Seaman Book", "Passport", "SID", "PAN Card", "AADHAR Card"].includes(d.name))
      .map((d) => d.name);
    const other = byName
      .filter((d) => ["SID", "PAN Card", "AADHAR Card"].includes(d.name))
      .map((d) => d.name);
    const category = filters.document_category;
    if (category === "Passport") return ["Passport"];
    if (category === "CDC") return ["Seaman Book"];
    if (category === "Visa") return ["Single Entry", "Multiple Entry"];
    if (category === "STCW") return stcw;
    if (category === "DCE") return stcw;
    if (category === "Value Added Course") return stcw;
    if (category === "Other") return other;
    if (category === "Licence") {
      return ["Certificate of Competency", "Certificate of Endorsement", "Certificate of Equivalency"];
    }
    return [];
  }, [filters.document_category, options.documentType]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "document_category") next.document_name = "";
      return next;
    });
  };

  const generate = async (e) => {
    e.preventDefault();
    setError("");
    setLoadingReport(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== "") params.set(k, v);
      });
      const res = await apiFetch(`/api/reports/document-filter?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to generate document report");
      const data = await res.json();
      setRecords(data.records || []);
      setReportType(data.reportType || "");
      setFrom(data.from || "");
      setTo(data.to || "");
    } catch (e2) {
      setError(e2.message || "Failed to generate report");
      setRecords([]);
    } finally {
      setLoadingReport(false);
    }
  };

  const hasRecords = records.length > 0;
  const exportBaseName = `document-report-${new Date().toISOString().slice(0, 10)}`;

  const exportCsv = () => {
    if (!hasRecords) return;
    downloadReportCsv(DOCUMENT_HEADERS, buildDocumentExportRows(records, reportType), `${exportBaseName}.csv`);
  };

  const exportPdf = async () => {
    if (!hasRecords || exportingPdf) return;
    setExportingPdf(true);
    try {
      await downloadReportPdf({
        headers: DOCUMENT_HEADERS,
        rows: buildDocumentExportRows(records, reportType),
        filename: `${exportBaseName}.pdf`,
      });
    } finally {
      setExportingPdf(false);
    }
  };

  const fieldStyle = { borderColor: "var(--border-primary)", background: "var(--bg-input)", color: "var(--text-primary)" };
  const fieldCls = "h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:border-[var(--border-focus)] focus:ring-[color:var(--border-focus)]";

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border-primary)", background: "linear-gradient(to right, var(--bg-secondary), var(--bg-card))" }}>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Document Report</h1>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-5">
          {error && <div className="mb-4 rounded-lg border px-4 py-3 text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--danger)", color: "var(--danger)" }}>{error}</div>}
          <form onSubmit={generate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input className={fieldCls} style={fieldStyle} name="candidate_id" value={filters.candidate_id} onChange={onFilterChange} placeholder="MCM crew ID" />
            <select className={fieldCls} style={fieldStyle} name="rank" value={filters.rank} onChange={onFilterChange}>
              <option value="">Select Rank</option>
              {options.ranks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select className={fieldCls} style={fieldStyle} name="status" value={filters.status} onChange={onFilterChange}>
              <option value="">Select Status</option>
              {options.status.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name != null && String(s.name).trim() !== "" ? s.name : `Status ${s.id}`}
                </option>
              ))}
            </select>
            <select className={fieldCls} style={fieldStyle} name="vessel_name" value={filters.vessel_name} onChange={onFilterChange}>
              <option value="">Select Vessel Name</option>
              {options.vesselNames.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select className={fieldCls} style={fieldStyle} name="document_category" value={filters.document_category} onChange={onFilterChange} required>
              <option value="">Select Document Category</option>
              {options.documentCategory.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className={fieldCls} style={fieldStyle} name="document_name" value={filters.document_name} onChange={onFilterChange}>
              <option value="">Select Document Name</option>
              {documentNameOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <input className={fieldCls} style={fieldStyle} type="date" name="from_date" value={filters.from_date} onChange={onFilterChange} />
            <input className={fieldCls} style={fieldStyle} type="date" name="to_date" value={filters.to_date} onChange={onFilterChange} />

            <div className="lg:col-span-4 flex justify-end">
              <button type="submit" disabled={loading || loadingReport} className="btn btn-primary h-9 px-4 text-sm font-medium rounded-lg disabled:opacity-60">
                {loadingReport ? "Generating..." : "Generate"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {(records.length > 0 || reportType) && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-primary)" }}>
          <div className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Report Details</h2>
              {from && to && <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>Period - {formatDate(from)} to {formatDate(to)}</p>}
            </div>
            {hasRecords && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={exportCsv} className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90" style={{ background: "var(--accent)" }}>
                  Download CSV
                </button>
                <button type="button" onClick={exportPdf} disabled={exportingPdf} className="px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:opacity-90" style={{ background: "var(--danger)" }}>
                  {exportingPdf ? "Preparing PDF…" : "Download PDF"}
                </button>
              </div>
            )}
          </div>
          <div className="p-6 overflow-x-auto">
            {records.length === 0 ? (
              <div className="py-12 text-center rounded-lg" style={{ color: "var(--text-tertiary)", background: "var(--bg-secondary)" }}>No records found.</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm min-w-[1100px]" style={{ color: "var(--text-primary)" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(180deg, var(--marine-700), var(--marine-800))", color: "#fff" }}>
                    <th className="px-3 py-2">Candidate No.</th>
                    <th className="px-3 py-2">Candidate Name</th>
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Nationality</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Vessel Name</th>
                    <th className="px-3 py-2">DOB</th>
                    <th className="px-3 py-2">Document Category</th>
                    <th className="px-3 py-2">Document Name/Type</th>
                    <th className="px-3 py-2">Certificate No.</th>
                    <th className="px-3 py-2">Issue Date</th>
                    <th className="px-3 py-2">Expiry Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={`${r.id}-${r.candidate_id}`} className="border-b hover:bg-[var(--bg-hover)]" style={{ borderColor: "var(--border-primary)" }}>
                      <td className="px-3 py-2">
                        <Link className="hover:underline font-medium" style={{ color: "var(--accent)" }} to={`/admin/candidates/${r.candidate_id}`}>
                          {upper(r.candidate_id)}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{upper(r.given_name)} {upper(r.surname)}</td>
                      <td className="px-3 py-2">{upper(r.rank_name)}</td>
                      <td className="px-3 py-2">{upper(r.nationality_name)}</td>
                      <td className="px-3 py-2">{upper(r.availability_status_name)}</td>
                      <td className="px-3 py-2">{upper(r.vessel_name)}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.date_of_birth)}</td>
                      <td className="px-3 py-2">{reportType || ""}</td>
                      <td className="px-3 py-2">{r.document_name || r.type || ""}</td>
                      <td className="px-3 py-2">{r.certificate_number || r.document_number || ""}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.issue_date || r.original_issue_date)}</td>
                      <td className="px-3 py-2 cell-nowrap">{formatDate(r.expiry_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
