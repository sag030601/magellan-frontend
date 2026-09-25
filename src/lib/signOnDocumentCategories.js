/** Fixed Sign-on document categories (mirrors server/lib/signOnDocumentCategories.js). */
export const SIGN_ON_DOCUMENT_CATEGORIES = Object.freeze([
  { key: "flight_ticket", label: "Flight Ticket" },
  { key: "bg_emigration_form_1", label: "BG E-Migration Form 1" },
  { key: "signon_confirmation_email", label: "Sign-on Confirmation Email" },
  { key: "dg_signon_form_1", label: "DG Signon Form 1" },
  { key: "contract_c", label: "Contract/C" },
  { key: "cos", label: "COS" },
  { key: "others", label: "Others" },
]);

export function emptySignOnPendingFiles() {
  return Object.fromEntries(SIGN_ON_DOCUMENT_CATEGORIES.map((c) => [c.key, []]));
}

export function signOnCategoryLabel(key) {
  return SIGN_ON_DOCUMENT_CATEGORIES.find((c) => c.key === key)?.label || "Document";
}
