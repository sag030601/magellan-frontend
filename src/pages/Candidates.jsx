import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { fmtAuditUserName } from "../lib/auditDisplay";
import "./Candidates.css";

const API = import.meta.env.VITE_API_URL || "";
const INPUT_CLS = "form-control";
const FIELD_WRAP = "candidates-field";
const ADD_LABEL = "block text-xs font-semibold mb-0.5";
const PAGE_SIZES = [25, 50, 100, 200];

const EMPTY_FILTERS = {
  rank: "", nationality: "", given_name: "", surname: "", passport_number: "",
  cdc_number: "", indos_number: "", contact_no: "", email: "", vessel_type: "",
  license_authority: "", engine_make: "", availability_status: "",
  availability_from: "", availability_to: "", USAvisa_status: "",
  aramco_charter: "", candidate_id: "",
};

const EMPTY_ADD_FORM = {
  given_name: "",
  surname: "",
  middle_name: "",
  rank_id: "",
  vessel_type_id: "",
  nationality_id: "",
  religion: "",
  gender: "",
  marital_status: "",
  place_of_birth: "",
  date_of_birth: "",
  passport_number: "",
  passport_issue_date: "",
  passport_expiry_date: "",
  cdc_number: "",
  cdc_issue_date: "",
  cdc_expiry_date: "",
  indos_number: "",
  license: "",
  email_id: "",
  contact_no_1: "",
  availability_status_id: "",
  availability_date: "",
  followup_date: "",
  aramco_charter: "",
  remark: "",
};

/** Percent widths for `colgroup` — sum 100%, fits viewport with `table-layout: fixed` */
const CANDIDATE_TABLE_COL_WIDTHS = [
  "3%", "11%", "6.5%", "10.5%", "7.5%", "9%", "6%", "9.5%", "10%", "11.5%", "12.5%", "3%",
];

const COLUMNS = [
  { key: "id", label: "CID" },
  { key: "name", label: "Name" },
  { key: "nat", label: "Nationality" },
  { key: "rank", label: "Rank" },
  { key: "avail_st", label: "Availability Status" },
  { key: "avail_dt", label: "Availability Date" },
  { key: "follow", label: "Follow Up Date" },
  { key: "contact", label: "Contact No1." },
  { key: "vtype", label: "Vessel Type" },
  { key: "vname", label: "Current Vessel Name" },
  { key: "remarks", label: "Remarks" },
  { key: "action", label: "Action" },
];

