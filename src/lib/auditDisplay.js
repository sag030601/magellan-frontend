/** @param {unknown} v */
export function parseEpochMs(v) {
  if (v == null || String(v).trim() === "") return null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isNaN(t) ? null : t;
  }
  const n = Number(v);
  if (!Number.isNaN(n) && String(v).trim() !== "") {
    return n > 1e12 ? n : n * 1000;
  }
  const ms = Date.parse(String(v));
  return Number.isNaN(ms) ? null : ms;
}

/** @param {unknown} v */
export function fmtAuditWhen(v) {
  const ms = parseEpochMs(v);
  if (ms == null) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}

/**
 * Prefer resolved display name; never show bare numeric user ids.
 * @param {Record<string, unknown>|null|undefined} row
 * @param {string} nameKey
 * @param {string} [idKey]
 */
export function fmtAuditUserName(row, nameKey, idKey) {
  const name = row?.[nameKey];
  if (name != null && String(name).trim() && !/^\d+$/.test(String(name).trim())) {
    return String(name).trim();
  }
  if (idKey && row?.[idKey] != null && !/^\d+$/.test(String(row[idKey]).trim())) {
    const alt = String(row[idKey]).trim();
    if (alt.includes("@")) return alt.split("@")[0];
    return alt;
  }
  return "—";
}

/** @param {Record<string, unknown>|null|undefined} row */
export function getRecordAudit(row) {
  if (!row) {
    return {
      createdAt: "—",
      createdBy: "—",
      updatedAt: "—",
      updatedBy: "—",
    };
  }
  const createdAt = fmtAuditWhen(row.created_at_audit ?? row.created_at);
  const updatedAt = fmtAuditWhen(row.updated_at_audit ?? row.updated_at);
  const createdBy = fmtAuditUserName(row, "created_by_name", "created_by");
  const updatedBy = fmtAuditUserName(row, "updated_by_name", "updated_by");
  return {
    createdAt,
    createdBy: createdBy !== "—" ? createdBy : fmtAuditUserName(row, "added_by_name", "added_by"),
    updatedAt,
    updatedBy: updatedBy !== "—" ? updatedBy : fmtAuditUserName(row, "edited_by_name", "edited_by"),
  };
}
