import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import RecordAuditPopover from "../components/RecordAuditPopover";
import { licenceDocumentUrl } from "../lib/documentUrl";
import {
  MAX_REQUEST_UPLOAD_MB,
  exceedsRequestLimit,
  pickDocumentFile,
  rejectOversizedFile,
  uploadErrorMessage,
} from "../lib/uploadLimits";
import "./CandidateDetails.css";

/** Passport / CDC / Visa / STCW rows in `seafarers_docs` — STCW tab lists all other document types */
const MAIN_SEAFARER_DOC_NAMES = ["Passport", "Seaman Book", "VISA Copy"];

function requireCompleteDate(val, label) {
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(String(val).trim())) {
    return `${label} is required.`;
  }
  return null;
}

/** `licences.type` values — parity with Laravel `candidate_edit` licence modal */
const LICENCE_TYPE_OPTIONS = [
  { value: "certificate_of_competency", label: "Certificate of Competency" },
  { value: "certificate_of_endorsement", label: "Certificate of Endorsement" },
  { value: "certificate_of_equivalency", label: "Certificate of Equivalency" },
];

/** `educations.type` — Laravel education modal */
const EDUCATION_TYPE_OPTIONS = [
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "board", label: "Board" },
];

/** Flag state — Processed by / Agent Name dropdown */
const FLAG_STATE_PROCESSED_BY_OPTIONS = [
  "FNSA Team",
  "Inchcape Team",
  "Magellan Crewing MGMT",
  "Zivya Marine Services.",
  "Vessel Charter",
  "Other Agent",
];

