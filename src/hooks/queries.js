import { apiFetch } from "../lib/api";

export const queryKeys = {
  vessels: ["vessels"],
  vessel: (id) => ["vessel", String(id)],
  vesselMetaOptions: ["vessel-meta-options"],
  owners: ["owners"],
  owner: (id) => ["owner", String(id)],
  reportFilterOptions: ["report-filter-options"],
  documentFilterOptions: ["document-filter-options"],
  users: ["users"],
  masterData: (key) => ["master-data", key],
  activityLogFilters: ["activity-log-filters"],
  activityLogs: (params) => ["activity-logs", params],
  candidate: (id) => ["candidate", String(id)],
};

export async function fetchVessels() {
  const res = await apiFetch("/api/vessels");
  if (!res.ok) throw new Error("Failed to fetch vessels");
  const data = await res.json();
  return data.vessels || [];
}

export async function fetchVessel(id) {
  const res = await apiFetch(`/api/vessels/${id}`);
  if (!res.ok) throw new Error("Vessel not found");
  return res.json();
}

export async function fetchVesselMetaOptions() {
  const res = await apiFetch("/api/vessels/meta/options");
  if (!res.ok) return { employers: [], shipTypes: [], shipFlags: [] };
  const d = await res.json().catch(() => ({}));
  return {
    employers: Array.isArray(d.employers) ? d.employers : [],
    shipTypes: Array.isArray(d.shipTypes) ? d.shipTypes : [],
    shipFlags: Array.isArray(d.shipFlags) ? d.shipFlags : [],
  };
}

export async function fetchOwners() {
  const res = await apiFetch("/api/owners");
  if (!res.ok) throw new Error("Failed to fetch owners");
  const data = await res.json();
  return data.owners || [];
}

export async function fetchOwner(id) {
  const res = await apiFetch(`/api/owners/${id}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load owner");
  return data.owner || {};
}

export async function fetchReportFilterOptions() {
  const res = await apiFetch("/api/reports/filter-options");
  if (!res.ok) throw new Error("Failed to load filter options");
  return res.json();
}

export async function fetchDocumentFilterOptions() {
  const res = await apiFetch("/api/reports/document-filter-options");
  if (!res.ok) throw new Error("Failed to load report options");
  return res.json();
}

export async function fetchSignOnOffReport(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const res = await apiFetch(`/api/reports/sign-on-off?${params}`);
  if (!res.ok) throw new Error("Failed to generate report");
  return res.json();
}

export async function fetchDocumentReport(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== "") params.set(k, v);
  });
  const res = await apiFetch(`/api/reports/document-filter?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to generate document report");
  return res.json();
}

export async function fetchUsers() {
  const res = await apiFetch("/api/auth/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  const data = await res.json();
  return data.users || [];
}

export async function fetchMasterData(key) {
  const res = await apiFetch(`/api/master-data/${key}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load");
  return Array.isArray(data.rows) ? data.rows : [];
}

export async function fetchActivityLogFilters() {
  try {
    const res = await apiFetch("/api/activity-logs/filters");
    if (!res.ok) return { actions: [], resourceTypes: [] };
    return res.json();
  } catch {
    return { actions: [], resourceTypes: [] };
  }
}

export async function fetchActivityLogs({ page, filters }) {
  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  Object.entries(filters).forEach(([k, v]) => {
    if (v != null && String(v).trim() !== "") params.set(k, String(v).trim());
  });
  const res = await apiFetch(`/api/activity-logs?${params}`);
  if (!res.ok) throw new Error("Failed to load activity log");
  return res.json();
}