function cellTitle(val) {
  const s = val != null ? String(val).trim() : "";
  if (!s || s === "—") return undefined;
  return s;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseEpochMs(v) {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(v);
  if (!Number.isNaN(n) && String(v).trim()) return n > 1e12 ? n : n * 1000;
  const ms = Date.parse(String(v));
  return Number.isNaN(ms) ? null : ms;
}

function fmtDate(v) {
  const ms = parseEpochMs(v);
  if (ms == null) return "—";
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function fmtStamp(v) {
  const ms = parseEpochMs(v);
  if (ms == null) return "";
  try {
    const s = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
    return s.replace(/,\s+/, ",\u00A0");
  } catch {
    return String(new Date(ms).toLocaleString()).replace(/,\s+/, ",\u00A0");
  }
}

function fmtDateTimeShort(v) {
  const ms = parseEpochMs(v);
  if (ms == null) return "—";
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${min}`;
}

function candidateColumnHeaderClass(key) {
  if (key === "id") return "candidates-col-narrow";
  if (key === "name") return "candidates-col-name candidates-col-person";
  if (key === "vname") return "candidates-col-name candidates-col-vessel";
  if (key === "avail_st") return "candidates-col-mid candidates-col-status";
  if (key === "rank") return "candidates-col-mid candidates-col-rank";
  if (key === "vtype") return "candidates-col-mid candidates-col-vtype";
  if (key === "nat") return "candidates-col-mid";
  if (key === "contact") return "candidates-col-mid candidates-col-contact";
  if (key === "avail_dt") return "candidates-col-date candidates-col-availability-date";
  if (key === "follow") return "candidates-col-date";
  if (key === "remarks") return "candidates-col-remarks";
  if (key === "action") return "candidates-col-action";
  return undefined;
}

function remarkPreview(c) {
  const r = c?.remark != null ? String(c.remark).trim() : "";
  return r || "";
}

/** Remark cell: View CV → remark text → updated time (stacked); hover = audit popover */
function RemarksCell({ c, onView }) {
  const href = cvUrl(c);
  const preview = remarkPreview(c);
  const stamp = fmtStamp(c.updated_at);
  return (
    <td className="candidates-col-remarks candidates-remarks-wrap">
      <div className="candidates-remarks-trigger">
        <div className="candidates-remarks-stack">
          <div className="candidates-remarks-block">
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="candidates-remarks-link-line" onClick={(e) => e.stopPropagation()}>
                View CV
              </a>
            ) : (
              <button type="button" className="candidates-remarks-link-line" onClick={() => onView(c.id)}>
                View CV
              </button>
            )}
          </div>
          <button type="button" className="candidates-remarks-link-line candidates-remarks-view-remark" onClick={() => onView(c.id)}>
            View Remark
          </button>
          <div className={preview ? "candidates-remarks-body" : "candidates-remarks-body candidates-remarks-body--empty"}>{preview || "—"}</div>
          <div className="candidates-remarks-stamp">{stamp || "—"}</div>
        </div>
      </div>
      <div className="candidates-remarks-popover" role="tooltip">
        <div className="candidates-remarks-popover-title">Record</div>
        <dl className="candidates-remarks-popover-dl">
          <dt>Created</dt>
          <dd>{fmtDateTimeShort(c.created_at)}</dd>
          <dt>By</dt>
          <dd>{fmtAuditUserName(c, "added_by_name", "added_by")}</dd>
          <dt>Updated</dt>
          <dd>{fmtDateTimeShort(c.updated_at)}</dd>
          <dt>By</dt>
          <dd>{fmtAuditUserName(c, "edited_by_name", "edited_by")}</dd>
        </dl>
        {c.last_activity && (
          <>
            <div className="candidates-remarks-popover-title candidates-remarks-popover-title--sub">Last portal action</div>
            <dl className="candidates-remarks-popover-dl">
              <dt>Action</dt>
              <dd>{c.last_activity.summary || "—"}</dd>
              <dt>By</dt>
              <dd>{c.last_activity.user_name || "—"}</dd>
              <dt>When</dt>
              <dd>{fmtDateTimeShort(c.last_activity.created_at)}</dd>
            </dl>
          </>
        )}
      </div>
    </td>
  );
}

const fullName = (c) => [c.given_name, c.middle_name, c.surname].filter(Boolean).join(" ").trim() || "—";
const displayNat = (c) => { const n = c.nationality_name ?? c.nationality; return n && String(n).trim() ? String(n).trim() : "—"; };
const csvCell = (s) => { const t = String(s ?? ""); return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("leave") || s.includes("off")) return "status-badge--warn";
  if (s.includes("unavailable") || s.includes("hold") || s.includes("inactive")) return "status-badge--danger";
  return "status-badge--ok";
}

function cvUrl(c) {
  const raw = c?.cv_upload_path ?? c?.cv_path ?? c?.cv ?? "";
  if (!raw || !String(raw).trim()) return null;
  const file = String(raw).split("/").pop();
  return file ? `${API}/uploads/documents/${c.id}/${file}` : null;
}

// ── API fetchers ────────────────────────────────────────────────────────────

function buildQs(filters, page, pageSize) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null && String(v).trim()) params.set(k, String(v).trim()); });
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return params.toString();
}

/** Merge search filters with toolbar export dates — server applies `export_from` / `export_to` to the list */
function mergeListParams(activeFilters, exportFrom, exportTo) {
  const out = { ...activeFilters };
  const f = (exportFrom ?? "").trim();
  const t = (exportTo ?? "").trim();
  if (f) out.export_from = f;
  if (t) out.export_to = t;
  return out;
}

async function fetchCandidates({ queryKey }) {
  const [, listParams, page, pageSize] = queryKey;
  const qs = buildQs(listParams, page, pageSize);
  const res = await apiFetch(`/api/candidates/all?${qs}`);
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}

/** Server caps pageSize at 200 — walk pages so export includes the full filtered list */
async function fetchAllCandidatesForExport(listParams) {
  const pageSize = 200;
  let page = 1;
  const all = [];
  for (;;) {
    const qs = buildQs(listParams, page, pageSize);
    const res = await apiFetch(`/api/candidates/all?${qs}`);
    if (!res.ok) throw new Error("Failed to fetch candidates for export");
    const data = await res.json();
    const batch = data.candidates || [];
    all.push(...batch);
    const total = Number(data.total) || 0;
    if (batch.length < pageSize || all.length >= total) break;
    page += 1;
    if (page > 500) break;
  }
  return all;
}

function downloadCsv(filename, lines) {
  const text = lines.join("\n");
  const blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

async function fetchSearchOptions() {
  const res = await apiFetch("/api/candidates/search-options");
  if (!res.ok) throw new Error("Failed to fetch options");
  return res.json();
}

// ── Form fields ─────────────────────────────────────────────────────────────

function SelectField({ label, placeholder, options, value, onChange }) {
  return (
    <div className={FIELD_WRAP}>
      <label>{label}</label>
      <select className={INPUT_CLS} value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {(options || []).map((o, i) => <option key={`${o.id}-${i}`} value={String(o.id)}>{o.name ?? o.option ?? ""}</option>)}
      </select>
    </div>
  );
}

function InputField({ label, placeholder, type = "text", value, onChange, required = false }) {
  return (
    <div className={FIELD_WRAP}>
      <label>{label}{required ? " *" : ""}</label>
      <input type={type} className={INPUT_CLS} placeholder={placeholder} value={value} onChange={onChange} required={required} />
    </div>
  );
}

// ── Pagination controls ─────────────────────────────────────────────────────

function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  const pages = useMemo(() => {
    const arr = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      if (page <= 3) { start = 2; end = 5; }
      if (page >= totalPages - 2) { start = totalPages - 4; end = totalPages - 1; }
      if (start > 2) arr.push("...");
      for (let i = start; i <= end; i++) arr.push(i);
      if (end < totalPages - 1) arr.push("...");
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  const btnCls = "px-2.5 py-1 text-xs rounded border transition-colors";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2" style={{ borderTop: "1px solid var(--border-primary)", background: "var(--bg-secondary)" }}>
      <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        <span>
          Showing <strong>{Math.min((page - 1) * pageSize + 1, total)}</strong>–<strong>{Math.min(page * pageSize, total)}</strong> of <strong>{total}</strong>
        </span>
        <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="form-control" style={{ width: "auto", padding: "2px 6px", fontSize: 11, minHeight: "1.75rem" }}>
          {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={btnCls} style={{ opacity: page <= 1 ? 0.4 : 1, color: "var(--text-secondary)", borderColor: "var(--border-primary)" }}>
          Prev
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} className="px-2 text-sm" style={{ color: "var(--text-tertiary)" }}>...</span>
          ) : (
            <button key={p} type="button" onClick={() => onPageChange(p)} className={btnCls} style={{ background: p === page ? "var(--accent)" : "transparent", color: p === page ? "#fff" : "var(--text-secondary)", borderColor: p === page ? "var(--accent)" : "var(--border-primary)" }}>
              {p}
            </button>
          ),
        )}
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={btnCls} style={{ opacity: page >= totalPages ? 0.4 : 1, color: "var(--text-secondary)", borderColor: "var(--border-primary)" }}>
          Next
        </button>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Candidates() {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [activeFilters, setActiveFilters] = useState({ ...EMPTY_FILTERS });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isAddRoute = /\/add-candidate\/?$/.test(location.pathname);

  const [addForm, setAddForm] = useState({ ...EMPTY_ADD_FORM });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addPhotoFile, setAddPhotoFile] = useState(null);
  const [addCvFile, setAddCvFile] = useState(null);

  const setAddField = useCallback((key, val) => {
    setAddForm((f) => ({ ...f, [key]: val }));
  }, []);

  const setField = useCallback((key, val) => setFilters((f) => ({ ...f, [key]: val })), []);

  const listParams = useMemo(
    () => mergeListParams(activeFilters, exportFrom, exportTo),
    [activeFilters, exportFrom, exportTo],
  );

  useEffect(() => {
    setPage(1);
  }, [exportFrom, exportTo]);

  const { data: optsData } = useQuery({
    queryKey: ["candidate-search-options"],
    queryFn: fetchSearchOptions,
    staleTime: 5 * 60 * 1000,
  });
  const opts = optsData || { ranks: [], countries: [], vesselTypes: [], engineMakes: [], usaVisaStatus: [], availabilityStatus: [] };

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["candidates", listParams, page, pageSize],
    queryFn: fetchCandidates,
    placeholderData: keepPreviousData,
  });

  const candidates = data?.candidates || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveFilters({ ...filters });
    setPage(1);
  };

  const handleClear = () => {
    setFilters({ ...EMPTY_FILTERS });
    setActiveFilters({ ...EMPTY_FILTERS });
    setPage(1);
  };

  const handlePageChange = (p) => setPage(p);
  const handlePageSizeChange = (s) => { setPageSize(s); setPage(1); };

  const handleView = (id) => navigate(`/admin/candidates/${id}`);

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    const given = addForm.given_name.trim();
    const surname = addForm.surname.trim();
    if (!given || !surname) {
      setAddError("Given name and surname are required.");
      return;
    }
    const ymd = /^\d{4}-\d{2}-\d{2}$/;
    if (addForm.passport_number.trim() && !ymd.test(String(addForm.passport_expiry_date || "").trim())) {
      setAddError("Passport expiry date is required when passport number is entered.");
      return;
    }
    if (addForm.cdc_number.trim() && !ymd.test(String(addForm.cdc_expiry_date || "").trim())) {
      setAddError("CDC expiry date is required when CDC number is entered.");
      return;
    }
    setAddSaving(true);
    setAddError(null);
    try {
      const payload = {
        given_name: given,
        surname: surname,
        middle_name: addForm.middle_name.trim() || undefined,
        rank_id: addForm.rank_id || undefined,
        vessel_type_id: addForm.vessel_type_id || undefined,
        nationality_id: addForm.nationality_id || undefined,
        religion: addForm.religion.trim() || undefined,
        marital_status: addForm.marital_status || undefined,
        place_of_birth: addForm.place_of_birth.trim() || undefined,
        date_of_birth: addForm.date_of_birth || undefined,
        passport_number: addForm.passport_number.trim() || undefined,
        passport_issue_date: addForm.passport_issue_date || undefined,
        passport_expiry_date: addForm.passport_expiry_date || undefined,
        cdc_number: addForm.cdc_number.trim() || undefined,
        cdc_issue_date: addForm.cdc_issue_date || undefined,
        cdc_expiry_date: addForm.cdc_expiry_date || undefined,
        indos_number: addForm.indos_number.trim() || undefined,
        license: addForm.license.trim() || undefined,
        email_id: addForm.email_id.trim() || undefined,
        contact_no_1: addForm.contact_no_1.trim() || undefined,
        availability_status_id: addForm.availability_status_id || undefined,
        availability_date: addForm.availability_date || undefined,
        followup_date: addForm.followup_date || undefined,
        aramco_charter: addForm.aramco_charter || undefined,
        remark: addForm.remark.trim() || undefined,
        gender: addForm.gender || undefined,
      };
      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== "") formData.append(k, String(v));
      });
      if (addPhotoFile) formData.append("photo_upload", addPhotoFile);
      if (addCvFile) formData.append("cv_upload", addCvFile);
      const r = await apiFetch("/api/candidates", {
        method: "POST",
        body: formData,
        headers: {},
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Failed to create candidate");
      const id = data.candidate?.id;
      if (!id) throw new Error("No candidate id returned from server");
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      setAddForm({ ...EMPTY_ADD_FORM });
      setAddPhotoFile(null);
      setAddCvFile(null);
      navigate(`/admin/candidates/${id}`);
      } catch (err) {
      setAddError(err?.message || "Failed to create candidate");
      } finally {
      setAddSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this candidate?")) return;
    try {
      const r = await apiFetch(`/api/candidates/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Delete failed");
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    } catch (e) { window.alert(e?.message || "Delete failed"); }
  };

  const exportRemarks = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      let rows;
      try {
        rows = await fetchAllCandidatesForExport(listParams);
      } catch (e) {
        window.alert(e?.message || "Could not load candidates for export.");
        return;
      }
      if (rows.length === 0) {
        window.alert(
          exportFrom || exportTo
            ? "No candidates match the current search and export date range."
            : "No candidates to export for the current search.",
        );
        return;
      }
      const header = [
        "CID", "Name", "Nationality", "Rank", "Availability Status", "Follow Up Date", "Remark",
        "Added by", "Edited by", "Created", "Updated",
      ];
      const lines = [
        header.join(","),
        ...rows.map((c) =>
          [
            c.id, fullName(c), displayNat(c).replace(/^—$/, ""), c.rank_name || "", c.availability_status_name || "", fmtDate(c.followup_date), c.remark ?? "",
            fmtAuditUserName(c, "added_by_name", "added_by"),
            fmtAuditUserName(c, "edited_by_name", "edited_by"),
            fmtDateTimeShort(c.created_at),
            fmtDateTimeShort(c.updated_at),
          ]
            .map(csvCell).join(","),
        ),
      ];
      downloadCsv(`candidates-remarks-${new Date().toISOString().slice(0, 10)}.csv`, lines);
    } finally {
      setExportBusy(false);
    }
  };

  const sf = (key, label, placeholder, options) => (
    <SelectField key={key} label={label} placeholder={placeholder} options={options} value={filters[key]} onChange={(e) => setField(key, e.target.value)} />
  );
  const inf = (key, label, placeholder, type) => (
    <InputField key={key} label={label} placeholder={placeholder} type={type} value={filters[key]} onChange={(e) => setField(key, e.target.value)} />
  );

  return (
    <div className="candidates-page max-w-[100%]">
      <header className="candidates-page-heading">
        <h1 style={{ color: "var(--text-primary)" }}>
          {isAddRoute ? "Add candidate" : "Candidates"}
        </h1>
        <p style={{ color: "var(--text-tertiary)" }}>
          {isAddRoute ? "Create a profile, then complete details on the next screen." : "Search and manage seafarer profiles"}
        </p>
      </header>

      {isAddRoute && (
        <div
          className="rounded-lg p-4 mb-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-sm)" }}
        >
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>New candidate</h2>
          {addError && (
            <div className="px-3 py-2 rounded-lg mb-3 text-sm" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--danger)" }}>
              {addError}
            </div>
          )}
          <form onSubmit={handleAddCandidate}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-2">
              <div className="mb-2">
                <label className={ADD_LABEL}>Surname *</label>
                <input
                  className={INPUT_CLS}
                  value={addForm.surname}
                  onChange={(e) => setAddField("surname", e.target.value)}
                  placeholder="Surname"
                  required
                  autoComplete="family-name"
                />
              </div>
              <div className="mb-2">
                <label className={ADD_LABEL}>Name *</label>
                <input
                  className={INPUT_CLS}
                  value={addForm.given_name}
                  onChange={(e) => setAddField("given_name", e.target.value)}
                  placeholder="Name"
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="mb-2">
                <label className={ADD_LABEL}>Middle name</label>
                <input
                  className={INPUT_CLS}
                  value={addForm.middle_name}
                  onChange={(e) => setAddField("middle_name", e.target.value)}
                  placeholder="Middle name"
                />
              </div>
              <div className="mb-2">
                <label className={ADD_LABEL}>Gender</label>
                <select className={INPUT_CLS} value={addForm.gender} onChange={(e) => setAddField("gender", e.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <SelectField
                label="Rank"
                placeholder="Select rank"
                options={opts.ranks}
                value={addForm.rank_id}
                onChange={(e) => setAddField("rank_id", e.target.value)}
              />
              <SelectField
                label="Vessel type"
                placeholder="Select vessel type"
                options={opts.vesselTypes}
                value={addForm.vessel_type_id}
                onChange={(e) => setAddField("vessel_type_id", e.target.value)}
              />
              <SelectField
                label="Nationality"
                placeholder="Select nationality"
                options={opts.countries}
                value={addForm.nationality_id}
                onChange={(e) => setAddField("nationality_id", e.target.value)}
              />
              <InputField
                label="Religion"
                placeholder="Religion"
                value={addForm.religion}
                onChange={(e) => setAddField("religion", e.target.value)}
              />
              <div className="mb-2">
                <label className={ADD_LABEL}>Marital status</label>
                <select className={INPUT_CLS} value={addForm.marital_status} onChange={(e) => setAddField("marital_status", e.target.value)}>
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <InputField
                label="Date of birth"
                placeholder="Date of birth"
                type="date"
                value={addForm.date_of_birth}
                onChange={(e) => setAddField("date_of_birth", e.target.value)}
              />
              <InputField
                label="Place of birth"
                placeholder="Place of birth"
                value={addForm.place_of_birth}
                onChange={(e) => setAddField("place_of_birth", e.target.value)}
              />
              <InputField
                label="Passport number"
                placeholder="Passport number"
                value={addForm.passport_number}
                onChange={(e) => setAddField("passport_number", e.target.value)}
              />
              <InputField
                label="Passport issue date"
                placeholder="Passport issue date"
                type="date"
                value={addForm.passport_issue_date}
                onChange={(e) => setAddField("passport_issue_date", e.target.value)}
              />
              <InputField
                label="Passport expiry date"
                placeholder="Passport expiry date"
                type="date"
                value={addForm.passport_expiry_date}
                onChange={(e) => setAddField("passport_expiry_date", e.target.value)}
                required={Boolean(addForm.passport_number.trim())}
              />
              <InputField
                label="CDC number"
                placeholder="CDC number"
                value={addForm.cdc_number}
                onChange={(e) => setAddField("cdc_number", e.target.value)}
              />
              <InputField
                label="CDC issue date"
                placeholder="CDC issue date"
                type="date"
                value={addForm.cdc_issue_date}
                onChange={(e) => setAddField("cdc_issue_date", e.target.value)}
              />
              <InputField
                label="CDC expiry date"
                placeholder="CDC expiry date"
                type="date"
                value={addForm.cdc_expiry_date}
                onChange={(e) => setAddField("cdc_expiry_date", e.target.value)}
                required={Boolean(addForm.cdc_number.trim())}
              />
              <InputField
                label="Indos number"
                placeholder="Indos number"
                value={addForm.indos_number}
                onChange={(e) => setAddField("indos_number", e.target.value)}
              />
              <InputField
                label="License authority"
                placeholder="License authority"
                value={addForm.license}
                onChange={(e) => setAddField("license", e.target.value)}
              />
              <InputField
                label="Email"
                placeholder="Email"
                type="email"
                value={addForm.email_id}
                onChange={(e) => setAddField("email_id", e.target.value)}
              />
              <InputField
                label="Contact no."
                placeholder="Contact"
                value={addForm.contact_no_1}
                onChange={(e) => setAddField("contact_no_1", e.target.value)}
              />
              <SelectField
                label="Availability status"
                placeholder="Select status"
                options={opts.availabilityStatus}
                value={addForm.availability_status_id}
                onChange={(e) => setAddField("availability_status_id", e.target.value)}
              />
              <InputField
                label="Availability date"
                placeholder="Availability date"
                type="date"
                value={addForm.availability_date}
                onChange={(e) => setAddField("availability_date", e.target.value)}
              />
              <InputField
                label="Follow-up date"
                placeholder="Follow-up date"
                type="date"
                value={addForm.followup_date}
                onChange={(e) => setAddField("followup_date", e.target.value)}
              />
              <div className="mb-2">
                <label className={ADD_LABEL}>Aramco charter</label>
                <select className={INPUT_CLS} value={addForm.aramco_charter} onChange={(e) => setAddField("aramco_charter", e.target.value)}>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="mb-2">
                <label className={ADD_LABEL}>Upload photo</label>
                <input
                  type="file"
                  className={INPUT_CLS}
                  accept="image/*"
                  onChange={(e) => setAddPhotoFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="mb-2">
                <label className={ADD_LABEL}>CV Upload</label>
                <input
                  type="file"
                  className={INPUT_CLS}
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setAddCvFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="mb-2 lg:col-span-2">
                <label className={ADD_LABEL}>Remarks</label>
                <input
                  className={INPUT_CLS}
                  value={addForm.remark}
                  onChange={(e) => setAddField("remark", e.target.value)}
                  placeholder="Optional remarks"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "6px 16px", fontSize: 13 }}
                onClick={() => navigate("/admin")}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: "6px 20px", fontSize: 13 }} disabled={addSaving}>
                {addSaving ? "Creating…" : "Create candidate"}
              </button>
      </div>
          </form>
        </div>
      )}

      {!isAddRoute && (
      <>
      {/* Search form */}
      <div className="candidates-filter-card rounded-lg mb-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-sm)" }}>
        <form onSubmit={handleSearch}>
          <div className="candidates-filter-grid">
            {sf("rank", "Rank", "Select Rank", opts.ranks)}
            {sf("nationality", "Nationality", "Select Nationality", opts.countries)}
            {inf("given_name", "Given Name", "Given Name")}
            {inf("surname", "Surname", "Surname")}
            {inf("passport_number", "Passport Number", "Passport Number")}
            {inf("cdc_number", "CDC Number", "CDC Number")}
            {inf("indos_number", "Indos Number", "Indos Number")}
            {inf("contact_no", "Contact No", "Contact No")}
            {inf("email", "Email ID", "Email ID")}
            {sf("vessel_type", "Vessel Type", "Select Vessel Type", opts.vesselTypes)}
            {sf("license_authority", "License Authority", "Select License Authority", opts.countries)}
            {sf("engine_make", "Engine Make/Type", "Select Engine Make/Type", opts.engineMakes)}
            {sf("availability_status", "Availability Status", "Select Availability Status", opts.availabilityStatus)}
            {inf("availability_from", "Availability From", "Availability From", "date")}
            {inf("availability_to", "Availability To", "Availability To", "date")}
            {sf("USAvisa_status", "USA Visa Status", "Select USA Visa Status", opts.usaVisaStatus)}
            <div className={FIELD_WRAP}>
              <label>Aramco charter</label>
              <select className={INPUT_CLS} value={filters.aramco_charter} onChange={(e) => setField("aramco_charter", e.target.value)}>
                <option value="">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            {inf("candidate_id", "MCM crew ID", "MCM crew ID")}
          </div>
          <div className="candidates-filter-actions">
            <button type="button" onClick={handleClear} className="btn btn-secondary btn-sm">Clear</button>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </div>
        </form>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg mb-4" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--danger)" }}>
          <strong className="font-semibold">Error</strong> — {error.message}
        </div>
      )}

      {/* Table */}
      <div className="rounded-none candidates-list-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-sm)" }}>
        <div className="candidates-toolbar" style={{ borderBottom: "1px solid var(--border-primary)", background: "var(--bg-secondary)" }}>
          <div className="candidates-toolbar-title">
            <h2 className="text-sm font-semibold m-0" style={{ color: "var(--text-primary)" }}>Candidates list</h2>
            {isFetching && !isLoading && (
              <span className="text-[10px] font-medium uppercase tracking-wide animate-pulse" style={{ color: "var(--accent)" }}>Updating</span>
            )}
          </div>
          <div className="candidates-toolbar-tools">
            <label>
              From
              <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="form-control" />
            </label>
            <label>
              To
              <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="form-control" />
            </label>
            <button
              type="button"
              onClick={exportRemarks}
              disabled={exportBusy}
              className="btn btn-primary btn-sm"
              style={{ background: "var(--teal-600)", borderColor: "var(--teal-600)", opacity: exportBusy ? 0.7 : 1 }}
            >
              {exportBusy ? "Exporting…" : "Export remarks"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48" style={{ color: "var(--text-tertiary)" }}>Loading candidates...</div>
        ) : (
          <div className="candidates-table-scroll">
            <table className="candidates-table">
              <colgroup>
                {CANDIDATE_TABLE_COL_WIDTHS.map((w, idx) => (
                  <col key={idx} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className={candidateColumnHeaderClass(col.key)}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ background: "var(--bg-card)", color: "var(--text-primary)" }} className={isFetching && !isLoading ? "opacity-60" : ""}>
                {candidates.length > 0 ? candidates.map((c, i) => (
                  <tr key={c.id ?? i}>
                    <td className="candidates-col-narrow candidates-cell-cid">
                      <button type="button" onClick={() => handleView(c.id)} className="font-semibold hover:underline tabular-nums" style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>{c.id}</button>
                      </td>
                    <td className="candidates-col-name candidates-col-person candidates-cell-wrap uppercase font-semibold">{fullName(c)}</td>
                    <td className="candidates-col-mid candidates-cell-wrap uppercase">{displayNat(c)}</td>
                    <td className="candidates-col-mid candidates-col-rank candidates-cell-wrap uppercase">{c.rank_name || "\u2014"}</td>
                    <td className="candidates-col-status uppercase" title={cellTitle(c.availability_status_name)}>
                      {c.availability_status_name ? (
                        <span className={`status-badge-pill ${statusTone(c.availability_status_name)}`}>
                          {c.availability_status_name}
                        </span>
                      ) : "\u2014"}
                      </td>
                    <td className="candidates-col-date candidates-col-availability-date">{fmtDate(c.availability_date)}</td>
                    <td className="candidates-col-date">{fmtDate(c.followup_date)}</td>
                    <td className="candidates-col-mid candidates-col-contact candidates-cell-wrap font-medium tabular-nums">{c.contact_no_1 || c.contact1 || "\u2014"}</td>
                    <td className="candidates-col-mid candidates-col-vtype candidates-cell-wrap uppercase">{c.vessel_type_name || "\u2014"}</td>
                    <td className="candidates-col-name candidates-col-vessel candidates-cell-wrap uppercase">{c.vessel_name || "\u2014"}</td>
                    <RemarksCell c={c} onView={handleView} />
                    <td className="candidates-col-action">
                      <div className="action-icons-toolbar candidates-action-cell">
                        <button type="button" onClick={() => handleDelete(c.id)} className="action-icon-btn action-icon-delete" title="Delete">
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>No candidates found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && total > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}

        {!isLoading && total === 0 && (
          <div className="px-4 py-2 text-xs" style={{ borderTop: "1px solid var(--border-primary)", background: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
            No results
          </div>
        )}
        </div>
      </>
      )}
    </div>
  );
}
