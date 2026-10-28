/**
 * Sign-on/off report state for the current tab.
 *
 * Kept in the existing in-memory list store (not sessionStorage or localStorage).
 * That store survives route changes inside the SPA, including Candidate Details
 * and Back to Reports, and is cleared on logout or a full page reload.
 * Report rows include passport and CDC fields, so they are not written to
 * browser storage that would outlive the tab session module.
 */
import { readListFilterMemory, writeListFilterMemory } from "./listFilterMemory.js";

export const SIGN_ON_OFF_REPORT_SESSION_VERSION = 1;

export const EMPTY_SIGN_ON_OFF_FILTERS = {
  employer_principal: "",
  vessel_name: "",
  rank: "",
  status: "",
  nationality: "",
  vessel_type: "",
  from_date: "",
  to_date: "",
};

const FILTER_KEYS = Object.keys(EMPTY_SIGN_ON_OFF_FILTERS);

export function signOnOffReportSessionKey(userId) {
  return `glts:admin:sign-on-off-report-state:${String(userId)}`;
}

export function emptySignOnOffFilters() {
  return { ...EMPTY_SIGN_ON_OFF_FILTERS };
}

export function sanitizeSignOnOffFilters(raw) {
  const filters = emptySignOnOffFilters();
  if (!raw || typeof raw !== "object") return filters;
  for (const key of FILTER_KEYS) {
    if (raw[key] != null) filters[key] = String(raw[key]);
  }
  return filters;
}

/**
 * @returns {{ filters: object, result: { records: object[], reportType: unknown, from: unknown, to: unknown } } | null}
 */
export function generatedFromResponse(submittedFilters, data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.records)) return null;
  return {
    filters: sanitizeSignOnOffFilters(submittedFilters),
    result: {
      records: data.records,
      reportType: data.reportType ?? null,
      from: data.from ?? null,
      to: data.to ?? null,
    },
  };
}

export function parseSignOnOffReportSession(saved) {
  if (!saved || typeof saved !== "object" || saved.version !== SIGN_ON_OFF_REPORT_SESSION_VERSION) {
    return { filters: emptySignOnOffFilters(), generated: null };
  }
  const generated = generatedFromResponse(saved.generated?.filters, saved.generated?.result);
  return {
    filters: sanitizeSignOnOffFilters(saved.filters),
    generated,
  };
}

export function readSignOnOffReportSession(userId) {
  if (userId == null || String(userId).trim() === "") {
    return { filters: emptySignOnOffFilters(), generated: null };
  }
  return parseSignOnOffReportSession(readListFilterMemory(signOnOffReportSessionKey(userId)));
}

export function writeSignOnOffReportSession(userId, { filters, generated }) {
  if (userId == null || String(userId).trim() === "") return;
  const nextGenerated = generated
    ? generatedFromResponse(generated.filters, generated.result)
    : null;
  writeListFilterMemory(signOnOffReportSessionKey(userId), {
    version: SIGN_ON_OFF_REPORT_SESSION_VERSION,
    filters: sanitizeSignOnOffFilters(filters),
    generated: nextGenerated,
  });
}
