import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const EMPTY_FORM = { name: "", email: "", password: "", role: "admin" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch("/api/auth/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, password: "", role: u.role || "admin" });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { name: form.name, email: form.email, role: form.role };
      if (form.password) payload.password = form.password;

      if (editingId) {
        const res = await apiFetch(`/api/auth/users/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Update failed"); }
      } else {
        if (!form.password) { setError("Password is required for new users"); setSaving(false); return; }
        payload.password = form.password;
        const res = await apiFetch("/api/auth/users", { method: "POST", body: JSON.stringify(payload) });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Create failed"); }
      }
      setShowModal(false);
      fetchUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"?`)) return;
    try {
      const res = await apiFetch(`/api/auth/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Delete failed");
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const fmtDate = (v) => {
    if (!v) return "\u2014";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "\u2014" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-sm)" }}>
        <div
          className="candidates-toolbar"
          style={{
            borderBottom: "1px solid var(--border-primary)",
            background: "var(--bg-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            padding: "0.5rem 0.75rem",
          }}
        >
          <div className="candidates-toolbar-title">
            <h2 className="text-sm font-semibold m-0" style={{ color: "var(--text-primary)" }}>User Management</h2>
            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
              Manage admin and user accounts
            </span>
          </div>
          <div className="candidates-toolbar-tools" style={{ marginLeft: "auto", display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={openAdd} className="btn btn-primary btn-sm">
              + Add User
            </button>
          </div>
        </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>Loading users...</div>
        ) : (
          <div className="table-responsive">
          <table className="table w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border-primary)" }}>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right users-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center" style={{ color: "var(--text-tertiary)" }}>No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border-primary)" }}>
                  <td className="px-4 py-3" style={{ color: "var(--text-tertiary)" }}>{u.id}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{u.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        background: u.role === "admin" ? "rgba(30,82,152,0.1)" : "var(--bg-tertiary)",
                        color: u.role === "admin" ? "var(--accent)" : "var(--text-secondary)",
                      }}
                    >
                      {(u.role || "admin").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 cell-nowrap" style={{ color: "var(--text-tertiary)" }} title={u.created_at != null ? String(u.created_at) : ""}>{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3 users-actions-cell">
                    <div className="action-icons-toolbar users-actions-toolbar">
                      <button type="button" onClick={() => openEdit(u)} className="action-icon-btn action-icon-edit" title="Edit"><i className="fas fa-pen" /></button>
                      <button type="button" onClick={() => handleDelete(u.id, u.name)} className="action-icon-btn action-icon-delete" title="Delete"><i className="fas fa-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-xl w-full max-w-md mx-4 overflow-hidden" style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-lg)" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)", background: "var(--bg-secondary)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{editingId ? "Edit User" : "Add New User"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-control" placeholder="Full name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-control" placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Password {editingId && <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>(leave blank to keep current)</span>}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="form-control" placeholder={editingId ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "Min 6 characters"} required={!editingId} minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="form-control">
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving..." : editingId ? "Update" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
