import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { documentHref } from "../lib/documentUrl";
import "./VesselForm.css";

const EMPTY = {
  employer: "",
  ship_name: "",
  imo_number: "",
  official_number: "",
  call_sign: "",
  gross_tonnage: "",
  kilo_watt: "",
  ship_type: "",
  ship_flag: "",
  policy_number: "",
  policy_validity: "",
  mlc_certificate_number: "",
  mlc_issue_date: "",
  financial_security_document_number: "",
  financial_security_document_validity: "",
  is_cba: "0",
};

const FILE_KEYS = [
  "sea_document",
  "cba_document",
  "policy_document",
  "mlc_certificate",
  "financial_security_document",
  "dmlc_part_1",
  "dmlc_part_2",
];

function toDateInput(v) {
  if (v == null || v === "") return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function VesselForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId && String(editId).match(/^\d+$/));
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState(() =>
    Object.fromEntries(FILE_KEYS.map((k) => [k, null])),
  );
  const [existingDocs, setExistingDocs] = useState(() => Object.fromEntries(FILE_KEYS.map((k) => [k, ""])));
  const [opts, setOpts] = useState({ employers: [], shipTypes: [], shipFlags: [] });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = useCallback((k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
  }, []);

  const setFile = useCallback((k, file) => {
    setFiles((p) => ({ ...p, [k]: file || null }));
  }, []);

  const loadOptions = useCallback(async () => {
    const r = await apiFetch("/api/vessels/meta/options");
    if (!r.ok) return;
    const d = await r.json().catch(() => ({}));
    setOpts({
      employers: Array.isArray(d.employers) ? d.employers : [],
      shipTypes: Array.isArray(d.shipTypes) ? d.shipTypes : [],
      shipFlags: Array.isArray(d.shipFlags) ? d.shipFlags : [],
    });
  }, []);

  const loadVessel = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    try {
      const r = await apiFetch(`/api/vessels/${editId}`);
      if (!r.ok) throw new Error("Vessel not found");
      const v = await r.json();
      setForm({
        employer: v.employer ?? "",
        ship_name: v.ship_name ?? "",
        imo_number: v.imo_number ?? "",
        official_number: v.official_number ?? "",
        call_sign: v.call_sign ?? "",
        gross_tonnage: v.gross_tonnage != null ? String(v.gross_tonnage) : "",
        kilo_watt: v.kilo_watt != null ? String(v.kilo_watt) : "",
        ship_type: v.ship_type ?? "",
        ship_flag: v.ship_flag ?? "",
        policy_number: v.policy_number ?? "",
        policy_validity: toDateInput(v.policy_validity),
        mlc_certificate_number: v.mlc_certificate_number ?? "",
        mlc_issue_date: toDateInput(v.mlc_issue_date),
        financial_security_document_number: v.financial_security_document_number ?? "",
        financial_security_document_validity: toDateInput(v.financial_security_document_validity),
        is_cba: v.is_cba === 1 || v.is_cba === true || String(v.is_cba) === "1" ? "1" : "0",
      });
      const doc = {};
      for (const k of FILE_KEYS) {
        doc[k] =
          k === "mlc_certificate"
            ? v.mlc_certificate || v.mlc_certificate_document || ""
            : v[k] || "";
      }
      setExistingDocs(doc);
    } catch (e) {
      setError(e?.message || "Failed to load vessel");
    } finally {
      setLoading(false);
    }
  }, [editId, isEdit]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadVessel();
  }, [loadVessel]);

  const resetForm = () => {
    if (isEdit) {
      loadVessel();
      setFiles(Object.fromEntries(FILE_KEYS.map((k) => [k, null])));
    } else {
      setForm(EMPTY);
      setFiles(Object.fromEntries(FILE_KEYS.map((k) => [k, null])));
    }
    setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        fd.append(k, v ?? "");
      });
      for (const k of FILE_KEYS) {
        const f = files[k];
        if (f) fd.append(k, f);
      }

      const url = isEdit ? `/api/vessels/${editId}` : "/api/vessels";
      const res = await apiFetch(url, {
        method: isEdit ? "PUT" : "POST",
        body: fd,
        headers: {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save vessel");
      navigate("/admin/vessel");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const docHint = (key) => {
    const cur = existingDocs[key];
    if (!cur) return null;
    const href = documentHref(cur);
    if (!href) return <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Current file on record</span>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--accent)" }}>
        View current file
      </a>
    );
  };

  const title = useMemo(() => (isEdit ? "Edit Vessel" : "Add Vessel"), [isEdit]);

  if (loading) {
    return (
      <div className="vessel-form-page flex items-center justify-center py-24" style={{ color: "var(--text-tertiary)" }}>
        <i className="fas fa-spinner fa-spin text-2xl mr-2" />
        Loading…
      </div>
    );
  }

  return (
    <div className="vessel-form-page space-y-4 max-w-[100%]">
      <div className="rounded-lg px-4 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <h1 className="text-lg font-semibold m-0" style={{ color: "var(--marine-700)" }}>{title}</h1>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="rounded-lg p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        {/* Ship Details */}
        <div className="vessel-form-section">
          <div className="vessel-form-section-title">Ship Details</div>
          <div className="vessel-form-grid">
            <div className="vessel-field">
              <label>Employer</label>
              <select className="form-control" value={form.employer} onChange={(e) => setField("employer", e.target.value)}>
                <option value="">Select Employer</option>
                {opts.employers.map((o) => (
                  <option key={o.id} value={o.principle_name || `Owner #${o.id}`}>{o.principle_name || `Owner #${o.id}`}</option>
                ))}
              </select>
            </div>
            <div className="vessel-field">
              <label>Name of ship<span className="req">*</span></label>
              <input className="form-control" required value={form.ship_name} onChange={(e) => setField("ship_name", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>IMO Number<span className="req">*</span></label>
              <input className="form-control" required value={form.imo_number} onChange={(e) => setField("imo_number", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>Official Number</label>
              <input className="form-control" value={form.official_number} onChange={(e) => setField("official_number", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>Call Sign<span className="req">*</span></label>
              <input className="form-control" required value={form.call_sign} onChange={(e) => setField("call_sign", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>Gross Tonnage<span className="req">*</span></label>
              <input className="form-control" required value={form.gross_tonnage} onChange={(e) => setField("gross_tonnage", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>Kilo Watt<span className="req">*</span></label>
              <input className="form-control" required value={form.kilo_watt} onChange={(e) => setField("kilo_watt", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>Ship Type<span className="req">*</span></label>
              <input
                className="form-control"
                required
                list="vessel-ship-types"
                value={form.ship_type}
                onChange={(e) => setField("ship_type", e.target.value)}
                placeholder="Select or type"
              />
              <datalist id="vessel-ship-types">
                {opts.shipTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="vessel-field">
              <label>Ship Flag<span className="req">*</span></label>
              <input
                className="form-control"
                required
                list="vessel-ship-flags"
                value={form.ship_flag}
                onChange={(e) => setField("ship_flag", e.target.value)}
                placeholder="Select or type"
              />
              <datalist id="vessel-ship-flags">
                {opts.shipFlags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="vessel-field">
              <label>SEA</label>
              <input className="form-control" type="file" accept=".pdf,application/pdf" onChange={(e) => setFile("sea_document", e.target.files?.[0] || null)} />
              {docHint("sea_document")}
            </div>
            <div className="vessel-field">
              <label>SEA refer to CBA?</label>
              <div className="vessel-radio-row">
                <label className="flex items-center gap-2 m-0 text-sm" style={{ color: "var(--text-primary)" }}>
                  <input type="radio" name="is_cba" checked={form.is_cba === "1"} onChange={() => setField("is_cba", "1")} />
                  Yes
                </label>
                <label className="flex items-center gap-2 m-0 text-sm" style={{ color: "var(--text-primary)" }}>
                  <input type="radio" name="is_cba" checked={form.is_cba === "0"} onChange={() => setField("is_cba", "0")} />
                  No
                </label>
              </div>
            </div>
            <div className="vessel-field">
              <label>CBA Document</label>
              <input className="form-control" type="file" accept=".pdf,application/pdf" onChange={(e) => setFile("cba_document", e.target.files?.[0] || null)} />
              {docHint("cba_document")}
            </div>
          </div>
        </div>

        {/* P & I */}
        <div className="vessel-form-section">
          <div className="vessel-form-section-title">P &amp; I Details</div>
          <div className="vessel-form-grid">
            <div className="vessel-field">
              <label>P &amp; I Policy Number<span className="req">*</span></label>
              <input className="form-control" required value={form.policy_number} onChange={(e) => setField("policy_number", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>Policy Date<span className="req">*</span></label>
              <input className="form-control" type="date" required value={form.policy_validity} onChange={(e) => setField("policy_validity", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>Policy Document</label>
              <input className="form-control" type="file" accept=".pdf,application/pdf" onChange={(e) => setFile("policy_document", e.target.files?.[0] || null)} />
              {docHint("policy_document")}
            </div>
          </div>
        </div>

        {/* MLC */}
        <div className="vessel-form-section">
          <div className="vessel-form-section-title">MLC Details</div>
          <div className="vessel-form-grid">
            <div className="vessel-field">
              <label>MLC Certificate No.</label>
              <input className="form-control" value={form.mlc_certificate_number} onChange={(e) => setField("mlc_certificate_number", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>MLC Issue Date</label>
              <input className="form-control" type="date" value={form.mlc_issue_date} onChange={(e) => setField("mlc_issue_date", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>MLC Certificate</label>
              <input className="form-control" type="file" accept=".pdf,application/pdf" onChange={(e) => setFile("mlc_certificate", e.target.files?.[0] || null)} />
              {docHint("mlc_certificate")}
            </div>
            <div className="vessel-field">
              <label>Financial Security No.</label>
              <input className="form-control" value={form.financial_security_document_number} onChange={(e) => setField("financial_security_document_number", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>Financial Security Doc</label>
              <input className="form-control" type="file" accept=".pdf,application/pdf" onChange={(e) => setFile("financial_security_document", e.target.files?.[0] || null)} />
              {docHint("financial_security_document")}
            </div>
            <div className="vessel-field">
              <label>Financial Validity</label>
              <input className="form-control" type="date" value={form.financial_security_document_validity} onChange={(e) => setField("financial_security_document_validity", e.target.value)} />
            </div>
            <div className="vessel-field">
              <label>DMLC Part 1</label>
              <input className="form-control" type="file" accept=".pdf,application/pdf" onChange={(e) => setFile("dmlc_part_1", e.target.files?.[0] || null)} />
              {docHint("dmlc_part_1")}
            </div>
            <div className="vessel-field">
              <label>DMLC Part 2</label>
              <input className="form-control" type="file" accept=".pdf,application/pdf" onChange={(e) => setFile("dmlc_part_2", e.target.files?.[0] || null)} />
              {docHint("dmlc_part_2")}
            </div>
          </div>
        </div>

        <div className="vessel-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save" : "Add"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>
            Reset
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate("/admin/vessel")} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
