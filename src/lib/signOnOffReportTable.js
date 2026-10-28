export function formatDate(val) {
  if (!val) return "—";
  const d = typeof val === "number" ? new Date(val * 1000) : new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function toEpochMillis(val) {
  if (!val) return null;
  const d = typeof val === "number" ? new Date(val * 1000) : new Date(val);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

export function daysRemaining(signOffDue) {
  if (!signOffDue) return "—";
  try {
    const ms = toEpochMillis(signOffDue);
    if (!ms) return "—";
    const due = new Date(ms);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due <= today) return "0Y 0M 0D";
    let totalMonths = (due.getFullYear() - today.getFullYear()) * 12 + (due.getMonth() - today.getMonth());
    if (due.getDate() < today.getDate()) totalMonths -= 1;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const from = new Date(today.getFullYear(), today.getMonth() + totalMonths, today.getDate());
    const days = Math.max(0, Math.round((due - from) / 86400000));
    return `${years}Y ${months}M ${days}D`;
  } catch {
    return "—";
  }
}

export function cap(str) {
  return str != null && String(str).trim() !== "" ? String(str).toUpperCase() : "—";
}

/** CSV and PDF use this table. The on-screen grid renders the same `records`. */
export function buildExportTable(reportType, records) {
  const today = new Date().toISOString().slice(0, 10);

  if (reportType === "signOn") {
    return {
      headers: ["Crew ID", "Crew Name", "Rank", "Nationality", "Current Ship", "DOB", "Place of Birth", "Passport No.", "PPT Issue", "PPT Expiry", "CDC No.", "CDC Issue", "CDC Expiry", "Contract Start", "Sign On Date", "Sign Off Due"],
      rows: records.map((r) => [
        r.candidate_id, `${cap(r.given_name)} ${cap(r.surname)}`, cap(r.rank_name), cap(r.nationality_name), cap(r.vessel_name),
        formatDate(r.date_of_birth), cap(r.place_of_birth), r.passport_number ?? "", formatDate(r.passport_issue_date), formatDate(r.passport_expiry_date),
        r.cdc_number ?? "", formatDate(r.cdc_issue_date), formatDate(r.cdc_expiry_date),
        formatDate(r.contract_start_date), formatDate(r.sign_on_date), formatDate(r.sign_off_due),
      ]),
      baseName: `sign-on-report-${today}`,
    };
  }

  if (reportType === "allSignOn") {
    return {
      headers: ["Crew ID", "Crew Name", "Rank", "DOB", "Current Ship", "Status", "Contract Start", "Sign On Date", "Sign Off Due", "Days Remaining"],
      rows: records.map((r) => {
        const status = r.availability_status_name
          ? String(r.availability_status_name).toUpperCase()
          : "—";
        return [r.candidate_id, `${cap(r.given_name)} ${cap(r.surname)}`, cap(r.rank_name), formatDate(r.date_of_birth), cap(r.vessel_name), status, formatDate(r.contract_start_date), formatDate(r.sign_on_date), formatDate(r.sign_off_due), daysRemaining(r.sign_off_due)];
      }),
      baseName: `all-sign-on-report-${today}`,
    };
  }

  return {
    headers: ["Crew ID", "Crew Name", "Rank", "DOB", "Current/Previous Ship", "Status", "Sign On Date", "Sign Off Date", "Contract Days", "Sign Off Reason"],
    rows: records.map((r) => [
      r.candidate_id, `${cap(r.given_name)} ${cap(r.surname)}`, cap(r.rank_name), formatDate(r.date_of_birth), cap(r.vessel_name),
      r.availability_status_name ? String(r.availability_status_name).toUpperCase() : "ON-LEAVE",
      formatDate(r.sign_on_date), formatDate(r.sign_off_date), daysRemaining(r.sign_off_due), cap(r.sign_off_reason),
    ]),
    baseName: `sign-off-report-${today}`,
  };
}