function stripHtmlToText(html) {
  if (html == null) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/\u00a0/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function remarkAttachmentUrl(fileUpload) {
  if (!fileUpload) return null;
  const raw = String(fileUpload);
  if (/^https?:\/\//i.test(raw)) return raw;
  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const rel = raw.replace(/^public\/?/, "").replace(/^storage\/?/, "").replace(/^\/+/, "");
  return rel ? `${apiBase}/uploads/${rel}` : null;
}

function formatRemarkDateTime(val) {
  if (val == null || val === "") return "";
  const num = Number(val);
  const d = !Number.isNaN(num) && String(val).match(/^\d+$/)
    ? new Date(num > 1e12 ? num : num * 1000)
    : new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(/\//g, "-");
}

const VERIFICATION_MODE_OPTIONS = [
  { value: "by_email", label: "By email" },
  { value: "by_website", label: "By website" },
  { value: "physical_letter", label: "Physical letter" },
  { value: "by_telecon", label: "By telecon" },
  { value: "other", label: "Other" },
];

const VISA_ENTRY_TYPE_OPTIONS = [
  { value: "single_entry", label: "Single entry" },
  { value: "multiple_entry", label: "Multiple entry" },
];

const TAB_PAGE_SIZES = [10, 25, 50];

/** Proposal row upload columns, in the same order as the Proposal form. */
const PROPOSAL_DOC_FIELDS = [
  { key: "cv_package_file", label: "CV Package (Aramco)", icon: "fa-file-lines" },
  { key: "proposal_email_file", label: "Proposal Email", icon: "fa-envelope" },
  { key: "approval_email_file", label: "Approval Email", icon: "fa-envelope-circle-check" },
  { key: "rejection_email_file", label: "Rejection Email", icon: "fa-envelope-open-text" },
  { key: "other_documents_file", label: "Other Documents", icon: "fa-paperclip" },
  { key: "upload_file", label: "Attachment", icon: "fa-paperclip" },
];

/** @param {unknown} url */
function fileExtensionOf(url) {
  const clean = String(url || "").split(/[?#]/)[0];
  const name = clean.split("/").pop() || "";
  const ext = name.includes(".") ? name.split(".").pop() : "";
  return ext ? ext.toLowerCase() : "";
}

const PREVIEWABLE_IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];

/** Proposal status dropdown — values stored in `planings.proposal_status`. */
const PROPOSAL_STATUS_OPTIONS = [
  { value: "to_be_proposed", label: "To be Proposed" },
  { value: "in_process", label: "In Process" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled_by_client", label: "Cancelled by Client" },
  { value: "rejected_by_manager", label: "Rejected by Manager" },
  { value: "approved_by_owner_client", label: "Approved by Owner/Client" },
  { value: "approved_by_crew_manager", label: "Approved by Crew Manager" },
  { value: "approved_by_dpa", label: "Approved by DPA" },
  { value: "approved_by_tech_manager", label: "Approved by Tech Manager" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "rejected_by_owner_client", label: "Rejected by Owner/Client" },
  { value: "on_hold_by_owner_client", label: "On-Hold by Owner/Client" },
  { value: "cv_shortlisted_by_manager", label: "CV Shortlisted by Manager" },
  { value: "awaiting_reply_from_client", label: "Awaiting Reply from Client" },
  { value: "awaiting_reply_from_manager", label: "Awaiting Reply from Manager" },
  { value: "no_response_by_manager", label: "No Response by Manager (15 DAYS+)" },
  { value: "no_response_by_owner_client", label: "No Response by Owner/Client (15 DAYS+)" },
];

function proposalStatusLabel(value) {
  if (value == null || String(value).trim() === "") return "-";
  const key = String(value).trim();
  const found = PROPOSAL_STATUS_OPTIONS.find((o) => o.value === key);
  if (found) return found.label;
  // Legacy free-text / old slugs (e.g. "awaiting_reply client")
  return key.replace(/_/g, " ");
}

/** Visa multi-document uploads (same order as the Visa form). */
const VISA_DOC_FIELDS = [
  { key: "loi_sponsor_file", label: "LOI Upload (Sponsor)", icon: "fa-file-signature" },
  { key: "visa_upload_file", label: "Visa Upload", icon: "fa-passport" },
  { key: "extended_visa_copy_1_file", label: "Extended Visa Copy (First)", icon: "fa-file" },
  { key: "extended_visa_copy_2_file", label: "Extended Visa Copy (2nd)", icon: "fa-file" },
  { key: "extended_visa_copy_3_file", label: "Extended Visa Copy (3rd)", icon: "fa-file" },
  { key: "extended_visa_copy_4_file", label: "Extended Visa Copy (4th)", icon: "fa-file" },
];

const VISA_SPONSOR_OPTIONS = [
  { value: "sedres_ksa", label: "SEDRES (KSA)" },
  { value: "inchcape_shipping_ksa", label: "INCHCAPE Shipping (KSA)" },
  { value: "fujairah_national_shipping_llc", label: "Fujairah National Shipping LLC" },
  { value: "magellan_crewing_management", label: "Magellan Crewing Management" },
  { value: "magellan_armada_ship_management_fzco", label: "Magellan Armada Ship Management FZCo" },
  { value: "kanoo_shipping_ksa", label: "Kanoo Shipping (KSA)" },
  { value: "adnoc", label: "ADNOC" },
  { value: "nmdc", label: "NMDC" },
  { value: "lamparel", label: "Lamparel" },
  { value: "n_a", label: "N/A" },
];

function visaSponsorLabel(value) {
  if (value == null || String(value).trim() === "") return "-";
  const key = String(value).trim();
  const found = VISA_SPONSOR_OPTIONS.find((o) => o.value === key);
  if (found) return found.label;
  return key.replace(/_/g, " ");
}

/** Resolve absolute URL for a seafarers/visa stored filename. */
function seafarersDocFileUrl(raw, candidateId) {
  if (raw == null || String(raw).trim() === "") return null;
  const s = String(raw);
  if (s.startsWith("http")) return s;
  const fileName = s.replace(/^\/+/, "").replace(/^public\/?/, "").split("/").pop();
  if (!fileName) return null;
  return `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${candidateId}/${fileName}`;
}

/** Uploaded visa documents for a row (plus legacy file_path as fallback). */
function visaDocumentsFor(row, candidateId) {
  const docs = VISA_DOC_FIELDS.filter(({ key }) => row?.[key]).map(({ key, label, icon }) => {
    const raw = String(row[key]);
    const fileName = raw.replace(/^\/+/, "").split("/").pop();
    const url = seafarersDocFileUrl(raw, candidateId);
    return { key, label, icon, fileName, url, ext: fileExtensionOf(fileName) };
  });
  // Legacy single attachment when no dedicated visa_upload_file is set.
  if (row?.file_path && !row?.visa_upload_file) {
    const raw = String(row.file_path);
    const fileName = raw.replace(/^\/+/, "").split("/").pop();
    const url = seafarersDocFileUrl(raw, candidateId);
    if (url) {
      docs.push({
        key: "file_path",
        label: "Visa Document",
        icon: "fa-passport",
        fileName,
        url,
        ext: fileExtensionOf(fileName),
      });
    }
  }
  return docs;
}

/** Uploaded proposal documents for a row, resolved to absolute URLs. */
function proposalDocumentsFor(row, candidateId) {
  return PROPOSAL_DOC_FIELDS.filter(({ key }) => row?.[key]).map(({ key, label, icon }) => {
    const raw = String(row[key]);
    const fileName = raw.replace(/^\/+/, "").split("/").pop();
    const url = raw.startsWith("http")
      ? raw
      : `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${candidateId}/${fileName}`;
    return { key, label, icon, fileName, url, ext: fileExtensionOf(fileName) };
  });
}

/** Action icons with audit details on hover. */
function ActionToolbar({ record, children, className = "", role, "aria-label": ariaLabel }) {
  return (
    <div
      className={`action-icons-toolbar action-audit-hover ${className}`.trim()}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
      <RecordAuditPopover record={record} />
    </div>
  );
}

function TabPagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  if (total <= 0) return null;
  return (
    <div className="tab-pagination-wrap">
      <div className="tab-pagination-info">
        <span>{total} records</span>
        <select
          className="form-control"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {TAB_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>
      </div>
      <div className="tab-pagination-actions">
        <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Prev
        </button>
        <span className="tab-pagination-page">{page} / {totalPages}</span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

/** Map legacy / free-text `visa_entry_type` values to select keys */
function normalizeVisaEntryTypeForSelect(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, "_");
  if (s === "single_entry" || s === "single" || s === "singleentry") return "single_entry";
  if (s === "multiple_entry" || s === "multiple" || s === "multipleentry") return "multiple_entry";
  return String(raw).trim();
}

function labelForVisaEntryType(value) {
  const v = normalizeVisaEntryTypeForSelect(value);
  const opt = VISA_ENTRY_TYPE_OPTIONS.find((o) => o.value === v);
  return opt ? opt.label : (value ? String(value).replace(/_/g, " ") : "-");
}

function labelForLicenceCapacity(value) {
  if (value == null || String(value).trim() === "") return "-";
  const opt = LICENCE_CAPACITY_OPTIONS.find((o) => o.value === value);
  return opt ? opt.label : String(value).replace(/_/g, " ").toUpperCase();
}

/** Calendar YYYY-MM-DD from API epoch / ISO / Date. Uses UTC date parts so a stored midnight does not slip a day. */
function calendarYmdFromValue(val) {
  if (val == null || val === "" || val === 0 || val === "0") return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  let d;
  if (typeof val === "string" && /^\d+$/.test(val.trim())) {
    const n = Number(val.trim());
    if (n <= 0) return "";
    d = new Date(n < 1e12 ? n * 1000 : n);
  } else if (typeof val === "number") {
    if (val <= 0) return "";
    d = new Date(val < 1e12 ? val * 1000 : val);
  } else {
    d = new Date(val);
  }
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Month/date/year display, e.g. 6/4/2000 — matches the candidate header DOB. */
function formatDateMonthDayYear(val) {
  const iso = calendarYmdFromValue(val);
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}/${y}`;
}

/** Match legacy blade date display (dd-mm-yyyy). */
function formatDocDate(val) {
  if (val == null || val === "") return "-";
  let d;
  if (typeof val === "number") {
    d = new Date(val < 1e12 ? val * 1000 : val);
  } else if (typeof val === "string" && /^\d+$/.test(val.trim())) {
    const n = Number(val);
    d = new Date(n < 1e12 ? n * 1000 : n);
  } else {
    d = new Date(val);
  }
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
}

function DocFileCell({ url }) {
  if (!url) return "N/A";
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      View
    </a>
  );
}

/** Company-generated forms/letters catalog — UI structure only; no APIs yet. */
const FORMS_TABS = [
  { key: "cv_company_owner", label: "CV-Company / Owner" },
  { key: "pre_joining_seafarers", label: "Pre-Joining Forms - Seafarers" },
  { key: "sea_rpsl_contract", label: "SEA / RPSL Contract" },
  { key: "company_policy", label: "Company Policy & Terms" },
  { key: "covering_letters", label: "Company Covering Letters" },
  { key: "pre_departure", label: "Pre-Departure Declaration" },
  { key: "sea_service_letters", label: "Experience / Sea Service Letters" },
  { key: "full_cv_package", label: "Full CV Package Download", note: "One File" },
  { key: "document_checklists", label: "Document Checklists" },
  { key: "email_templates", label: "Email Templates" },
];

const FORMS_CATALOG = {
  cv_company_owner: [
    { key: "magellan_mcm_cv", name: "Magellan (MCM CV Form)" },
    { key: "aramco_cv", name: "Aramco (CV Form)" },
  ],
  pre_joining_seafarers: [
    { key: "anti_bribery", name: "Anti Bribery Form", canPreview: true, canDownload: true, status: "generated" },
    { key: "criminal_civil_declaration", name: "Criminal & Civil Declaration Form" },
    { key: "drug_alcohol_declaration", name: "Drug & Alcohol Declaration Form" },
    { key: "marpol_declaration", name: "MARPOL - Read and Understood Declaration" },
    { key: "nda_policy", name: "Non-Disclosure Agreement (NDA) Policy" },
    { key: "cyber_security_policy", name: "Cyber Security Policy" },
    { key: "anti_smuggling_awareness", name: "Anti-Smuggling Awareness" },
    { key: "bank_account_declaration", name: "Bank Account Declaration Form" },
  ],
  sea_rpsl_contract: [
    { key: "magellan_rpsl_contract", name: "Magellan – RPSL Contract" },
  ],
  company_policy: [
    { key: "standard_terms_conditions_seafarers", name: "Standard Terms & Conditions for Seafarers" },
  ],
  covering_letters: [
    { key: "immigration_letter_log", name: "Immigration Letter / LOG (for Joining Vessel)" },
    { key: "letter_to_master", name: "Letter to Master (About Crew Joining Information to on-board Master)" },
    { key: "business_visa_ksa_mumbai", name: "Business Visa Covering Letter – KSA Mumbai, India" },
    { key: "business_visa_ksa_jakarta", name: "Business Visa Covering Letter - KSA Jakarta, Indonesia" },
  ],
  pre_departure: [],
  sea_service_letters: [
    { key: "sea_service_standard", name: "Sea Service Letter (Standard)" },
    { key: "sea_service_gmdss_renewal", name: "Sea Service Letter for GMDSS Renewal" },
    { key: "sea_service_coc_renewal", name: "Sea Service Letter for CoC Renewal" },
    { key: "sea_service_watchkeeping_ii4_deck", name: "Sea Service Letter for issuance of Watch-Keeping II/4 (Deck)" },
    { key: "sea_service_watchkeeping_iii4_engine", name: "Sea Service Letter for issuance of Watch-Keeping III/4 (Engine)" },
    { key: "sea_service_cop_ii5_deck", name: "Sea Service Letter for issuance of CoP II/5 (Deck)" },
    { key: "sea_service_cop_iii5_engine", name: "Sea Service Letter for issuance of CoP III/5 (Engine)" },
  ],
  full_cv_package: [
    { key: "standard_cv_package", name: "Standard CV Package Combined File for Client Proposal" },
    { key: "aramco_cv_package", name: "ARAMCO CV Package Combined File" },
    { key: "adnoc_cv_package", name: "ADNOC CV Package Combined File" },
  ],
  document_checklists: [
    { key: "mcm_prejoining_standard", name: "MCM Pre-Joining Document Checklist (Standard as per STCW / MLC)" },
    { key: "mcm_prejoining_offshore", name: "MCM Pre Joining Document Checklist (Offshore Vessel)" },
    { key: "mcm_prejoining_oil_tanker", name: "MCM Pre Joining Document Checklist (Oil Tanker Vessel)" },
    { key: "mcm_prejoining_chemical_tanker", name: "MCM Pre Joining Document Checklist (Chemical Tanker Vessel)" },
    { key: "mcm_prejoining_lpg", name: "MCM Pre Joining Document Checklist (LPG Carrier)" },
    { key: "aramco_cv_package_checklist", name: "ARAMCO CV Package Checklist", canPreview: true, canDownload: true, status: "generated" },
  ],
  email_templates: [
    { key: "welcome_new_seafarer", name: "Welcome Email to Seafarer (New/First Time to Magellan)" },
    { key: "welcome_recommended_seafarer", name: "Welcome Email to Seafarer (Recommend by Principal/Owner/DPA/Tech Team)" },
    { key: "joining_intimation_rejoining_indonesian", name: "Joining Intimation/Initial Email to Seafarers for Re-Joining vessels (Indonesian)" },
    { key: "cv_package_submission_port_captain", name: "CV Package Submission/ Crew Change Plan to Port Captain" },
    { key: "cv_package_submission_fnsa", name: "CV Package Submission to FNSA Team" },
    { key: "cv_package_submission_principal", name: "CV Package Submission to Principal (Standard Format)" },
    { key: "loi_request_sedres", name: "Letter of Invitation (LOI) Request to SEDRES" },
    { key: "loi_request_inchcape", name: "Letter of Invitation (LOI) Request to INCHCAPE" },
    { key: "crew_change_intimation_master", name: "Crew Change Intimation to On-board Master" },
    { key: "crew_change_plan_port_captain", name: "Crew Change Intimation/Plan to Port Captain" },
    { key: "crew_change_plan_port_agent", name: "Crew Change Intimation/Plan to Port Agent" },
    { key: "ksa_visa_initial_indonesian", name: "KSA Visa Initial Email to Seafarer (Indonesian)" },
    { key: "ksa_visa_initial_indian", name: "KSA Visa Initial Email to Seafarer (India)" },
    { key: "pre_joining_forms_email", name: "Pre-Joining Forms Email to Seafarers" },
    { key: "prior_joining_documents_confirmation_indian", name: "Prior Joining Vessel - Joining Documents Confirmation email to Seafarers (Indian)" },
  ],
};

function resolveFormsCatalogItem(item) {
  const status = item.status || "template";
  return {
    key: item.key,
    name: item.name,
    status,
    canPreview: item.canPreview === true,
    canDownload: item.canDownload === true,
  };
}

function formsCatalogStatusLabel(item) {
  if (item.status === "generated") return "Generated document available";
  if (item.status === "unavailable") return "Not available yet";
  return "Template available";
}

/** `licences.capacity` (COC grade) — Laravel `CandidateController::$capacities` */
const LICENCE_CAPACITY_OPTIONS = [
  { value: "master", label: "Master" },
  { value: "chief_officer", label: "Chief Officer" },
  { value: "officer_in_charge_of_navigational_watch", label: "Officer In Charge Of Navigational Watch" },
  { value: "chief_engineer", label: "Chief Engineer" },
  { value: "other_na_as_per_stcw95", label: "Other, N/A as per STCW95" },
  { value: "second_engineer", label: "2nd Engineer" },
  { value: "officer_in_charge_of_engineering_watch", label: "Officer In Charge Of Engineering Watch" },
  { value: "radio_officer", label: "Radio-officer" },
  { value: "gmdss_radio_operator", label: "GMDSS Radio Operator" },
  { value: "rating_forming_part_of_navigational_watch", label: "Rating Forming Part Of Navigational Watch" },
  { value: "rating_forming_part_of_engineering_watch", label: "Rating Forming Part Of Engineering Watch" },
  { value: "rating_as_an_able_seafarer_deck", label: "Rating as an Able Seafarer Deck" },
  { value: "ships_mechanic_qualification", label: "Ships Mechanic Qualification" },
  { value: "chief_cook", label: "Chief Cook" },
  { value: "electro_technical_officer", label: "Electro Technical Officer" },
  { value: "electro_technical_rating", label: "Electro-technical Rating" },
  { value: "electrical_system_engineer", label: "Electrical System Engineer" },
  { value: "gas_engineer", label: "Gas Engineer" },
  { value: "general_steward", label: "General Steward" },
];

/** Parse `YYYY-MM-DD` to local Date at midnight. */
function parseLocalDateYmd(s) {
  if (!s || typeof s !== "string") return null;
  const p = s.trim().split("-");
  if (p.length !== 3) return null;
  const y = Number(p[0]);
  const m = Number(p[1]);
  const d = Number(p[2]);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/** Normalize API date (unix seconds, ISO string, Date) to local calendar Date at midnight. */
function toLocalDateFromApi(val) {
  if (val == null || val === "") return null;
  if (typeof val === "number") {
    const ms = val < 1e12 ? val * 1000 : val;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return parseLocalDateYmd(s.slice(0, 10));
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function calcInclusivePeriod(signOn, signOff) {
  const a = parseLocalDateYmd(signOn);
  const b = parseLocalDateYmd(signOff);
  if (!a || !b) return "";
  if (a.getTime() > b.getTime()) return "";
  const dayMs = 86400000;
  const days = Math.floor((b.getTime() - a.getTime()) / dayMs) + 1;
  return `${days} days`;
}

function isOnBoardWithUsStatus(status) {
  const s = String(status || "").toLowerCase().replace(/-/g, " ");
  return s.includes("onboard") || s.includes("on board");
}

function availabilityTone(status) {
  const s = String(status || "").toLowerCase();
  if (!s || s === "n/a") return "status-badge--neutral";
  if (isOnBoardWithUsStatus(status)) return "status-badge--info";
  if (s.includes("leave") || s.includes("off")) return "status-badge--warn";
  if (s.includes("unavailable") || s.includes("hold") || s.includes("inactive")) return "status-badge--danger";
  return "status-badge--ok";
}

/** Aligns with list column `availability_status_name` and GET /api/candidates/:id enrich. */
function resolveAvailabilityStatusLabel(candidateLike, availabilityStatusOpts = []) {
  const c = candidateLike || {};
  const merged =
    (c.availability_status_name && String(c.availability_status_name).trim()) ||
    (c.availabilityStatus?.name && String(c.availabilityStatus.name).trim()) ||
    (c.availability_status?.name && String(c.availability_status.name).trim());
  if (merged) return merged;
  const id = c.availability_status_id;
  if (id === null || id === undefined || id === "") return null;
  const row = (availabilityStatusOpts || []).find((o) => String(o.id) === String(id));
  if (row?.name && String(row.name).trim()) return String(row.name).trim();
  return null;
}

const CandidateDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fromReports = location.state?.from === "reports";
  const backToPath = fromReports
    ? (location.state?.backTo || "/admin/report")
    : "/admin/candidates";
  const backLabel = fromReports
    ? (location.state?.backLabel || "Back to Reports")
    : "Back to Candidates";

  // State for main tabs (Basic, Documents, Services, Proposal, Medicals, Flag state, Pre Joining, Sign On, Sign Off, Communication, Forms & Letters)
  const [activeMainTab, setActiveMainTab] = useState("basic_details");
  const [activeSeafarersTab, setActiveSeafarersTab] = useState("BasicDetail");
  const [activeFormsTab, setActiveFormsTab] = useState("cv_company_owner");

  // Form data states
  const [candidateData, setCandidateData] = useState({});
  const [formData, setFormData] = useState({});
  const [personalInfoEditing, setPersonalInfoEditing] = useState(false);
  const [personalInfoSnapshot, setPersonalInfoSnapshot] = useState(null);
  const [personalInfoSaving, setPersonalInfoSaving] = useState(false);
  const personalInfoEditingRef = useRef(false);
  const candidateFetchFastRef = useRef(false);

  // Address data
  const [addressData, setAddressData] = useState({
    house_no: "",
    building_name: "",
    street_area: "",
    state: "",
    country: "",
    city: "",
    domestic_airport: "",
    international_airport: "",
    email: "",
    contact1: "",
    contact2: "",
  });

  // Additional info
  const [additionalInfo, setAdditionalInfo] = useState({
    height: "",
    weight: "",
    eye_color: "",
    hair_color: "",
    identification_mark: "",
    bmi: "",
    boiler_suit_size: "",
    shoe_size: "",
  });

  // Modal states
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showNokModal, setShowNokModal] = useState(false);
  const [showAdditionalModal, setShowAdditionalModal] = useState(false);
  const [seafarersModal, setSeafarersModal] = useState({
    open: false,
    editingDoc: null,
    fixedType: null,
    pickType: false,
  });
  const [licenseModal, setLicenseModal] = useState({ open: false, editingDoc: null });
  const [educationModal, setEducationModal] = useState({ open: false, editingDoc: null });
  const [verificationModal, setVerificationModal] = useState({ open: false, editingDoc: null });
  const [verificationDocTypes, setVerificationDocTypes] = useState([]);
  const [auxCertModal, setAuxCertModal] = useState({ open: false, variant: "dce", editingDoc: null });

  // Data lists
  const [seafarersDocs, setSeafarersDocs] = useState([]);
  const [dceDocs, setDceDocs] = useState([]);
  const [valueCourses, setValueCourses] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [nokDocs, setNokDocs] = useState([]);
  const [nomineeRelationships, setNomineeRelationships] = useState([]);
  const [nokEditing, setNokEditing] = useState(null);
  const [educationalDocuments, setEducationalDocuments] = useState([]);
  const [verificationDocuments, setverificationDocuments] = useState([]);
  const [recordOfSeaServices, setRecordOfSeaServices] = useState([]);
  const [planings, setPlanings] = useState([]);
  const [preJoiningMedicals, setPreJoiningMedicals] = useState([]);
  const [preJoiningTravelDocs, setPreJoiningTravelDocs] = useState([]);
  const [postSignOnDocs, setPostSignOnDocs] = useState([]);
  const [postSignOffDocs, setPostSignOffDocs] = useState([]);
  const [candidateRemarks, setCandidateRemarks] = useState([]);
  const [remarksSearch, setRemarksSearch] = useState("");
  const [expandedRemarkIds, setExpandedRemarkIds] = useState(() => new Set());
  const [basicPhotoFile, setBasicPhotoFile] = useState(null);
  const [basicCvFile, setBasicCvFile] = useState(null);
  const [remarkModal, setRemarkModal] = useState({
    open: false,
    editingId: null,
    remarks: "",
    file: null,
    saving: false,
  });
  const [signOnDocumentTypes, setSignOnDocumentTypes] = useState([]);
  const [showSignOnDocModal, setShowSignOnDocModal] = useState(false);
  const [signOnDocSignonId, setSignOnDocSignonId] = useState(null);
  const [signOnDocList, setSignOnDocList] = useState([]);
  const [signOnDocUploading, setSignOnDocUploading] = useState(false);

  // Sign-on document editing
  const [signOnDocEditingId, setSignOnDocEditingId] = useState(null);
  const [signOnDocEditDocumentId, setSignOnDocEditDocumentId] = useState("");
  const [signOnDocFormKey, setSignOnDocFormKey] = useState(0);

  // Sign-on record editing (post-sign-on documents rows: postsignon_docs)
  const [showPostSignOnRecordModal, setShowPostSignOnRecordModal] = useState(false);
  const [postSignOnRecordEditingId, setPostSignOnRecordEditingId] = useState(null);
  const [postSignOnRecordForm, setPostSignOnRecordForm] = useState({
    vessel_name: "",
    imo_number: "",
    sign_on_rank: "",
    contract_start_date: "",
    sign_on_date: "",
    sign_on_port: "",
    country_id: "",
    sign_off_due: "",
    remark: "",
  });
  const [postSignOnRecordSaving, setPostSignOnRecordSaving] = useState(false);
  /** Master list from GET /api/vessels for sign-on vessel dropdown. */
  const [vesselsList, setVesselsList] = useState([]);
  const [ownersList, setOwnersList] = useState([]);

  const [showPostSignOffRecordModal, setShowPostSignOffRecordModal] = useState(false);
  const [postSignOffRecordEditingId, setPostSignOffRecordEditingId] = useState(null);
  const [postSignOffRecordForm, setPostSignOffRecordForm] = useState({
    vessel_name: "",
    imo_number: "",
    sign_off_rank: "",
    sign_on_date: "",
    sign_off_date: "",
    sign_off_port: "",
    country_id: "",
    arrival_date: "",
    contract_completion_date: "",
    sign_off_reason: "",
    remark: "",
  });
  const [postSignOffRecordSaving, setPostSignOffRecordSaving] = useState(false);
  const [flagStateCrewDocuments, setFlagStateCrewDocuments] = useState([]);
  const [countries, setCountries] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [errors, setErrors] = useState([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMenuCoords, setExportMenuCoords] = useState(null);
  const [aramcoPkgOpen, setAramcoPkgOpen] = useState(false);
  const [aramcoPkgDocs, setAramcoPkgDocs] = useState([]);
  const [aramcoPkgSelected, setAramcoPkgSelected] = useState({});
  const [aramcoPkgLoading, setAramcoPkgLoading] = useState(false);
  const exportMenuRef = useRef(null);
  const exportDropdownBtnRef = useRef(null);
  const exportDropdownMenuRef = useRef(null);
  /** Ranks, vessel types & engine makes from `/api/candidates/search-options` (same masters as list search). */
  const [masterSearchOpts, setMasterSearchOpts] = useState({
    ranks: [],
    vesselTypes: [],
    engineMakes: [],
    availabilityStatus: [],
    preJoiningMedicalTypes: [],
    preMedicalDocumentTypes: [],
    preJoiningTravelDocumentTypes: [],
  });
  /** Multipart file for pre-joining medical doc add/edit (field name `file` on API). */
  const [medicalDocFile, setMedicalDocFile] = useState(null);
  /** Multipart file for pre-joining travel doc add/edit. */
  const [preJoiningTravelFile, setPreJoiningTravelFile] = useState(null);
  /** Multipart file for flag state doc add/edit. */
  const [flagStateDocFile, setFlagStateDocFile] = useState(null);
  /** Multipart file for external / sea service document upload. */
  const [seaServiceDocFile, setSeaServiceDocFile] = useState(null);
  /** Multipart files for proposal document uploads. */
  const [proposalFiles, setProposalFiles] = useState({
    cv_package_file: null,
    proposal_email_file: null,
    approval_email_file: null,
    rejection_email_file: null,
    other_documents_file: null,
  });
  // Generic modal state for Services, Proposal, Medicals, FlagState, PreJoining tabs
  const [genericModal, setGenericModal] = useState({ open: false, type: "", editingId: null, form: {}, saving: false });
  /** Proposal documents: pick from the row's uploads, then preview in-app. */
  const [proposalDocViewer, setProposalDocViewer] = useState({ open: false, row: null, docs: [], selected: null });
  const [formsDocViewer, setFormsDocViewer] = useState({
    open: false,
    name: "",
    fileName: "",
    url: null,
  });

  const openProposalDocViewer = (row) => {
    const docs = proposalDocumentsFor(row, id);
    if (!docs.length) return;
    setProposalDocViewer({ open: true, row, docs, selected: docs.length === 1 ? docs[0] : null });
  };

  const closeProposalDocViewer = () =>
    setProposalDocViewer({ open: false, row: null, docs: [], selected: null });

  const downloadProposalDoc = (doc) => {
    if (!doc?.url) return;
    const a = document.createElement("a");
    a.href = doc.url;
    a.download = doc.fileName || "document";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const [tabPaging, setTabPaging] = useState({
    record_of_sea_services: { page: 1, pageSize: 10 },
    planings: { page: 1, pageSize: 10 },
    pre_joining_medicals: { page: 1, pageSize: 10 },
    flag_state_crew_documents: { page: 1, pageSize: 10 },
    pre_joining_travel_documents: { page: 1, pageSize: 10 },
    post_sign_on_documents: { page: 1, pageSize: 10 },
    post_sign_off_documents: { page: 1, pageSize: 10 },
  });

  const openGenericModal = async (type, row = null) => {
    const defaults = {
      services: { rank: "", vessel_name: "", flag: "", vessel_type: "", grt: "", dwt: "", bhp: "", engine_type: "", sign_on_date: "", sign_off_date: "", period: "", reason_of_sign_off: "", owner_company: "", file_path: "" },
      proposal: {
        rank: "",
        vessel_name: "",
        contract_duration: "",
        proposed_wages: "",
        approved_wages: "",
        proposal_date: "",
        proposal_status: "",
        approval_date: "",
        tentative_joining_schedule: "",
        remarks: "",
        cv_package_file: "",
        proposal_email_file: "",
        approval_email_file: "",
        rejection_email_file: "",
        other_documents_file: "",
        wages: "",
        tentative_travel_date: "",
      },
      medicals: { medical_id: "", certificate_number: "", country_id: "", issue_date: "", expiry_date: "" },
      flagstate: {
        flag_doc_country: "",
        flag_doc_name: "",
        flag_doc_grade: "",
        endorsement_no: "",
        issue_date: "",
        expiry_date: "",
        processed_by: "",
        remarks: "",
        file_path: "",
      },
      prejoining: { document_id: "", country_id: "", issue_date: "", expiry_date: "" },
    };
    if (!defaults[type]) return;
    const form = { ...defaults[type] };
    if (row) {
      Object.keys(form).forEach((k) => {
        if (row[k] == null || row[k] === "") return;
        if (["sign_on_date", "sign_off_date", "issue_date", "expiry_date", "tentative_joining_schedule", "proposal_date", "approval_date", "tentative_travel_date"].includes(k)) {
          form[k] = formatDateForInput(row[k]);
        } else if ((type === "services" || type === "proposal") && (k === "rank" || k === "vessel_type")) {
          form[k] = String(row[k]);
        } else if (type === "medicals" && k === "medical_id") {
          form[k] = String(row[k]);
        } else if (type === "prejoining" && k === "document_id") {
          form[k] = String(row[k]);
        } else {
          form[k] = String(row[k]);
        }
      });
    }
    if (type === "services") {
      form.period = calcInclusivePeriod(form.sign_on_date, form.sign_off_date);
    }
    if (type === "medicals") setMedicalDocFile(null);
    if (type === "flagstate") setFlagStateDocFile(null);
    if (type === "services") setSeaServiceDocFile(null);
    if (type === "proposal") {
      setProposalFiles({
        cv_package_file: null,
        proposal_email_file: null,
        approval_email_file: null,
        rejection_email_file: null,
        other_documents_file: null,
      });
      // Legacy rows only had `wages` — treat as proposed wages when editing.
      if (!form.proposed_wages && form.wages) form.proposed_wages = form.wages;
    }
    if ((type === "services" || type === "proposal") && !vesselsList.length) {
      try {
        const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
        const r = await fetch(`${apiBase}/api/vessels`, { headers: authHeaders() });
        if (r.ok) {
          const d = await r.json();
          setVesselsList(Array.isArray(d.vessels) ? d.vessels : []);
        }
      } catch {
        /* non-fatal */
      }
    }
    if (type === "services" && !ownersList.length) {
      try {
        const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
        const r = await fetch(`${apiBase}/api/owners`, { headers: authHeaders() });
        if (r.ok) {
          const d = await r.json();
          setOwnersList(Array.isArray(d.owners) ? d.owners : []);
        }
      } catch {
        /* non-fatal */
      }
    }
    if (type === "prejoining") {
      setPreJoiningTravelFile(null);
      try {
        const r = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/candidates/search-options`,
          { headers: authHeaders() },
        );
        if (r.ok) {
          const d = await r.json();
          setMasterSearchOpts({
            ranks: d.ranks || [],
            vesselTypes: d.vesselTypes || [],
            engineMakes: d.engineMakes || [],
            availabilityStatus: d.availabilityStatus || [],
            preJoiningMedicalTypes: d.preJoiningMedicalTypes || [],
            preMedicalDocumentTypes: d.preMedicalDocumentTypes || d.preJoiningMedicalTypes || [],
            preJoiningTravelDocumentTypes: d.preJoiningTravelDocumentTypes || [],
          });
        }
      } catch {
        /* non-fatal */
      }
    }
    setGenericModal({ open: true, type, editingId: row?.id ?? null, form, saving: false });
  };

  const closeGenericModal = () => {
    setMedicalDocFile(null);
    setPreJoiningTravelFile(null);
    setFlagStateDocFile(null);
    setSeaServiceDocFile(null);
    setProposalFiles({
      cv_package_file: null,
      proposal_email_file: null,
      approval_email_file: null,
      rejection_email_file: null,
      other_documents_file: null,
    });
    setGenericModal({ open: false, type: "", editingId: null, form: {}, saving: false });
  };

  const handleGenericFormChange = (key, val) => {
    setGenericModal((prev) => {
      const form = { ...prev.form, [key]: val };
      if (prev.type === "services" && (key === "sign_on_date" || key === "sign_off_date")) {
        form.period = calcInclusivePeriod(form.sign_on_date, form.sign_off_date);
      }
      return { ...prev, form };
    });
  };

  const handleGenericVesselChange = (value) => {
    setGenericModal((prev) => ({
      ...prev,
      form: { ...prev.form, vessel_name: value },
    }));
  };

  const saveGenericModal = async () => {
    const { type, editingId, form } = genericModal;
    setGenericModal((prev) => ({ ...prev, saving: true }));
    const apiBase = import.meta.env.VITE_API_URL || "";
    const endpoints = { services: "sea-services", proposal: "planings", medicals: "prejoining-medicals", flagstate: "flag-state-docs", prejoining: "prejoining-travel" };
    const endpoint = endpoints[type];
    try {
      const url = editingId
        ? `${apiBase}/api/candidates/${id}/${endpoint}/${editingId}`
        : `${apiBase}/api/candidates/${id}/${endpoint}`;
      const method = editingId ? "put" : "post";

      if (type === "medicals") {
        if (!form.medical_id) {
          alert("Select a document type.");
          setGenericModal((prev) => ({ ...prev, saving: false }));
          return;
        }
        const fd = new FormData();
        fd.append("medical_id", String(form.medical_id));
        fd.append("certificate_number", form.certificate_number ?? "");
        fd.append("country_id", form.country_id != null && form.country_id !== "" ? String(form.country_id) : "");
        fd.append("issue_date", form.issue_date ?? "");
        fd.append("expiry_date", form.expiry_date ?? "");
        if (medicalDocFile) fd.append("file", medicalDocFile);
        await axios[method](url, fd);
      } else if (type === "prejoining") {
        if (!form.document_id) {
          alert("Select a document type.");
          setGenericModal((prev) => ({ ...prev, saving: false }));
          return;
        }
        const fd = new FormData();
        fd.append("document_id", String(form.document_id));
        fd.append("country_id", form.country_id != null && form.country_id !== "" ? String(form.country_id) : "");
        fd.append("issue_date", form.issue_date ?? "");
        fd.append("expiry_date", form.expiry_date ?? "");
        if (preJoiningTravelFile) fd.append("file", preJoiningTravelFile);
        await axios[method](url, fd);
      } else if (type === "flagstate") {
        const fd = new FormData();
        fd.append("flag_doc_country", form.flag_doc_country ?? "");
        fd.append("flag_doc_name", form.flag_doc_name ?? "");
        fd.append("flag_doc_grade", form.flag_doc_grade ?? "");
        fd.append("endorsement_no", form.endorsement_no ?? "");
        fd.append("issue_date", form.issue_date ?? "");
        fd.append("expiry_date", form.expiry_date ?? "");
        fd.append("processed_by", form.processed_by ?? "");
        fd.append("remarks", form.remarks ?? "");
        if (flagStateDocFile) fd.append("file", flagStateDocFile);
        await axios[method](url, fd);
      } else if (type === "proposal") {
        const selectedFiles = Object.values(proposalFiles).filter(Boolean);
        if (exceedsRequestLimit(selectedFiles)) {
          alert(`These documents add up to more than ${MAX_REQUEST_UPLOAD_MB} MB. Upload them in smaller batches.`);
          setGenericModal((prev) => ({ ...prev, saving: false }));
          return;
        }
        const fd = new FormData();
        [
          "rank",
          "vessel_name",
          "contract_duration",
          "proposed_wages",
          "approved_wages",
          "proposal_date",
          "proposal_status",
          "approval_date",
          "tentative_joining_schedule",
          "remarks",
          "tentative_travel_date",
        ].forEach((k) => fd.append(k, form[k] ?? ""));
        // Keep legacy `wages` in sync with proposed wages for older consumers.
        fd.append("wages", form.proposed_wages ?? "");
        Object.entries(proposalFiles).forEach(([k, file]) => {
          if (file) fd.append(k, file);
        });
        await axios[method](url, fd);
      } else if (type === "services") {
        const fd = new FormData();
        [
          "rank",
          "vessel_name",
          "flag",
          "vessel_type",
          "grt",
          "dwt",
          "bhp",
          "engine_type",
          "sign_on_date",
          "sign_off_date",
          "period",
          "reason_of_sign_off",
          "owner_company",
        ].forEach((k) => fd.append(k, form[k] ?? ""));
        if (seaServiceDocFile) fd.append("file", seaServiceDocFile);
        await axios[method](url, fd);
      } else {
        await axios[method](url, form);
      }

      closeGenericModal();
      fetchCandidateData();
    } catch (e) {
      alert(uploadErrorMessage(e));
      setGenericModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleGenericDelete = async (type, docId) => {
    if (!window.confirm("Delete this record?")) return;
    const apiBase = import.meta.env.VITE_API_URL || "";
    const endpoints = { services: "sea-services", proposal: "planings", medicals: "prejoining-medicals", flagstate: "flag-state-docs", prejoining: "prejoining-travel" };
    try {
      await axios.delete(`${apiBase}/api/candidates/${id}/${endpoints[type]}/${docId}`);
      fetchCandidateData();
    } catch (e) { alert(e?.response?.data?.error || e.message); }
  };

  const authHeaders = () => {
    const token = localStorage.getItem("magellan_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const downloadCandidateExport = async (kind, filename) => {
    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    setExportBusy(true);
    setExportMenuOpen(false);
    try {
      const r = await fetch(`${apiBase}/api/candidates/${id}/export/${kind}`, { headers: authHeaders() });
      if (!r.ok) {
        let msg = r.statusText;
        try {
          const j = await r.json();
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const blob = await r.blob();
      const a = document.createElement("a");
      const u = URL.createObjectURL(blob);
      a.href = u;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(u);
    } catch (e) {
      alert(e?.message || "Download failed");
    } finally {
      setExportBusy(false);
    }
  };

  const formsPdfFilenameFromHeader = (header, fallback) => {
    if (!header) return fallback;
    const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (star) {
      try {
        return decodeURIComponent(star[1].trim());
      } catch {
        /* fall through */
      }
    }
    const quoted = /filename="([^"]+)"/i.exec(header);
    if (quoted) return quoted[1];
    const plain = /filename=([^;]+)/i.exec(header);
    return plain ? plain[1].trim() : fallback;
  };

  const fetchFormsPdfBlob = async (templateKey, { download } = {}) => {
    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    const qs = download ? "?download=1" : "";
    const r = await fetch(`${apiBase}/api/candidates/${id}/forms/${templateKey}${qs}`, {
      headers: authHeaders(),
    });
    if (!r.ok) {
      let msg = r.statusText;
      try {
        const j = await r.json();
        if (j.error) msg = j.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    const blob = await r.blob();
    const filename = formsPdfFilenameFromHeader(
      r.headers.get("content-disposition"),
      `${templateKey}.pdf`,
    );
    return { blob, filename };
  };

  const closeFormsDocViewer = () => {
    setFormsDocViewer((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      return { open: false, name: "", fileName: "", url: null };
    });
  };

  const viewFormsDocument = async (item) => {
    if (!item?.canPreview || exportBusy) return;
    setExportBusy(true);
    try {
      const { blob, filename } = await fetchFormsPdfBlob(item.key);
      const url = URL.createObjectURL(blob);
      setFormsDocViewer((prev) => {
        if (prev.url) URL.revokeObjectURL(prev.url);
        return { open: true, name: item.name, fileName: filename, url };
      });
    } catch (e) {
      alert(e?.message || "Preview failed");
    } finally {
      setExportBusy(false);
    }
  };

  const downloadFormsDocument = async (item) => {
    if (!item?.canDownload || exportBusy) return;
    setExportBusy(true);
    try {
      const { blob, filename } = await fetchFormsPdfBlob(item.key, { download: true });
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(u);
    } catch (e) {
      alert(e?.message || "Download failed");
    } finally {
      setExportBusy(false);
    }
  };

  const openAramcoCvPackage = async () => {
    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    setExportMenuOpen(false);
    setAramcoPkgOpen(true);
    setAramcoPkgLoading(true);
    setAramcoPkgSelected({});
    try {
      const r = await fetch(`${apiBase}/api/candidates/${id}/export/aramco-cv-package/documents`, {
        headers: authHeaders(),
      });
      if (!r.ok) throw new Error("Could not load document list");
      const data = await r.json();
      setAramcoPkgDocs(Array.isArray(data.documents) ? data.documents : []);
    } catch (e) {
      alert(e?.message || "Could not load document list");
      setAramcoPkgOpen(false);
    } finally {
      setAramcoPkgLoading(false);
    }
  };

  const toggleAramcoPkgDoc = (key, hasFile) => {
    if (!hasFile) return;
    setAramcoPkgSelected((prev) => {
      if (prev[key] != null) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      const used = new Set(Object.values(prev).map((n) => Number(n)).filter((n) => n > 0));
      let n = 1;
      while (used.has(n)) n += 1;
      return { ...prev, [key]: n };
    });
  };

  const setAramcoPkgOrder = (key, raw) => {
    const n = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
    setAramcoPkgSelected((prev) => {
      if (prev[key] == null) return prev;
      return { ...prev, [key]: Number.isFinite(n) && n > 0 ? n : "" };
    });
  };

  const downloadAramcoCvPackage = async () => {
    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    const documents = Object.entries(aramcoPkgSelected)
      .filter(([, order]) => order !== "" && Number(order) > 0)
      .map(([key, order]) => ({ key, order: Number(order) }))
      .sort((a, b) => a.order - b.order);
    setExportBusy(true);
    try {
      const r = await fetch(`${apiBase}/api/candidates/${id}/export/aramco-cv-package`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ documents }),
      });
      if (!r.ok) {
        let msg = r.statusText;
        try {
          const j = await r.json();
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const blob = await r.blob();
      const slug = [candidateData.surname, candidateData.given_name]
        .filter((x) => x != null && String(x).trim())
        .map((x) => String(x).trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, ""))
        .filter(Boolean)
        .join("_") || `crew_${id}`;
      const a = document.createElement("a");
      const u = URL.createObjectURL(blob);
      a.href = u;
      a.download = `Aramco_CV_Package_${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(u);
      setAramcoPkgOpen(false);
    } catch (e) {
      alert(e?.message || "Download failed");
    } finally {
      setExportBusy(false);
    }
  };

  /** Uploaded CV/resume (not the generated Check List CV PDF). */
  const downloadCandidateResume = async () => {
    const cvUrl = candidateData.cv;
    if (!cvUrl) {
      alert("No resume file uploaded for this candidate.");
      setExportMenuOpen(false);
      return;
    }
    setExportBusy(true);
    setExportMenuOpen(false);
    try {
      const r = await fetch(cvUrl);
      if (!r.ok) {
        let msg = r.statusText;
        try {
          const j = await r.json();
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg || "Could not download resume");
      }
      const blob = await r.blob();
      const leaf =
        (candidateData.raw?.cv_upload_path && String(candidateData.raw.cv_upload_path).split("/").pop()) ||
        cvUrl.split("/").pop() ||
        "";
      const extFromLeaf = leaf.includes(".") ? leaf.slice(leaf.lastIndexOf(".")).toLowerCase() : "";
      const slug = [candidateData.surname, candidateData.given_name]
        .filter((x) => x != null && String(x).trim())
        .map((x) => String(x).trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, ""))
        .filter(Boolean)
        .join("_") || `crew_${id}`;
      const filename = `resume_${slug}${extFromLeaf || ".pdf"}`;
      const a = document.createElement("a");
      const u = URL.createObjectURL(blob);
      a.href = u;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(u);
    } catch (e) {
      alert(e?.message || "Download failed");
    } finally {
      setExportBusy(false);
    }
  };

  useLayoutEffect(() => {
    if (!exportMenuOpen) {
      setExportMenuCoords(null);
      return;
    }
    const measure = () => {
      const el = exportDropdownBtnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setExportMenuCoords({
        top: r.bottom + 6,
        left: r.left,
        minWidth: Math.max(220, r.width),
      });
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [exportMenuOpen]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const close = (e) => {
      const t = e.target;
      if (exportMenuRef.current?.contains(t)) return;
      if (exportDropdownMenuRef.current?.contains(t)) return;
      setExportMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [exportMenuOpen]);

  useEffect(() => {
    const loadOwners = async () => {
      try {
        const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
        const r = await fetch(`${apiBase}/api/owners`, { headers: authHeaders() });
        if (!r.ok) return;
        const d = await r.json();
        setOwnersList(Array.isArray(d.owners) ? d.owners : []);
      } catch {
        /* non-fatal */
      }
    };
    loadOwners();
  }, [id]);

  useEffect(() => {
    const loadSearchOptions = async () => {
      try {
        const r = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/candidates/search-options`,
          { headers: authHeaders() },
        );
        if (!r.ok) return;
        const d = await r.json();
        setMasterSearchOpts({
          ranks: d.ranks || [],
          vesselTypes: d.vesselTypes || [],
          engineMakes: d.engineMakes || [],
          availabilityStatus: d.availabilityStatus || [],
          preJoiningMedicalTypes: d.preJoiningMedicalTypes || [],
          preMedicalDocumentTypes: d.preMedicalDocumentTypes || d.preJoiningMedicalTypes || [],
          preJoiningTravelDocumentTypes: d.preJoiningTravelDocumentTypes || [],
        });
      } catch {
        /* non-fatal */
      }
    };
    loadSearchOptions();
  }, [id]);

  useEffect(() => {
    if (!showPostSignOnRecordModal && !showPostSignOffRecordModal) return;
    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    (async () => {
      try {
        const r = await fetch(`${apiBase}/api/vessels`, { headers: authHeaders() });
        if (!r.ok) return;
        const d = await r.json();
        setVesselsList(Array.isArray(d.vessels) ? d.vessels : []);
      } catch {
        /* non-fatal */
      }
    })();
  }, [showPostSignOnRecordModal, showPostSignOffRecordModal]);

  const { data: candidateApiData, error: candidateQueryError } = useQuery({
    queryKey: ["candidate", id],
    queryFn: async () => {
      const fast = candidateFetchFastRef.current ? "1" : "0";
      candidateFetchFastRef.current = false;
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/candidates/${id}?fast=${fast}`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error("Failed to fetch candidate");
      return res.json();
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (candidateQueryError) {
      console.error("Error fetching candidate data:", candidateQueryError);
    }
  }, [candidateQueryError]);

  useEffect(() => {
    if (!candidateApiData) return;
    try {
      const data = candidateApiData;
      const candidate = data.candidate || data.data?.candidate || data;
      const apiBase = import.meta.env.VITE_API_URL || "";

      // Set pre-joining medicals and flag state docs first (so they always render even if later code throws)
      const rawPreJoining = Array.isArray(data.pre_joining_medical_docs)
        ? data.pre_joining_medical_docs
        : Array.isArray(data.data?.pre_joining_medical_docs)
          ? data.data.pre_joining_medical_docs
          : Array.isArray(data.candidate?.pre_joining_medical_docs)
            ? data.candidate.pre_joining_medical_docs
            : [];
      setPreJoiningMedicals(
        rawPreJoining.map((doc) => {
          const path = doc.file_path != null && doc.file_path !== "" ? String(doc.file_path) : "";
          const pathWithoutPublic = path.replace(/^public\/?/, "");
          const fileName = pathWithoutPublic ? pathWithoutPublic.split("/").pop() : null;
          const cid = candidate?.id ?? data.candidate_id ?? data.candidate?.id;
          const fileUrl =
            fileName && cid
              ? `${apiBase}/uploads/documents/${cid}/${fileName}`
              : path.startsWith("http") ? path : null;
          return { ...doc, file_path: fileUrl || path || null };
        }),
      );
      const rawFlagState = Array.isArray(data.flag_state_crew_documents)
        ? data.flag_state_crew_documents
        : Array.isArray(data.data?.flag_state_crew_documents)
          ? data.data.flag_state_crew_documents
          : Array.isArray(data.candidate?.flag_state_crew_documents)
            ? data.candidate.flag_state_crew_documents
            : [];
      const flagCid = candidate?.id ?? data.candidate_id ?? data.candidate?.id;
      setFlagStateCrewDocuments(
        rawFlagState.map((doc) => {
          const rawPath = doc.file_path ?? doc.file_upload;
          const path = rawPath != null && rawPath !== "" ? String(rawPath) : "";
          const pathWithoutPublic = path.replace(/^public\/?/, "");
          const fileName = pathWithoutPublic ? pathWithoutPublic.split("/").pop() : null;
          const fileUrl =
            fileName && flagCid
              ? `${apiBase}/uploads/documents/${flagCid}/${fileName}`
              : path.startsWith("http") ? path : null;
          return { ...doc, file_path: fileUrl || path || null };
        }),
      );

      const rawPreJoiningTravel = Array.isArray(data.pre_joining_travel_docs)
        ? data.pre_joining_travel_docs
        : Array.isArray(data.data?.pre_joining_travel_docs)
          ? data.data.pre_joining_travel_docs
          : Array.isArray(data.candidate?.pre_joining_travel_docs)
            ? data.candidate.pre_joining_travel_docs
            : [];
      const cid = candidate?.id ?? data.candidate_id ?? data.candidate?.id;
      setPreJoiningTravelDocs(
        rawPreJoiningTravel.map((doc) => {
          const rawPath = doc.file_path ?? doc.file_upload;
          const path = rawPath != null && rawPath !== "" ? String(rawPath) : "";
          const pathWithoutPublic = path.replace(/^public\/?/, "");
          const fileName = pathWithoutPublic ? pathWithoutPublic.split("/").pop() : null;
          const fileUrl =
            fileName && cid
              ? `${apiBase}/uploads/documents/${cid}/${fileName}`
              : path.startsWith("http") ? path : null;
          return { ...doc, file_path: fileUrl || path || null };
        }),
      );

      const rawPostSignOn = Array.isArray(data.post_sign_on_docs)
        ? data.post_sign_on_docs
        : Array.isArray(data.data?.post_sign_on_docs)
          ? data.data.post_sign_on_docs
          : Array.isArray(data.candidate?.post_sign_on_docs)
            ? data.candidate.post_sign_on_docs
            : [];
      setPostSignOnDocs(
        rawPostSignOn.map((doc) => {
          const rawPath = doc.file_path ?? doc.file_upload;
          const path = rawPath != null && rawPath !== "" ? String(rawPath) : "";
          const pathWithoutPublic = path.replace(/^public\/?/, "");
          const fileName = pathWithoutPublic ? pathWithoutPublic.split("/").pop() : null;
          const fileUrl =
            fileName && cid
              ? `${apiBase}/uploads/documents/${cid}/${fileName}`
              : path.startsWith("http") ? path : null;
          return { ...doc, file_path: fileUrl || path || null };
        }),
      );

      const rawPostSignOff = Array.isArray(data.post_sign_off_docs)
        ? data.post_sign_off_docs
        : Array.isArray(data.data?.post_sign_off_docs)
          ? data.data.post_sign_off_docs
          : Array.isArray(data.candidate?.post_sign_off_docs)
            ? data.candidate.post_sign_off_docs
            : [];
      setPostSignOffDocs(rawPostSignOff);

      const normalize = (c) => ({
        id: c.id,
        name: [c.given_name, c.middle_name, c.surname]
          .filter(Boolean)
          .join(" "),
        given_name: c.given_name,
        middle_name: c.middle_name,
        surname: c.surname,
        email: c.email_id || c.email || "",
        email_id: c.email_id || c.email || "",
        contact1: c.contact_no_1 || c.contact1 || "",
        contact2: c.contact_no_2 || c.contact2 || "",
        rank_name: c.rank_name || "",
        position: c.rank_name || c.position || "",
        passport_number: c.passport_number || "",
        passport_issue_date: c.passport_issue_date || null,
        passport_expiry_date: c.passport_expiry_date || null,
        seaman_book_number: c.seaman_book_number || "",
        indos_number: c.indos_number || "",
        cdc_number: c.cdc_number || "",
        cdc_issue_date: c.cdc_issue_date || null,
        cdc_expiry_date: c.cdc_expiry_date || null,
        license: c.license || "",
        dob: c.date_of_birth || c.dob || "",
        appliedDate: c.created_at
          ? new Date(c.created_at * 1000).toISOString()
          : null,
        photo: c.photo_upload
          ? `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${c.id}/${c.photo_upload.split("/").pop()}`
          : null,
        cv: c.cv_upload_path
          ? `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${c.id}/${c.cv_upload_path.split("/").pop()}`
          : null,
        cv_upload_path: c.cv_upload_path || null,
        house_no: c.house_no || "",
        building_name: c.building_name || "",
        street_area: c.residence_address || c.street_area || "",
        city: c.city_id || c.city || "",
        city_id: c.city_id || c.city || "",
        state: c.state_id || c.state || "",
        state_id: c.state_id || c.state || "",
        country: c.country_id || c.country || "",
        country_id: c.country_id || c.country || "",
        place_of_birth: c.place_of_birth || "",
        availability_date: c.availability_date || c.readiness_date || "",
        bio: c.bio || c.ref_from || "",
        height: c.height || "",
        weight: c.weight || "",
        eye_color: c.eye_color || "",
        hair_color: c.hair_color || "",
        identification_mark: c.identification_mark || "",
        bmi: c.bmi || "",
        boiler_suit_size: c.boiler_suit_size || "",
        shoe_size: c.shoe_size || "",
        nok_name: c.nok_name || c.nok?.name || "",
        nok_relationship: c.nok_relationship || "",
        nok_contact_number: c.nok_contact_number || "",
        nationality_id: c.nationality_id || "",
        gender: c.gender ? String(c.gender).trim().toLowerCase() : "",
        religion: c.religion ? String(c.religion).trim().toLowerCase() : "",
        marital_status: c.marital_status
          ? String(c.marital_status).trim().toLowerCase().replace("unmarried", "single")
          : "",
        domestic_airport: c.domestic_airport || "",
        international_airport: c.international_airport || "",
        province: c.province || "",
        raw: c,
      });

      const normalized = normalize(candidate);
      setCandidateData(normalized);
      // Don't clobber in-progress personal-info edits with a background refresh.
      if (!personalInfoEditingRef.current) {
        setFormData({
          ...candidate,
          gender: String(candidate.gender || "").trim().toLowerCase(),
          religion: String(candidate.religion || "").trim().toLowerCase(),
          marital_status: String(candidate.marital_status || "").trim().toLowerCase().replace("unmarried", "single"),
        });
      }
      setAdditionalInfo({
        height: normalized.height || "",
        weight: normalized.weight || "",
        eye_color: normalized.eye_color || "",
        hair_color: normalized.hair_color || "",
        identification_mark: normalized.identification_mark || "",
        bmi: normalized.bmi || "",
        boiler_suit_size: normalized.boiler_suit_size || "",
        shoe_size: normalized.shoe_size || "",
      });
      // Normalize document file paths and convert epoch seconds to ms for dates

      const normalizeDoc = (doc) => {
        const fileName = doc.file_path ? doc.file_path.split("/").pop() : null;
        const fileUrl = fileName
          ? `${apiBase}/uploads/documents/${candidate.id}/${fileName}`
          : null;

        // 🔥 Map document_type_id → name
        const docType = (data.document_types || []).find(
          (dt) => Number(dt.id) === Number(doc.document_type_id),
        );

        const visaFiles = {};
        for (const { key } of VISA_DOC_FIELDS) {
          if (doc[key]) visaFiles[key] = seafarersDocFileUrl(doc[key], candidate.id) || doc[key];
        }

        return {
          ...doc,
          ...visaFiles,
          document_name: docType?.name || "", // ✅ THIS IS THE FIX
          issue_date: doc.issue_date ? Number(doc.issue_date) * 1000 : null,
          expiry_date: doc.expiry_date ? Number(doc.expiry_date) * 1000 : null,
          visa_arrive_date: doc.visa_arrive_date
            ? Number(doc.visa_arrive_date) * 1000
            : null,
          file_path: fileUrl || doc.file_path || null,
        };
      };

      setSeafarersDocs((data.seafarers_docs || []).map(normalizeDoc));
      const normalizeDceDoc = (doc) => {
        const typeId = doc.document_id ?? doc.document_type_id;
        const path = doc.file_path || doc.file_upload || "";
        const fileName = path ? path.replace(/^public\//, "").split("/").pop() : null;
        const fileUrl = fileName && candidate?.id ? `${apiBase}/uploads/documents/${candidate.id}/${fileName}` : null;
        const docType = (data.document_types || []).find(
          (dt) => Number(dt.id) === Number(typeId),
        );
        return {
          ...doc,
          document_id: typeId,
          document_type_id: typeId,
          document_name: docType?.name || "",
          issue_date: doc.issue_date ? Number(doc.issue_date) * 1000 : null,
          expiry_date: doc.expiry_date ? Number(doc.expiry_date) * 1000 : null,
          visa_arrive_date: doc.visa_arrive_date
            ? Number(doc.visa_arrive_date) * 1000
            : null,
          file_path: fileUrl,
        };
      };
      setDceDocs((data.dce_docs || []).map(normalizeDceDoc));
      setValueCourses(
        (data.value_courses || []).map((doc) => {
          const apiBaseUrl = import.meta.env.VITE_API_URL || "";
          const typeId = doc.document_id ?? doc.document_type_id;
          const docType = (data.document_types || []).find(
            (dt) => Number(dt.id) === Number(typeId),
          );
          const filePath = doc.file_upload || doc.file_path || "";
          const fileName = filePath ? filePath.replace(/^public\//, "").split("/").pop() : null;
          const fileUrl = fileName && candidate?.id
            ? `${apiBaseUrl}/uploads/documents/${candidate.id}/${fileName}`
            : null;
          return {
            ...doc,
            document_id: typeId,
            document_type_id: typeId,
            document_name: docType?.name || "",
            issue_date: doc.issue_date ? (typeof doc.issue_date === "number" ? doc.issue_date * 1000 : doc.issue_date) : null,
            expiry_date: doc.expiry_date ? (typeof doc.expiry_date === "number" ? doc.expiry_date * 1000 : doc.expiry_date) : null,
            file_path: fileUrl || filePath || null,
          };
        }),
      );
      // setLicenses((data.licenses || []).map(normalizeDoc));
      const normalizeLicenceDate = (val) => {
        if (val == null || val === "") return null;
        if (typeof val === "number") return val < 1e12 ? val * 1000 : val;
        return val;
      };
      setLicenses(
        (data.licenses || []).map((doc) => ({
          ...doc,
          original_issue_date: normalizeLicenceDate(doc.original_issue_date),
          issue_revalidation_date: normalizeLicenceDate(doc.issue_revalidation_date),
          expiry_date: normalizeLicenceDate(doc.expiry_date),
          upload_file: doc.upload_file
            ? licenceDocumentUrl(candidate.id, doc.upload_file)
            : null,
        })),
      );

      const normalizeNokDoc = (doc) => {
        const rawPath = doc.file_path != null ? String(doc.file_path) : "";
        let fileUrl = null;
        if (rawPath) {
          if (/^https?:\/\//i.test(rawPath)) {
            fileUrl = rawPath;
          } else {
            const rel = rawPath.replace(/^public\/?/, "");
            if (rel.startsWith("nok_uploads/")) {
              fileUrl = `${apiBase}/uploads/${rel}`;
            } else {
              const fileName = rel.split("/").pop();
              fileUrl = fileName ? `${apiBase}/uploads/documents/${candidate.id}/${fileName}` : null;
            }
          }
        }
        return {
          ...doc,
          file_path: fileUrl || rawPath || null,
          relationship: doc.relationship || doc.nomineeRelationship?.relationship || null,
        };
      };

      setNokDocs((data.nok_docs || []).map(normalizeNokDoc));
      setNomineeRelationships(data.nominee_relationships || []);
      setRecordOfSeaServices(data.record_of_sea_services || []);
      setPlanings(data.planings || []);
      setCountries(data.countries || []);
      setDocumentTypes(data.document_types || []);
      setSignOnDocumentTypes(data.sign_on_document_types || []);
      const apiBaseNorm = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      setVerificationDocTypes(data.verification_document_types || []);
      setEducationalDocuments(
        (data.document || []).map((doc) => {
          const raw = doc.upload_file != null ? String(doc.upload_file) : "";
          const fn = raw.replace(/^public\/?/, "").split("/").filter(Boolean).pop() || null;
          const normalizeEduDate = (val) => {
            if (val == null || val === "") return null;
            if (typeof val === "number") return val < 1e12 ? val * 1000 : val;
            return val;
          };
          return {
            ...doc,
            from_year: normalizeEduDate(doc.from_year),
            to_year: normalizeEduDate(doc.to_year),
            upload_file: fn && candidate?.id ? `${apiBaseNorm}/uploads/documents/${candidate.id}/${fn}` : null,
          };
        }),
      );
      setverificationDocuments(
        (data.docsVerfication || []).map((doc) => {
          const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
          const raw = doc.file_upload != null ? String(doc.file_upload) : "";
          const rel = raw.replace(/^public\/?/, "");
          const fileName = rel.includes("/") ? rel.split("/").pop() : rel;
          const fileUrl =
            fileName && candidate?.id
              ? `${apiBase}/uploads/documents/${candidate.id}/${fileName}`
              : rel
                ? `${apiBase}/uploads/documents/${rel}`
                : null;
          const normalizeVerDate = (val) => {
            if (val == null || val === "") return null;
            if (typeof val === "number") return val < 1e12 ? val * 1000 : val;
            return val;
          };
          return {
            ...doc,
            verification_date: normalizeVerDate(doc.verification_date),
            file_upload: fileUrl,
          };
        }),
      );

      setCandidateRemarks(
        (data.candidate_remarks || []).map((row) => ({
          ...row,
          file_url: remarkAttachmentUrl(row.file_upload),
          remarks_text: stripHtmlToText(row.remarks),
        })),
      );

    } catch (error) {
      console.error("Error applying candidate data:", error);
    }
  }, [candidateApiData]);

  const fetchCandidateData = async ({ fast = true } = {}) => {
    candidateFetchFastRef.current = Boolean(fast);
    // Soft-invalidate list in background; don't block document/personal saves on it.
    queryClient.invalidateQueries({ queryKey: ["candidates"] });
    await queryClient.refetchQueries({ queryKey: ["candidate", id] });
  };

  const applyCandidateProfileLocally = (updated) => {
    if (!updated || typeof updated !== "object") return;
    setFormData((prev) => ({ ...prev, ...updated }));
    setCandidateData((prev) => {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const photoName = updated.photo_upload ? String(updated.photo_upload).split("/").pop() : null;
      const cvName = updated.cv_upload_path ? String(updated.cv_upload_path).split("/").pop() : null;
      return {
        ...prev,
        id: updated.id ?? prev.id,
        name: [updated.given_name, updated.middle_name, updated.surname].filter(Boolean).join(" ") || prev.name,
        given_name: updated.given_name ?? prev.given_name,
        middle_name: updated.middle_name ?? prev.middle_name,
        surname: updated.surname ?? prev.surname,
        email: updated.email_id || updated.email || prev.email,
        email_id: updated.email_id || updated.email || prev.email_id,
        contact1: updated.contact_no_1 || updated.contact1 || prev.contact1,
        contact2: updated.contact_no_2 || updated.contact2 || prev.contact2,
        passport_number: updated.passport_number ?? prev.passport_number,
        cdc_number: updated.cdc_number ?? prev.cdc_number,
        indos_number: updated.indos_number ?? prev.indos_number,
        license: updated.license ?? prev.license,
        dob: updated.date_of_birth || updated.dob || prev.dob,
        availability_date: updated.availability_date ?? prev.availability_date,
        photo: photoName
          ? `${apiBase}/uploads/documents/${updated.id || prev.id}/${photoName}`
          : prev.photo,
        cv: cvName
          ? `${apiBase}/uploads/documents/${updated.id || prev.id}/${cvName}`
          : prev.cv,
        cv_upload_path: updated.cv_upload_path ?? prev.cv_upload_path,
        raw: { ...(prev?.raw || {}), ...updated },
      };
    });
    applyStatusSyncFromResponse(updated);
  };

  const applyStatusSyncFromResponse = (data) => {
    if (!data || data.availability_status_id == null) return;
    const statusId = data.availability_status_id;
    const statusName = data.availability_status_name ?? null;
    setFormData((prev) => ({
      ...prev,
      availability_status_id: statusId,
      availability_status_name: statusName ?? prev.availability_status_name,
    }));
    setCandidateData((prev) => ({
      ...prev,
      raw: {
        ...(prev?.raw || {}),
        availability_status_id: statusId,
        availability_status_name: statusName ?? prev?.raw?.availability_status_name,
        availabilityStatus: statusName
          ? { id: statusId, name: statusName }
          : prev?.raw?.availabilityStatus,
      },
    }));
  };

  // Fetch sign-on documents for modal (when signon_id is selected)
  const fetchSignOnDocuments = async (signonId) => {
    if (!signonId || !id) return;
    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(
        `${apiBase}/api/candidates/${id}/sign-on-documents?signon_id=${signonId}`,
        { headers: authHeaders() },
      );
      const data = await res.json();
      if (data.documents) {
        const apiBaseUrl = apiBase.replace(/\/$/, "");
        setSignOnDocList(
          data.documents.map((d) => ({
            ...d,
            view_url:
              d.file_path && !String(d.file_path).startsWith("http")
                ? `${apiBaseUrl}/uploads/${d.file_path.replace(/^public\/?/, "")}`
                : d.file_path,
          })),
        );
      } else setSignOnDocList([]);
    } catch (err) {
      console.error("Error fetching sign-on documents:", err);
      setSignOnDocList([]);
    }
  };

  useEffect(() => {
    if (showSignOnDocModal && signOnDocSignonId && id) fetchSignOnDocuments(signOnDocSignonId);
  }, [showSignOnDocModal, signOnDocSignonId, id]);

  const openSignOnDocModal = (signonId) => {
    setSignOnDocSignonId(signonId);
    setSignOnDocEditingId(null);
    setSignOnDocEditDocumentId("");
    setSignOnDocFormKey((k) => k + 1);
    setShowSignOnDocModal(true);
  };

  const handleEditSignOnDocument = (doc) => {
    setSignOnDocEditingId(doc?.id ?? null);
    setSignOnDocEditDocumentId(doc?.document_id != null ? String(doc.document_id) : "");
    // Reset file input/select UI for a clean edit experience
    setSignOnDocFormKey((k) => k + 1);
  };

  const handleAddSignOnDocument = async (e) => {
    e.preventDefault();
    const form = e.target;
    const documentId = form.document_id?.value;
    const fileInput = form.file_path;
    if (!signOnDocSignonId) {
      alert("No sign-on record selected.");
      return;
    }
    if (!documentId) {
      alert("Please select document type.");
      return;
    }
    setSignOnDocUploading(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const fd = new FormData();
      fd.append("signon_id", String(signOnDocSignonId));
      fd.append("document_id", String(documentId));
      if (fileInput?.files?.length) {
        const file = rejectOversizedFile(fileInput.files[0], fileInput);
        if (!file) {
          setSignOnDocUploading(false);
          return;
        }
        fd.append("file_path", file);
      }

      const endpoint = signOnDocEditingId
        ? `${apiBase}/api/candidates/${id}/sign-on-documents/${signOnDocEditingId}`
        : `${apiBase}/api/candidates/${id}/sign-on-documents`;

      const method = signOnDocEditingId ? "PUT" : "POST";
      const res = await fetch(endpoint, { method, body: fd, headers: authHeaders() });
      const contentType = res.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      const result = isJson ? await res.json() : { error: await res.text() || "Server error" };
      if (res.ok) {
        await fetchSignOnDocuments(signOnDocSignonId);
        if (typeof form.reset === "function") form.reset();
        setSignOnDocEditingId(null);
        setSignOnDocEditDocumentId("");
        setSignOnDocFormKey((k) => k + 1);
      } else {
        alert(result.error || "Failed to add document");
      }
    } catch (err) {
      console.error("Add sign-on document error:", err);
      alert(err?.message || "Failed to add document");
    } finally {
      setSignOnDocUploading(false);
    }
  };

  const handleDeleteSignOnDocument = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(
        `${apiBase}/api/candidates/${id}/sign-on-documents/${docId}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (res.ok) await fetchSignOnDocuments(signOnDocSignonId);
      else alert("Failed to delete");
    } catch (err) {
      console.error(err);
      alert("Failed to delete document");
    }
  };

  const handlePostSignOnRecordInputChange = (e) => {
    const { name, value } = e.target;
    setPostSignOnRecordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePostSignOnVesselChange = (e) => {
    const vesselName = e.target.value;
    const vessel = vesselsList.find(
      (v) => String(v.ship_name ?? v.vessel_name ?? "").trim() === String(vesselName).trim(),
    );
    setPostSignOnRecordForm((prev) => ({
      ...prev,
      vessel_name: vesselName,
      ...(vessel != null && vessel.imo_number != null && String(vessel.imo_number).trim() !== ""
        ? { imo_number: String(vessel.imo_number) }
        : {}),
    }));
  };

  const postSignOnPeriodSummary = useMemo(() => {
    const a = parseLocalDateYmd(postSignOnRecordForm.sign_on_date);
    const b = parseLocalDateYmd(postSignOnRecordForm.sign_off_due);
    if (!postSignOnRecordForm.sign_on_date?.trim() || !postSignOnRecordForm.sign_off_due?.trim()) {
      return { line: "", detail: "" };
    }
    if (!a || !b) return { line: "Invalid dates", detail: "" };
    if (a.getTime() > b.getTime()) {
      return { line: "Due sign-off must be on or after sign-on", detail: "" };
    }
    const dayMs = 86400000;
    const totalInclusive = Math.floor((b.getTime() - a.getTime()) / dayMs) + 1;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let detail = "";
    if (today.getTime() < a.getTime()) {
      const until = Math.ceil((a.getTime() - today.getTime()) / dayMs);
      detail = `Today is before sign-on (${until} day${until !== 1 ? "s" : ""} until start).`;
    } else if (today.getTime() > b.getTime()) {
      const past = Math.floor((today.getTime() - b.getTime()) / dayMs);
      detail = `Contract window ended ${past} day${past !== 1 ? "s" : ""} ago.`;
    } else {
      const elapsed = Math.floor((today.getTime() - a.getTime()) / dayMs) + 1;
      const remaining = Math.floor((b.getTime() - today.getTime()) / dayMs);
      detail = `As of today: ${elapsed} day${elapsed !== 1 ? "s" : ""} on board, ${remaining} day${remaining !== 1 ? "s" : ""} left until due sign-off.`;
    }
    return {
      line: `${totalInclusive} calendar day${totalInclusive !== 1 ? "s" : ""} (sign-on → due sign-off)`,
      detail,
    };
  }, [postSignOnRecordForm.sign_on_date, postSignOnRecordForm.sign_off_due]);

  /** User may add a sign-off row only after at least one Sign On row has due sign-off on or before today. */
  const signOffAddEligible = useMemo(() => {
    const rows = Array.isArray(postSignOnDocs) ? postSignOnDocs : [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return rows.some((row) => {
      const due = toLocalDateFromApi(row.sign_off_due);
      if (!due) return false;
      return due.getTime() <= today.getTime();
    });
  }, [postSignOnDocs]);

  const isAdmin = user?.role === "admin";
  const canAddSignOffRecord = signOffAddEligible || isAdmin;

  const filteredRemarks = useMemo(() => {
    const q = String(remarksSearch || "").trim().toLowerCase();
    const rows = Array.isArray(candidateRemarks) ? candidateRemarks : [];
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        row.remarks_text,
        row.added_by_name,
        row.added_by != null ? String(row.added_by) : "",
        formatRemarkDateTime(row.created_at),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [candidateRemarks, remarksSearch]);

  const toggleRemarkExpanded = (remarkId) => {
    setExpandedRemarkIds((prev) => {
      const next = new Set(prev);
      if (next.has(remarkId)) next.delete(remarkId);
      else next.add(remarkId);
      return next;
    });
  };

  const openRemarkModal = (row = null) => {
    if (row?.id != null && !isAdmin) {
      alert("Only admins can edit communication notes.");
      return;
    }
    setRemarkModal({
      open: true,
      editingId: row?.id ?? null,
      remarks: row ? (row.remarks_text || stripHtmlToText(row.remarks) || "") : "",
      file: null,
      saving: false,
    });
  };

  const closeRemarkModal = () => {
    setRemarkModal({ open: false, editingId: null, remarks: "", file: null, saving: false });
  };

  const handleSaveRemark = async () => {
    const text = String(remarkModal.remarks || "").trim();
    if (!text) {
      alert("Remark is required.");
      return;
    }
    if (remarkModal.editingId && !isAdmin) {
      alert("Only admins can edit communication notes.");
      return;
    }
    setRemarkModal((prev) => ({ ...prev, saving: true }));
    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const fd = new FormData();
      fd.append("remark", text);
      if (remarkModal.file) {
        const file = rejectOversizedFile(remarkModal.file);
        if (!file) {
          setRemarkModal((prev) => ({ ...prev, saving: false }));
          return;
        }
        fd.append("file_upload", file);
      }
      if (remarkModal.editingId) {
        await axios.put(`${apiBase}/api/candidates/${id}/remarks/${remarkModal.editingId}`, fd);
      } else {
        await axios.post(`${apiBase}/api/candidates/${id}/remarks`, fd);
      }
      closeRemarkModal();
      fetchCandidateData();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to save remark");
      setRemarkModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleDeleteRemark = async (remarkId) => {
    if (!isAdmin) {
      alert("Only admins can delete communication notes.");
      return;
    }
    if (!window.confirm("Delete this remark?")) return;
    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      await axios.delete(`${apiBase}/api/candidates/${id}/remarks/${remarkId}`);
      fetchCandidateData();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to delete remark");
    }
  };

  const handleSaveFollowupDate = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      await axios.put(`${apiBase}/api/candidates/${id}`, {
        followup_date: formData.followup_date ?? "",
      });
      alert("Follow-up date saved");
      fetchCandidateData();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  };

  const nToday = new Date();
  const todayYmdLocal = `${nToday.getFullYear()}-${String(nToday.getMonth() + 1).padStart(2, "0")}-${String(nToday.getDate()).padStart(2, "0")}`;

  const openAddPostSignOnRecordModal = () => {
    setPostSignOnRecordEditingId(null);
    setPostSignOnRecordForm({
      vessel_name: "",
      imo_number: "",
      sign_on_rank: "",
      contract_start_date: "",
      sign_on_date: "",
      sign_on_port: "",
      country_id: "",
      sign_off_due: "",
      remark: "",
    });
    setShowPostSignOnRecordModal(true);
  };

  const openEditPostSignOnRecordModal = (row) => {
    if (!isAdmin) {
      alert("Only admins can edit sign-on records.");
      return;
    }
    setPostSignOnRecordEditingId(row?.id ?? null);
    setPostSignOnRecordForm({
      vessel_name: row?.vessel_name ?? "",
      imo_number: row?.imo_number ?? "",
      sign_on_rank:
        row?.sign_on_rank != null && String(row.sign_on_rank).trim() !== ""
          ? String(row.sign_on_rank)
          : "",
      contract_start_date: toDateInputValue(row?.contract_start_date),
      sign_on_date: toDateInputValue(row?.sign_on_date),
      sign_on_port: row?.sign_on_port ?? "",
      country_id: row?.country_id != null ? String(row.country_id) : "",
      sign_off_due: toDateInputValue(row?.sign_off_due),
      remark: row?.remark ?? "",
    });
    setShowPostSignOnRecordModal(true);
  };

  const submitPostSignOnRecord = async (e) => {
    e.preventDefault();
    if (!id) return;
    const isEdit = postSignOnRecordEditingId != null;
    if (isEdit && !isAdmin) {
      alert("Only admins can edit sign-on records.");
      return;
    }
    setPostSignOnRecordSaving(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const payload = {
        vessel_name: postSignOnRecordForm.vessel_name,
        imo_number: postSignOnRecordForm.imo_number,
        sign_on_rank:
          postSignOnRecordForm.sign_on_rank !== "" && postSignOnRecordForm.sign_on_rank != null
            ? Number(postSignOnRecordForm.sign_on_rank)
            : postSignOnRecordForm.sign_on_rank,
        contract_start_date: postSignOnRecordForm.contract_start_date,
        sign_on_date: postSignOnRecordForm.sign_on_date,
        sign_on_port: postSignOnRecordForm.sign_on_port,
        country_id: postSignOnRecordForm.country_id,
        sign_off_due: postSignOnRecordForm.sign_off_due,
        remark: postSignOnRecordForm.remark,
      };
      const endpoint = isEdit
        ? `${apiBase}/api/candidates/${id}/post-sign-on-documents/${postSignOnRecordEditingId}`
        : `${apiBase}/api/candidates/${id}/post-sign-on-documents`;

      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save sign-on record");
      }

      const saved = await res.json().catch(() => ({}));
      applyStatusSyncFromResponse(saved);
      setShowPostSignOnRecordModal(false);
      setPostSignOnRecordEditingId(null);
      await fetchCandidateData();
    } catch (err) {
      alert(err?.message || "Failed to save sign-on record");
    } finally {
      setPostSignOnRecordSaving(false);
    }
  };

  const handleDeletePostSignOnRecord = async (rowId) => {
    if (!isAdmin) {
      alert("Only admins can delete sign-on records.");
      return;
    }
    if (!window.confirm("Delete this sign-on record?")) return;
    try {
      const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const res = await fetch(
        `${apiBase}/api/candidates/${id}/post-sign-on-documents/${rowId}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete sign-on record");
      }
      const deleted = await res.json().catch(() => ({}));
      applyStatusSyncFromResponse(deleted);
      await fetchCandidateData();
    } catch (err) {
      alert(err?.message || "Failed to delete sign-on record");
    }
  };

  const handlePostSignOffRecordInputChange = (e) => {
    const { name, value } = e.target;
    setPostSignOffRecordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePostSignOffVesselChange = (e) => {
    const vesselName = e.target.value;
    const vessel = vesselsList.find(
      (v) => String(v.ship_name ?? v.vessel_name ?? "").trim() === String(vesselName).trim(),
    );
    setPostSignOffRecordForm((prev) => ({
      ...prev,
      vessel_name: vesselName,
      ...(vessel != null && vessel.imo_number != null && String(vessel.imo_number).trim() !== ""
        ? { imo_number: String(vessel.imo_number) }
        : {}),
    }));
  };

  const openAddPostSignOffRecordModal = () => {
    const rows = Array.isArray(postSignOnDocs) ? postSignOnDocs : [];
    // Prefer the most recent sign-on by sign-on date (then id) so shared fields can be prefilled.
    const lastSignOn = [...rows].sort((a, b) => {
      const da = toLocalDateFromApi(a?.sign_on_date)?.getTime() ?? 0;
      const db = toLocalDateFromApi(b?.sign_on_date)?.getTime() ?? 0;
      if (db !== da) return db - da;
      return Number(b?.id || 0) - Number(a?.id || 0);
    })[0] || null;

    setPostSignOffRecordEditingId(null);
    setPostSignOffRecordForm({
      vessel_name: lastSignOn?.vessel_name ?? "",
      imo_number: lastSignOn?.imo_number != null ? String(lastSignOn.imo_number) : "",
      sign_off_rank:
        lastSignOn?.sign_on_rank != null && String(lastSignOn.sign_on_rank).trim() !== ""
          ? String(lastSignOn.sign_on_rank)
          : "",
      sign_on_date: toDateInputValue(lastSignOn?.sign_on_date),
      sign_off_date: "",
      sign_off_port: "",
      country_id: lastSignOn?.country_id != null ? String(lastSignOn.country_id) : "",
      arrival_date: "",
      contract_completion_date: toDateInputValue(lastSignOn?.sign_off_due),
      sign_off_reason: "",
      remark: "",
    });
    setShowPostSignOffRecordModal(true);
  };

  const openEditPostSignOffRecordModal = (row) => {
    if (!isAdmin) {
      alert("Only admins can edit sign-off records.");
      return;
    }
    setPostSignOffRecordEditingId(row?.id ?? null);
    setPostSignOffRecordForm({
      vessel_name: row?.vessel_name ?? "",
      imo_number: row?.imo_number ?? "",
      sign_off_rank:
        row?.sign_off_rank != null && String(row.sign_off_rank).trim() !== ""
          ? String(row.sign_off_rank)
          : "",
      sign_on_date: toDateInputValue(row?.sign_on_date),
      sign_off_date: toDateInputValue(row?.sign_off_date),
      sign_off_port: row?.sign_off_port ?? "",
      country_id: row?.country_id != null ? String(row.country_id) : "",
      arrival_date: toDateInputValue(row?.arrival_date),
      contract_completion_date: toDateInputValue(row?.contract_completion_date),
      sign_off_reason: row?.sign_off_reason ?? "",
      remark: row?.remark ?? "",
    });
    setShowPostSignOffRecordModal(true);
  };

  const submitPostSignOffRecord = async (e) => {
    e.preventDefault();
    if (!id) return;
    const isEdit = postSignOffRecordEditingId != null;
    if (isEdit && !isAdmin) {
      alert("Only admins can edit sign-off records.");
      return;
    }
    if (!isEdit && !signOffAddEligible && !isAdmin) {
      alert(
        "You can add a sign-off only after the due sign-off date from a Sign On record has been reached.",
      );
      return;
    }
    setPostSignOffRecordSaving(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const payload = {
        vessel_name: postSignOffRecordForm.vessel_name,
        imo_number: postSignOffRecordForm.imo_number,
        sign_off_rank:
          postSignOffRecordForm.sign_off_rank !== "" && postSignOffRecordForm.sign_off_rank != null
            ? Number(postSignOffRecordForm.sign_off_rank)
            : postSignOffRecordForm.sign_off_rank,
        sign_on_date: postSignOffRecordForm.sign_on_date,
        sign_off_date: postSignOffRecordForm.sign_off_date,
        sign_off_port: postSignOffRecordForm.sign_off_port,
        country_id: postSignOffRecordForm.country_id,
        arrival_date: postSignOffRecordForm.arrival_date,
        contract_completion_date: postSignOffRecordForm.contract_completion_date,
        sign_off_reason: postSignOffRecordForm.sign_off_reason,
        remark: postSignOffRecordForm.remark,
      };

      const endpoint = isEdit
        ? `${apiBase}/api/candidates/${id}/post-sign-off-documents/${postSignOffRecordEditingId}`
        : `${apiBase}/api/candidates/${id}/post-sign-off-documents`;

      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save sign-off record");
      }

      const saved = await res.json().catch(() => ({}));
      applyStatusSyncFromResponse(saved);
      setShowPostSignOffRecordModal(false);
      setPostSignOffRecordEditingId(null);
      await fetchCandidateData();
    } catch (err) {
      alert(err?.message || "Failed to save sign-off record");
    } finally {
      setPostSignOffRecordSaving(false);
    }
  };

  const handleDeletePostSignOffRecord = async (rowId) => {
    if (!isAdmin) {
      alert("Only admins can delete sign-off records.");
      return;
    }
    if (!window.confirm("Delete this sign-off record?")) return;
    try {
      const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const res = await fetch(
        `${apiBase}/api/candidates/${id}/post-sign-off-documents/${rowId}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete sign-off record");
      }
      await fetchCandidateData();
    } catch (err) {
      alert(err?.message || "Failed to delete sign-off record");
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBasicDetailsFileChange = (e) => {
    const { name, files } = e.target;
    const file = rejectOversizedFile(files?.[0], e.target);
    if (!file || !name) return;
    if (name === "photo_upload") {
      setBasicPhotoFile(file);
      setFormData((prev) => ({ ...prev, photo_upload: file.name }));
      return;
    }
    if (name === "cv_upload") {
      setBasicCvFile(file);
      setFormData((prev) => ({ ...prev, cv_upload: file.name, cv_upload_path: file.name }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: file.name }));
  };

  // Handle additional info changes
  const handleAdditionalInfoChange = (e) => {
    const { name, value } = e.target;
    setAdditionalInfo((prev) => ({ ...prev, [name]: value }));
  };

  // Submit basic details form
  const handleBasicDetailsSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin || !personalInfoEditingRef.current) return;
    const passportExpiryErr = requireCompleteDate(formData.passport_expiry_date, "Passport expiry date");
    if (passportExpiryErr) {
      alert(passportExpiryErr);
      return;
    }
    const cdcExpiryErr = requireCompleteDate(formData.cdc_expiry_date, "CDC expiry date");
    if (cdcExpiryErr) {
      alert(cdcExpiryErr);
      return;
    }
    setPersonalInfoSaving(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      // Only send fields that the backend whitelists for update.
      const payload = {
        surname: formData.surname,
        given_name: formData.given_name,
        middle_name: formData.middle_name,
        rank_id: formData.rank_id,
        vessel_type_id: formData.vessel_type_id,
        date_of_birth: formData.date_of_birth,
        place_of_birth: formData.place_of_birth,
        nationality_id: formData.nationality_id,
        religion: formData.religion,
        gender: formData.gender,
        marital_status: formData.marital_status,
        license: formData.license,
        passport_number: formData.passport_number,
        passport_issue_date: formData.passport_issue_date,
        passport_expiry_date: formData.passport_expiry_date,
        cdc_number: formData.cdc_number,
        cdc_issue_date: formData.cdc_issue_date,
        cdc_expiry_date: formData.cdc_expiry_date,
        indos_number: formData.indos_number,
        availability_status_id: formData.availability_status_id,
        availability_date: formData.availability_date,
        aramco_charter: formData.aramco_charter,
        followup_date: formData.followup_date,
        residence_address: formData.residence_address,
        province: formData.province,
        house_no: formData.house_no,
        building_name: formData.building_name,
        domestic_airport: formData.domestic_airport,
        international_airport: formData.international_airport,
        country_id: formData.country_id,
        state_id: formData.state_id,
        city_id: formData.city_id,
        email_id: formData.email_id,
        contact_no_1: formData.contact_no_1,
        contact_no_2: formData.contact_no_2,
      };

      const hasFiles = Boolean(basicPhotoFile || basicCvFile);
      let updated = null;
      if (hasFiles) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          fd.append(k, String(v));
        });
        if (basicPhotoFile) fd.append("photo_upload", basicPhotoFile);
        if (basicCvFile) fd.append("cv_upload", basicCvFile);
        const res = await axios.put(`${apiBase}/api/candidates/${id}`, fd);
        updated = res?.data?.candidate || null;
      } else {
        // Prefer JSON when no files — avoids multipart/nginx 413 issues on AWS.
        const res = await axios.put(`${apiBase}/api/candidates/${id}`, payload);
        updated = res?.data?.candidate || null;
      }
      setBasicPhotoFile(null);
      setBasicCvFile(null);
      if (updated) applyCandidateProfileLocally(updated);
      personalInfoEditingRef.current = false;
      setPersonalInfoEditing(false);
      setPersonalInfoSnapshot(null);
      // Refresh list quietly; avoid blocking the UI on a full candidate reload.
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      if (hasFiles) {
        // Photo/CV URLs may need a quick background refresh.
        fetchCandidateData({ fast: true }).catch(() => {});
      }
    } catch (error) {
      setErrors(error.response?.data?.errors || []);
      alert(uploadErrorMessage(error, "Failed to update candidate"));
    } finally {
      setPersonalInfoSaving(false);
    }
  };

  const startPersonalInfoEdit = () => {
    if (!isAdmin) return;
    setPersonalInfoSnapshot({ ...formData });
    personalInfoEditingRef.current = true;
    setPersonalInfoEditing(true);
  };

  const cancelPersonalInfoEdit = () => {
    if (personalInfoSnapshot) setFormData(personalInfoSnapshot);
    setBasicPhotoFile(null);
    setBasicCvFile(null);
    personalInfoEditingRef.current = false;
    setPersonalInfoEditing(false);
    setPersonalInfoSnapshot(null);
  };

  // Submit additional info
  const handleAdditionalInfoSubmit = async (e) => {
    e.preventDefault();
    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    try {
      await axios.put(`${apiBase}/api/candidates/${id}`, additionalInfo);
      setShowAdditionalModal(false);
      alert("Additional information saved.");
      fetchCandidateData();
    } catch (error) {
      alert(error?.response?.data?.error || error.message || "Failed to save additional information.");
      console.error("Error saving additional info:", error);
    }
  };

  const handleDeleteDocument = async (docId, kind) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    const paths = {
      seafarers: `seafarers-documents`,
      license: `licences`,
      dce: `dce-documents`,
      value_course: `value-added-courses`,
      education: `educations`,
      verification: `document-verifications`,
    };
    const segment = paths[kind];
    if (!segment) return;
    try {
      await axios.delete(`${apiBase}/api/candidates/${id}/${segment}/${docId}`);
      fetchCandidateData();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Delete failed");
    }
  };

  const formatDateForInput = (val) => {
    if (!val) return "";
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const num = Number(s);
    if (!Number.isNaN(num) && /^\d+$/.test(s)) {
      const ms = num > 1e12 ? num : num * 1000;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
    }
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
  };

  const formatServiceDate = (val) => {
    if (!val) return "";
    const d = typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)
      ? new Date(val + "Z")
      : new Date(typeof val === "number" ? val * 1000 : val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
  };

  /** Inclusive calendar days from sign-on to due sign-off (matches Add modal period). */
  const formatSignOnContractPeriod = (signOn, signOffDue) => {
    const a = toLocalDateFromApi(signOn);
    const b = toLocalDateFromApi(signOffDue);
    if (!a || !b) return "—";
    if (a.getTime() > b.getTime()) return "—";
    const dayMs = 86400000;
    const inclusive = Math.floor((b.getTime() - a.getTime()) / dayMs) + 1;
    return `${inclusive} day${inclusive !== 1 ? "s" : ""}`;
  };

  const openSeafarersModal = (partial) =>
    setSeafarersModal({
      open: true,
      editingDoc: null,
      fixedType: null,
      pickType: false,
      ...partial,
    });
  const closeSeafarersModal = () =>
    setSeafarersModal({ open: false, editingDoc: null, fixedType: null, pickType: false });

  const paginate = (tabKey, rows) => {
    const cfg = tabPaging[tabKey] || { page: 1, pageSize: 10 };
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / cfg.pageSize));
    const page = Math.min(cfg.page, totalPages);
    const start = (page - 1) * cfg.pageSize;
    return {
      rows: rows.slice(start, start + cfg.pageSize),
      total,
      totalPages,
      page,
      pageSize: cfg.pageSize,
    };
  };

  const setTabPage = (tabKey, page) =>
    setTabPaging((prev) => ({ ...prev, [tabKey]: { ...(prev[tabKey] || { pageSize: 10 }), page } }));

  const setTabPageSize = (tabKey, pageSize) =>
    setTabPaging((prev) => ({ ...prev, [tabKey]: { ...(prev[tabKey] || {}), page: 1, pageSize } }));

  const countryNameById = useMemo(
    () => Object.fromEntries((countries || []).map((c) => [String(c.id), c.name])),
    [countries],
  );

  const resolveCountryName = (row) => {
    if (row?.country_name) return row.country_name;
    const id = row?.country_id ?? row?.country;
    if (id != null && String(id).trim() !== "") {
      return countryNameById[String(id)] ?? "-";
    }
    return "-";
  };

  const seaServicesPage = paginate("record_of_sea_services", recordOfSeaServices);
  const planingsPage = paginate("planings", planings);
  const medicalsPage = paginate("pre_joining_medicals", preJoiningMedicals);
  const flagStatePage = paginate("flag_state_crew_documents", flagStateCrewDocuments);
  const travelDocsPage = paginate("pre_joining_travel_documents", preJoiningTravelDocs);
  const signOnPage = paginate("post_sign_on_documents", postSignOnDocs);
  const signOffPage = paginate("post_sign_off_documents", postSignOffDocs);

  return (
    <div className="candidate-details-container">
      {/* Back navigation — reports vs candidates stay separate */}
      <button
        type="button"
        onClick={() => navigate(backToPath)}
        className="back-to-list-btn"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {backLabel}
      </button>

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="alert alert-danger">
          <ul>
            {errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Enhanced Summary Header */}
      <div className="candidate-summary-header">
        <div className="summary-photo-section">
          {candidateData.photo ? (
            <img
              src={candidateData.photo}
              alt="Candidate"
              className="candidate-photo"
            />
          ) : (
            <div className="no-photo-placeholder">No Photo</div>
          )}
        </div>

        <div className="summary-info-section">
          <h2 className="candidate-name">
            {candidateData.name || "Unnamed Candidate"}
          </h2>
          <div className="candidate-rank-badge">
            Rank:{" "}
            {candidateData.rank_name
              || candidateData.raw?.rank_name
              || masterSearchOpts.ranks?.find((r) => String(r.id) === String(candidateData.raw?.rank_id))?.name
              || candidateData.position
              || "N/A"}
          </div>

          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Status</span>
              <span className="summary-value">
                {(() => {
                  const label = resolveAvailabilityStatusLabel(
                    candidateData.raw || formData,
                    masterSearchOpts.availabilityStatus,
                  );
                  if (label) {
                    return (
                      <span className={`status-badge-pill status-badge-pill--prominent ${availabilityTone(label)}`}>
                        ● {label}
                      </span>
                    );
                  }
                  return <span className="status-badge-pill status-badge-pill--prominent status-badge--neutral">● N/A</span>;
                })()}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Email</span>
              <span className="summary-value">
                {candidateData.email_id || "N/A"}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Phone</span>
              <span className="summary-value">
                {candidateData.contact1 || "N/A"}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Date of Birth</span>
              <span className="summary-value">
                {candidateData.dob
                  ? formatDateMonthDayYear(candidateData.dob) || "N/A"
                  : "N/A"}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Passport No.</span>
              <span className="summary-value">
                {candidateData.passport_number || "N/A"}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">CDC No.</span>
              <span className="summary-value">
                {candidateData.cdc_number || "N/A"}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">License</span>
              <span className="summary-value">
                {(() => {
                  const cocNumbers = (licenses || [])
                    .filter((l) => String(l?.type || "").toLowerCase() === "certificate_of_competency")
                    .map((l) => String(l.document_number || "").trim())
                    .filter(Boolean);
                  if (cocNumbers.length) return cocNumbers.join(", ");
                  return candidateData.license || "N/A";
                })()}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Crew ID</span>
              <span className="summary-value">{candidateData.id || "-"}</span>
            </div>

            <div className="summary-item">
              <span className="summary-label">Available From</span>
              <span className="summary-value">
                {candidateData.availability_date
                  ? new Date(
                      candidateData.availability_date,
                    ).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
          </div>

          <div className="summary-export-row">
            <div className="export-dropdown-wrap" ref={exportMenuRef}>
              <button
                ref={exportDropdownBtnRef}
                type="button"
                className="btn btn-primary"
                disabled={exportBusy}
                onClick={() => setExportMenuOpen((v) => !v)}
              >
                {exportBusy ? "Preparing…" : "Download ▾"}
              </button>
            </div>
            {exportMenuOpen &&
              exportMenuCoords &&
              createPortal(
                <ul
                  ref={exportDropdownMenuRef}
                  className="export-dropdown-menu export-dropdown-menu--portal"
                  style={{
                    position: "fixed",
                    top: exportMenuCoords.top,
                    left: exportMenuCoords.left,
                    minWidth: exportMenuCoords.minWidth,
                    zIndex: 10001,
                  }}
                  role="menu"
                >
                  <li>
                    <button
                      type="button"
                      className="export-dropdown-item"
                      onClick={() => downloadCandidateExport("check-list-cv", "crew_checklist.pdf")}
                    >
                      Check List CV
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="export-dropdown-item"
                      onClick={() => downloadCandidateExport("check-list-csv", "crew_checklist.csv")}
                    >
                      Check List CSV
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="export-dropdown-item"
                      onClick={() => downloadCandidateExport("crew-application", "crew_application.pdf")}
                    >
                      Crew Application Form
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="export-dropdown-item"
                      onClick={() => downloadCandidateExport("aramco-xlsx", "aramco.xlsx")}
                    >
                      Aramco
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="export-dropdown-item"
                      onClick={() => openAramcoCvPackage()}
                    >
                      Aramco CV Package
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="export-dropdown-item"
                      disabled={!candidateData.cv}
                      title={candidateData.cv ? "Uploaded CV / resume file" : "No resume file on file"}
                      onClick={() => downloadCandidateResume()}
                    >
                      Download resume
                    </button>
                  </li>
                </ul>,
                document.body,
              )}
          </div>
        </div>
      </div>

      {/* Main Tab Navigation - aligned with candidate_edit.blade.php */}
      <div className="main-tabs">
        <ul className="nav nav-tabs" role="tablist">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === "basic_details" ? "active" : ""}`}
              onClick={() => { setActiveMainTab("basic_details"); setActiveSeafarersTab("BasicDetail"); }}
              role="tab"
              aria-selected={activeMainTab === "basic_details"}
            >
              Basic
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === "seafarers_documents" ? "active" : ""}`}
              onClick={() => { setActiveMainTab("seafarers_documents"); setActiveSeafarersTab("Passport"); }}
              role="tab"
              aria-selected={activeMainTab === "seafarers_documents"}
            >
              Documents
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === "record_of_sea_services" ? "active" : ""}`}
              onClick={() => setActiveMainTab("record_of_sea_services")}
              role="tab"
              aria-selected={activeMainTab === "record_of_sea_services"}
            >
              External Service
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === "planings" ? "active" : ""}`}
              onClick={() => setActiveMainTab("planings")}
              role="tab"
              aria-selected={activeMainTab === "planings"}
            >
              Proposal
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === "pre_joining_medicals" ? "active" : ""}`}
              onClick={() => setActiveMainTab("pre_joining_medicals")}
              role="tab"
              aria-selected={activeMainTab === "pre_joining_medicals"}
            >
              Medicals
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === "flag_state_crew_documents" ? "active" : ""}`}
              onClick={() => setActiveMainTab("flag_state_crew_documents")}
              role="tab"
              aria-selected={activeMainTab === "flag_state_crew_documents"}
            >
              Flag state doc
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === "pre_joining_travel_documents" ? "active" : ""}`}
              onClick={() => setActiveMainTab("pre_joining_travel_documents")}
              role="tab"
              aria-selected={activeMainTab === "pre_joining_travel_documents"}
            >
              Pre Joining
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === "post_sign_on_documents" ? "active" : ""}`}
              onClick={() => setActiveMainTab("post_sign_on_documents")}
              role="tab"
              aria-selected={activeMainTab === "post_sign_on_documents"}
            >
              Sign On
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === "post_sign_off_documents" ? "active" : ""}`}
              onClick={() => setActiveMainTab("post_sign_off_documents")}
              role="tab"
              aria-selected={activeMainTab === "post_sign_off_documents"}
            >
              Sign Off
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === "remarks" ? "active" : ""}`}
              onClick={() => setActiveMainTab("remarks")}
              role="tab"
              aria-selected={activeMainTab === "remarks"}
            >
              Communication
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeMainTab === "download_generate_forms" ? "active" : ""}`}
              onClick={() => { setActiveMainTab("download_generate_forms"); setActiveFormsTab("cv_company_owner"); }}
              role="tab"
              aria-selected={activeMainTab === "download_generate_forms"}
            >
              Forms & Letters
            </button>
          </li>
        </ul>
      </div>

      {/* Basic Details Tab */}
      {activeMainTab === "basic_details" && (
        <div className="tab-content">
          {/* Sub-tabs for Basic Details – match Blade: Address, Nok, Additional Info */}
          <div className="sub-tabs" role="tablist">
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "BasicDetail" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("BasicDetail")}
              role="tab"
              aria-selected={activeSeafarersTab === "BasicDetail"}
            >
              Personal Info
            </button>
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "Address" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Address")}
              role="tab"
              aria-selected={activeSeafarersTab === "Address"}
            >
              Address
            </button>
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "Nok" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Nok")}
              role="tab"
              aria-selected={activeSeafarersTab === "Nok"}
            >
              Next of Kin
            </button>
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "AdditionalInfo" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("AdditionalInfo")}
              role="tab"
              aria-selected={activeSeafarersTab === "AdditionalInfo"}
            >
              Additional Info
            </button>
          </div>

          {activeSeafarersTab === "BasicDetail" && (
            <BasicDetailsForm
              formData={formData}
              candidateData={candidateData}
              handleInputChange={handleInputChange}
              handleSubmit={handleBasicDetailsSubmit}
              handleFileChange={handleBasicDetailsFileChange}
              basicPhotoFile={basicPhotoFile}
              basicCvFile={basicCvFile}
              countries={countries}
              masterSearchOpts={masterSearchOpts}
              editing={personalInfoEditing}
              saving={personalInfoSaving}
              canEdit={isAdmin}
              onStartEdit={startPersonalInfoEdit}
              onCancelEdit={cancelPersonalInfoEdit}
            />
          )}

          {activeSeafarersTab === "Address" && (
            <AddressSection
              formData={formData}
              candidateData={candidateData}
              countries={countries}
              onAddEdit={() => setShowAddressModal(true)}
            />
          )}

          {activeSeafarersTab === "Nok" && (
            <NokSection
              nokDocs={nokDocs}
              candidateData={candidateData}
              formData={formData}
              onAddNew={() => {
                setNokEditing(null);
                setShowNokModal(true);
              }}
              onEdit={(nok) => {
                setNokEditing(nok);
                setShowNokModal(true);
              }}
              fetchCandidateData={fetchCandidateData}
            />
          )}

          {activeSeafarersTab === "AdditionalInfo" && (
            <AdditionalInfoSection
              additionalInfo={additionalInfo}
              candidateData={candidateData}
              onEdit={() => {
                setAdditionalInfo({
                  height: candidateData?.height || "",
                  weight: candidateData?.weight || "",
                  eye_color: candidateData?.eye_color || "",
                  hair_color: candidateData?.hair_color || "",
                  identification_mark: candidateData?.identification_mark || "",
                  bmi: candidateData?.bmi || "",
                  boiler_suit_size: candidateData?.boiler_suit_size || "",
                  shoe_size: candidateData?.shoe_size || "",
                });
                setShowAdditionalModal(true);
              }}
            />
          )}
        </div>
      )}

      {/* Seafarers Documents Tab */}
      {activeMainTab === "seafarers_documents" && (
        <div className="tab-content">
          {/* Seafarers Sub-tabs */}
          <div className="sub-tabs" role="tablist">
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "Passport" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Passport")}
              role="tab"
              aria-selected={activeSeafarersTab === "Passport"}
            >
              Passport
            </button>
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "Cdc" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Cdc")}
              role="tab"
              aria-selected={activeSeafarersTab === "Cdc"}
            >
              CDC
            </button>
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "Licence" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Licence")}
              role="tab"
              aria-selected={activeSeafarersTab === "Licence"}
            >
              License
            </button>
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "Documents" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Documents")}
              role="tab"
              aria-selected={activeSeafarersTab === "Documents"}
            >
              STCW
            </button>
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "Visa" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Visa")}
              role="tab"
              aria-selected={activeSeafarersTab === "Visa"}
            >
              Visa
            </button>
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "edDocs" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("edDocs")}
              role="tab"
              aria-selected={activeSeafarersTab === "edDocs"}
            >
              Educational Documents
            </button>
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "verificationDocs" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("verificationDocs")}
              role="tab"
              aria-selected={activeSeafarersTab === "verificationDocs"}
            >
              Document Verification
            </button>
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "Dce" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Dce")}
              role="tab"
              aria-selected={activeSeafarersTab === "Dce"}
            >
              DCE
            </button>
            <button
              type="button"
              className={`sub-tab ${activeSeafarersTab === "ValueAddedCourse" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("ValueAddedCourse")}
              role="tab"
              aria-selected={activeSeafarersTab === "ValueAddedCourse"}
            >
              Value Added Course
            </button>
          </div>

          {/* Passport Section */}
          {activeSeafarersTab === "Passport" && (
            <PassportSection
              seafarersDocs={seafarersDocs}
              onAddNew={() => openSeafarersModal({ fixedType: "Passport" })}
              onDelete={(docId) => handleDeleteDocument(docId, "seafarers")}
              onEdit={(doc) => openSeafarersModal({ editingDoc: doc, fixedType: "Passport" })}
            />
          )}

          {/* CDC Section */}
          {activeSeafarersTab === "Cdc" && (
            <CdcSection
              seafarersDocs={seafarersDocs}
              onAddNew={() => openSeafarersModal({ fixedType: "Seaman Book" })}
              onDelete={(docId) => handleDeleteDocument(docId, "seafarers")}
              onEdit={(doc) => openSeafarersModal({ editingDoc: doc, fixedType: "Seaman Book" })}
            />
          )}

          {/* License Section */}
          {activeSeafarersTab === "Licence" && (
            <LicenseSection
              licenses={licenses}
              onAddNew={() => setLicenseModal({ open: true, editingDoc: null })}
              onDelete={(docId) => handleDeleteDocument(docId, "license")}
              onEdit={(doc) => setLicenseModal({ open: true, editingDoc: doc })}
            />
          )}

          {/* STCW Documents Section */}
          {activeSeafarersTab === "Documents" && (
            <StcwDocumentsSection
              seafarersDocs={seafarersDocs}
              onAddNew={() => openSeafarersModal({ pickType: true })}
              onDelete={(docId) => handleDeleteDocument(docId, "seafarers")}
              onEdit={(doc) => openSeafarersModal({ editingDoc: doc, pickType: true })}
            />
          )}

          {/* Visa Section */}
          {activeSeafarersTab === "Visa" && (
            <VisaSection
              candidateId={id}
              seafarersDocs={seafarersDocs}
              onAddNew={() => openSeafarersModal({ fixedType: "VISA Copy" })}
              onDelete={(docId) => handleDeleteDocument(docId, "seafarers")}
              onEdit={(doc) => openSeafarersModal({ editingDoc: doc, fixedType: "VISA Copy" })}
            />
          )}

          {/* Education Section */}
          {activeSeafarersTab === "edDocs" && (
            <EducationalDocuments
              edDocs={educationalDocuments}
              onAddNew={() => setEducationModal({ open: true, editingDoc: null })}
              onDelete={(docId) => handleDeleteDocument(docId, "education")}
              onEdit={(doc) => setEducationModal({ open: true, editingDoc: doc })}
            />
          )}

          {/* Verification Section */}
          {activeSeafarersTab === "verificationDocs" && (
            <VerificationDocuments
              edDocs={verificationDocuments}
              onAddNew={() => setVerificationModal({ open: true, editingDoc: null })}
              onDelete={(docId) => handleDeleteDocument(docId, "verification")}
              onEdit={(doc) => setVerificationModal({ open: true, editingDoc: doc })}
            />
          )}

          {/* Dce Section */}
          {activeSeafarersTab === "Dce" && (
            <DceDocumentsSection
              dceDocs={dceDocs}
              onAddNew={() => setAuxCertModal({ open: true, variant: "dce", editingDoc: null })}
              onDelete={(docId) => handleDeleteDocument(docId, "dce")}
              onEdit={(doc) => setAuxCertModal({ open: true, variant: "dce", editingDoc: doc })}
            />
          )}

          {/* Value Added Course Section */}
          {activeSeafarersTab === "ValueAddedCourse" && (
            <ValueAddedDocumentsSection
              valueCourses={valueCourses}
              onAddNew={() => setAuxCertModal({ open: true, variant: "value", editingDoc: null })}
              onDelete={(docId) => handleDeleteDocument(docId, "value_course")}
              onEdit={(doc) => setAuxCertModal({ open: true, variant: "value", editingDoc: doc })}
            />
          )}
        </div>
      )}

      {/* External Service - Record of sea services */}
      {activeMainTab === "record_of_sea_services" && (
        <div className="tab-content">
          <div className="tab-content-section">
            <div className="section-header-row">
              <h6 className="tab-section-title">External Service</h6>
              <button type="button" className="btn btn-sm btn-info" onClick={() => openGenericModal("services")}>
                Add New
              </button>
            </div>
            {seaServicesPage.total > 0 ? (
              <>
              <div className="table-responsive">
                <table className="basic-detail-table services-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Vessel Name</th>
                      <th>Flag</th>
                      <th>Vessel Type</th>
                      <th>GRT</th>
                      <th>DWT</th>
                      <th>BHP</th>
                      <th>Engine Make/Type</th>
                      <th>Sign on Date</th>
                      <th>Sign off Date</th>
                      <th>Period</th>
                      <th>Reason of Sign off</th>
                      <th>Owner/Company</th>
                      <th>Document</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seaServicesPage.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.rank_name ?? row.rank ?? "-"}</td>
                        <td>{row.vessel_name ?? "-"}</td>
                        <td>{row.flag ?? "-"}</td>
                        <td>{row.vessel_type_name ?? row.vessel_type ?? "-"}</td>
                        <td>{row.grt ?? "-"}</td>
                        <td>{row.dwt ?? "-"}</td>
                        <td>{row.bhp ?? "-"}</td>
                        <td>{row.engine_type ?? "-"}</td>
                        <td>{row.sign_on_date ? formatServiceDate(row.sign_on_date) : "-"}</td>
                        <td>{row.sign_off_date ? formatServiceDate(row.sign_off_date) : "-"}</td>
                        <td>{row.period ?? "-"}</td>
                        <td>{row.reason_of_sign_off ?? "-"}</td>
                        <td title={row.owner_company}>{row.owner_company ? (String(row.owner_company).length > 15 ? `${String(row.owner_company).slice(0, 15)}...` : row.owner_company) : "-"}</td>
                        <td>
                          {row.file_path ? (
                            <a
                              href={
                                String(row.file_path).startsWith("http")
                                  ? row.file_path
                                  : `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${id}/${String(row.file_path).replace(/^\/+/, "").split("/").pop()}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="action-cell-with-audit">
                          <ActionToolbar record={row}>
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openGenericModal("services", row)}><i className="fas fa-pen" /></button>
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleGenericDelete("services", row.id)}><i className="fas fa-trash" /></button>
                          </ActionToolbar>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TabPagination
                page={seaServicesPage.page}
                totalPages={seaServicesPage.totalPages}
                total={seaServicesPage.total}
                pageSize={seaServicesPage.pageSize}
                onPageChange={(p) => setTabPage("record_of_sea_services", p)}
                onPageSizeChange={(s) => setTabPageSize("record_of_sea_services", s)}
              />
              </>
            ) : (
              <div className="tab-placeholder">
                <p>No sea service records found.</p>
                <p className="text-muted small">Add records via backend or when Add New is available.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proposal - Planings */}
      {activeMainTab === "planings" && (
        <div className="tab-content">
          <div className="tab-content-section">
            <div className="section-header-row">
              <h6 className="tab-section-title">Proposal</h6>
              <button type="button" className="btn btn-sm btn-info" onClick={() => openGenericModal("proposal")}>
                Add New
              </button>
            </div>
            {planingsPage.total > 0 ? (
              <>
              <div className="table-responsive">
                <table className="basic-detail-table proposal-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Vessel Name</th>
                      <th>Contract Duration</th>
                      <th>Proposed Wages (USD)</th>
                      <th>Approved Wages (USD)</th>
                      <th>Proposal Date</th>
                      <th>Proposal Status</th>
                      <th>Approval Date</th>
                      <th>Tentative Joining Schedule</th>
                      <th>Remarks</th>
                      <th>Documents</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planingsPage.rows.map((row) => {
                      const rowDocs = proposalDocumentsFor(row, id);
                      return (
                      <tr key={row.id}>
                        <td>{row.rank_name ?? row.rank ?? "-"}</td>
                        <td>{row.vessel_name ?? "-"}</td>
                        <td>{row.contract_duration ?? "-"}</td>
                        <td>{row.proposed_wages || row.wages || "-"}</td>
                        <td>{row.approved_wages || "-"}</td>
                        <td>{row.proposal_date ? formatServiceDate(row.proposal_date) : "-"}</td>
                        <td>{proposalStatusLabel(row.proposal_status)}</td>
                        <td>{row.approval_date ? formatServiceDate(row.approval_date) : "-"}</td>
                        <td>{row.tentative_joining_schedule ? formatServiceDate(row.tentative_joining_schedule) : "-"}</td>
                        <td title={row.remarks || ""}>{row.remarks ? String(row.remarks).slice(0, 40) + (String(row.remarks).length > 40 ? "…" : "") : "-"}</td>
                        <td>
                          {rowDocs.length ? (
                            <button
                              type="button"
                              className="doc-view-trigger"
                              onClick={() => openProposalDocViewer(row)}
                              title={`View ${rowDocs.length} document${rowDocs.length > 1 ? "s" : ""}`}
                            >
                              <i className="fas fa-folder-open" aria-hidden="true" />
                              View
                              <span className="doc-view-count">{rowDocs.length}</span>
                            </button>
                          ) : "-"}
                        </td>
                        <td className="action-cell-with-audit">
                          <ActionToolbar record={row}>
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openGenericModal("proposal", row)}><i className="fas fa-pen" /></button>
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleGenericDelete("proposal", row.id)}><i className="fas fa-trash" /></button>
                          </ActionToolbar>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <TabPagination
                page={planingsPage.page}
                totalPages={planingsPage.totalPages}
                total={planingsPage.total}
                pageSize={planingsPage.pageSize}
                onPageChange={(p) => setTabPage("planings", p)}
                onPageSizeChange={(s) => setTabPageSize("planings", s)}
              />
              </>
            ) : (
              <div className="tab-placeholder">
                <p>No proposal records found.</p>
                <p className="text-muted small">Add records via backend or when Add New is available.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Medicals - Pre-joining medicals */}
      {activeMainTab === "pre_joining_medicals" && (
        <div className="tab-content">
          <div className="tab-content-section">
            <div className="section-header-row">
              <h6 className="tab-section-title">Pre-joining medicals</h6>
              <button type="button" className="btn btn-sm btn-info" onClick={() => openGenericModal("medicals")}>
                Add New
              </button>
            </div>
            {medicalsPage.total > 0 ? (
              <>
              <div className="table-responsive">
                <table className="basic-detail-table medicals-table">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Certificate Number</th>
                      <th>Country Name</th>
                      <th>Issue Date</th>
                      <th>Expiry Date</th>
                      <th>Document File</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicalsPage.rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {(masterSearchOpts.preMedicalDocumentTypes || masterSearchOpts.preJoiningMedicalTypes || [])
                            .find((m) => String(m.id) === String(row.medical_id))?.name
                            ?? (documentTypes || []).find((dt) => String(dt.id) === String(row.medical_id))?.name
                            ?? row.document_name
                            ?? (row.medical_id != null && row.medical_id !== "" ? `#${row.medical_id}` : "-")}
                        </td>
                        <td>{row.certificate_number ?? "-"}</td>
                        <td>{resolveCountryName(row)}</td>
                        <td>{row.issue_date ? formatServiceDate(row.issue_date) : "-"}</td>
                        <td>{row.expiry_date ? formatServiceDate(row.expiry_date) : "-"}</td>
                        <td>
                          {row.file_path ? (
                            <a
                              href={String(row.file_path).startsWith("http") ? row.file_path : `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${id}/${String(row.file_path || "").replace(/^\/+/, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          ) : "-"}
                        </td>
                        <td className="action-cell-with-audit">
                          <ActionToolbar record={row}>
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openGenericModal("medicals", row)}><i className="fas fa-pen" /></button>
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleGenericDelete("medicals", row.id)}><i className="fas fa-trash" /></button>
                          </ActionToolbar>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TabPagination
                page={medicalsPage.page}
                totalPages={medicalsPage.totalPages}
                total={medicalsPage.total}
                pageSize={medicalsPage.pageSize}
                onPageChange={(p) => setTabPage("pre_joining_medicals", p)}
                onPageSizeChange={(s) => setTabPageSize("pre_joining_medicals", s)}
              />
              </>
            ) : (
              <div className="tab-placeholder">
                <p>No pre-joining medical documents found.</p>
                <p className="text-muted small">Add records via backend or when Add New is available.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flag state crew documents */}
      {activeMainTab === "flag_state_crew_documents" && (
        <div className="tab-content">
          <div className="tab-content-section">
            <div className="section-header-row">
              <h6 className="tab-section-title">Flag state crew documents</h6>
              <button type="button" className="btn btn-sm btn-info" onClick={() => openGenericModal("flagstate")}>
                Add New
              </button>
            </div>
            {flagStatePage.total > 0 ? (
              <>
              <div className="table-responsive">
                <table className="basic-detail-table flag-state-table">
                  <thead>
                    <tr>
                      <th>Flag State Country</th>
                      <th>COE/Documents Name</th>
                      <th>Grade/Capacity</th>
                      <th>Endorsement No</th>
                      <th>Issue Date (Endo)</th>
                      <th>Expiry Date (Endo)</th>
                      <th>Processed by / Agent</th>
                      <th>Remarks</th>
                      <th>Document</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flagStatePage.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.flag_doc_country ?? "-"}</td>
                        <td>{row.flag_doc_name ?? "-"}</td>
                        <td>{labelForLicenceCapacity(row.flag_doc_grade) || "-"}</td>
                        <td>{row.endorsement_no ?? "-"}</td>
                        <td>{row.issue_date ? formatServiceDate(row.issue_date) : "-"}</td>
                        <td>{row.expiry_date ? formatServiceDate(row.expiry_date) : "-"}</td>
                        <td>{row.processed_by ?? "-"}</td>
                        <td title={row.remarks || undefined}>
                          {row.remarks
                            ? (String(row.remarks).length > 40 ? `${String(row.remarks).slice(0, 40)}…` : row.remarks)
                            : "-"}
                        </td>
                        <td>
                          {row.file_path ? (
                            <a
                              href={String(row.file_path).startsWith("http") ? row.file_path : `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${id}/${String(row.file_path || "").replace(/^\/+/, "").split("/").pop()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          ) : "-"}
                        </td>
                        <td className="action-cell-with-audit">
                          <ActionToolbar record={row}>
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openGenericModal("flagstate", row)}><i className="fas fa-pen" /></button>
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleGenericDelete("flagstate", row.id)}><i className="fas fa-trash" /></button>
                          </ActionToolbar>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TabPagination
                page={flagStatePage.page}
                totalPages={flagStatePage.totalPages}
                total={flagStatePage.total}
                pageSize={flagStatePage.pageSize}
                onPageChange={(p) => setTabPage("flag_state_crew_documents", p)}
                onPageSizeChange={(s) => setTabPageSize("flag_state_crew_documents", s)}
              />
              </>
            ) : (
              <div className="tab-placeholder">
                <p>No flag state crew documents found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pre Joining - Travel documents */}
      {activeMainTab === "pre_joining_travel_documents" && (
        <div className="tab-content">
          <div className="tab-content-section">
            <div className="section-header-row">
              <h6 className="tab-section-title">Pre-joining travel documents</h6>
              <button type="button" className="btn btn-sm btn-info" onClick={() => openGenericModal("prejoining")}>
                Add New
              </button>
            </div>
            {travelDocsPage.total > 0 ? (
              <>
              <div className="table-responsive">
                <table className="basic-detail-table medicals-table">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Country Name</th>
                      <th>Issue Date</th>
                      <th>Expiry Date</th>
                      <th>Document File</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {travelDocsPage.rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {(masterSearchOpts.preJoiningTravelDocumentTypes || [])
                            .find((t) => String(t.id) === String(row.document_id))?.name
                            ?? row.document_name
                            ?? (row.document_id != null && row.document_id !== "" ? `#${row.document_id}` : "-")}
                        </td>
                        <td>{resolveCountryName(row)}</td>
                        <td>{row.issue_date ? formatServiceDate(row.issue_date) : "-"}</td>
                        <td>{row.expiry_date ? formatServiceDate(row.expiry_date) : "-"}</td>
                        <td>
                          {row.file_path ? (
                            <a
                              href={String(row.file_path).startsWith("http") ? row.file_path : `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${id}/${String(row.file_path || "").replace(/^\/+/, "").replace(/^public\/?/, "").split("/").pop()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          ) : "-"}
                        </td>
                        <td className="action-cell-with-audit">
                          <ActionToolbar record={row}>
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openGenericModal("prejoining", row)}><i className="fas fa-pen" /></button>
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleGenericDelete("prejoining", row.id)}><i className="fas fa-trash" /></button>
                          </ActionToolbar>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TabPagination
                page={travelDocsPage.page}
                totalPages={travelDocsPage.totalPages}
                total={travelDocsPage.total}
                pageSize={travelDocsPage.pageSize}
                onPageChange={(p) => setTabPage("pre_joining_travel_documents", p)}
                onPageSizeChange={(s) => setTabPageSize("pre_joining_travel_documents", s)}
              />
              </>
            ) : (
              <div className="tab-placeholder">
                <p>No pre-joining travel documents found.</p>
                <p className="text-muted small">Add records via backend or when Add New is available.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sign On - Post sign on documents */}
      {activeMainTab === "post_sign_on_documents" && (
        <div className="tab-content">
          <div className="tab-content-section">
            <div className="section-header-row">
              <h6 className="tab-section-title">Sign on documents</h6>
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={openAddPostSignOnRecordModal}
                title="Add New sign-on record"
              >
                Add New
              </button>
            </div>
            {signOnPage.total > 0 ? (
              <>
              <div className="table-responsive sign-on-main-table-wrap">
                <table className="basic-detail-table medicals-table sign-on-records-table">
                  <thead>
                    <tr>
                      <th>Vessel Name</th>
                      <th>IMO Number</th>
                      <th>Sign On Rank</th>
                      <th>Contract Start Date</th>
                      <th>Sign On Date</th>
                      <th>Sign On Port</th>
                      <th>Sign On Country</th>
                      <th>Sign Off Due Date</th>
                      <th>Period</th>
                      <th>Remark</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signOnPage.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.vessel_name ?? "-"}</td>
                        <td>{row.imo_number ?? "-"}</td>
                        <td>{row.rank_name ?? row.sign_on_rank ?? row.rank ?? "-"}</td>
                        <td>{row.contract_start_date ? formatServiceDate(row.contract_start_date) : "-"}</td>
                        <td>{row.sign_on_date ? formatServiceDate(row.sign_on_date) : "-"}</td>
                        <td>{row.sign_on_port ?? "-"}</td>
                        <td>
                          {row.country_name ??
                            (row.country_id != null
                              ? (countries.find((c) => String(c.id) === String(row.country_id))?.name ?? row.country_id)
                              : "-")}
                        </td>
                        <td>{row.sign_off_due ? formatServiceDate(row.sign_off_due) : "-"}</td>
                        <td>{formatSignOnContractPeriod(row.sign_on_date, row.sign_off_due)}</td>
                        <td>
                          <span
                            title={row.remark ? `Remark: ${row.remark}` : ""}
                            style={{
                              cursor: row.remark ? "pointer" : "default",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "inline-block",
                              maxWidth: 220,
                            }}
                          >
                            {row.remark ? String(row.remark).slice(0, 30) + (String(row.remark).length > 30 ? "..." : "") : "-"}
                          </span>
                        </td>
                        <td className="action-cell-with-audit">
                          <ActionToolbar record={row}>
                            {isAdmin && (
                              <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openEditPostSignOnRecordModal(row)}><i className="fas fa-pen" /></button>
                            )}
                            <button type="button" className="action-icon-btn action-icon-docs" title="Documents" onClick={() => openSignOnDocModal(row.id)}><i className="fas fa-file-alt" /></button>
                            {isAdmin && (
                              <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleDeletePostSignOnRecord(row.id)}><i className="fas fa-trash" /></button>
                            )}
                          </ActionToolbar>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TabPagination
                page={signOnPage.page}
                totalPages={signOnPage.totalPages}
                total={signOnPage.total}
                pageSize={signOnPage.pageSize}
                onPageChange={(p) => setTabPage("post_sign_on_documents", p)}
                onPageSizeChange={(s) => setTabPageSize("post_sign_on_documents", s)}
              />
              </>
            ) : (
              <div className="tab-placeholder">
                <p>No sign on records found.</p>
                <p className="text-muted small">Click Add New to add a sign-on record.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sign Off - Post sign off documents */}
      {activeMainTab === "post_sign_off_documents" && (
        <div className="tab-content">
          <div className="tab-content-section">
            <div className="section-header-row">
              <h6 className="tab-section-title">Sign off documents</h6>
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={openAddPostSignOffRecordModal}
                disabled={!canAddSignOffRecord}
                title={
                  canAddSignOffRecord
                    ? "Add New sign-off record"
                    : "Available after the due sign-off date on a Sign On record is today or earlier."
                }
              >
                Add New
              </button>
            </div>
            {!signOffAddEligible && !isAdmin && (
              <p className="small text-muted mb-2">
                Add sign-off is available once a Sign On record has a due sign-off date on or before today.
              </p>
            )}

            {signOffPage.total > 0 ? (
              <>
              <div className="table-responsive sign-on-main-table-wrap">
                <table className="basic-detail-table medicals-table sign-on-records-table">
                  <thead>
                    <tr>
                      <th>Vessel Name</th>
                      <th>IMO Number</th>
                      <th>Sign Off Rank</th>
                      <th>Sign On Date</th>
                      <th>Sign Off Date</th>
                      <th>Sign Off Port</th>
                      <th>Sign Off Country</th>
                      <th>Arrival Date in Home Country</th>
                      <th>Contract Completion Date</th>
                      <th>Sign Off Reason</th>
                      <th>Remark</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signOffPage.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.vessel_name ?? "-"}</td>
                        <td>{row.imo_number ?? "-"}</td>
                        <td>{row.rank_name ?? row.sign_off_rank ?? row.sign_off_rank_id ?? "-"}</td>
                        <td>{row.sign_on_date ? formatServiceDate(row.sign_on_date) : "-"}</td>
                        <td>{row.sign_off_date ? formatServiceDate(row.sign_off_date) : "-"}</td>
                        <td>{row.sign_off_port ?? "-"}</td>
                        <td>
                          {row.country_name ??
                            (row.country_id != null
                              ? (countries.find((c) => String(c.id) === String(row.country_id))?.name ?? row.country_id)
                              : "-")}
                        </td>
                        <td>{row.arrival_date ? formatServiceDate(row.arrival_date) : "-"}</td>
                        <td>{row.contract_completion_date ? formatServiceDate(row.contract_completion_date) : "-"}</td>
                        <td>{row.sign_off_reason ?? "-"}</td>
                        <td>
                          <span
                            title={row.remark ? `Remark: ${row.remark}` : ""}
                            style={{
                              cursor: row.remark ? "pointer" : "default",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "inline-block",
                              maxWidth: 220,
                            }}
                          >
                            {row.remark ? String(row.remark).slice(0, 30) + (String(row.remark).length > 30 ? "..." : "") : "-"}
                          </span>
                        </td>
                        <td className="action-cell-with-audit">
                          <ActionToolbar record={row}>
                            {isAdmin ? (
                              <>
                                <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openEditPostSignOffRecordModal(row)}><i className="fas fa-pen" /></button>
                                <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleDeletePostSignOffRecord(row.id)}><i className="fas fa-trash" /></button>
                              </>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </ActionToolbar>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TabPagination
                page={signOffPage.page}
                totalPages={signOffPage.totalPages}
                total={signOffPage.total}
                pageSize={signOffPage.pageSize}
                onPageChange={(p) => setTabPage("post_sign_off_documents", p)}
                onPageSizeChange={(s) => setTabPageSize("post_sign_off_documents", s)}
              />
              </>
            ) : (
              <div className="tab-placeholder">
                <p>No sign off records found.</p>
                <p className="text-muted small">Click Add New to add a sign-off record.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Communication - Remarks */}
      {activeMainTab === "remarks" && (
        <div className="tab-content">
          <div className="tab-content-section remarks-section">
            <div className="remarks-toolbar">
              <div className="remarks-toolbar-left">
                <h6 className="tab-section-title" style={{ margin: 0 }}>Communication</h6>
                <span className="remarks-count-pill">
                  {filteredRemarks.length}
                  {remarksSearch.trim() && filteredRemarks.length !== candidateRemarks.length
                    ? ` / ${candidateRemarks.length}`
                    : ""}{" "}
                  notes
                </span>
              </div>
              <div className="remarks-toolbar-right">
                <input
                  type="search"
                  className="form-control remarks-search"
                  placeholder="Search notes, author, date…"
                  value={remarksSearch}
                  onChange={(e) => setRemarksSearch(e.target.value)}
                  aria-label="Search communication notes"
                />
                <button type="button" className="btn btn-sm btn-info" onClick={() => openRemarkModal()}>
                  Add Remark
                </button>
              </div>
            </div>

            <div className="remarks-followup-bar">
              <label className="remarks-followup-label" htmlFor="remarks-followup-date">
                Follow-up date
              </label>
              <input
                id="remarks-followup-date"
                type="date"
                className="form-control remarks-followup-input"
                value={formatDateForInput(formData.followup_date)}
                onChange={(e) => setFormData((prev) => ({ ...prev, followup_date: e.target.value }))}
              />
              <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveFollowupDate}>
                Save
              </button>
            </div>

            {filteredRemarks.length > 0 ? (
              <div className="remarks-feed" role="list">
                {filteredRemarks.map((row) => {
                  const text = String(row.remarks_text || "").trim();
                  const expanded = expandedRemarkIds.has(row.id);
                  const lineCount = text ? text.split(/\n/).length : 0;
                  const long = text.length > 320 || lineCount > 5;
                  return (
                    <article
                      key={row.id}
                      className={`remarks-card${expanded ? " is-expanded" : ""}`}
                      role="listitem"
                    >
                      <div className="remarks-card-rail" aria-hidden="true" />
                      <div className="remarks-card-body">
                        <header className="remarks-card-meta">
                          <div className="remarks-card-actions action-audit-hover">
                            {row.file_url ? (
                              <a
                                href={row.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="remarks-file-link"
                                title="Open attachment"
                              >
                                <i className="fas fa-paperclip" aria-hidden="true" /> Attachment
                              </a>
                            ) : null}
                            {isAdmin ? (
                              <>
                                <button
                                  type="button"
                                  className="action-icon-btn action-icon-edit"
                                  title="Edit"
                                  onClick={() => openRemarkModal(row)}
                                >
                                  <i className="fas fa-pen" />
                                </button>
                                <button
                                  type="button"
                                  className="action-icon-btn action-icon-delete"
                                  title="Delete"
                                  onClick={() => handleDeleteRemark(row.id)}
                                >
                                  <i className="fas fa-trash" />
                                </button>
                              </>
                            ) : (
                              <span
                                className="action-icon-btn action-icon-audit"
                                title="Audit"
                                aria-label="Audit details"
                                tabIndex={0}
                              >
                                <i className="fas fa-clock" aria-hidden="true" />
                              </span>
                            )}
                            <RecordAuditPopover record={row} />
                          </div>
                        </header>
                        <div
                          className={`remarks-card-text${long && !expanded ? " is-collapsed" : ""}`}
                        >
                          {text || (
                            <span className="remarks-card-text-empty">No note text</span>
                          )}
                        </div>
                        {long ? (
                          <button
                            type="button"
                            className="remarks-expand-btn"
                            onClick={() => toggleRemarkExpanded(row.id)}
                            aria-expanded={expanded}
                          >
                            {expanded ? "Show less" : "Show full note"}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="tab-placeholder remarks-empty">
                <p>{candidateRemarks.length ? "No notes match your search." : "No communication notes yet."}</p>
                <p className="text-muted small">
                  {candidateRemarks.length
                    ? "Clear the search to see all notes."
                    : "Click Add Remark to record a communication note."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeMainTab === "download_generate_forms" && (
        <FormsLettersPanel
          activeTab={activeFormsTab}
          onTabChange={setActiveFormsTab}
          busy={exportBusy}
          onView={viewFormsDocument}
          onDownload={downloadFormsDocument}
        />
      )}

      {aramcoPkgOpen && (
        <div className="modal-overlay" onClick={() => !exportBusy && setAramcoPkgOpen(false)}>
          <div className="modal-content modal-lg aramco-pkg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Aramco CV Package</h3>
              <button type="button" className="close-btn" onClick={() => !exportBusy && setAramcoPkgOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="aramco-pkg-note">
                Pages 1–5 are always included: cover letter, Aramco checklist, Aramco CV, work experience, and previous approval letter.
                Tick supporting documents below and set the order number. They are appended in that numbered order.
              </p>
              {aramcoPkgLoading ? (
                <p>Loading documents…</p>
              ) : aramcoPkgDocs.length === 0 ? (
                <p>No uploaded documents found for this crew member.</p>
              ) : (
                <div className="aramco-pkg-list">
                  {Object.entries(
                    aramcoPkgDocs.reduce((acc, doc) => {
                      const g = doc.group || "Other";
                      if (!acc[g]) acc[g] = [];
                      acc[g].push(doc);
                      return acc;
                    }, {}),
                  ).map(([group, docs]) => (
                    <div key={group} className="aramco-pkg-group">
                      <div className="aramco-pkg-group-title">{group}</div>
                      {docs.map((doc) => {
                        const checked = aramcoPkgSelected[doc.key] != null;
                        return (
                          <label key={doc.key} className={`aramco-pkg-row${doc.hasFile ? "" : " is-disabled"}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!doc.hasFile}
                              onChange={() => toggleAramcoPkgDoc(doc.key, doc.hasFile)}
                            />
                            <input
                              type="number"
                              min="1"
                              className="aramco-pkg-order"
                              disabled={!checked}
                              value={checked ? aramcoPkgSelected[doc.key] : ""}
                              onChange={(e) => setAramcoPkgOrder(doc.key, e.target.value)}
                              title="Order in PDF"
                            />
                            <span className="aramco-pkg-label">
                              {doc.label}
                              {!doc.hasFile ? <em> (no file)</em> : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" disabled={exportBusy} onClick={() => setAramcoPkgOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={exportBusy || aramcoPkgLoading} onClick={downloadAramcoCvPackage}>
                {exportBusy ? "Preparing PDF…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {remarkModal.open && (
        <div className="modal-overlay" onClick={closeRemarkModal}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{remarkModal.editingId ? "Edit Remark" : "Add Remark"}</h3>
              <button type="button" className="close-btn" onClick={closeRemarkModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Remarks</label>
                <textarea
                  className="form-control"
                  rows={10}
                  value={remarkModal.remarks}
                  onChange={(e) => setRemarkModal((prev) => ({ ...prev, remarks: e.target.value }))}
                  style={{ resize: "vertical", minHeight: 180 }}
                  placeholder="Write the communication note…"
                />
              </div>
              <div className="form-group">
                <label>Upload File {remarkModal.editingId ? "(optional — leave empty to keep existing)" : "(optional)"}</label>
                <input
                  type="file"
                  className="form-control"
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = pickDocumentFile(e);
                    setRemarkModal((prev) => ({ ...prev, file: file || null }));
                  }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "12px 16px" }}>
              <button type="button" className="btn btn-secondary" onClick={closeRemarkModal} disabled={remarkModal.saving}>
                Close
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveRemark} disabled={remarkModal.saving}>
                {remarkModal.saving ? "Saving…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proposal documents: choose a file, preview it without leaving the page */}
      {proposalDocViewer.open && (
        <div className="modal-overlay" onClick={closeProposalDocViewer}>
          <div className="modal-content modal-lg doc-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Proposal Documents
                {proposalDocViewer.row?.vessel_name ? ` · ${proposalDocViewer.row.vessel_name}` : ""}
              </h3>
              <button type="button" className="close-btn" onClick={closeProposalDocViewer} aria-label="Close">&times;</button>
            </div>

            <div className="doc-viewer-body">
              <div className="doc-viewer-list" role="listbox" aria-label="Documents">
                <div className="doc-viewer-list-title">
                  {proposalDocViewer.docs.length} document{proposalDocViewer.docs.length > 1 ? "s" : ""}
                </div>
                {proposalDocViewer.docs.map((doc) => (
                  <button
                    key={doc.key}
                    type="button"
                    role="option"
                    aria-selected={proposalDocViewer.selected?.key === doc.key}
                    className={`doc-viewer-item${proposalDocViewer.selected?.key === doc.key ? " is-active" : ""}`}
                    onClick={() => setProposalDocViewer((prev) => ({ ...prev, selected: doc }))}
                  >
                    <i className={`fas ${doc.icon} doc-viewer-item-icon`} aria-hidden="true" />
                    <span className="doc-viewer-item-text">
                      <span className="doc-viewer-item-label">{doc.label}</span>
                      <span className="doc-viewer-item-meta">{doc.ext ? doc.ext.toUpperCase() : "FILE"}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="doc-viewer-stage">
                {!proposalDocViewer.selected ? (
                  <div className="doc-viewer-empty">
                    <i className="fas fa-file-circle-question" aria-hidden="true" />
                    <p>Select a document to preview</p>
                  </div>
                ) : PREVIEWABLE_IMAGE_EXTS.includes(proposalDocViewer.selected.ext) ? (
                  <div className="doc-viewer-frame doc-viewer-frame--image">
                    <img src={proposalDocViewer.selected.url} alt={proposalDocViewer.selected.label} />
                  </div>
                ) : proposalDocViewer.selected.ext === "pdf" ? (
                  <div className="doc-viewer-frame">
                    <iframe
                      src={`${proposalDocViewer.selected.url}#toolbar=1`}
                      title={proposalDocViewer.selected.label}
                    />
                  </div>
                ) : (
                  <div className="doc-viewer-empty">
                    <i className="fas fa-file-arrow-down" aria-hidden="true" />
                    <p>
                      Preview is not available for
                      {proposalDocViewer.selected.ext ? ` .${proposalDocViewer.selected.ext}` : " this"} files
                    </p>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => downloadProposalDoc(proposalDocViewer.selected)}
                    >
                      Download to view
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer doc-viewer-footer">
              <span className="doc-viewer-filename" title={proposalDocViewer.selected?.fileName || ""}>
                {proposalDocViewer.selected?.fileName || ""}
              </span>
              <div className="doc-viewer-footer-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info"
                  disabled={!proposalDocViewer.selected}
                  onClick={() => downloadProposalDoc(proposalDocViewer.selected)}
                >
                  Download
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={closeProposalDocViewer}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {formsDocViewer.open && (
        <div className="modal-overlay" onClick={closeFormsDocViewer}>
          <div className="modal-content modal-lg doc-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{formsDocViewer.name || "Form"}</h3>
              <button type="button" className="close-btn" onClick={closeFormsDocViewer} aria-label="Close">&times;</button>
            </div>
            <div className="doc-viewer-body">
              <div className="doc-viewer-list" role="listbox" aria-label="Documents">
                <div className="doc-viewer-list-title">1 document</div>
                <button
                  type="button"
                  role="option"
                  aria-selected="true"
                  className="doc-viewer-item is-active"
                >
                  <i className="fas fa-file-pdf doc-viewer-item-icon" aria-hidden="true" />
                  <span className="doc-viewer-item-text">
                    <span className="doc-viewer-item-label">{formsDocViewer.name || "Form"}</span>
                    <span className="doc-viewer-item-meta">PDF</span>
                  </span>
                </button>
              </div>
              <div className="doc-viewer-stage">
                {formsDocViewer.url ? (
                  <div className="doc-viewer-frame">
                    <iframe
                      src={`${formsDocViewer.url}#toolbar=1`}
                      title={formsDocViewer.name || "Form preview"}
                    />
                  </div>
                ) : (
                  <div className="doc-viewer-empty">
                    <p>Preview is not available</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer doc-viewer-footer">
              <span className="doc-viewer-filename" title={formsDocViewer.fileName || ""}>
                {formsDocViewer.fileName || ""}
              </span>
              <div className="doc-viewer-footer-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info"
                  disabled={!formsDocViewer.url}
                  onClick={() => {
                    if (!formsDocViewer.url) return;
                    const a = document.createElement("a");
                    a.href = formsDocViewer.url;
                    a.download = formsDocViewer.fileName || "form.pdf";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                >
                  Download
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={closeFormsDocViewer}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic Add/Edit Modal for Services, Proposal, Medicals, FlagState, PreJoining */}
      {genericModal.open && (
        <div className="modal-overlay" onClick={closeGenericModal}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{genericModal.editingId ? "Edit" : "Add"} {
                { services: "External Service", proposal: "Proposal", medicals: "Pre-joining Medical", flagstate: "Flag State Document", prejoining: "Pre-joining Travel Document" }[genericModal.type]
              }</h3>
              <button className="close-btn" onClick={closeGenericModal}>&times;</button>
            </div>
            <div className="modal-body modal-form-row">
              {genericModal.type === "services" && (<>
                <div className="form-group">
                  <label>Rank</label>
                  <select
                    className="form-control"
                    value={genericModal.form.rank}
                    onChange={(e) => handleGenericFormChange("rank", e.target.value)}
                  >
                    <option value="">Select rank</option>
                    {masterSearchOpts.ranks.map((r) => (
                      <option key={r.id} value={String(r.id)}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vessel Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={genericModal.form.vessel_name}
                    onChange={(e) => handleGenericFormChange("vessel_name", e.target.value)}
                  />
                </div>
                <div className="form-group"><label>Flag</label><input type="text" className="form-control" value={genericModal.form.flag} onChange={(e) => handleGenericFormChange("flag", e.target.value)} /></div>
                <div className="form-group">
                  <label>Vessel type</label>
                  <select
                    className="form-control"
                    value={genericModal.form.vessel_type}
                    onChange={(e) => handleGenericFormChange("vessel_type", e.target.value)}
                  >
                    <option value="">Select vessel type</option>
                    {masterSearchOpts.vesselTypes.map((vt) => (
                      <option key={vt.id} value={String(vt.id)}>{vt.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group"><label>GRT</label><input type="text" className="form-control" value={genericModal.form.grt} onChange={(e) => handleGenericFormChange("grt", e.target.value)} /></div>
                <div className="form-group"><label>DWT</label><input type="text" className="form-control" value={genericModal.form.dwt} onChange={(e) => handleGenericFormChange("dwt", e.target.value)} /></div>
                <div className="form-group"><label>BHP</label><input type="text" className="form-control" value={genericModal.form.bhp} onChange={(e) => handleGenericFormChange("bhp", e.target.value)} /></div>
                <div className="form-group">
                  <label>Engine Make/Type</label>
                  <select
                    className="form-control"
                    value={genericModal.form.engine_type}
                    onChange={(e) => handleGenericFormChange("engine_type", e.target.value)}
                  >
                    <option value="">Select Engine Make/Type</option>
                    {genericModal.form.engine_type &&
                      !(masterSearchOpts.engineMakes || []).some(
                        (em) => String(em.name) === String(genericModal.form.engine_type),
                      ) && (
                        <option value={genericModal.form.engine_type}>
                          {genericModal.form.engine_type} (current)
                        </option>
                      )}
                    {(masterSearchOpts.engineMakes || []).map((em) => (
                      <option key={em.id} value={em.name}>{em.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group"><label>Sign On Date</label><input type="date" className="form-control" value={genericModal.form.sign_on_date} onChange={(e) => handleGenericFormChange("sign_on_date", e.target.value)} /></div>
                <div className="form-group"><label>Sign Off Date</label><input type="date" className="form-control" value={genericModal.form.sign_off_date} onChange={(e) => handleGenericFormChange("sign_off_date", e.target.value)} /></div>
                <div className="form-group">
                  <label>Period</label>
                  <input
                    type="text"
                    className="form-control"
                    value={genericModal.form.period}
                    readOnly
                    placeholder="Auto-calculated from sign on/off dates"
                  />
                </div>
                <div className="form-group"><label>Reason of Sign Off</label><input type="text" className="form-control" value={genericModal.form.reason_of_sign_off} onChange={(e) => handleGenericFormChange("reason_of_sign_off", e.target.value)} /></div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Owner / Company</label>
                  <input
                    type="text"
                    className="form-control"
                    value={genericModal.form.owner_company}
                    onChange={(e) => handleGenericFormChange("owner_company", e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>
                    Document Upload
                    {genericModal.editingId ? " — leave empty to keep current file" : ""}
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                    onChange={(e) => setSeaServiceDocFile(pickDocumentFile(e))}
                  />
                  {seaServiceDocFile && (
                    <p className="text-muted small mb-0 mt-1">Selected: {seaServiceDocFile.name}</p>
                  )}
                  {genericModal.editingId && genericModal.form.file_path && !seaServiceDocFile && (
                    <p className="text-muted small mb-0 mt-1">
                      Current file:{" "}
                      <a
                        href={
                          String(genericModal.form.file_path).startsWith("http")
                            ? genericModal.form.file_path
                            : `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${id}/${String(genericModal.form.file_path).replace(/^\/+/, "").split("/").pop()}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    </p>
                  )}
                </div>
              </>)}

              {genericModal.type === "proposal" && (<>
                <div className="form-group">
                  <label>Rank</label>
                  <select
                    className="form-control"
                    value={genericModal.form.rank}
                    onChange={(e) => handleGenericFormChange("rank", e.target.value)}
                  >
                    <option value="">Select rank</option>
                    {masterSearchOpts.ranks.map((r) => (
                      <option key={r.id} value={String(r.id)}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vessel Name</label>
                  <select
                    className="form-control"
                    value={genericModal.form.vessel_name}
                    onChange={(e) => handleGenericVesselChange(e.target.value)}
                  >
                    <option value="">Select vessel name</option>
                    {genericModal.form.vessel_name &&
                      !vesselsList.some(
                        (v) =>
                          String(v.ship_name ?? v.vessel_name ?? "").trim() ===
                          String(genericModal.form.vessel_name).trim(),
                      ) && (
                        <option value={genericModal.form.vessel_name}>
                          {genericModal.form.vessel_name} (current)
                        </option>
                      )}
                    {Array.from(
                      new Set(
                        [...vesselsList]
                          .map((v) => String(v.ship_name ?? v.vessel_name ?? "").trim())
                          .filter(Boolean),
                      ),
                    )
                      .sort((a, b) => a.localeCompare(b))
                      .map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Contract Duration</label>
                  <select
                    className="form-control"
                    value={genericModal.form.contract_duration}
                    onChange={(e) => handleGenericFormChange("contract_duration", e.target.value)}
                  >
                    <option value="">Select contract duration</option>
                    {["1 Month", "2 Month", "3 Month", "4 Month", "5 Month", "6 Month", "7 Month", "8 Month", "9 Month", "10 Month", "11 Month", "12 Month"].map((v) => (
                      <option key={v} value={v}>{v.replace(" Month", "")} Months</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Proposed Wages (USD)</label>
                  <input
                    type="text"
                    className="form-control"
                    inputMode="decimal"
                    placeholder="e.g. 4500"
                    value={genericModal.form.proposed_wages || ""}
                    onChange={(e) => handleGenericFormChange("proposed_wages", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Approved Wages (USD)</label>
                  <input
                    type="text"
                    className="form-control"
                    inputMode="decimal"
                    placeholder="e.g. 4500"
                    value={genericModal.form.approved_wages || ""}
                    onChange={(e) => handleGenericFormChange("approved_wages", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Proposal Date</label>
                  <input type="date" className="form-control" value={genericModal.form.proposal_date} onChange={(e) => handleGenericFormChange("proposal_date", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Proposal Status</label>
                  <select className="form-control" value={genericModal.form.proposal_status} onChange={(e) => handleGenericFormChange("proposal_status", e.target.value)}>
                    <option value="">Select status</option>
                    {PROPOSAL_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    {/* Keep legacy value selectable when editing an older record */}
                    {genericModal.form.proposal_status
                      && !PROPOSAL_STATUS_OPTIONS.some((o) => o.value === genericModal.form.proposal_status)
                      && (
                        <option value={genericModal.form.proposal_status}>
                          {proposalStatusLabel(genericModal.form.proposal_status)} (current)
                        </option>
                      )}
                  </select>
                </div>
                <div className="form-group">
                  <label>Approval Date</label>
                  <input type="date" className="form-control" value={genericModal.form.approval_date} onChange={(e) => handleGenericFormChange("approval_date", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Tentative Joining Schedule</label>
                  <input type="date" className="form-control" value={genericModal.form.tentative_joining_schedule} onChange={(e) => handleGenericFormChange("tentative_joining_schedule", e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Remarks</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={genericModal.form.remarks || ""}
                    onChange={(e) => handleGenericFormChange("remarks", e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Document Uploads (max 20 MB each)</label>
                  <div className="proposal-upload-grid">
                    {[
                      { key: "cv_package_file", label: "CV Package (Aramco)" },
                      { key: "proposal_email_file", label: "Proposal Email File" },
                      { key: "approval_email_file", label: "Approval Email File" },
                      { key: "rejection_email_file", label: "Rejection Email File" },
                      { key: "other_documents_file", label: "Other Documents" },
                    ].map(({ key, label }) => {
                      const existing = genericModal.form[key];
                      const selected = proposalFiles[key];
                      const href = existing
                        ? (String(existing).startsWith("http")
                          ? existing
                          : `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${id}/${String(existing).replace(/^\/+/, "").split("/").pop()}`)
                        : null;
                      return (
                        <div key={key} className="proposal-upload-item">
                          <div className="proposal-upload-label">{label}</div>
                          <input
                            type="file"
                            className="form-control"
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.eml,.msg"
                            onChange={(e) => {
                              const file = pickDocumentFile(e);
                              setProposalFiles((prev) => ({ ...prev, [key]: file }));
                            }}
                          />
                          {selected ? (
                            <span className="text-muted small">{selected.name} (selected)</span>
                          ) : href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="view-file-btn">View current</a>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>)}

              {genericModal.type === "medicals" && (<>
                <div className="form-group">
                  <label>Document type</label>
                  <select
                    className="form-control"
                    value={genericModal.form.medical_id}
                    onChange={(e) => handleGenericFormChange("medical_id", e.target.value)}
                    required
                  >
                    <option value="">Select document type</option>
                    {[...(masterSearchOpts.preMedicalDocumentTypes?.length
                      ? masterSearchOpts.preMedicalDocumentTypes
                      : masterSearchOpts.preJoiningMedicalTypes?.length
                        ? masterSearchOpts.preJoiningMedicalTypes
                        : documentTypes || [])]
                      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }))
                      .map((dt) => (
                        <option key={dt.id} value={String(dt.id)}>{dt.name}</option>
                      ))}
                  </select>
                </div>
                <div className="form-group"><label>Certificate Number</label><input type="text" className="form-control" value={genericModal.form.certificate_number} onChange={(e) => handleGenericFormChange("certificate_number", e.target.value)} /></div>
                <div className="form-group"><label>Country</label>
                  <select className="form-control" value={genericModal.form.country_id} onChange={(e) => handleGenericFormChange("country_id", e.target.value)}>
                    <option value="">Select Country</option>
                    {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Issue Date</label><input type="date" className="form-control" value={genericModal.form.issue_date} onChange={(e) => handleGenericFormChange("issue_date", e.target.value)} /></div>
                <div className="form-group"><label>Expiry Date</label><input type="date" className="form-control" value={genericModal.form.expiry_date} onChange={(e) => handleGenericFormChange("expiry_date", e.target.value)} /></div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Document file {genericModal.editingId ? "(optional — leave empty to keep current file)" : "(optional)"}</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                    onChange={(e) => setMedicalDocFile(pickDocumentFile(e))}
                  />
                </div>
              </>)}

              {genericModal.type === "flagstate" && (<>
                <div className="form-group">
                  <label>Flag State Country</label>
                  <select
                    className="form-control"
                    value={genericModal.form.flag_doc_country}
                    onChange={(e) => handleGenericFormChange("flag_doc_country", e.target.value)}
                  >
                    <option value="">Select country</option>
                    {genericModal.form.flag_doc_country &&
                      !(countries || []).some(
                        (c) => String(c.name) === String(genericModal.form.flag_doc_country),
                      ) && (
                        <option value={genericModal.form.flag_doc_country}>
                          {genericModal.form.flag_doc_country} (current)
                        </option>
                      )}
                    {(countries || []).map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>COE/Documents Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={genericModal.form.flag_doc_name}
                    onChange={(e) => handleGenericFormChange("flag_doc_name", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Grade/Capacity</label>
                  <select
                    className="form-control"
                    value={genericModal.form.flag_doc_grade}
                    onChange={(e) => handleGenericFormChange("flag_doc_grade", e.target.value)}
                  >
                    <option value="">Select grade/capacity</option>
                    {genericModal.form.flag_doc_grade &&
                      !LICENCE_CAPACITY_OPTIONS.some(
                        (o) => o.value === genericModal.form.flag_doc_grade,
                      ) && (
                        <option value={genericModal.form.flag_doc_grade}>
                          {labelForLicenceCapacity(genericModal.form.flag_doc_grade)} (current)
                        </option>
                      )}
                    {LICENCE_CAPACITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Endorsement No</label>
                  <input
                    type="text"
                    className="form-control"
                    value={genericModal.form.endorsement_no}
                    onChange={(e) => handleGenericFormChange("endorsement_no", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Issue Date (Endo)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={genericModal.form.issue_date}
                    onChange={(e) => handleGenericFormChange("issue_date", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Expiry Date (Endo)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={genericModal.form.expiry_date}
                    onChange={(e) => handleGenericFormChange("expiry_date", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Processed by / Agent Name</label>
                  <select
                    className="form-control"
                    value={genericModal.form.processed_by}
                    onChange={(e) => handleGenericFormChange("processed_by", e.target.value)}
                  >
                    <option value="">Select agent</option>
                    {genericModal.form.processed_by &&
                      !FLAG_STATE_PROCESSED_BY_OPTIONS.includes(genericModal.form.processed_by) && (
                        <option value={genericModal.form.processed_by}>
                          {genericModal.form.processed_by} (current)
                        </option>
                      )}
                    {FLAG_STATE_PROCESSED_BY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Remarks</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={genericModal.form.remarks}
                    onChange={(e) => handleGenericFormChange("remarks", e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>
                    Browse (Upload)
                    {genericModal.editingId ? " — leave empty to keep current file" : ""}
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                    onChange={(e) => setFlagStateDocFile(pickDocumentFile(e))}
                  />
                  {genericModal.editingId && genericModal.form.file_path && !flagStateDocFile && (
                    <p className="text-muted small mb-0 mt-1">
                      Current file:{" "}
                      <a
                        href={
                          String(genericModal.form.file_path).startsWith("http")
                            ? genericModal.form.file_path
                            : `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${id}/${String(genericModal.form.file_path).replace(/^\/+/, "").split("/").pop()}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    </p>
                  )}
                </div>
              </>)}

              {genericModal.type === "prejoining" && (<>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Document type</label>
                  <select
                    className="form-control"
                    value={genericModal.form.document_id}
                    onChange={(e) => handleGenericFormChange("document_id", e.target.value)}
                    required
                  >
                    <option value="">Select document type</option>
                    {(masterSearchOpts.preJoiningTravelDocumentTypes || [])
                      .slice()
                      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }))
                      .map((dt) => (
                        <option key={dt.id} value={String(dt.id)}>{dt.name}</option>
                      ))}
                  </select>
                  {(masterSearchOpts.preJoiningTravelDocumentTypes || []).length === 0 && (
                    <p className="text-muted small mb-0 mt-1">
                      No types returned from the server. Add rows to <code>travel_document_types</code> (or legacy <code>global_lookups</code> for travel), or save a travel document so types can be inferred from <code>document_id</code>.
                    </p>
                  )}
                </div>
                <div className="form-group"><label>Country</label>
                  <select className="form-control" value={genericModal.form.country_id} onChange={(e) => handleGenericFormChange("country_id", e.target.value)}>
                    <option value="">Select Country</option>
                    {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Issue Date</label><input type="date" className="form-control" value={genericModal.form.issue_date} onChange={(e) => handleGenericFormChange("issue_date", e.target.value)} /></div>
                <div className="form-group"><label>Expiry Date</label><input type="date" className="form-control" value={genericModal.form.expiry_date} onChange={(e) => handleGenericFormChange("expiry_date", e.target.value)} /></div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Document file {genericModal.editingId ? "(optional — leave empty to keep current file)" : "(optional)"}</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                    onChange={(e) => setPreJoiningTravelFile(pickDocumentFile(e))}
                  />
                </div>
              </>)}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeGenericModal}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={genericModal.saving} onClick={saveGenericModal}>
                {genericModal.saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddressModal
        show={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        candidateId={id}
        formData={formData}
        countries={countries}
        onSubmitSuccess={() => {
          fetchCandidateData({ fast: true }).catch(() => {});
        }}
      />
      <NokModal
        show={showNokModal}
        onClose={() => {
          setShowNokModal(false);
          setNokEditing(null);
        }}
        candidateId={id}
        editingNok={nokEditing}
        nomineeRelationships={nomineeRelationships}
        onSubmitSuccess={() => {
          setShowNokModal(false);
          setNokEditing(null);
          fetchCandidateData({ fast: true }).catch(() => {});
        }}
      />

      {/* Sign On Documents modal: list docs and add new */}
      {showSignOnDocModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Sign On Documents {signOnDocSignonId ? `(Sign On #${signOnDocSignonId})` : ""}</h6>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary border-0 p-2"
                  onClick={() => {
                    setShowSignOnDocModal(false);
                    setSignOnDocSignonId(null);
                    setSignOnDocList([]);
                    setSignOnDocEditingId(null);
                    setSignOnDocEditDocumentId("");
                    setSignOnDocFormKey((k) => k + 1);
                  }}
                  aria-label="Close"
                  title="Close"
                  style={{ fontSize: "1.5rem", lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body">
                <h6 className="mb-2">Documents</h6>
                <div className="table-responsive mb-3">
                  <table className="table table-bordered table-sm">
                    <thead>
                      <tr>
                        <th>Document Name</th>
                        <th>View</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signOnDocList.length === 0 ? (
                        <tr><td colSpan={4} className="text-muted">No documents yet. Add one below.</td></tr>
                      ) : (
                        signOnDocList.map((d) => (
                          <tr key={d.id}>
                            <td>{d.document_name ?? d.document_id ?? "-"}</td>
                            <td>
                              {d.view_url ? (
                                <a href={d.view_url} target="_blank" rel="noopener noreferrer">View</a>
                              ) : "-"}
                            </td>
                            <td className="action-cell-with-audit">
                              <ActionToolbar record={d}>
                                <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => handleEditSignOnDocument(d)}><i className="fas fa-pen" /></button>
                                <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleDeleteSignOnDocument(d.id)}><i className="fas fa-trash" /></button>
                              </ActionToolbar>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <hr />
                <div className="d-flex align-items-center justify-content-between mb-2 gap-2">
                  <h6 className="mb-0">{signOnDocEditingId ? "Update Document" : "Add Document"}</h6>
                  {signOnDocEditingId && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setSignOnDocEditingId(null);
                        setSignOnDocEditDocumentId("");
                        setSignOnDocFormKey((k) => k + 1);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <form onSubmit={handleAddSignOnDocument} className="small">
                  <div className="mb-2">
                    <label className="form-label">Document type</label>
                    <select
                      name="document_id"
                      className="form-select form-select-sm"
                      required
                      value={signOnDocEditDocumentId}
                      onChange={(e) => setSignOnDocEditDocumentId(e.target.value)}
                    >
                      <option value="">Select document</option>
                      {signOnDocumentTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name ?? t.option ?? t.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">File (optional)</label>
                    <input
                      key={signOnDocFormKey}
                      type="file"
                      name="file_path"
                      className="form-control form-control-sm"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={signOnDocUploading}>
                    {signOnDocUploading ? "Saving…" : (signOnDocEditingId ? "Update Document" : "Add Document")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sign On Record modal: add/edit postsignon_docs rows */}
      {showPostSignOnRecordModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">
                  {postSignOnRecordEditingId != null ? "Edit Sign-On Record" : "Add Sign-On Record"}
                </h6>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary border-0 p-2"
                  onClick={() => {
                    setShowPostSignOnRecordModal(false);
                    setPostSignOnRecordEditingId(null);
                  }}
                  aria-label="Close"
                  title="Close"
                  style={{ fontSize: "1.5rem", lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body modal-form-row">
                <form onSubmit={submitPostSignOnRecord} className="modal-body modal-form-row p-0">
                  <div className="form-group">
                    <label>Vessel</label>
                    <select
                      name="vessel_name"
                      className="form-control"
                      value={postSignOnRecordForm.vessel_name}
                      onChange={handlePostSignOnVesselChange}
                      required
                    >
                      <option value="">Select vessel</option>
                      {postSignOnRecordForm.vessel_name &&
                        !vesselsList.some(
                          (v) =>
                            String(v.ship_name ?? v.vessel_name ?? "").trim() ===
                            String(postSignOnRecordForm.vessel_name).trim(),
                        ) && (
                          <option value={postSignOnRecordForm.vessel_name}>
                            {postSignOnRecordForm.vessel_name} (current)
                          </option>
                        )}
                      {vesselsList.map((v) => {
                        const nm = String(v.ship_name ?? v.vessel_name ?? "").trim();
                        if (!nm) return null;
                        return (
                          <option key={v.id} value={nm}>
                            {nm}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>IMO Number</label>
                    <input
                      type="text"
                      name="imo_number"
                      className="form-control"
                      value={postSignOnRecordForm.imo_number}
                      onChange={handlePostSignOnRecordInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Sign-on rank</label>
                    <select
                      name="sign_on_rank"
                      className="form-control"
                      value={postSignOnRecordForm.sign_on_rank}
                      onChange={handlePostSignOnRecordInputChange}
                      required
                    >
                      <option value="">Select rank</option>
                      {postSignOnRecordForm.sign_on_rank !== "" &&
                        !masterSearchOpts.ranks.some(
                          (r) => String(r.id) === String(postSignOnRecordForm.sign_on_rank),
                        ) && (
                          <option value={postSignOnRecordForm.sign_on_rank}>
                            {postSignOnRecordForm.sign_on_rank} (current)
                          </option>
                        )}
                      {(masterSearchOpts.ranks || [])
                        .slice()
                        .sort((a, b) =>
                          String(a.name || "").localeCompare(String(b.name || ""), undefined, {
                            sensitivity: "base",
                          }),
                        )
                        .map((r) => (
                          <option key={r.id} value={String(r.id)}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sign On Country</label>
                    <select
                      name="country_id"
                      className="form-control"
                      value={postSignOnRecordForm.country_id}
                      onChange={handlePostSignOnRecordInputChange}
                      required
                    >
                      <option value="">Select Country</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Contract Start Date</label>
                    <input
                      type="date"
                      name="contract_start_date"
                      className="form-control"
                      value={postSignOnRecordForm.contract_start_date}
                      onChange={handlePostSignOnRecordInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Sign On Date</label>
                    <input
                      type="date"
                      name="sign_on_date"
                      className="form-control"
                      value={postSignOnRecordForm.sign_on_date}
                      onChange={handlePostSignOnRecordInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Sign On Port</label>
                    <input
                      type="text"
                      name="sign_on_port"
                      className="form-control"
                      value={postSignOnRecordForm.sign_on_port}
                      onChange={handlePostSignOnRecordInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contract Expiry (Sign Off Due) *</label>
                    <input
                      type="date"
                      name="sign_off_due"
                      className="form-control"
                      value={postSignOnRecordForm.sign_off_due}
                      onChange={handlePostSignOnRecordInputChange}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Period</label>
                    <div
                      className="form-control"
                      style={{
                        background: "var(--bg-secondary)",
                        minHeight: "auto",
                        height: "auto",
                        paddingTop: "10px",
                        paddingBottom: "10px",
                      }}
                    >
                      {postSignOnPeriodSummary.line ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{postSignOnPeriodSummary.line}</div>
                          {postSignOnPeriodSummary.detail && (
                            <div className="small text-muted mt-1 mb-0">{postSignOnPeriodSummary.detail}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">Enter sign-on and due sign-off dates</span>
                      )}
                    </div>
                  </div>
                  <div className="form-group full-width">
                    <label>Remark</label>
                    <textarea
                      name="remark"
                      className="form-control"
                      value={postSignOnRecordForm.remark}
                      onChange={handlePostSignOnRecordInputChange}
                      rows={2}
                    />
                  </div>

                  <div className="form-actions full-width">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => {
                      setShowPostSignOnRecordModal(false);
                      setPostSignOnRecordEditingId(null);
                    }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-sm btn-primary" disabled={postSignOnRecordSaving}>
                      {postSignOnRecordSaving
                        ? "Saving…"
                        : postSignOnRecordEditingId != null
                          ? "Update"
                          : "Add"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sign Off Record modal: add/edit post-sign-off docs rows */}
      {showPostSignOffRecordModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">
                  {postSignOffRecordEditingId != null ? "Edit Sign-Off Record" : "Add Sign-Off Record"}
                </h6>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary border-0 p-2"
                  onClick={() => {
                    setShowPostSignOffRecordModal(false);
                    setPostSignOffRecordEditingId(null);
                  }}
                  aria-label="Close"
                  title="Close"
                  style={{ fontSize: "1.5rem", lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>

              <div className="modal-body modal-form-row">
                <form onSubmit={submitPostSignOffRecord} className="modal-body modal-form-row p-0">
                  <div className="form-group">
                    <label>Vessel</label>
                    <select
                      name="vessel_name"
                      className="form-control"
                      value={postSignOffRecordForm.vessel_name}
                      onChange={handlePostSignOffVesselChange}
                      required
                    >
                      <option value="">Select vessel</option>
                      {postSignOffRecordForm.vessel_name &&
                        !vesselsList.some(
                          (v) =>
                            String(v.ship_name ?? v.vessel_name ?? "").trim() ===
                            String(postSignOffRecordForm.vessel_name).trim(),
                        ) && (
                          <option value={postSignOffRecordForm.vessel_name}>
                            {postSignOffRecordForm.vessel_name} (current)
                          </option>
                        )}
                      {vesselsList.map((v) => {
                        const nm = String(v.ship_name ?? v.vessel_name ?? "").trim();
                        if (!nm) return null;
                        return (
                          <option key={v.id} value={nm}>
                            {nm}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>IMO Number</label>
                    <input
                      type="text"
                      name="imo_number"
                      className="form-control"
                      value={postSignOffRecordForm.imo_number}
                      onChange={handlePostSignOffRecordInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Sign-off rank</label>
                    <select
                      name="sign_off_rank"
                      className="form-control"
                      value={postSignOffRecordForm.sign_off_rank}
                      onChange={handlePostSignOffRecordInputChange}
                      required
                    >
                      <option value="">Select rank</option>
                      {postSignOffRecordForm.sign_off_rank !== "" &&
                        !masterSearchOpts.ranks.some(
                          (r) => String(r.id) === String(postSignOffRecordForm.sign_off_rank),
                        ) && (
                          <option value={postSignOffRecordForm.sign_off_rank}>
                            {postSignOffRecordForm.sign_off_rank} (current)
                          </option>
                        )}
                      {(masterSearchOpts.ranks || [])
                        .slice()
                        .sort((a, b) =>
                          String(a.name || "").localeCompare(String(b.name || ""), undefined, {
                            sensitivity: "base",
                          }),
                        )
                        .map((r) => (
                          <option key={r.id} value={String(r.id)}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Sign On Date</label>
                    <input
                      type="date"
                      name="sign_on_date"
                      className="form-control"
                      value={postSignOffRecordForm.sign_on_date}
                      onChange={handlePostSignOffRecordInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Sign Off Date</label>
                    <input
                      type="date"
                      name="sign_off_date"
                      className="form-control"
                      value={postSignOffRecordForm.sign_off_date}
                      onChange={handlePostSignOffRecordInputChange}
                      max={isAdmin ? undefined : todayYmdLocal}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Sign Off Port</label>
                    <input
                      type="text"
                      name="sign_off_port"
                      className="form-control"
                      value={postSignOffRecordForm.sign_off_port}
                      onChange={handlePostSignOffRecordInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Sign Off Country</label>
                    <select
                      name="country_id"
                      className="form-control"
                      value={postSignOffRecordForm.country_id}
                      onChange={handlePostSignOffRecordInputChange}
                      required
                    >
                      <option value="">Select Country</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Arrival Date</label>
                    <input
                      type="date"
                      name="arrival_date"
                      className="form-control"
                      value={postSignOffRecordForm.arrival_date}
                      onChange={handlePostSignOffRecordInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Contract Completion Date *</label>
                    <input
                      type="date"
                      name="contract_completion_date"
                      className="form-control"
                      value={postSignOffRecordForm.contract_completion_date}
                      onChange={handlePostSignOffRecordInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Sign Off Reason</label>
                    <input
                      type="text"
                      name="sign_off_reason"
                      className="form-control"
                      value={postSignOffRecordForm.sign_off_reason}
                      onChange={handlePostSignOffRecordInputChange}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Remark</label>
                    <textarea
                      name="remark"
                      className="form-control"
                      value={postSignOffRecordForm.remark}
                      onChange={handlePostSignOffRecordInputChange}
                      rows={2}
                    />
                  </div>

                  <div className="form-actions full-width">
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        setShowPostSignOffRecordModal(false);
                        setPostSignOffRecordEditingId(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary"
                      disabled={postSignOffRecordSaving}
                    >
                      {postSignOffRecordSaving
                        ? "Saving…"
                        : postSignOffRecordEditingId != null
                          ? "Update"
                          : "Add"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdditionalInfoModal
        show={showAdditionalModal}
        additionalInfo={additionalInfo}
        handleChange={handleAdditionalInfoChange}
        handleSubmit={handleAdditionalInfoSubmit}
        onClose={() => setShowAdditionalModal(false)}
      />

      <SeafarersDocumentModal
        show={seafarersModal.open}
        countries={countries}
        documentTypes={documentTypes}
        candidateId={id}
        editingDoc={seafarersModal.editingDoc}
        fixedType={seafarersModal.fixedType}
        pickType={seafarersModal.pickType}
        onClose={closeSeafarersModal}
        onSubmitSuccess={() => {
          closeSeafarersModal();
          fetchCandidateData({ fast: true }).catch(() => {});
        }}
      />

      <LicenseFormModal
        show={licenseModal.open}
        onClose={() => setLicenseModal({ open: false, editingDoc: null })}
        candidateId={id}
        countries={countries}
        ranks={masterSearchOpts.ranks || []}
        editingDoc={licenseModal.editingDoc}
        onSubmitSuccess={() => {
          setLicenseModal({ open: false, editingDoc: null });
          fetchCandidateData({ fast: true }).catch(() => {});
        }}
      />

      <EducationFormModal
        show={educationModal.open}
        onClose={() => setEducationModal({ open: false, editingDoc: null })}
        candidateId={id}
        editingDoc={educationModal.editingDoc}
        onSubmitSuccess={() => {
          setEducationModal({ open: false, editingDoc: null });
          fetchCandidateData({ fast: true }).catch(() => {});
        }}
      />

      <VerificationFormModal
        show={verificationModal.open}
        onClose={() => setVerificationModal({ open: false, editingDoc: null })}
        candidateId={id}
        verificationDocTypes={verificationDocTypes}
        editingDoc={verificationModal.editingDoc}
        onSubmitSuccess={() => {
          setVerificationModal({ open: false, editingDoc: null });
          fetchCandidateData({ fast: true }).catch(() => {});
        }}
      />

      <DceValueCertificateModal
        show={auxCertModal.open}
        variant={auxCertModal.variant}
        candidateId={id}
        countries={countries}
        documentTypes={documentTypes}
        editingDoc={auxCertModal.editingDoc}
        onClose={() => setAuxCertModal({ open: false, variant: "dce", editingDoc: null })}
        onSubmitSuccess={() => {
          setAuxCertModal({ open: false, variant: "dce", editingDoc: null });
          fetchCandidateData({ fast: true }).catch(() => {});
        }}
      />
    </div>
  );
};

/** API dates may be epoch seconds, epoch ms (from normalizeDoc), or YYYY-MM-DD. */
const toDateInputValue = (val) => calendarYmdFromValue(val);

// Personal Info form – aligned with candidate_edit.blade.php BasicDetail and API response
const BasicDetailsForm = ({
  formData,
  candidateData,
  handleInputChange,
  handleSubmit,
  handleFileChange,
  basicPhotoFile = null,
  basicCvFile = null,
  countries,
  masterSearchOpts = { ranks: [], vesselTypes: [], availabilityStatus: [] },
  editing = false,
  saving = false,
  canEdit = false,
  onStartEdit,
  onCancelEdit,
}) => {
  const frozen = !editing;
  const hasPhoto = Boolean(formData.photo_upload && candidateData?.photo);
  const hasCv = Boolean(formData.cv_upload_path && candidateData?.cv);

  return (
    <form
      onSubmit={handleSubmit}
      className={`basic-details-form personal-info-form${frozen ? " personal-info-form--frozen" : " personal-info-form--editing"}`}
    >
      <div className="personal-info-header">
        <div>
          <div className="personal-info-header-title">Personal Information</div>
          <div className="personal-info-header-subtitle">
            {frozen
              ? (canEdit ? "View only — click Edit to make changes" : "View only")
              : "Editing — save when finished"}
          </div>
        </div>
        <div className="personal-info-header-actions">
          {frozen ? (
            canEdit ? (
              <button type="button" className="btn btn-primary personal-info-edit-btn" onClick={onStartEdit}>
                <i className="fas fa-pen" aria-hidden /> Edit
              </button>
            ) : null
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary personal-info-cancel-btn"
                onClick={onCancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary personal-info-save-btn" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="form-wrapper-inner">
        <div className="form-row personal-info-row">
          <div className="form-group">
            <label>SURNAME</label>
            <input
              type="text"
              name="surname"
              className="form-control"
              value={formData.surname || ""}
              onChange={handleInputChange}
              required
              readOnly={frozen}
              disabled={frozen}
            />
          </div>
          <div className="form-group">
            <label>GIVEN NAME</label>
            <input
              type="text"
              name="given_name"
              className="form-control"
              value={formData.given_name || ""}
              onChange={handleInputChange}
              required
              readOnly={frozen}
              disabled={frozen}
            />
          </div>
          <div className="form-group">
            <label>MIDDLE NAME</label>
            <input
              type="text"
              name="middle_name"
              className="form-control"
              value={formData.middle_name || ""}
              onChange={handleInputChange}
              readOnly={frozen}
              disabled={frozen}
            />
          </div>
          <div className="form-group">
            <label>RANK</label>
            <select
              name="rank_id"
              className="form-control"
              value={formData.rank_id ?? ""}
              onChange={handleInputChange}
              disabled={frozen}
            >
              <option value="">Select rank</option>
              {(masterSearchOpts.ranks || []).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>VESSEL TYPE</label>
            <select
              name="vessel_type_id"
              className="form-control"
              value={formData.vessel_type_id ?? ""}
              onChange={handleInputChange}
              disabled={frozen}
            >
              <option value="">Select vessel type</option>
              {(masterSearchOpts.vesselTypes || []).map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>DATE OF BIRTH</label>
            {frozen ? (
              <input
                type="text"
                className="form-control"
                value={formData.date_of_birth ? formatDateMonthDayYear(formData.date_of_birth) : ""}
                readOnly
                disabled
              />
            ) : (
              <input
                type="date"
                name="date_of_birth"
                className="form-control"
                lang="en-US"
                value={toDateInputValue(formData.date_of_birth)}
                onChange={handleInputChange}
                required
              />
            )}
          </div>
          <div className="form-group">
            <label>PLACE OF BIRTH</label>
            <input
              type="text"
              name="place_of_birth"
              className="form-control"
              value={formData.place_of_birth || ""}
              onChange={handleInputChange}
              readOnly={frozen}
              disabled={frozen}
            />
          </div>
          <div className="form-group">
            <label>NATIONALITY</label>
            <select
              name="nationality_id"
              className="form-control"
              value={formData.nationality_id ?? ""}
              onChange={handleInputChange}
              disabled={frozen}
            >
              <option value="">Select Nationality</option>
              {(countries || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row personal-info-row">
          <div className="form-group">
            <label>RELIGION</label>
            <select name="religion" className="form-control" value={formData.religion || ""} onChange={handleInputChange} disabled={frozen}>
              <option value="">Select</option>
              <option value="hindu">HINDU</option>
              <option value="muslim">MUSLIM</option>
              <option value="christian">CHRISTIAN</option>
            </select>
          </div>
          <div className="form-group">
            <label>GENDER</label>
            <select name="gender" className="form-control" value={formData.gender || ""} onChange={handleInputChange} disabled={frozen}>
              <option value="">Select</option>
              <option value="male">MALE</option>
              <option value="female">FEMALE</option>
              <option value="other">OTHER</option>
            </select>
          </div>
          <div className="form-group">
            <label>MARITAL STATUS</label>
            <select name="marital_status" className="form-control" value={formData.marital_status || ""} onChange={handleInputChange} disabled={frozen}>
              <option value="">Select</option>
              <option value="married">MARRIED</option>
              <option value="single">SINGLE</option>
            </select>
          </div>
          <div className="form-group">
            <label>LICENSE AUTHORITY</label>
            <select name="license" className="form-control" value={formData.license ?? ""} onChange={handleInputChange} disabled={frozen}>
              <option value="">Select</option>
              {(countries || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>PASSPORT NUMBER</label>
            <input type="text" name="passport_number" className="form-control" value={formData.passport_number || ""} onChange={handleInputChange} required readOnly={frozen} disabled={frozen} />
          </div>
          <div className="form-group">
            <label>PASSPORT ISSUE</label>
            <input type="date" name="passport_issue_date" className="form-control" value={toDateInputValue(formData.passport_issue_date)} onChange={handleInputChange} readOnly={frozen} disabled={frozen} />
          </div>
          <div className="form-group">
            <label>PASSPORT EXPIRY *</label>
            <input type="date" name="passport_expiry_date" className="form-control" value={toDateInputValue(formData.passport_expiry_date)} onChange={handleInputChange} required readOnly={frozen} disabled={frozen} />
          </div>
          <div className="form-group">
            <label>CDC NUMBER</label>
            <input type="text" name="cdc_number" className="form-control" value={formData.cdc_number || ""} onChange={handleInputChange} required readOnly={frozen} disabled={frozen} />
          </div>
        </div>

        <div className="form-row personal-info-row">
          <div className="form-group">
            <label>CDC ISSUE DATE</label>
            <input type="date" name="cdc_issue_date" className="form-control" value={toDateInputValue(formData.cdc_issue_date)} onChange={handleInputChange} readOnly={frozen} disabled={frozen} />
          </div>
          <div className="form-group">
            <label>CDC EXPIRY DATE *</label>
            <input type="date" name="cdc_expiry_date" className="form-control" value={toDateInputValue(formData.cdc_expiry_date)} onChange={handleInputChange} required readOnly={frozen} disabled={frozen} />
          </div>
          <div className="form-group">
            <label>INDOS NUMBER</label>
            <input type="text" name="indos_number" className="form-control" value={formData.indos_number || ""} onChange={handleInputChange} required readOnly={frozen} disabled={frozen} />
          </div>
          <div className="form-group">
            <label>STATUS</label>
            <select
              name="availability_status_id"
              className="form-control"
              value={formData.availability_status_id ?? ""}
              onChange={handleInputChange}
              disabled={frozen}
            >
              <option value="">Select status</option>
              {formData.availability_status_id != null &&
                formData.availability_status_id !== "" &&
                !(masterSearchOpts.availabilityStatus || []).some(
                  (s) => String(s.id) === String(formData.availability_status_id),
                ) && (
                  <option value={formData.availability_status_id}>
                    {resolveAvailabilityStatusLabel(formData, masterSearchOpts.availabilityStatus) ||
                      `Status ${formData.availability_status_id}`}{" "}
                    (current)
                  </option>
                )}
              {(masterSearchOpts.availabilityStatus || []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>AVAILABILITY DATE</label>
            <input type="date" name="availability_date" className="form-control" value={toDateInputValue(formData.availability_date)} onChange={handleInputChange} required readOnly={frozen} disabled={frozen} />
          </div>
          <div className="form-group">
            <label>ARAMCO CHARTER</label>
            <select name="aramco_charter" className="form-control" value={formData.aramco_charter || ""} onChange={handleInputChange} required disabled={frozen}>
              <option value="">Select</option>
              <option value="yes">YES</option>
              <option value="no">NO</option>
            </select>
          </div>
          <div className="form-group">
            <label>FOLLOW-UP DATE</label>
            <input type="date" name="followup_date" className="form-control" value={toDateInputValue(formData.followup_date)} onChange={handleInputChange} readOnly={frozen} disabled={frozen} />
          </div>
          <div className="form-group">
            <label>EMAIL</label>
            <input type="email" name="email_id" className="form-control" value={formData.email_id || ""} onChange={handleInputChange} readOnly={frozen} disabled={frozen} />
          </div>
          <div className="form-group">
            <label>CONTACT NO. 1</label>
            <input type="text" name="contact_no_1" className="form-control" value={formData.contact_no_1 || ""} onChange={handleInputChange} readOnly={frozen} disabled={frozen} />
          </div>
          <div className="form-group">
            <label>CONTACT NO. 2</label>
            <input type="text" name="contact_no_2" className="form-control" value={formData.contact_no_2 || ""} onChange={handleInputChange} readOnly={frozen} disabled={frozen} />
          </div>
          {frozen ? (
            <div className="form-group form-group-attachments personal-info-attachments">
              <label>ATTACHMENTS</label>
              <div className="personal-info-attachments-row">
                <div className="personal-info-attachment-item">
                  <span className="personal-info-attachment-label">Photo</span>
                  {hasPhoto ? (
                    <a href={candidateData.photo} target="_blank" rel="noopener noreferrer" className="view-file-btn" title="View photo">View</a>
                  ) : (
                    <span className="personal-info-attachment-empty">None</span>
                  )}
                </div>
                <div className="personal-info-attachment-item">
                  <span className="personal-info-attachment-label">CV</span>
                  {hasCv ? (
                    <a href={candidateData.cv} target="_blank" rel="noopener noreferrer" className="view-file-btn" title="View CV">View</a>
                  ) : (
                    <span className="personal-info-attachment-empty">None</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="form-group form-group-file">
                <label>PHOTO</label>
                <div className="personal-info-file-cell">
                  <input type="file" name="photo_upload" className="form-control" accept="image/*" onChange={handleFileChange} />
                  {basicPhotoFile ? (
                    <span className="text-muted small" style={{ marginLeft: 8 }}>{basicPhotoFile.name} (selected)</span>
                  ) : hasPhoto ? (
                    <a href={candidateData.photo} target="_blank" rel="noopener noreferrer" className="view-file-btn" title="View photo">View</a>
                  ) : null}
                </div>
              </div>
              <div className="form-group form-group-file">
                <label>CV</label>
                <div className="personal-info-file-cell">
                  <input type="file" name="cv_upload" className="form-control" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                  {basicCvFile ? (
                    <span className="text-muted small" style={{ marginLeft: 8 }}>{basicCvFile.name} (selected)</span>
                  ) : hasCv ? (
                    <a href={candidateData.cv} target="_blank" rel="noopener noreferrer" className="view-file-btn" title="View CV">View</a>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!frozen && (
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancelEdit} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </form>
  );
};

const formatAddressValue = (value, uppercase = false) => {
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  const text = String(value).trim();
  return uppercase ? text.toUpperCase() : text;
};

const AddressDetailItem = ({ label, value, icon }) => (
  <div className="address-detail-item">
    <span className="address-detail-label">
      {icon ? <i className={`fas ${icon} address-detail-icon`} aria-hidden /> : null}
      {label}
    </span>
    <span className="address-detail-value">{value}</span>
  </div>
);

const AddressSection = ({ formData, countries, onAddEdit }) => {
  const countryName =
    formData?.country_name ||
    countries?.find((c) => Number(c.id) === Number(formData?.country_id))?.name;
  const stateName = formData?.state_name || "";
  const cityName = formData?.city_name || "";
  const addressFields = [
    formData?.house_no,
    formData?.building_name,
    formData?.residence_address,
    formData?.province,
    stateName,
    cityName,
    countryName,
    formData?.domestic_airport,
    formData?.international_airport,
    formData?.email_id,
    formData?.contact_no_1,
    formData?.contact_no_2,
  ];
  const hasData = addressFields.some((v) => v !== null && v !== undefined && String(v).trim() !== "");

  const locationLine = [cityName, stateName, countryName]
    .map((p) => (p != null && String(p).trim() !== "" ? String(p).trim() : ""))
    .filter(Boolean)
    .join(", ");

  return (
    <div className="basic-sub-section address-section">
      <div className="address-section-header">
        <div>
          <h6 className="address-section-title">Address &amp; contact</h6>
          <p className="address-section-subtitle">Residence, location, travel airports, and reachability details</p>
        </div>
        <button type="button" className="btn btn-primary address-edit-btn" onClick={onAddEdit}>
          <i className="fas fa-pen" aria-hidden />
          {hasData ? "Edit details" : "Add details"}
        </button>
      </div>

      {hasData ? (
        <div className="address-cards-grid">
          <article className="address-card">
            <header className="address-card-header">
              <i className="fas fa-home" aria-hidden />
              <h6>Residence</h6>
            </header>
            <div className="address-card-body">
              <AddressDetailItem label="House / flat no." value={formatAddressValue(formData?.house_no)} />
              <AddressDetailItem label="Building name" value={formatAddressValue(formData?.building_name, true)} />
              <AddressDetailItem label="Street / road / area" value={formatAddressValue(formData?.residence_address, true)} />
              <AddressDetailItem label="Province / region" value={formatAddressValue(formData?.province, true)} />
            </div>
          </article>

          <article className="address-card">
            <header className="address-card-header">
              <i className="fas fa-map-marker-alt" aria-hidden />
              <h6>Location</h6>
            </header>
            <div className="address-card-body">
              {locationLine !== "" ? <p className="address-location-summary">{locationLine}</p> : null}
              <AddressDetailItem label="City" value={formatAddressValue(cityName)} />
              <AddressDetailItem label="State" value={formatAddressValue(stateName)} />
              <AddressDetailItem label="Country" value={formatAddressValue(countryName, true)} />
            </div>
          </article>

          <article className="address-card">
            <header className="address-card-header">
              <i className="fas fa-plane" aria-hidden />
              <h6>Travel</h6>
            </header>
            <div className="address-card-body">
              <AddressDetailItem label="Nearest domestic airport" value={formatAddressValue(formData?.domestic_airport)} icon="fa-plane-departure" />
              <AddressDetailItem label="Nearest international airport" value={formatAddressValue(formData?.international_airport, true)} icon="fa-globe" />
            </div>
          </article>

          <article className="address-card">
            <header className="address-card-header">
              <i className="fas fa-address-book" aria-hidden />
              <h6>Contact</h6>
            </header>
            <div className="address-card-body">
              <AddressDetailItem label="Email" value={formatAddressValue(formData?.email_id)} icon="fa-envelope" />
              <AddressDetailItem label="Contact no. 1" value={formatAddressValue(formData?.contact_no_1)} icon="fa-phone" />
              <AddressDetailItem label="Contact no. 2" value={formatAddressValue(formData?.contact_no_2)} icon="fa-phone-alt" />
            </div>
          </article>
        </div>
      ) : (
        <div className="address-empty-state">
          <div className="address-empty-icon" aria-hidden>
            <i className="fas fa-map-marked-alt" />
          </div>
          <h6>No address on file</h6>
          <p>Add residence, location, and contact information for this candidate.</p>
          <button type="button" className="btn btn-primary" onClick={onAddEdit}>
            Add address details
          </button>
        </div>
      )}
    </div>
  );
};


// Next of Kin section – match Blade: table with full columns + Add New
const NokSection = ({ nokDocs, candidateData, formData, onAddNew, onEdit, fetchCandidateData }) => {
  const formatDate = (d) => {
    if (!d) return "";
    const date = typeof d === "number" ? new Date(d * 1000) : new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
  };

  return (
    <div className="basic-sub-section nok-section">
      <div className="section-header-row">
        <h6 className="section-title">Next of Kin</h6>
        <button type="button" className="btn btn-sm btn-info" onClick={onAddNew}>
          Add New
        </button>
      </div>
      {nokDocs.length > 0 ? (
        <div className="table-responsive">
          <table className="basic-detail-table nok-table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>RELATIONSHIP</th>
                <th>GENDER</th>
                <th>NOK</th>
                <th>BENEFICIARY IN CASE OF DEATH</th>
                <th>CONTACT IN CASE OF EMERGENCY</th>
                <th>CONTACT</th>
                <th>D.O.B</th>
                <th>REMARK</th>
                <th>NOK DOC</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {nokDocs.map((nok) => (
                <tr key={nok.id}>
                  <td>{(nok.name || "").toString().toUpperCase()}</td>
                  <td>{nok.nomineeRelationship?.relationship ?? nok.relationship ?? "-"}</td>
                  <td>{(nok.gender || "").toString().toUpperCase()}</td>
                  <td>{(nok.nok || "").toString().toUpperCase()}</td>
                  <td>{(nok.beneficiary || "").toString().toUpperCase()}</td>
                  <td>{nok.emergency_contact ?? "-"}</td>
                  <td>{nok.contact_number ?? nok.contact ?? "-"}</td>
                  <td>{formatDate(nok.dob)}</td>
                  <td>{(nok.remark || "").toString().toUpperCase()}</td>
                  <td>{nok.file_path ? <a href={nok.file_path} target="_blank" rel="noopener noreferrer">View</a> : "-"}</td>
                  <td className="action-cell-with-audit">
                    <ActionToolbar record={nok}>
                      <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => onEdit && onEdit(nok)}><i className="fas fa-pen" /></button>
                      <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => { /* delete */ }}><i className="fas fa-trash" /></button>
                    </ActionToolbar>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (formData?.nok_name || candidateData?.nok_name) ? (
        <table className="basic-detail-table">
          <tbody>
            <tr><td className="label-cell">NAME</td><td className="value-cell">{formData?.nok_name || candidateData?.nok_name || "-"}</td></tr>
            <tr><td className="label-cell">RELATIONSHIP</td><td className="value-cell">{formData?.nok_relationship || candidateData?.nok_relationship || "-"}</td></tr>
            <tr><td className="label-cell">CONTACT</td><td className="value-cell">{formData?.nok_contact_number || candidateData?.nok_contact_number || "-"}</td></tr>
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <p>No Next of Kin information. Click &quot;Add New&quot; to add.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onAddNew}>Add NOK</button>
        </div>
      )}
    </div>
  );
};

// Additional Info section – match Blade: table with 4 cols (label/value pairs)
const AdditionalInfoSection = ({ additionalInfo, candidateData, onEdit }) => {
  const hasInfo = candidateData?.height || candidateData?.weight || candidateData?.eye_color;

  return (
    <div className="basic-sub-section additional-info-section">
      <div className="section-header-row">
        <h6 className="section-title">Additional Info</h6>
        <button type="button" className="btn btn-sm btn-primary" onClick={onEdit}>
          {hasInfo ? "Edit" : "Add"} Additional Info
        </button>
      </div>
      {hasInfo ? (
        <table className="basic-detail-table additional-info-table">
          <thead>
            <tr>
              <th colSpan={4}>Additional Info</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Height</td>
              <td>{candidateData?.height || "-"}</td>
              <td>Weight</td>
              <td>{candidateData?.weight || "-"}</td>
            </tr>
            <tr>
              <td>Eye Colour</td>
              <td>{(candidateData?.eye_color || "-").toString().toUpperCase()}</td>
              <td>Hair Colour</td>
              <td>{(candidateData?.hair_color || "-").toString().toUpperCase()}</td>
            </tr>
            <tr>
              <td>Identification Mark</td>
              <td>{(candidateData?.identification_mark || "-").toString().toUpperCase()}</td>
              <td>BMI</td>
              <td>{(candidateData?.bmi || "-").toString().toUpperCase()}</td>
            </tr>
            <tr>
              <td>Boiler Suit Size</td>
              <td>{candidateData?.boiler_suit_size || "-"}</td>
              <td>Shoe Size</td>
              <td>{candidateData?.shoe_size || "-"}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <p>No additional info. Click &quot;Add Additional Info&quot; to add.</p>
        </div>
      )}
    </div>
  );
};

function FormsLettersRowActions({ canPreview, canDownload, busy, onView, onDownload }) {
  const previewOff = !canPreview || busy;
  const downloadOff = !canDownload || busy;
  return (
    <div className="doc-actions-toolbar" role="toolbar" aria-label="Form actions">
      <button
        type="button"
        className="doc-action-btn doc-action-preview"
        disabled={previewOff}
        onClick={canPreview ? onView : undefined}
        title={!canPreview ? "Preview not available yet" : busy ? "Preparing…" : "View"}
        aria-label={!canPreview ? "View — not available yet" : "View"}
      >
        <svg className="doc-action-icon-svg" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle fill="none" stroke="currentColor" strokeWidth="2" cx="12" cy="12" r="3" />
        </svg>
      </button>
      <button
        type="button"
        className="doc-action-btn doc-action-download"
        disabled={downloadOff}
        onClick={canDownload ? onDownload : undefined}
        title={!canDownload ? "Download not available yet" : busy ? "Preparing…" : "Download"}
        aria-label={!canDownload ? "Download — not available yet" : "Download"}
      >
        <svg className="doc-action-icon-svg" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
      </button>
    </div>
  );
}

function FormsLettersPanel({ activeTab, onTabChange, busy, onView, onDownload }) {
  const tab = FORMS_TABS.find((t) => t.key === activeTab) || FORMS_TABS[0];
  const items = (FORMS_CATALOG[tab.key] || []).map(resolveFormsCatalogItem);
  return (
    <div className="tab-content">
      <div className="sub-tabs" role="tablist">
        {FORMS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`sub-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => onTabChange(t.key)}
            role="tab"
            aria-selected={activeTab === t.key}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="document-section">
        <div className="section-header">
          <h3>{tab.label}</h3>
        </div>
        {tab.note ? (
          <p className="forms-letters-note">{tab.note}</p>
        ) : null}
        {items.length > 0 ? (
          <div className="table-responsive doc-table-wrap forms-letters-table">
            <table className="doc-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Document / Form</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.key}>
                    <td>{idx + 1}</td>
                    <td className="forms-letters-name">{item.name}</td>
                    <td>
                      <span className={`forms-letters-status forms-letters-status--${item.status}`}>
                        {formsCatalogStatusLabel(item)}
                      </span>
                    </td>
                    <td className="doc-list-actions-cell">
                      <FormsLettersRowActions
                        canPreview={item.canPreview}
                        canDownload={item.canDownload}
                        busy={busy}
                        onView={() => onView?.(item)}
                        onDownload={() => onDownload?.(item)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No forms available</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Compact icon toolbar for document tables — audit on hover, tooltips + aria-labels */
function DocumentRowActions({
  record,
  previewOpen,
  hasFile,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
}) {
  return (
    <div className="doc-actions-toolbar action-audit-hover" role="toolbar" aria-label="Document actions">
      <button
        type="button"
        className={`doc-action-btn doc-action-preview${previewOpen ? " is-active" : ""}`}
        onClick={onPreview}
        title={previewOpen ? "Hide preview" : "Preview"}
        aria-label={previewOpen ? "Hide document preview" : "Open document preview"}
        aria-pressed={previewOpen}
      >
        <svg className="doc-action-icon-svg" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle fill="none" stroke="currentColor" strokeWidth="2" cx="12" cy="12" r="3" />
        </svg>
      </button>
      {hasFile && (
        <button
          type="button"
          className="doc-action-btn doc-action-download"
          onClick={onDownload}
          title="Download"
          aria-label="Download file"
        >
          <svg className="doc-action-icon-svg" viewBox="0 0 24 24" aria-hidden focusable="false">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
      )}
      <button
        type="button"
        className="doc-action-btn doc-action-edit"
        onClick={onEdit}
        title="Edit"
        aria-label="Edit document"
      >
        <svg className="doc-action-icon-svg" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        type="button"
        className="doc-action-btn doc-action-delete"
        onClick={onDelete}
        title="Delete"
        aria-label="Delete document"
      >
        <svg className="doc-action-icon-svg" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
        </svg>
      </button>
      <RecordAuditPopover record={record} />
    </div>
  );
}

const PassportSection = ({ seafarersDocs, onAddNew, onDelete, onEdit }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const passportDocs = seafarersDocs.filter(
    (doc) => doc.document_name === "Passport",
  );

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(doc.file_path, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Passport_${doc.certificate_number || "document"}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  const getFileType = (filePath) => {
    if (!filePath) return "unknown";
    const ext = filePath.split(".").pop().toLowerCase();
    return ext;
  };

  const isImageFile = (filePath) => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    return imageExtensions.includes(getFileType(filePath));
  };

  const isPdfFile = (filePath) => {
    return getFileType(filePath) === "pdf";
  };

  return (
    <div className="document-section">
      <div className="section-header">
        <h3>🛂 Passport Documents</h3>
        <button className="btn btn-primary" onClick={onAddNew}>
          ➕ Add Passport
        </button>
      </div>

      {passportDocs.length > 0 ? (
        <div className="passport-container">
          <div className="table-responsive doc-table-wrap">
            <table className="doc-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Passport No.</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Country</th>
                  <th>Place of Issue</th>
                  <th>Document File</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {passportDocs.map((doc, idx) => {
                  const isExpired =
                    doc.expiry_date && new Date(doc.expiry_date) < new Date();
                  return (
                    <tr
                      key={doc.id}
                      className={[
                        selectedDoc?.id === doc.id ? "doc-row-active" : "",
                        isExpired ? "doc-row-expired" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <td>{idx + 1}</td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td>{doc.country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td><DocFileCell url={doc.file_path} /></td>
                      <td className="doc-list-actions-cell action-cell-with-audit">
                        <DocumentRowActions
                          record={doc}
                          previewOpen={selectedDoc?.id === doc.id}
                          hasFile={!!doc.file_path}
                          onPreview={() =>
                            setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)
                          }
                          onDownload={() => handleDownload(doc)}
                          onEdit={() => onEdit(doc)}
                          onDelete={() => onDelete(doc.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  Preview · Passport #{selectedDoc.certificate_number}
                </h3>
                <button
                  className="btn btn-link close-btn"
                  onClick={() => setSelectedDoc(null)}
                >
                  ✕
                </button>
              </div>

              <div className="preview-content">
                {selectedDoc.file_path ? (
                  <>
                    {isImageFile(selectedDoc.file_path) ? (
                      <div className="image-preview">
                        <img
                          src={selectedDoc.file_path}
                          alt={`Passport ${selectedDoc.certificate_number}`}
                        />
                      </div>
                    ) : isPdfFile(selectedDoc.file_path) ? (
                      <div className="pdf-preview">
                        <iframe
                          src={`${selectedDoc.file_path}#toolbar=1`}
                          width="100%"
                          height="600px"
                          title={`Passport ${selectedDoc.certificate_number}`}
                        />
                      </div>
                    ) : (
                      <div className="preview-unavailable">
                        <p>
                          Preview not available for this file type (.
                          {getFileType(selectedDoc.file_path)})
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleDownload(selectedDoc)}
                        >
                          ⬇️ Download to View
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="preview-unavailable">
                    <p>No document file attached</p>
                  </div>
                )}
              </div>

              <div className="preview-footer">
                <button
                  className="btn btn-success"
                  onClick={() => handleDownload(selectedDoc)}
                >
                  ⬇️ Download Document
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedDoc(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <p>No passport documents available</p>
        </div>
      )}
    </div>
  );
};

const CdcSection = ({ seafarersDocs, onAddNew, onDelete, onEdit }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const cdcDocs = seafarersDocs.filter(
    (doc) => doc.document_name === "Seaman Book",
  );

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(doc.file_path, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `CDC_${doc.certificate_number || "document"}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  const getFileType = (filePath) => {
    if (!filePath) return "unknown";
    const ext = filePath.split(".").pop().toLowerCase();
    return ext;
  };

  const isImageFile = (filePath) => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    return imageExtensions.includes(getFileType(filePath));
  };

  const isPdfFile = (filePath) => {
    return getFileType(filePath) === "pdf";
  };

  return (
    <div className="document-section">
      <div className="section-header">
        <h3>📘 CDC Documents</h3>
        <button className="btn btn-primary" onClick={onAddNew}>
          ➕ Add CDC
        </button>
      </div>

      {cdcDocs.length > 0 ? (
        <div className="passport-container">
          <div className="table-responsive doc-table-wrap">
            <table className="doc-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CDC No.</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Country</th>
                  <th>Place of Issue</th>
                  <th>Document File</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cdcDocs.map((doc, idx) => {
                  const isExpired =
                    doc.expiry_date && new Date(doc.expiry_date) < new Date();
                  return (
                    <tr
                      key={doc.id}
                      className={[
                        selectedDoc?.id === doc.id ? "doc-row-active" : "",
                        isExpired ? "doc-row-expired" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <td>{idx + 1}</td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td>{doc.country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td><DocFileCell url={doc.file_path} /></td>
                      <td className="doc-list-actions-cell action-cell-with-audit">
                        <DocumentRowActions
                          record={doc}
                          previewOpen={selectedDoc?.id === doc.id}
                          hasFile={!!doc.file_path}
                          onPreview={() =>
                            setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)
                          }
                          onDownload={() => handleDownload(doc)}
                          onEdit={() => onEdit(doc)}
                          onDelete={() => onDelete(doc.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  Preview · CDC #{selectedDoc.certificate_number}
                </h3>
                <button
                  className="btn btn-link close-btn"
                  onClick={() => setSelectedDoc(null)}
                >
                  ✕
                </button>
              </div>

              <div className="preview-content">
                {selectedDoc.file_path ? (
                  <>
                    {isImageFile(selectedDoc.file_path) ? (
                      <div className="image-preview">
                        <img
                          src={selectedDoc.file_path}
                          alt={`CDC ${selectedDoc.certificate_number}`}
                        />
                      </div>
                    ) : isPdfFile(selectedDoc.file_path) ? (
                      <div className="pdf-preview">
                        <iframe
                          src={`${selectedDoc.file_path}#toolbar=1`}
                          width="100%"
                          height="600px"
                          title={`CDC ${selectedDoc.certificate_number}`}
                        />
                      </div>
                    ) : (
                      <div className="preview-unavailable">
                        <p>
                          Preview not available for this file type (.
                          {getFileType(selectedDoc.file_path)})
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleDownload(selectedDoc)}
                        >
                          ⬇️ Download to View
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="preview-unavailable">
                    <p>No document file attached</p>
                  </div>
                )}
              </div>

              <div className="preview-footer">
                <button
                  className="btn btn-success"
                  onClick={() => handleDownload(selectedDoc)}
                >
                  ⬇️ Download Document
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedDoc(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <p>No CDC documents available</p>
        </div>
      )}
    </div>
  );
};

const LicenseSection = ({ licenses, onAddNew, onDelete, onEdit }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(doc.upload_file, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `License_${doc.document_number || "document"}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  const getFileType = (filePath) => {
    if (!filePath) return "unknown";
    const ext = filePath.split(".").pop().toLowerCase();
    return ext;
  };

  const isImageFile = (filePath) => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    return imageExtensions.includes(getFileType(filePath));
  };

  const isPdfFile = (filePath) => {
    return getFileType(filePath) === "pdf";
  };

  return (
    <div className="document-section">
      <div className="section-header">
        <h3>📜 License Documents</h3>
        <button className="btn btn-primary" onClick={onAddNew}>
          ➕ Add License
        </button>
      </div>

      {licenses.length > 0 ? (
        <div className="passport-container">
          <div className="table-responsive doc-table-wrap">
            <table className="doc-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Document Number</th>
                  <th>COC Grade</th>
                  <th>Rank</th>
                  <th>Original Issue Date</th>
                  <th>Issue Revalidation</th>
                  <th>Expiry Date</th>
                  <th>Issue Place</th>
                  <th>Country</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((license, idx) => {
                  const isExpired =
                    license.expiry_date &&
                    new Date(license.expiry_date) < new Date();
                  return (
                    <tr
                      key={license.id}
                      className={[
                        selectedDoc?.id === license.id ? "doc-row-active" : "",
                        isExpired ? "doc-row-expired" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <td>{idx + 1}</td>
                      <td>
                        {license.type?.replace(/_/g, " ").toUpperCase() || "-"}
                      </td>
                      <td>{license.document_number || "-"}</td>
                      <td>{labelForLicenceCapacity(license.capacity)}</td>
                      <td>{license.rank?.toUpperCase() || "-"}</td>
                      <td>{formatDocDate(license.original_issue_date)}</td>
                      <td>{formatDocDate(license.issue_revalidation_date)}</td>
                      <td>{formatDocDate(license.expiry_date)}</td>
                      <td>{license.issue_place?.toUpperCase() || "-"}</td>
                      <td>{license.country_name?.toUpperCase() || "-"}</td>
                      <td className="doc-list-actions-cell action-cell-with-audit">
                        <DocumentRowActions
                          record={license}
                          previewOpen={selectedDoc?.id === license.id}
                          hasFile={!!license.upload_file}
                          onPreview={() =>
                            setSelectedDoc(
                              selectedDoc?.id === license.id ? null : license,
                            )
                          }
                          onDownload={() => handleDownload(license)}
                          onEdit={() => onEdit(license)}
                          onDelete={() => onDelete(license.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  Preview · License #{selectedDoc.document_number}
                </h3>
                <button
                  className="btn btn-link close-btn"
                  onClick={() => setSelectedDoc(null)}
                >
                  ✕
                </button>
              </div>

              <div className="preview-content">
                {selectedDoc.upload_file ? (
                  <>
                    {isImageFile(selectedDoc.upload_file) ? (
                      <div className="image-preview">
                        <img
                          src={selectedDoc.upload_file}
                          alt={`License ${selectedDoc.document_number}`}
                        />
                      </div>
                    ) : isPdfFile(selectedDoc.upload_file) ? (
                      <div className="pdf-preview">
                        <iframe
                          src={`${selectedDoc.upload_file}#toolbar=1`}
                          width="100%"
                          height="600px"
                          title={`License ${selectedDoc.document_number}`}
                        />
                      </div>
                    ) : (
                      <div className="preview-unavailable">
                        <p>
                          Preview not available for this file type (.
                          {getFileType(selectedDoc.upload_file)})
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleDownload(selectedDoc)}
                        >
                          ⬇️ Download to View
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="preview-unavailable">
                    <p>No document file attached</p>
                  </div>
                )}
              </div>

              <div className="preview-footer">
                <button
                  className="btn btn-success"
                  onClick={() => handleDownload(selectedDoc)}
                >
                  ⬇️ Download Document
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedDoc(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <p>No license documents available</p>
        </div>
      )}
    </div>
  );
};

const StcwDocumentsSection = ({ seafarersDocs, onAddNew, onDelete, onEdit }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const excluded = ["Passport", "Seaman Book", "VISA Copy"];
  const stcwDocs = seafarersDocs.filter(
    (doc) => !excluded.includes(doc.document_name),
  );

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(doc.file_path, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `STCW_${doc.certificate_number || "document"}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  const getFileType = (filePath) => {
    if (!filePath) return "unknown";
    const ext = filePath.split(".").pop().toLowerCase();
    return ext;
  };

  const isImageFile = (filePath) => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    return imageExtensions.includes(getFileType(filePath));
  };

  const isPdfFile = (filePath) => {
    return getFileType(filePath) === "pdf";
  };

  return (
    <div className="document-section">
      <div className="section-header">
        <h3>📑 STCW Documents</h3>
        <button type="button" className="btn btn-primary" onClick={onAddNew}>
          ➕ Add STCW / training certificate
        </button>
      </div>

      {stcwDocs.length > 0 ? (
        <div className="passport-container">
          <div className="table-responsive doc-table-wrap">
            <table className="doc-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Country Name</th>
                  <th>Document Name</th>
                  <th>Stcw Code/Regulation</th>
                  <th>Certificate Number</th>
                  <th>Place of Issue</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Document File</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stcwDocs.map((doc, idx) => {
                  const isExpired =
                    doc.expiry_date && new Date(doc.expiry_date) < new Date();
                  return (
                    <tr
                      key={doc.id}
                      className={[
                        selectedDoc?.id === doc.id ? "doc-row-active" : "",
                        isExpired ? "doc-row-expired" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <td>{idx + 1}</td>
                      <td>{doc.country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.document_name?.toUpperCase() || "-"}</td>
                      <td>{doc.stcw_regulation?.toUpperCase() || "-"}</td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td><DocFileCell url={doc.file_path} /></td>
                      <td className="doc-list-actions-cell action-cell-with-audit">
                        <DocumentRowActions
                          record={doc}
                          previewOpen={selectedDoc?.id === doc.id}
                          hasFile={!!doc.file_path}
                          onPreview={() =>
                            setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)
                          }
                          onDownload={() => handleDownload(doc)}
                          onEdit={() => onEdit(doc)}
                          onDelete={() => onDelete(doc.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  Preview · {selectedDoc.document_name} #{selectedDoc.certificate_number}
                </h3>
                <button
                  className="btn btn-link close-btn"
                  onClick={() => setSelectedDoc(null)}
                >
                  ✕
                </button>
              </div>

              <div className="preview-content">
                {selectedDoc.file_path ? (
                  <>
                    {isImageFile(selectedDoc.file_path) ? (
                      <div className="image-preview">
                        <img
                          src={selectedDoc.file_path}
                          alt={`STCW ${selectedDoc.document_name}`}
                        />
                      </div>
                    ) : isPdfFile(selectedDoc.file_path) ? (
                      <div className="pdf-preview">
                        <iframe
                          src={`${selectedDoc.file_path}#toolbar=1`}
                          width="100%"
                          height="600px"
                          title={`STCW ${selectedDoc.document_name}`}
                        />
                      </div>
                    ) : (
                      <div className="preview-unavailable">
                        <p>
                          Preview not available for this file type (.
                          {getFileType(selectedDoc.file_path)})
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleDownload(selectedDoc)}
                        >
                          ⬇️ Download to View
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="preview-unavailable">
                    <p>No document file attached</p>
                  </div>
                )}
              </div>

              <div className="preview-footer">
                <button
                  className="btn btn-success"
                  onClick={() => handleDownload(selectedDoc)}
                >
                  ⬇️ Download Document
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedDoc(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <p>No STCW documents available</p>
        </div>
      )}
    </div>
  );
};

const DceDocumentsSection = ({ dceDocs, onAddNew, onDelete, onEdit }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);

  const handleDownload = async (doc) => {
    try {
      const url = doc.file_path || doc.file_upload;
      if (!url) return;
      const response = await axios.get(url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `DCE_${doc.certificate_number || "document"}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  const getFileType = (filePath) => {
    if (!filePath) return "unknown";
    const ext = (filePath || "").split(".").pop()?.toLowerCase() || "";
    return ext;
  };
  const isImageFile = (filePath) => ["jpg", "jpeg", "png", "gif", "webp"].includes(getFileType(filePath));
  const isPdfFile = (filePath) => getFileType(filePath) === "pdf";
  const fileUrl = (doc) => doc.file_path || doc.file_upload;

  return (
    <div className="document-section">
      <div className="section-header">
        <h3>📋 DCE Documents</h3>
        <button type="button" className="btn btn-primary" onClick={onAddNew}>
          ➕ Add DCE document
        </button>
      </div>
      {dceDocs.length > 0 ? (
        <div className="passport-container">
          <div className="table-responsive doc-table-wrap">
            <table className="doc-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Country Name</th>
                  <th>Document Name</th>
                  <th>Certificate Number</th>
                  <th>Place of Issue</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Document File</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dceDocs.map((doc, idx) => {
                  const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                  return (
                    <tr
                      key={doc.id}
                      className={[
                        selectedDoc?.id === doc.id ? "doc-row-active" : "",
                        isExpired ? "doc-row-expired" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <td>{idx + 1}</td>
                      <td>{doc.country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.document_name?.toUpperCase() || "-"}</td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td><DocFileCell url={fileUrl(doc)} /></td>
                      <td className="doc-list-actions-cell action-cell-with-audit">
                        <DocumentRowActions
                          record={doc}
                          previewOpen={selectedDoc?.id === doc.id}
                          hasFile={!!fileUrl(doc)}
                          onPreview={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                          onDownload={() => handleDownload(doc)}
                          onEdit={() => onEdit(doc)}
                          onDelete={() => onDelete(doc.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>Preview · {selectedDoc.document_name} #{selectedDoc.certificate_number}</h3>
                <button className="btn btn-link close-btn" onClick={() => setSelectedDoc(null)}>✕</button>
              </div>
              <div className="preview-content">
                {fileUrl(selectedDoc) ? (
                  <>
                    {isImageFile(fileUrl(selectedDoc)) ? (
                      <div className="image-preview"><img src={fileUrl(selectedDoc)} alt={`DCE ${selectedDoc.document_name}`} /></div>
                    ) : isPdfFile(fileUrl(selectedDoc)) ? (
                      <div className="pdf-preview"><iframe src={`${fileUrl(selectedDoc)}#toolbar=1`} width="100%" height="600px" title={`DCE ${selectedDoc.document_name}`} /></div>
                    ) : (
                      <div className="preview-unavailable">
                        <p>Preview not available for this file type (.{getFileType(fileUrl(selectedDoc))})</p>
                        <button className="btn btn-primary" onClick={() => handleDownload(selectedDoc)}>⬇️ Download to View</button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="preview-unavailable"><p>No document file attached</p></div>
                )}
              </div>
              <div className="preview-footer">
                <button className="btn btn-success" onClick={() => handleDownload(selectedDoc)}>⬇️ Download Document</button>
                <button className="btn btn-secondary" onClick={() => setSelectedDoc(null)}>Close Preview</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state"><p>No DCE documents available</p></div>
      )}
    </div>
  );
};

const ValueAddedDocumentsSection = ({ valueCourses, onAddNew, onDelete, onEdit }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);

  const handleDownload = async (doc) => {
    try {
      const url = doc.file_path || doc.file_upload;
      if (!url) return;
      const response = await axios.get(url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `ValueCourse_${doc.certificate_number || "document"}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  const getFileType = (filePath) => {
    if (!filePath) return "unknown";
    const ext = (filePath || "").split(".").pop()?.toLowerCase() || "";
    return ext;
  };
  const isImageFile = (filePath) => ["jpg", "jpeg", "png", "gif", "webp"].includes(getFileType(filePath));
  const isPdfFile = (filePath) => getFileType(filePath) === "pdf";
  const fileUrl = (doc) => doc.file_path || doc.file_upload;

  return (
    <div className="document-section">
      <div className="section-header">
        <h3>📌 Value Added Course Documents</h3>
        <button type="button" className="btn btn-primary" onClick={onAddNew}>
          ➕ Add value added course
        </button>
      </div>
      {valueCourses.length > 0 ? (
        <div className="passport-container">
          <div className="table-responsive doc-table-wrap">
            <table className="doc-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Country Name</th>
                  <th>Document Name</th>
                  <th>Certificate Number</th>
                  <th>Place of Issue</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Document File</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {valueCourses.map((doc, idx) => {
                  const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                  return (
                    <tr
                      key={doc.id}
                      className={[
                        selectedDoc?.id === doc.id ? "doc-row-active" : "",
                        isExpired ? "doc-row-expired" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <td>{idx + 1}</td>
                      <td>{doc.country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.document_name?.toUpperCase() || "-"}</td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td><DocFileCell url={fileUrl(doc)} /></td>
                      <td className="doc-list-actions-cell action-cell-with-audit">
                        <DocumentRowActions
                          record={doc}
                          previewOpen={selectedDoc?.id === doc.id}
                          hasFile={!!fileUrl(doc)}
                          onPreview={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                          onDownload={() => handleDownload(doc)}
                          onEdit={() => onEdit(doc)}
                          onDelete={() => onDelete(doc.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>Preview · {selectedDoc.document_name} #{selectedDoc.certificate_number}</h3>
                <button className="btn btn-link close-btn" onClick={() => setSelectedDoc(null)}>✕</button>
              </div>
              <div className="preview-content">
                {fileUrl(selectedDoc) ? (
                  <>
                    {isImageFile(fileUrl(selectedDoc)) ? (
                      <div className="image-preview"><img src={fileUrl(selectedDoc)} alt={`Value Course ${selectedDoc.document_name}`} /></div>
                    ) : isPdfFile(fileUrl(selectedDoc)) ? (
                      <div className="pdf-preview"><iframe src={`${fileUrl(selectedDoc)}#toolbar=1`} width="100%" height="600px" title={`Value Course ${selectedDoc.document_name}`} /></div>
                    ) : (
                      <div className="preview-unavailable">
                        <p>Preview not available for this file type (.{getFileType(fileUrl(selectedDoc))})</p>
                        <button className="btn btn-primary" onClick={() => handleDownload(selectedDoc)}>⬇️ Download to View</button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="preview-unavailable"><p>No document file attached</p></div>
                )}
              </div>
              <div className="preview-footer">
                <button className="btn btn-success" onClick={() => handleDownload(selectedDoc)}>⬇️ Download Document</button>
                <button className="btn btn-secondary" onClick={() => setSelectedDoc(null)}>Close Preview</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state"><p>No Value Added Course documents available</p></div>
      )}
    </div>
  );
};

const VisaSection = ({ candidateId, seafarersDocs, onAddNew, onDelete, onEdit }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [visaDocViewer, setVisaDocViewer] = useState({ open: false, row: null, docs: [], selected: null });
  const visaDocs = seafarersDocs.filter(
    (doc) => doc.document_name === "VISA Copy",
  );

  const openVisaDocViewer = (row) => {
    const docs = visaDocumentsFor(row, candidateId);
    if (!docs.length) return;
    setVisaDocViewer({ open: true, row, docs, selected: docs.length === 1 ? docs[0] : null });
  };

  const closeVisaDocViewer = () =>
    setVisaDocViewer({ open: false, row: null, docs: [], selected: null });

  const downloadVisaDoc = (doc) => {
    if (!doc?.url) return;
    const a = document.createElement("a");
    a.href = doc.url;
    a.download = doc.fileName || "document";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownload = async (doc) => {
    try {
      const url = doc.file_path || visaDocumentsFor(doc, candidateId)[0]?.url;
      if (!url) {
        alert("No document file attached");
        return;
      }
      const response = await axios.get(url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute(
        "download",
        `Visa_${doc.certificate_number || "document"}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  const getFileType = (filePath) => {
    if (!filePath) return "unknown";
    const ext = filePath.split(".").pop().toLowerCase();
    return ext;
  };

  const isImageFile = (filePath) => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    return imageExtensions.includes(getFileType(filePath));
  };

  const isPdfFile = (filePath) => {
    return getFileType(filePath) === "pdf";
  };

  return (
    <div className="document-section">
      <div className="section-header">
        <h3>✈️ Visa Documents</h3>
        <button type="button" className="btn btn-primary" onClick={onAddNew}>
          ➕ Add Visa
        </button>
      </div>

      {visaDocs.length > 0 ? (
        <div className="passport-container">
          <div className="table-responsive doc-table-wrap">
            <table className="doc-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Visa For Country</th>
                  <th>Issue Country</th>
                  <th>Place of Issue</th>
                  <th>Visa Category</th>
                  <th>Type of Visa Entry</th>
                  <th>Visa No.</th>
                  <th>Issue Date</th>
                  <th>Arrival Date in Destination</th>
                  <th>Reference/Boarder No</th>
                  <th>Sponsor Name</th>
                  <th>Expiry Date</th>
                  <th>Remark</th>
                  <th>Documents</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visaDocs.map((doc, idx) => {
                  const isExpired =
                    doc.expiry_date && new Date(doc.expiry_date) < new Date();
                  const rowDocs = visaDocumentsFor(doc, candidateId);
                  const hasAnyFile = rowDocs.length > 0;
                  return (
                    <tr
                      key={doc.id}
                      className={[
                        selectedDoc?.id === doc.id ? "doc-row-active" : "",
                        isExpired ? "doc-row-expired" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <td>{idx + 1}</td>
                      <td>{doc.visa_country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.visa_issue_country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td>{doc.visa_category || "-"}</td>
                      <td>{labelForVisaEntryType(doc.visa_entry_type).toUpperCase()}</td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.visa_arrive_date)}</td>
                      <td>{doc.border_number || "-"}</td>
                      <td title={visaSponsorLabel(doc.sponsor_name)}>
                        {visaSponsorLabel(doc.sponsor_name)}
                      </td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td title={doc.remark || ""}>{doc.remark ? String(doc.remark).slice(0, 12) : "-"}</td>
                      <td>
                        {hasAnyFile ? (
                          <button
                            type="button"
                            className="doc-view-trigger"
                            onClick={() => openVisaDocViewer(doc)}
                            title={`View ${rowDocs.length} document${rowDocs.length > 1 ? "s" : ""}`}
                          >
                            <i className="fas fa-folder-open" aria-hidden="true" />
                            View
                            <span className="doc-view-count">{rowDocs.length}</span>
                          </button>
                        ) : "-"}
                      </td>
                      <td className="doc-list-actions-cell action-cell-with-audit">
                        <DocumentRowActions
                          record={doc}
                          previewOpen={selectedDoc?.id === doc.id}
                          hasFile={hasAnyFile}
                          onPreview={() =>
                            setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)
                          }
                          onDownload={() => handleDownload(doc)}
                          onEdit={() => onEdit(doc)}
                          onDelete={() => onDelete(doc.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Document Preview Section (legacy single-file quick preview) */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  Preview · Visa #{selectedDoc.certificate_number}
                </h3>
                <button
                  className="btn btn-link close-btn"
                  onClick={() => setSelectedDoc(null)}
                >
                  ✕
                </button>
              </div>

              <div className="preview-content">
                {selectedDoc.file_path ? (
                  <>
                    {isImageFile(selectedDoc.file_path) ? (
                      <div className="image-preview">
                        <img
                          src={selectedDoc.file_path}
                          alt={`Visa ${selectedDoc.certificate_number}`}
                        />
                      </div>
                    ) : isPdfFile(selectedDoc.file_path) ? (
                      <div className="pdf-preview">
                        <iframe
                          src={`${selectedDoc.file_path}#toolbar=1`}
                          width="100%"
                          height="600px"
                          title={`Visa ${selectedDoc.certificate_number}`}
                        />
                      </div>
                    ) : (
                      <div className="preview-unavailable">
                        <p>
                          Preview not available for this file type (.
                          {getFileType(selectedDoc.file_path)})
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleDownload(selectedDoc)}
                        >
                          ⬇️ Download to View
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="preview-unavailable">
                    <p>No primary document file attached — use View to open uploaded copies</p>
                    {visaDocumentsFor(selectedDoc, candidateId).length > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          openVisaDocViewer(selectedDoc);
                          setSelectedDoc(null);
                        }}
                      >
                        Open documents
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="preview-footer">
                <button
                  className="btn btn-success"
                  onClick={() => handleDownload(selectedDoc)}
                >
                  ⬇️ Download Document
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedDoc(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <p>No visa documents available</p>
        </div>
      )}

      {visaDocViewer.open && (
        <div className="modal-overlay" onClick={closeVisaDocViewer}>
          <div className="modal-content modal-lg doc-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Visa Documents
                {visaDocViewer.row?.certificate_number
                  ? ` · #${visaDocViewer.row.certificate_number}`
                  : ""}
              </h3>
              <button type="button" className="close-btn" onClick={closeVisaDocViewer} aria-label="Close">&times;</button>
            </div>

            <div className="doc-viewer-body">
              <div className="doc-viewer-list" role="listbox" aria-label="Documents">
                <div className="doc-viewer-list-title">
                  {visaDocViewer.docs.length} document{visaDocViewer.docs.length > 1 ? "s" : ""}
                </div>
                {visaDocViewer.docs.map((doc) => (
                  <button
                    key={doc.key}
                    type="button"
                    role="option"
                    aria-selected={visaDocViewer.selected?.key === doc.key}
                    className={`doc-viewer-item${visaDocViewer.selected?.key === doc.key ? " is-active" : ""}`}
                    onClick={() => setVisaDocViewer((prev) => ({ ...prev, selected: doc }))}
                  >
                    <i className={`fas ${doc.icon} doc-viewer-item-icon`} aria-hidden="true" />
                    <span className="doc-viewer-item-text">
                      <span className="doc-viewer-item-label">{doc.label}</span>
                      <span className="doc-viewer-item-meta">{doc.ext ? doc.ext.toUpperCase() : "FILE"}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="doc-viewer-stage">
                {!visaDocViewer.selected ? (
                  <div className="doc-viewer-empty">
                    <i className="fas fa-file-circle-question" aria-hidden="true" />
                    <p>Select a document to preview</p>
                  </div>
                ) : PREVIEWABLE_IMAGE_EXTS.includes(visaDocViewer.selected.ext) ? (
                  <div className="doc-viewer-frame doc-viewer-frame--image">
                    <img src={visaDocViewer.selected.url} alt={visaDocViewer.selected.label} />
                  </div>
                ) : visaDocViewer.selected.ext === "pdf" ? (
                  <div className="doc-viewer-frame">
                    <iframe
                      src={`${visaDocViewer.selected.url}#toolbar=1`}
                      title={visaDocViewer.selected.label}
                    />
                  </div>
                ) : (
                  <div className="doc-viewer-empty">
                    <i className="fas fa-file-arrow-down" aria-hidden="true" />
                    <p>
                      Preview is not available for
                      {visaDocViewer.selected.ext ? ` .${visaDocViewer.selected.ext}` : " this"} files
                    </p>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => downloadVisaDoc(visaDocViewer.selected)}
                    >
                      Download to view
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer doc-viewer-footer">
              <span className="doc-viewer-filename" title={visaDocViewer.selected?.fileName || ""}>
                {visaDocViewer.selected?.fileName || ""}
              </span>
              <div className="doc-viewer-footer-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info"
                  disabled={!visaDocViewer.selected}
                  onClick={() => downloadVisaDoc(visaDocViewer.selected)}
                >
                  Download
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={closeVisaDocViewer}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EducationalDocuments = ({ edDocs, onDelete, onEdit, onAddNew }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(doc.upload_file, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Education_${(doc.name || "document").replace(/\s+/g, "_")}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  const getFileType = (filePath) => {
    if (!filePath) return "unknown";
    const ext = filePath.split(".").pop().toLowerCase();
    return ext;
  };

  const isImageFile = (filePath) => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    return imageExtensions.includes(getFileType(filePath));
  };

  const isPdfFile = (filePath) => {
    return getFileType(filePath) === "pdf";
  };

  return (
    <div className="document-section">
      <div className="section-header">
        <h3>📚 Educational documents</h3>
        {onAddNew && (
          <button type="button" className="btn btn-primary" onClick={onAddNew}>
            ➕ Add
          </button>
        )}
      </div>

      {edDocs.length > 0 ? (
        <div className="passport-container">
          <div className="table-responsive doc-table-wrap">
            <table className="doc-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>From Year</th>
                  <th>To Year</th>
                  <th>Qualification Attained</th>
                  <th>Address</th>
                  <th>Remark</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {edDocs.map((edDoc, idx) => {
                  return (
                    <tr
                      key={edDoc.id}
                      className={selectedDoc?.id === edDoc.id ? "doc-row-active" : ""}
                    >
                      <td>{idx + 1}</td>
                      <td>{edDoc.type?.replace(/_/g, " ").toUpperCase() || "-"}</td>
                      <td>{edDoc.name?.toUpperCase() || "-"}</td>
                      <td>{formatDocDate(edDoc.from_year)}</td>
                      <td>{formatDocDate(edDoc.to_year)}</td>
                      <td>{edDoc.qualification_attained?.toUpperCase() || "-"}</td>
                      <td>{edDoc.address?.toUpperCase() || "-"}</td>
                      <td title={edDoc.remark || ""}>{edDoc.remark?.toUpperCase() || "-"}</td>
                      <td className="doc-list-actions-cell action-cell-with-audit">
                        {edDoc.upload_file ? (
                          <>
                            <a href={edDoc.upload_file} target="_blank" rel="noopener noreferrer">View</a>
                            {" | "}
                          </>
                        ) : null}
                        <DocumentRowActions
                          record={edDoc}
                          previewOpen={selectedDoc?.id === edDoc.id}
                          hasFile={!!edDoc.upload_file}
                          onPreview={() =>
                            setSelectedDoc(
                              selectedDoc?.id === edDoc.id ? null : edDoc,
                            )
                          }
                          onDownload={() => handleDownload(edDoc)}
                          onEdit={() => onEdit(edDoc)}
                          onDelete={() => onDelete(edDoc.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  Preview · {selectedDoc.name || "Education"} ({selectedDoc.type || ""})
                </h3>
                <button
                  className="btn btn-link close-btn"
                  onClick={() => setSelectedDoc(null)}
                >
                  ✕
                </button>
              </div>

              <div className="preview-content">
                {selectedDoc.upload_file ? (
                  <>
                    {isImageFile(selectedDoc.upload_file) ? (
                      <div className="image-preview">
                        <img
                          src={selectedDoc.upload_file}
                          alt={`Education ${selectedDoc.name}`}
                        />
                      </div>
                    ) : isPdfFile(selectedDoc.upload_file) ? (
                      <div className="pdf-preview">
                        <iframe
                          src={`${selectedDoc.upload_file}#toolbar=1`}
                          width="100%"
                          height="600px"
                          title={`Education ${selectedDoc.name}`}
                        />
                      </div>
                    ) : (
                      <div className="preview-unavailable">
                        <p>
                          Preview not available for this file type (.
                          {getFileType(selectedDoc.upload_file)})
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleDownload(selectedDoc)}
                        >
                          ⬇️ Download to View
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="preview-unavailable">
                    <p>No document file attached</p>
                  </div>
                )}
              </div>

              <div className="preview-footer">
                <button
                  className="btn btn-success"
                  onClick={() => handleDownload(selectedDoc)}
                >
                  ⬇️ Download Document
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedDoc(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <p>No educational documents available</p>
        </div>
      )}
    </div>
  );
};

const VerificationDocuments = ({ edDocs, onDelete, onEdit, onAddNew }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(doc.file_upload, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Verification_${doc.document_number || doc.id || "document"}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  const getFileType = (filePath) => {
    if (!filePath) return "unknown";
    const ext = filePath.split(".").pop().toLowerCase();
    return ext;
  };

  const isImageFile = (filePath) => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    return imageExtensions.includes(getFileType(filePath));
  };

  const isPdfFile = (filePath) => {
    return getFileType(filePath) === "pdf";
  };

  return (
    <div className="document-section">
      <div className="section-header">
        <h3>✅ Document verification</h3>
        {onAddNew && (
          <button type="button" className="btn btn-primary" onClick={onAddNew}>
            ➕ Add
          </button>
        )}
      </div>

      {edDocs.length > 0 ? (
        <div className="passport-container">
          <div className="table-responsive doc-table-wrap">
            <table className="doc-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Document Name</th>
                  <th>Document Number</th>
                  <th>Verification Date</th>
                  <th>Verification Mode</th>
                  <th>Verified</th>
                  <th>Remark</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {edDocs.map((edDoc, idx) => {
                  return (
                    <tr
                      key={edDoc.id}
                      className={selectedDoc?.id === edDoc.id ? "doc-row-active" : ""}
                    >
                      <td>{idx + 1}</td>
                      <td>{(edDoc.document_type_name || edDoc.document_id || "-").toString().toUpperCase()}</td>
                      <td>{edDoc.document_number || "-"}</td>
                      <td>{formatDocDate(edDoc.verification_date)}</td>
                      <td>{edDoc.verification_mode ? String(edDoc.verification_mode).replace(/_/g, " ").toUpperCase() : "-"}</td>
                      <td>{edDoc.verified === 1 || edDoc.verified === true ? "Yes" : edDoc.verified === 0 || edDoc.verified === false ? "No" : "-"}</td>
                      <td title={edDoc.remark || ""}>{edDoc.remark ? String(edDoc.remark).slice(0, 12) : "-"}</td>
                      <td className="doc-list-actions-cell action-cell-with-audit">
                        {edDoc.file_upload ? (
                          <>
                            <a href={edDoc.file_upload} target="_blank" rel="noopener noreferrer">View</a>
                            {" | "}
                          </>
                        ) : null}
                        <DocumentRowActions
                          record={edDoc}
                          previewOpen={selectedDoc?.id === edDoc.id}
                          hasFile={!!edDoc.file_upload}
                          onPreview={() =>
                            setSelectedDoc(
                              selectedDoc?.id === edDoc.id ? null : edDoc,
                            )
                          }
                          onDownload={() => handleDownload(edDoc)}
                          onEdit={() => onEdit(edDoc)}
                          onDelete={() => onDelete(edDoc.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  Preview · Verification #{selectedDoc.document_number || selectedDoc.id}
                </h3>
                <button
                  className="btn btn-link close-btn"
                  onClick={() => setSelectedDoc(null)}
                >
                  ✕
                </button>
              </div>

              <div className="preview-content">
                {selectedDoc.file_upload ? (
                  <>
                    {isImageFile(selectedDoc.file_upload) ? (
                      <div className="image-preview">
                        <img
                          src={selectedDoc.file_upload}
                          alt={`edDoc ${selectedDoc.document_number}`}
                        />
                      </div>
                    ) : isPdfFile(selectedDoc.file_upload) ? (
                      <div className="pdf-preview">
                        <iframe
                          src={`${selectedDoc.file_upload}#toolbar=1`}
                          width="100%"
                          height="600px"
                          title={`edDoc ${selectedDoc.document_number}`}
                        />
                      </div>
                    ) : (
                      <div className="preview-unavailable">
                        <p>
                          Preview not available for this file type (.
                          {getFileType(selectedDoc.file_upload)})
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleDownload(selectedDoc)}
                        >
                          ⬇️ Download to View
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="preview-unavailable">
                    <p>No document file attached</p>
                  </div>
                )}
              </div>

              <div className="preview-footer">
                <button
                  className="btn btn-success"
                  onClick={() => handleDownload(selectedDoc)}
                >
                  ⬇️ Download Document
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedDoc(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <p>No verification documents available</p>
        </div>
      )}
    </div>
  );
};

// Modal Components
const ADDRESS_FIELDS = [
  "house_no",
  "building_name",
  "residence_address",
  "province",
  "country_id",
  "state_id",
  "city_id",
  "domestic_airport",
  "international_airport",
  "email_id",
  "contact_no_1",
  "contact_no_2",
];

const AddressModal = ({ show, onClose, candidateId, formData, countries, onSubmitSuccess }) => {
  const [data, setData] = useState({
    house_no: "",
    building_name: "",
    residence_address: "",
    country_id: "",
    state_id: "",
    city_id: "",
    domestic_airport: "",
    international_airport: "",
    email_id: "",
    contact_no_1: "",
    contact_no_2: "",
    province: "",
  });
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

  const fetchStatesForCountry = async (countryId) => {
    if (!countryId) {
      setStates([]);
      return [];
    }
    const res = await axios.get(`${apiBase}/api/candidates/location/states/${countryId}`);
    const rows = Array.isArray(res.data) ? res.data : [];
    setStates(rows);
    return rows;
  };

  const fetchCitiesForState = async (stateId) => {
    if (!stateId) {
      setCities([]);
      return [];
    }
    const res = await axios.get(`${apiBase}/api/candidates/location/cities/${stateId}`);
    const rows = Array.isArray(res.data) ? res.data : [];
    setCities(rows);
    return rows;
  };

  useEffect(() => {
    if (!show || !formData) return;
    let cancelled = false;

    const init = async () => {
      setError("");
      const countryId = formData.country_id ?? "";
      const stateId = formData.state_id ?? "";
      const cityId = formData.city_id ?? "";

      setData({
        house_no: formData.house_no || "",
        building_name: formData.building_name || "",
        residence_address: formData.residence_address || formData.street_area || "",
        country_id: countryId,
        state_id: stateId,
        city_id: cityId,
        domestic_airport: formData.domestic_airport || "",
        international_airport: formData.international_airport || "",
        email_id: formData.email_id || formData.email || "",
        contact_no_1: formData.contact_no_1 || formData.contact1 || "",
        contact_no_2: formData.contact_no_2 || formData.contact2 || "",
        province: formData.province || "",
      });

      setStates([]);
      setCities([]);
      if (!countryId) return;

      try {
        await fetchStatesForCountry(countryId);
        if (cancelled) return;
        if (stateId) await fetchCitiesForState(stateId);
      } catch (err) {
        console.error("Error loading location options:", err);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [show, formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = async (e) => {
    const country_id = e.target.value;
    setData((prev) => ({ ...prev, country_id, state_id: "", city_id: "" }));
    setCities([]);
    try {
      await fetchStatesForCountry(country_id);
    } catch (err) {
      console.error("Error loading states:", err);
    }
  };

  const handleStateChange = async (e) => {
    const state_id = e.target.value;
    setData((prev) => ({ ...prev, state_id, city_id: "" }));
    try {
      await fetchCitiesForState(state_id);
    } catch (err) {
      console.error("Error loading cities:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!candidateId) {
      setError("Candidate id is missing.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {};
      for (const key of ADDRESS_FIELDS) {
        payload[key] = data[key] ?? "";
      }
      await axios.put(`${apiBase}/api/candidates/${candidateId}`, payload);
      onClose();
      onSubmitSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to save address.";
      setError(msg);
      console.error("Error saving address:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header address-modal-header">
          <div>
            <h3>Address &amp; contact</h3>
            <p className="modal-header-subtitle">Residence, location, travel, and reachability</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error ? <div className="alert alert-danger mx-3 mt-2 mb-0 py-2 small">{error}</div> : null}
          <div className="modal-body address-modal-body">
            <section className="address-modal-section">
              <h4 className="address-modal-section-title"><i className="fas fa-home" aria-hidden /> Residence</h4>
              <div className="address-modal-grid">
                <div className="form-group"><label>House / flat no.</label><input type="text" className="form-control" name="house_no" value={data.house_no} onChange={handleChange} /></div>
                <div className="form-group"><label>Building name</label><input type="text" className="form-control" name="building_name" value={data.building_name} onChange={handleChange} /></div>
                <div className="form-group address-modal-span-2"><label>Street / road / area</label><input type="text" className="form-control" name="residence_address" value={data.residence_address} onChange={handleChange} /></div>
                <div className="form-group"><label>Province / region</label><input type="text" className="form-control" name="province" value={data.province} onChange={handleChange} /></div>
              </div>
            </section>
            <section className="address-modal-section">
              <h4 className="address-modal-section-title"><i className="fas fa-map-marker-alt" aria-hidden /> Location</h4>
              <div className="address-modal-grid">
                <div className="form-group"><label>Country</label>
                  <select name="country_id" className="form-control" value={data.country_id} onChange={handleCountryChange}>
                    <option value="">Select country</option>
                    {(countries || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>State</label>
                  <select name="state_id" className="form-control" value={data.state_id} onChange={handleStateChange} disabled={!data.country_id}>
                    <option value="">Select state</option>
                    {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>City</label>
                  <select name="city_id" className="form-control" value={data.city_id} onChange={handleChange} disabled={!data.state_id}>
                    <option value="">Select city</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </section>
            <section className="address-modal-section">
              <h4 className="address-modal-section-title"><i className="fas fa-plane" aria-hidden /> Travel</h4>
              <div className="address-modal-grid">
                <div className="form-group"><label>Nearest domestic airport</label><input type="text" className="form-control" name="domestic_airport" value={data.domestic_airport} onChange={handleChange} /></div>
                <div className="form-group"><label>Nearest international airport</label><input type="text" className="form-control" name="international_airport" value={data.international_airport} onChange={handleChange} /></div>
              </div>
            </section>
            <section className="address-modal-section">
              <h4 className="address-modal-section-title"><i className="fas fa-address-book" aria-hidden /> Contact</h4>
              <div className="address-modal-grid">
                <div className="form-group address-modal-span-2"><label>Email</label><input type="email" className="form-control" name="email_id" value={data.email_id} onChange={handleChange} /></div>
                <div className="form-group"><label>Contact no. 1</label><input type="text" className="form-control" name="contact_no_1" value={data.contact_no_1} onChange={handleChange} /></div>
                <div className="form-group"><label>Contact no. 2</label><input type="text" className="form-control" name="contact_no_2" value={data.contact_no_2} onChange={handleChange} /></div>
              </div>
            </section>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const NokModal = ({ show, onClose, candidateId, editingNok, nomineeRelationships = [], onSubmitSuccess }) => {
  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const emptyForm = {
    name: "",
    relationship_id: "",
    nok: "",
    beneficiary: "",
    emergency_contact: "",
    contact_number: "",
    dob: "",
    gender: "",
    remark: "",
  };
  const [data, setData] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show) return;
    setFile(null);
    setError("");
    if (editingNok) {
      setData({
        name: editingNok.name || "",
        relationship_id: editingNok.relationship_id != null ? String(editingNok.relationship_id) : "",
        nok: editingNok.nok ? String(editingNok.nok).toLowerCase() : "",
        beneficiary: editingNok.beneficiary || "",
        emergency_contact: editingNok.emergency_contact || "",
        contact_number: editingNok.contact_number || editingNok.contact || "",
        dob: (() => {
          const v = editingNok.dob;
          if (!v) return "";
          const s = String(v);
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
          const d = new Date(typeof v === "number" ? (v > 1e12 ? v : v * 1000) : v);
          return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
        })(),
        gender: editingNok.gender || "",
        remark: editingNok.remark || "",
      });
    } else {
      setData(emptyForm);
    }
  }, [show, editingNok?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!candidateId) {
      setError("Candidate id is missing.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("name", data.name || "");
      fd.append("relationship_id", data.relationship_id || "");
      fd.append("nok", data.nok || "");
      fd.append("beneficiary", data.beneficiary || "");
      fd.append("emergency_contact", data.emergency_contact || "");
      fd.append("contact_number", data.contact_number || "");
      fd.append("dob", data.dob || "");
      fd.append("gender", data.gender || "");
      fd.append("remark", data.remark || "");
      if (file) fd.append("file", file);

      const path = editingNok
        ? `${apiBase}/api/candidates/${candidateId}/nok-documents/${editingNok.id}`
        : `${apiBase}/api/candidates/${candidateId}/nok-documents`;

      if (editingNok) await axios.put(path, fd);
      else await axios.post(path, fd);

      onClose();
      onSubmitSuccess?.();
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Failed to save NOK.";
      setError(msg);
      console.error("Error saving NOK:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingNok ? "Edit" : "Add"} Next of Kin</h3>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error ? <div className="alert alert-danger mx-3 mt-2 mb-0 py-2 small">{error}</div> : null}
          <div className="modal-body modal-form-row">
            <div className="form-group"><label>NAME</label><input type="text" className="form-control" name="name" value={data.name} onChange={handleChange} /></div>
            <div className="form-group">
              <label>RELATIONSHIP</label>
              {nomineeRelationships.length > 0 ? (
                <select name="relationship_id" className="form-control" value={data.relationship_id} onChange={handleChange}>
                  <option value="">Select relationship</option>
                  {nomineeRelationships.map((r) => (
                    <option key={r.id} value={r.id}>{r.relationship}</option>
                  ))}
                </select>
              ) : (
                <input type="text" className="form-control" name="relationship_id" value={data.relationship_id} onChange={handleChange} placeholder="Relationship id or name" />
              )}
            </div>
            <div className="form-group"><label>NOK</label>
              <select name="nok" className="form-control" value={data.nok} onChange={handleChange}>
                <option value="">-- Select --</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="form-group"><label>BENEFICIARY IN CASE OF DEATH</label><input type="text" className="form-control" name="beneficiary" value={data.beneficiary} onChange={handleChange} /></div>
            <div className="form-group"><label>CONTACT IN CASE OF EMERGENCY</label>
              <select name="emergency_contact" className="form-control" value={data.emergency_contact} onChange={handleChange}>
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="form-group"><label>CONTACT</label><input type="text" className="form-control" name="contact_number" value={data.contact_number} onChange={handleChange} /></div>
            <div className="form-group"><label>D.O.B</label><input type="date" className="form-control" name="dob" value={data.dob} onChange={handleChange} /></div>
            <div className="form-group"><label>GENDER</label>
              <select name="gender" className="form-control" value={data.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group"><label>REMARK</label><input type="text" className="form-control" name="remark" value={data.remark} onChange={handleChange} /></div>
            <div className="form-group">
              <label>Upload File (optional)</label>
              <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setFile(pickDocumentFile(e))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdditionalInfoModal = ({
  show,
  additionalInfo,
  handleChange,
  handleSubmit,
  onClose,
}) => {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add / Edit Physical Details</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Height</label>
              <input
                type="text"
                name="height"
                className="form-control"
                value={additionalInfo.height}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Weight</label>
              <input
                type="text"
                name="weight"
                className="form-control"
                value={additionalInfo.weight}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Eye Colour</label>
              <input
                type="text"
                name="eye_color"
                className="form-control"
                value={additionalInfo.eye_color}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Hair Colour</label>
              <input
                type="text"
                name="hair_color"
                className="form-control"
                value={additionalInfo.hair_color}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Identification Mark</label>
              <input
                type="text"
                name="identification_mark"
                className="form-control"
                value={additionalInfo.identification_mark}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>BMI</label>
              <input
                type="text"
                name="bmi"
                className="form-control"
                value={additionalInfo.bmi}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Boiler Suit Size</label>
              <input
                type="text"
                name="boiler_suit_size"
                className="form-control"
                value={additionalInfo.boiler_suit_size}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Shoe Size</label>
              <input
                type="text"
                name="shoe_size"
                className="form-control"
                value={additionalInfo.shoe_size}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SeafarersDocumentModal = ({
  show,
  countries,
  documentTypes,
  candidateId,
  editingDoc,
  fixedType,
  pickType,
  onClose,
  onSubmitSuccess,
}) => {
  const [form, setForm] = useState({});
  const [pickedTypeId, setPickedTypeId] = useState("");
  const [file, setFile] = useState(null);
  const [visaFiles, setVisaFiles] = useState(() =>
    Object.fromEntries(VISA_DOC_FIELDS.map(({ key }) => [key, null])),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    const d = editingDoc;
    const fromFixed =
      !pickType && fixedType && documentTypes
        ? documentTypes.find((x) => x.name === fixedType)?.id
        : null;
    setPickedTypeId(
      d?.document_type_id != null
        ? String(d.document_type_id)
        : fromFixed != null
          ? String(fromFixed)
          : "",
    );
    setForm({
      country_id: d?.country_id != null ? String(d.country_id) : "",
      visa_country: d?.visa_country != null ? String(d.visa_country) : "",
      visa_issue_country: d?.visa_issue_country != null ? String(d.visa_issue_country) : "",
      certificate_number: d?.certificate_number || "",
      place_of_issue: d?.place_of_issue || "",
      issue_date: toDateInputValue(d?.issue_date),
      expiry_date: toDateInputValue(d?.expiry_date),
      stcw_regulation: d?.stcw_regulation || "",
      visa_category: d?.visa_category || "",
      visa_entry_type: normalizeVisaEntryTypeForSelect(d?.visa_entry_type),
      visa_arrive_date: toDateInputValue(d?.visa_arrive_date),
      border_number: d?.border_number || "",
      sponsor_name: d?.sponsor_name || "",
      remark: d?.remark || "",
      loi_sponsor_file: d?.loi_sponsor_file || "",
      visa_upload_file: d?.visa_upload_file || "",
      extended_visa_copy_1_file: d?.extended_visa_copy_1_file || "",
      extended_visa_copy_2_file: d?.extended_visa_copy_2_file || "",
      extended_visa_copy_3_file: d?.extended_visa_copy_3_file || "",
      extended_visa_copy_4_file: d?.extended_visa_copy_4_file || "",
    });
    setFile(null);
    setVisaFiles(Object.fromEntries(VISA_DOC_FIELDS.map(({ key }) => [key, null])));
  }, [show, editingDoc?.id, fixedType, pickType, documentTypes]);

  const stcwTypeChoices = (documentTypes || []).filter(
    (dt) => !MAIN_SEAFARER_DOC_NAMES.includes(dt.name),
  );

  const resolvedDocumentTypeId = () => {
    // When the type picker is shown (Add/Edit STCW), use the selected dropdown value.
    if (pickType) return pickedTypeId;
    if (editingDoc?.document_type_id != null) return String(editingDoc.document_type_id);
    if (fixedType) {
      const found = documentTypes.find((d) => d.name === fixedType);
      return found ? String(found.id) : "";
    }
    return pickedTypeId;
  };

  const showVisaFields =
    fixedType === "VISA Copy" || editingDoc?.document_name === "VISA Copy";

  const expiryRequired =
    MAIN_SEAFARER_DOC_NAMES.includes(fixedType) ||
    MAIN_SEAFARER_DOC_NAMES.includes(editingDoc?.document_name);

  const showStcwField =
    pickType ||
    (editingDoc && !MAIN_SEAFARER_DOC_NAMES.includes(editingDoc.document_name));

  const modalTitle = (() => {
    if (pickType && editingDoc) return `Edit ${editingDoc.document_name || "STCW document"}`;
    if (pickType) return "Add STCW / training certificate";
    if (editingDoc) return `Edit ${editingDoc.document_name || "document"}`;
    if (fixedType) return `Add ${fixedType}`;
    return "Add document";
  })();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dtId = resolvedDocumentTypeId();
    if (!dtId) {
      alert("Please select a document type.");
      return;
    }
    if (!showVisaFields && !form.country_id) {
      alert("Please select a country.");
      return;
    }
    const ymd = /^\d{4}-\d{2}-\d{2}$/;
    if (!form.issue_date || !ymd.test(String(form.issue_date).trim())) {
      alert("Please choose a complete issue date (year, month, and day).");
      return;
    }
    if (expiryRequired && (!form.expiry_date || !ymd.test(String(form.expiry_date).trim()))) {
      alert("Please choose a complete expiry date (year, month, and day).");
      return;
    }
    if (
      !expiryRequired &&
      form.expiry_date &&
      !ymd.test(String(form.expiry_date).trim())
    ) {
      alert("Expiry date must be a complete date when provided.");
      return;
    }
    if (
      showVisaFields &&
      form.visa_arrive_date &&
      !ymd.test(String(form.visa_arrive_date).trim())
    ) {
      alert("Please choose a complete arrival date (year, month, and day), or leave it blank.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("document_type_id", dtId);
      if (!showVisaFields) {
        fd.append("country_id", form.country_id);
      } else {
        fd.append("country_id", "");
        fd.append("visa_country", form.visa_country || "");
        fd.append("visa_issue_country", form.visa_issue_country || "");
        fd.append("border_number", form.border_number || "");
        fd.append("sponsor_name", form.sponsor_name || "");
        fd.append("remark", form.remark || "");
      }
      fd.append("certificate_number", form.certificate_number || "");
      fd.append("place_of_issue", form.place_of_issue || "");
      fd.append("issue_date", String(form.issue_date).trim());
      fd.append("expiry_date", form.expiry_date ? String(form.expiry_date).trim() : "");
      if (showVisaFields) {
        fd.append("visa_category", form.visa_category || "");
        fd.append("visa_entry_type", form.visa_entry_type || "");
        fd.append("visa_arrive_date", form.visa_arrive_date || "");
        Object.entries(visaFiles).forEach(([k, f]) => {
          if (f) fd.append(k, f);
        });
      }
      if (showStcwField) {
        fd.append("stcw_regulation", form.stcw_regulation || "");
      }
      if (!showVisaFields && file) fd.append("file_path", file);
      const path = editingDoc
        ? `/api/candidates/${candidateId}/seafarers-documents/${editingDoc.id}`
        : `/api/candidates/${candidateId}/seafarers-documents`;
      if (editingDoc) await axios.put(path, fd);
      else await axios.post(path, fd);
      onSubmitSuccess();
    } catch (err) {
      alert(uploadErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-content${showVisaFields ? " modal-lg" : ""}`}>
        <div className="modal-header">
          <h3>{modalTitle}</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {pickType && (
            <div className="form-group">
              <label>Document type</label>
              <select
                className="form-control"
                value={pickedTypeId}
                onChange={(e) => setPickedTypeId(e.target.value)}
                required
              >
                <option value="">Select type</option>
                {stcwTypeChoices.map((dt) => (
                  <option key={dt.id} value={String(dt.id)}>
                    {dt.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showVisaFields ? (
            <>
              <div className="form-group">
                <label>Visa for country</label>
                <select
                  name="visa_country"
                  className="form-control"
                  value={form.visa_country || ""}
                  onChange={handleChange}
                >
                  <option value="">Select country</option>
                  {(countries || []).map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Issue country</label>
                <select
                  name="visa_issue_country"
                  className="form-control"
                  value={form.visa_issue_country || ""}
                  onChange={handleChange}
                >
                  <option value="">Select country</option>
                  {(countries || []).map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="form-group">
              <label>Country</label>
              <select
                name="country_id"
                className="form-control"
                value={form.country_id || ""}
                onChange={handleChange}
                required
              >
                <option value="">Select Country</option>
                {(countries || []).map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>{showVisaFields ? "Visa No." : "Certificate / document number"}</label>
            <input
              type="text"
              name="certificate_number"
              className="form-control"
              value={form.certificate_number || ""}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Place of issue</label>
            <input
              type="text"
              name="place_of_issue"
              className="form-control"
              value={form.place_of_issue || ""}
              onChange={handleChange}
            />
          </div>
          {showVisaFields && (
            <>
              <div className="form-group">
                <label>Visa category</label>
                <input
                  type="text"
                  name="visa_category"
                  className="form-control"
                  value={form.visa_category || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Type of visa entry</label>
                <select
                  name="visa_entry_type"
                  className="form-control"
                  value={form.visa_entry_type || ""}
                  onChange={handleChange}
                >
                  <option value="">Select single or multiple entry</option>
                  {!VISA_ENTRY_TYPE_OPTIONS.some((o) => o.value === form.visa_entry_type) && form.visa_entry_type ? (
                    <option value={form.visa_entry_type}>{String(form.visa_entry_type).replace(/_/g, " ")}</option>
                  ) : null}
                  {VISA_ENTRY_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="form-group">
            <label>Issue date *</label>
            <input
              type="date"
              name="issue_date"
              className="form-control"
              value={form.issue_date || ""}
              onChange={handleChange}
              required
            />
            <small className="text-muted" style={{ display: "block", marginTop: 4 }}>
              Pick a full date (calendar must include the year). DD/MM/YYYY must be complete, e.g. 01/04/2024 — not 01/04.
            </small>
          </div>
          <div className="form-group">
            <label>Expiry date{expiryRequired ? " *" : ""}</label>
            <input
              type="date"
              name="expiry_date"
              className="form-control"
              value={form.expiry_date || ""}
              onChange={handleChange}
              required={expiryRequired}
            />
          </div>
          {showVisaFields && (
            <>
              <div className="form-group">
                <label>Arrival date in destination</label>
                <input
                  type="date"
                  name="visa_arrive_date"
                  className="form-control"
                  value={form.visa_arrive_date || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Reference / boarder no</label>
                <input
                  type="text"
                  name="border_number"
                  className="form-control"
                  value={form.border_number || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Sponsor Name</label>
                <select
                  name="sponsor_name"
                  className="form-control"
                  value={form.sponsor_name || ""}
                  onChange={handleChange}
                >
                  <option value="">Select sponsor</option>
                  {VISA_SPONSOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                  {form.sponsor_name
                    && !VISA_SPONSOR_OPTIONS.some((o) => o.value === form.sponsor_name)
                    && (
                      <option value={form.sponsor_name}>
                        {visaSponsorLabel(form.sponsor_name)} (current)
                      </option>
                    )}
                </select>
              </div>
              <div className="form-group">
                <label>Remark</label>
                <input
                  type="text"
                  name="remark"
                  className="form-control"
                  value={form.remark || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Document Uploads (max 20 MB each)</label>
                <div className="proposal-upload-grid">
                  {VISA_DOC_FIELDS.map(({ key, label }) => {
                    const existing = form[key];
                    const selected = visaFiles[key];
                    const href = existing
                      ? (String(existing).startsWith("http")
                        ? existing
                        : seafarersDocFileUrl(existing, candidateId))
                      : null;
                    return (
                      <div key={key} className="proposal-upload-item">
                        <div className="proposal-upload-label">{label}</div>
                        <input
                          type="file"
                          className="form-control"
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                          onChange={(e) => {
                            const picked = pickDocumentFile(e);
                            setVisaFiles((prev) => ({ ...prev, [key]: picked }));
                          }}
                        />
                        {selected ? (
                          <span className="text-muted small">{selected.name} (selected)</span>
                        ) : href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="view-file-btn">View current</a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          {showStcwField && (
            <div className="form-group">
              <label>STCW regulation / note</label>
              <input
                type="text"
                name="stcw_regulation"
                className="form-control"
                value={form.stcw_regulation || ""}
                onChange={handleChange}
              />
            </div>
          )}
          {!showVisaFields && (
            <div className="form-group">
              <label>Upload document {editingDoc ? "(optional — leave empty to keep current file)" : ""}</label>
              <input
                type="file"
                className="form-control"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={(e) => setFile(pickDocumentFile(e))}
              />
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : editingDoc ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LicenseFormModal = ({
  show,
  onClose,
  candidateId,
  countries,
  ranks = [],
  editingDoc,
  onSubmitSuccess,
}) => {
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    const d = editingDoc;
    setForm({
      type: d?.type || "",
      capacity: d?.capacity || "",
      rank: d?.rank || "",
      document_number: d?.document_number || "",
      original_issue_date: toDateInputValue(d?.original_issue_date),
      expiry_date: toDateInputValue(d?.expiry_date),
      issue_revalidation_date: toDateInputValue(d?.issue_revalidation_date),
      issue_place: d?.issue_place && d.issue_place !== "-" ? d.issue_place : "",
      country_id: d?.country_id != null ? String(d.country_id) : "",
    });
    setFile(null);
  }, [show, editingDoc?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const expiryErr = requireCompleteDate(form.expiry_date, "Expiry date");
    if (expiryErr) {
      alert(expiryErr);
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      const entries = {
        type: form.type || "",
        capacity: form.capacity || "",
        rank: form.rank || "",
        document_number: form.document_number || "",
        original_issue_date: form.original_issue_date || "",
        expiry_date: form.expiry_date || "",
        issue_revalidation_date: form.issue_revalidation_date || "",
        issue_place: form.issue_place || "-",
        country_id: form.country_id || "",
      };
      Object.entries(entries).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("upload_file", file);
      const base = `/api/candidates/${candidateId}/licences`;
      if (editingDoc) await axios.put(`${base}/${editingDoc.id}`, fd);
      else await axios.post(base, fd);
      onSubmitSuccess();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  const typeKnown = LICENCE_TYPE_OPTIONS.some((o) => o.value === form.type);
  const capacityKnown = LICENCE_CAPACITY_OPTIONS.some((o) => o.value === form.capacity);
  const rankNames = (ranks || []).map((r) => String(r.name || "").trim()).filter(Boolean);
  const rankKnown = rankNames.includes(String(form.rank || "").trim());

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{editingDoc ? "Edit license" : "Add license"}</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type</label>
            <select name="type" className="form-control" value={form.type || ""} onChange={handleChange} required>
              <option value="">Select document type</option>
              {!typeKnown && form.type ? (
                <option value={form.type}>{String(form.type).replace(/_/g, " ")}</option>
              ) : null}
              {LICENCE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Capacity (COC grade)</label>
            <select name="capacity" className="form-control" value={form.capacity || ""} onChange={handleChange} required>
              <option value="">Select COC grade</option>
              {!capacityKnown && form.capacity ? (
                <option value={form.capacity}>{String(form.capacity).replace(/_/g, " ")}</option>
              ) : null}
              {LICENCE_CAPACITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Document number</label>
            <input type="text" name="document_number" className="form-control" value={form.document_number || ""} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Rank</label>
            <select name="rank" className="form-control" value={form.rank || ""} onChange={handleChange} required>
              <option value="">Select rank</option>
              {!rankKnown && form.rank ? (
                <option value={form.rank}>{form.rank}</option>
              ) : null}
              {(ranks || []).map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Country</label>
            <select name="country_id" className="form-control" value={form.country_id || ""} onChange={handleChange}>
              <option value="">Select</option>
              {(countries || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Place of issue</label>
            <input type="text" name="issue_place" className="form-control" value={form.issue_place || ""} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Original issue date</label>
            <input type="date" name="original_issue_date" className="form-control" value={form.original_issue_date || ""} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Issue revalidation date</label>
            <input type="date" name="issue_revalidation_date" className="form-control" value={form.issue_revalidation_date || ""} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Expiry date *</label>
            <input type="date" name="expiry_date" className="form-control" value={form.expiry_date || ""} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Upload scan {editingDoc ? "(optional)" : ""}</label>
            <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={(e) => setFile(pickDocumentFile(e))} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EducationFormModal = ({
  show,
  onClose,
  candidateId,
  editingDoc,
  onSubmitSuccess,
}) => {
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    const d = editingDoc;
    setForm({
      type: d?.type || "",
      name: d?.name || "",
      from_year: toDateInputValue(d?.from_year),
      to_year: toDateInputValue(d?.to_year),
      qualification_attained: d?.qualification_attained || "",
      address: d?.address || "",
      remark: d?.remark || "",
    });
    setFile(null);
  }, [show, editingDoc?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("type", form.type || "");
      fd.append("name", form.name || "");
      fd.append("from_year", form.from_year || "");
      fd.append("to_year", form.to_year || "");
      fd.append("qualification_attained", form.qualification_attained || "");
      fd.append("address", form.address || "");
      fd.append("remark", form.remark || "");
      if (file) fd.append("upload_file", file);
      const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const path = `${base}/api/candidates/${candidateId}/educations`;
      if (editingDoc) await axios.put(`${path}/${editingDoc.id}`, fd);
      else await axios.post(path, fd);
      onSubmitSuccess();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  const typeKnown = EDUCATION_TYPE_OPTIONS.some((o) => o.value === form.type);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{editingDoc ? "Edit education" : "Add education"}</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type</label>
            <select name="type" className="form-control" value={form.type || ""} onChange={handleChange} required>
              <option value="">Select education type</option>
              {!typeKnown && form.type ? (
                <option value={form.type}>{String(form.type).replace(/_/g, " ")}</option>
              ) : null}
              {EDUCATION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Name (institution)</label>
            <input name="name" className="form-control" value={form.name || ""} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>From</label>
            <input type="date" name="from_year" className="form-control" value={form.from_year || ""} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>To</label>
            <input type="date" name="to_year" className="form-control" value={form.to_year || ""} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Qualification attained</label>
            <input name="qualification_attained" className="form-control" value={form.qualification_attained || ""} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input name="address" className="form-control" value={form.address || ""} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Remark</label>
            <input name="remark" className="form-control" value={form.remark || ""} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Upload document (optional)</label>
            <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={(e) => setFile(pickDocumentFile(e))} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VerificationFormModal = ({
  show,
  onClose,
  candidateId,
  verificationDocTypes = [],
  editingDoc,
  onSubmitSuccess,
}) => {
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    const d = editingDoc;
    const verifiedVal = d?.verified === 1 || d?.verified === true || String(d?.verified) === "1" ? "1" : "0";
    setForm({
      document_id: d?.document_id != null ? String(d.document_id) : "",
      document_number: d?.document_number || "",
      verification_date: toDateInputValue(d?.verification_date),
      verification_mode: d?.verification_mode || "",
      verified: verifiedVal,
      remark: d?.remark || "",
    });
    setFile(null);
  }, [show, editingDoc?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.document_id) {
      alert("Please select a document type.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("document_id", form.document_id);
      fd.append("document_number", form.document_number || "");
      fd.append("verification_date", form.verification_date || "");
      fd.append("verification_mode", form.verification_mode || "");
      fd.append("verified", form.verified === "1" ? "1" : "0");
      fd.append("remark", form.remark || "");
      if (file) fd.append("file_upload", file);
      const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const path = `${base}/api/candidates/${candidateId}/document-verifications`;
      if (editingDoc) await axios.put(`${path}/${editingDoc.id}`, fd);
      else await axios.post(path, fd);
      onSubmitSuccess();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  const docIds = (verificationDocTypes || []).map((t) => String(t.id));
  const docKnown = docIds.includes(String(form.document_id || "").trim());
  const modeKnown = VERIFICATION_MODE_OPTIONS.some((o) => o.value === form.verification_mode);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{editingDoc ? "Edit document verification" : "Add document verification"}</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Document type</label>
            <select name="document_id" className="form-control" value={form.document_id || ""} onChange={handleChange} required>
              <option value="">Select document type</option>
              {!docKnown && form.document_id ? (
                <option value={form.document_id}>ID {form.document_id}</option>
              ) : null}
              {(verificationDocTypes || []).map((t) => (
                <option key={t.id} value={String(t.id)}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Document number</label>
            <input name="document_number" className="form-control" value={form.document_number || ""} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Verification date</label>
            <input type="date" name="verification_date" className="form-control" value={form.verification_date || ""} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Verification mode</label>
            <select name="verification_mode" className="form-control" value={form.verification_mode || ""} onChange={handleChange} required>
              <option value="">Select mode</option>
              {!modeKnown && form.verification_mode ? (
                <option value={form.verification_mode}>{String(form.verification_mode).replace(/_/g, " ")}</option>
              ) : null}
              {VERIFICATION_MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Verified</label>
            <select name="verified" className="form-control" value={form.verified || "0"} onChange={handleChange} required>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>
          <div className="form-group">
            <label>Remark</label>
            <input name="remark" className="form-control" value={form.remark || ""} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Upload file {editingDoc ? "(optional — leave empty to keep current)" : "(optional)"}</label>
            <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx" onChange={(e) => setFile(pickDocumentFile(e))} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DceValueCertificateModal = ({
  show,
  variant,
  candidateId,
  countries,
  documentTypes,
  editingDoc,
  onClose,
  onSubmitSuccess,
}) => {
  const cfg =
    variant === "value"
      ? { segment: "value-added-courses", fileKey: "file_upload", title: "Value added course" }
      : { segment: "dce-documents", fileKey: "file_path", title: "DCE document" };

  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    const d = editingDoc;
    setForm({
      document_type_id: d?.document_type_id != null || d?.document_id != null
        ? String(d.document_type_id ?? d.document_id)
        : "",
      country_id: d?.country_id != null ? String(d.country_id) : "",
      certificate_number: d?.certificate_number || "",
      place_of_issue: d?.place_of_issue || "",
      issue_date: toDateInputValue(d?.issue_date),
      expiry_date: toDateInputValue(d?.expiry_date),
    });
    setFile(null);
  }, [show, editingDoc?.id, variant]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.document_type_id) {
      alert("Select a document type.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("document_type_id", form.document_type_id);
      fd.append("country_id", form.country_id || "");
      fd.append("certificate_number", form.certificate_number || "");
      fd.append("place_of_issue", form.place_of_issue || "");
      fd.append("issue_date", form.issue_date || "");
      fd.append("expiry_date", form.expiry_date || "");
      if (file) fd.append(cfg.fileKey, file);
      const base = `/api/candidates/${candidateId}/${cfg.segment}`;
      if (editingDoc) await axios.put(`${base}/${editingDoc.id}`, fd);
      else await axios.post(base, fd);
      onSubmitSuccess();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{editingDoc ? `Edit ${cfg.title}` : `Add ${cfg.title}`}</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Document type</label>
            <select
              name="document_type_id"
              className="form-control"
              value={form.document_type_id || ""}
              onChange={handleChange}
              required
            >
              <option value="">Select</option>
              {(documentTypes || []).map((dt) => (
                <option key={dt.id} value={String(dt.id)}>{dt.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Country</label>
            <select name="country_id" className="form-control" value={form.country_id || ""} onChange={handleChange}>
              <option value="">Select</option>
              {(countries || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Certificate number</label>
            <input type="text" name="certificate_number" className="form-control" value={form.certificate_number || ""} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Place of issue</label>
            <input type="text" name="place_of_issue" className="form-control" value={form.place_of_issue || ""} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Issue date</label>
            <input type="date" name="issue_date" className="form-control" value={form.issue_date || ""} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Expiry date</label>
            <input type="date" name="expiry_date" className="form-control" value={form.expiry_date || ""} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>File {editingDoc ? "(optional)" : ""}</label>
            <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={(e) => setFile(pickDocumentFile(e))} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateDetails;
