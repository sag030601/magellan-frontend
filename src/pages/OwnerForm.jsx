import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

const EMPTY = {
  registered_ship_owner_name: "",
  ship_owner_representative_name: "",
  principle_name: "",
  email: "",
  contact_number: "",
  registered_ship_owner_address: "",
  ship_owner_representative_address: "",
  principle_address: "",
  validity_type: "",
  validity_date: "",
  agreement_type: "",
};

export default function OwnerForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId && /^\d+$/.test(String(editId)));
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [agreementFile, setAgreementFile] = useState(null);
  const [managerFile, setManagerFile] = useState(null);
  const [otherFile, setOtherFile] = useState(null);
  const navigate = useNavigate();

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch(`/api/owners/${editId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load owner");
        const owner = data.owner || {};
        setForm({
          registered_ship_owner_name: owner.registered_ship_owner_name || "",
          ship_owner_representative_name: owner.ship_owner_representative_name || "",
          principle_name: owner.principle_name || "",
          email: owner.email || "",
          contact_number: owner.contact_number || "",
          registered_ship_owner_address: owner.registered_ship_owner_address || "",
          ship_owner_representative_address: owner.ship_owner_representative_address || "",
          principle_address: owner.principle_address || "",
          validity_type: owner.validity_type || "",
          validity_date:
            owner.validity_date && /^\d{4}-\d{2}-\d{2}/.test(String(owner.validity_date))
              ? String(owner.validity_date).slice(0, 10)
              : "",
          agreement_type: owner.agreement_type || "",
        });
      } catch (err) {
        setError(err?.message || "Failed to load owner");
      } finally {
        setLoading(false);
      }
    })();
  }, [editId, isEdit]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
      if (agreementFile) fd.append("agreement_file", agreementFile);
      if (managerFile) fd.append("manager_chain_agreement_file", managerFile);
      if (otherFile) fd.append("other_document_file", otherFile);
      const res = await apiFetch(isEdit ? `/api/owners/${editId}` : "/api/owners", {
        method: isEdit ? "PUT" : "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save owner");
      navigate("/admin/owner");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {isEdit ? "Edit Owner / Principal" : "Add Owner / Principal"}
        </h1>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && (
        <div className="rounded-lg p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", color: "var(--text-tertiary)" }}>
          Loading owner...
        </div>
      )}
      {!loading && (
      <form onSubmit={onSubmit} className="rounded-lg p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="form-row">
          <div className="form-group">
            <label>Registered Ship Owner Name</label>
            <input className="form-control" value={form.registered_ship_owner_name} onChange={(e) => setField("registered_ship_owner_name", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Ship Owner Representative Name</label>
            <input className="form-control" value={form.ship_owner_representative_name} onChange={(e) => setField("ship_owner_representative_name", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Name of Employer</label>
            <input className="form-control" required value={form.principle_name} onChange={(e) => setField("principle_name", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-control" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Contact Number</label>
            <input className="form-control" value={form.contact_number} onChange={(e) => setField("contact_number", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Validity Type</label>
            <input className="form-control" value={form.validity_type} onChange={(e) => setField("validity_type", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Validity Date</label>
            <input className="form-control" type="date" value={form.validity_date} onChange={(e) => setField("validity_date", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Agreement Type</label>
            <input className="form-control" value={form.agreement_type} onChange={(e) => setField("agreement_type", e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label>Registered Ship Owner Address</label>
            <textarea className="form-control" rows={3} value={form.registered_ship_owner_address} onChange={(e) => setField("registered_ship_owner_address", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Ship Owner Representative Address</label>
            <textarea className="form-control" rows={3} value={form.ship_owner_representative_address} onChange={(e) => setField("ship_owner_representative_address", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Principle Address</label>
            <textarea className="form-control" rows={3} value={form.principle_address} onChange={(e) => setField("principle_address", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Agreement (PDF)</label>
            <input className="form-control" type="file" accept=".pdf,application/pdf" onChange={(e) => setAgreementFile(e.target.files?.[0] || null)} />
          </div>
          <div className="form-group">
            <label>Supported by Manning / Manager Chain (PDF)</label>
            <input className="form-control" type="file" accept=".pdf,application/pdf" onChange={(e) => setManagerFile(e.target.files?.[0] || null)} />
          </div>
          <div className="form-group">
            <label>Other document (PDF or passport photo JPEG/PNG)</label>
            <input
              className="form-control"
              type="file"
              accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setOtherFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/admin/owner")}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Owner" : "Save Owner"}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
