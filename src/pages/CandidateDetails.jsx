import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import RecordAuditPopover from "../components/RecordAuditPopover";
import { licenceDocumentUrl } from "../lib/documentUrl";
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

function AuditCell({ record, children }) {
  return (
    <td className="doc-row-audit-cell">
      <span className="doc-row-audit-index">{children}</span>
      <RecordAuditPopover record={record} />
    </td>
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

function availabilityTone(status) {
  const s = String(status || "").toLowerCase();
  if (!s || s === "n/a") return "status-badge--neutral";
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
  const { user } = useAuth();

  // State for main tabs (Basic, Documents, Services, Proposal, Medicals, Flag state, Pre Joining, Sign On, Sign Off, Communication)
  const [activeMainTab, setActiveMainTab] = useState("basic_details");
  const [activeSeafarersTab, setActiveSeafarersTab] = useState("BasicDetail");

  // Form data states
  const [candidateData, setCandidateData] = useState({});
  const [formData, setFormData] = useState({});

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
  const exportMenuRef = useRef(null);
  const exportDropdownBtnRef = useRef(null);
  const exportDropdownMenuRef = useRef(null);
  /** Ranks & vessel types from `/api/candidates/search-options` (same masters as list search). */
  const [masterSearchOpts, setMasterSearchOpts] = useState({
    ranks: [],
    vesselTypes: [],
    availabilityStatus: [],
    preJoiningMedicalTypes: [],
    preMedicalDocumentTypes: [],
    preJoiningTravelDocumentTypes: [],
  });
  /** Multipart file for pre-joining medical doc add/edit (field name `file` on API). */
  const [medicalDocFile, setMedicalDocFile] = useState(null);
  /** Multipart file for pre-joining travel doc add/edit. */
  const [preJoiningTravelFile, setPreJoiningTravelFile] = useState(null);
  // Generic modal state for Services, Proposal, Medicals, FlagState, PreJoining tabs
  const [genericModal, setGenericModal] = useState({ open: false, type: "", editingId: null, form: {}, saving: false });
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
      services: { rank: "", vessel_name: "", flag: "", vessel_type: "", grt: "", dwt: "", bhp: "", engine_type: "", sign_on_date: "", sign_off_date: "", period: "", reason_of_sign_off: "", owner_company: "" },
      proposal: { rank: "", vessel_name: "", contract_duration: "", tentative_joining_schedule: "", wages: "", proposal_status: "", proposal_date: "", approval_date: "", tentative_travel_date: "" },
      medicals: { medical_id: "", certificate_number: "", country_id: "", issue_date: "", expiry_date: "" },
      flagstate: { flag_doc_country: "", flag_doc_name: "", flag_doc_grade: "", issue_date: "", expiry_date: "" },
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
      } else {
        await axios[method](url, form);
      }

      closeGenericModal();
      fetchCandidateData();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
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

  // Fetch candidate data on mount
  useEffect(() => {
    fetchCandidateData();
  }, [id]);

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

  const fetchCandidateData = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/candidates/${id}`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error("Failed to fetch candidate");
      const data = await res.json();
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
      setFlagStateCrewDocuments(rawFlagState);

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
        gender: c.gender || "",
        religion: c.religion || "",
        marital_status: c.marital_status || "",
        domestic_airport: c.domestic_airport || "",
        international_airport: c.international_airport || "",
        province: c.province || "",
        raw: c,
      });

      const normalized = normalize(candidate);
      setCandidateData(normalized);
      setFormData(candidate);
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

        return {
          ...doc,
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

    } catch (error) {
      console.error("Error fetching candidate data:", error);
    }
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
      if (fileInput?.files?.length) fd.append("file_path", fileInput.files[0]);

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

      const isEdit = postSignOnRecordEditingId != null;
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
    setPostSignOffRecordEditingId(null);
    setPostSignOffRecordForm({
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
    setShowPostSignOffRecordModal(true);
  };

  const openEditPostSignOffRecordModal = (row) => {
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
    const file = files?.[0];
    if (!file || !name) return;
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

      await axios.put(`${apiBase}/api/candidates/${id}`, payload);
      alert("Candidate updated successfully");
      fetchCandidateData();
    } catch (error) {
      setErrors(error.response?.data?.errors || []);
    }
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

  // Match `SignOnSignOffReport.jsx` status logic:
  // If today is within [sign_on_date, sign_off_due] => On-board, else On-Leave.
  // Also account for separate sign-off records: if sign-off date is already passed => On-Leave.
  const getStatusFromSignOnDocs = () => {
    const toEpochMillis = (val) => {
      if (val === null || val === undefined || val === "") return null;
      if (typeof val === "number") {
        // Most of our "epoch seconds" columns come as seconds
        return val < 1e12 ? val * 1000 : val;
      }
      const s = String(val).trim();
      if (!s) return null;
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const d = new Date(`${s}T00:00:00.000Z`);
        const ms = d.getTime();
        return Number.isNaN(ms) ? null : ms;
      }
      if (/^\d+(\.\d+)?$/.test(s)) {
        const n = Number(s);
        return Number.isNaN(n) ? null : (n < 1e12 ? n * 1000 : n);
      }
      const ms = new Date(val).getTime();
      return Number.isNaN(ms) ? null : ms;
    };

    const startOfDay = (ms) => {
      const d = new Date(ms);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };

    const signOnDocs = Array.isArray(postSignOnDocs) ? postSignOnDocs : [];
    const signOffDocs = Array.isArray(postSignOffDocs) ? postSignOffDocs : [];
    if (!signOnDocs.length && !signOffDocs.length) return null;

    const todayStart = startOfDay(Date.now());

    // If any sign-off date is already before today => On-Leave.
    const hasPassedSignOff = signOffDocs.some((d) => {
      const signOffMillis = toEpochMillis(d?.sign_off_date ?? d?.sign_off_due);
      if (!signOffMillis) return false;
      const signOffDay = startOfDay(signOffMillis);
      return todayStart > signOffDay;
    });
    if (hasPassedSignOff) return "On-Leave";

    // Otherwise decide using sign-on period.
    const isOnBoard = signOnDocs.some((d) => {
      const signOnMillis = toEpochMillis(d?.sign_on_date);
      const signOffDueMillis = toEpochMillis(d?.sign_off_due);
      if (!signOnMillis || !signOffDueMillis) return false;
      const signOnDay = startOfDay(signOnMillis);
      const signOffDueDay = startOfDay(signOffDueMillis);
      return todayStart >= signOnDay && todayStart <= signOffDueDay;
    });
    if (isOnBoard) return "On-board with us";

    // If we only have sign-off records (no sign-on docs), treat as On-board until sign-off day.
    const hasFutureSignOff = signOffDocs.some((d) => {
      const signOffMillis = toEpochMillis(d?.sign_off_date ?? d?.sign_off_due);
      if (!signOffMillis) return false;
      const signOffDay = startOfDay(signOffMillis);
      return todayStart <= signOffDay;
    });
    return hasFutureSignOff ? "On-board with us" : "On-Leave";
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
      {/* Back to list */}
      <button
        type="button"
        onClick={() => navigate("/admin/candidates")}
        className="back-to-list-btn"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Candidates
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
              <span className="summary-label">Status</span>
              <span className="summary-value">
                {(() => {
                  const label = resolveAvailabilityStatusLabel(
                    candidateData.raw,
                    masterSearchOpts.availabilityStatus,
                  );
                  if (label) {
                    return (
                      <span className={`status-badge-pill status-badge-pill--prominent ${availabilityTone(label)}`}>
                        ● {label}
                      </span>
                    );
                  }
                  const recordStatus = getStatusFromSignOnDocs();
                  if (recordStatus) {
                    return (
                      <span className={`status-badge-pill status-badge-pill--prominent ${availabilityTone(recordStatus)}`}>
                        ● {recordStatus}
                      </span>
                    );
                  }
                  return <span className="status-badge-pill status-badge-pill--prominent status-badge--neutral">● N/A</span>;
                })()}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Date of Birth</span>
              <span className="summary-value">
                {candidateData.dob
                  ? new Date(candidateData.dob).toLocaleDateString()
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
                {candidateData.license || "N/A"}
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
              Services
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
              countries={countries}
              masterSearchOpts={masterSearchOpts}
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
              onEdit={(doc) => openSeafarersModal({ editingDoc: doc })}
            />
          )}

          {/* Visa Section */}
          {activeSeafarersTab === "Visa" && (
            <VisaSection
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

      {/* Services - Record of sea services */}
      {activeMainTab === "record_of_sea_services" && (
        <div className="tab-content">
          <div className="tab-content-section">
            <div className="section-header-row">
              <h6 className="tab-section-title">Record of sea services</h6>
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
                      <th>Engine Type</th>
                      <th>Sign on Date</th>
                      <th>Sign off Date</th>
                      <th>Period</th>
                      <th>Reason of Sign off</th>
                      <th>Owner/Company</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seaServicesPage.rows.map((row) => (
                      <tr key={row.id}>
                        <AuditCell record={row}>{row.rank_name ?? row.rank ?? "-"}</AuditCell>
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
                          <div className="action-icons-toolbar">
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openGenericModal("services", row)}><i className="fas fa-pen" /></button>
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleGenericDelete("services", row.id)}><i className="fas fa-trash" /></button>
                          </div>
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
                      <th>Tentative Joining Schedule</th>
                      <th>Wages</th>
                      <th>Proposal Status</th>
                      <th>Proposal Date</th>
                      <th>Approval Date</th>
                      <th>Rejection / Cancellation</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planingsPage.rows.map((row) => (
                      <tr key={row.id}>
                        <AuditCell record={row}>{row.rank_name ?? row.rank ?? "-"}</AuditCell>
                        <td>{row.vessel_name ?? "-"}</td>
                        <td>{row.contract_duration ?? "-"}</td>
                        <td>{row.tentative_joining_schedule ? formatServiceDate(row.tentative_joining_schedule) : "-"}</td>
                        <td title={row.wages}>{row.wages ?? "-"}</td>
                        <td>{row.proposal_status ? String(row.proposal_status).replace(/_/g, " ") : "-"}</td>
                        <td>{row.proposal_date ? formatServiceDate(row.proposal_date) : "-"}</td>
                        <td>{row.approval_date ? formatServiceDate(row.approval_date) : "-"}</td>
                        <td>{row.tentative_travel_date ? formatServiceDate(row.tentative_travel_date) : "-"}</td>
                        <td>
                          <div className="action-icons-toolbar">
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openGenericModal("proposal", row)}><i className="fas fa-pen" /></button>
                            {row.upload_file && (
                              <a
                                href={String(row.upload_file).startsWith("http") ? row.upload_file : `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${id}/${String(row.upload_file).replace(/^\/+/, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-icon-btn action-icon-view"
                                title="View"
                              ><i className="fas fa-eye" /></a>
                            )}
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleGenericDelete("proposal", row.id)}><i className="fas fa-trash" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                        <AuditCell record={row}>
                          {(masterSearchOpts.preMedicalDocumentTypes || masterSearchOpts.preJoiningMedicalTypes || [])
                            .find((m) => String(m.id) === String(row.medical_id))?.name
                            ?? (documentTypes || []).find((dt) => String(dt.id) === String(row.medical_id))?.name
                            ?? row.document_name
                            ?? (row.medical_id != null && row.medical_id !== "" ? `#${row.medical_id}` : "-")}
                        </AuditCell>
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
                        <td>
                          <div className="action-icons-toolbar">
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openGenericModal("medicals", row)}><i className="fas fa-pen" /></button>
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleGenericDelete("medicals", row.id)}><i className="fas fa-trash" /></button>
                          </div>
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
                      <th>Flag Doc Country</th>
                      <th>Flag Doc Name</th>
                      <th>Flag Doc Grade</th>
                      <th>Issue Date</th>
                      <th>Expiry Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flagStatePage.rows.map((row) => (
                      <tr key={row.id}>
                        <AuditCell record={row}>{row.flag_doc_country ?? "-"}</AuditCell>
                        <td>{row.flag_doc_name ?? "-"}</td>
                        <td>{row.flag_doc_grade ?? "-"}</td>
                        <td>{row.issue_date ? formatServiceDate(row.issue_date) : "-"}</td>
                        <td>{row.expiry_date ? formatServiceDate(row.expiry_date) : "-"}</td>
                        <td>
                          <div className="action-icons-toolbar">
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openGenericModal("flagstate", row)}><i className="fas fa-pen" /></button>
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleGenericDelete("flagstate", row.id)}><i className="fas fa-trash" /></button>
                          </div>
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
                <p className="text-muted small">Add records via backend or when Add New is available.</p>
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
                        <AuditCell record={row}>
                          {(masterSearchOpts.preJoiningTravelDocumentTypes || [])
                            .find((t) => String(t.id) === String(row.document_id))?.name
                            ?? row.document_name
                            ?? (row.document_id != null && row.document_id !== "" ? `#${row.document_id}` : "-")}
                        </AuditCell>
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
                        <td>
                          <div className="action-icons-toolbar">
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openGenericModal("prejoining", row)}><i className="fas fa-pen" /></button>
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleGenericDelete("prejoining", row.id)}><i className="fas fa-trash" /></button>
                          </div>
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
                        <AuditCell record={row}>{row.vessel_name ?? "-"}</AuditCell>
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
                        <td>
                          <div className="action-icons-toolbar">
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openEditPostSignOnRecordModal(row)}><i className="fas fa-pen" /></button>
                            <button type="button" className="action-icon-btn action-icon-docs" title="Documents" onClick={() => openSignOnDocModal(row.id)}><i className="fas fa-file-alt" /></button>
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleDeletePostSignOnRecord(row.id)}><i className="fas fa-trash" /></button>
                          </div>
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
                        <AuditCell record={row}>{row.vessel_name ?? "-"}</AuditCell>
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
                        <td>
                          <div className="action-icons-toolbar">
                            <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => openEditPostSignOffRecordModal(row)}><i className="fas fa-pen" /></button>
                            <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleDeletePostSignOffRecord(row.id)}><i className="fas fa-trash" /></button>
                          </div>
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
          <div className="tab-content-section">
            <h6 className="tab-section-title">Candidate Remarks / Communication</h6>
            <div style={{ maxWidth: 700 }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 6, display: "block" }}>Follow-up Date</label>
                <input
                  type="date"
                  className="form-control"
                  style={{ maxWidth: 260 }}
                  value={formatDateForInput(formData.followup_date)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, followup_date: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 6, display: "block" }}>Remark</label>
                <textarea
                  className="form-control"
                  rows={6}
                  value={formData.remark ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                  style={{ resize: "vertical", minHeight: 120, fontSize: 14 }}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      const apiBase = import.meta.env.VITE_API_URL || "";
                      const payload = { remark: formData.remark ?? "", followup_date: formData.followup_date ?? "" };
                      await axios.put(`${apiBase}/api/candidates/${id}`, payload);
                      alert("Remark saved successfully");
                      fetchCandidateData();
                    } catch (e) { alert(e?.response?.data?.error || e.message); }
                  }}
                >
                  Save Remark
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
                { services: "Sea Service Record", proposal: "Proposal", medicals: "Pre-joining Medical", flagstate: "Flag State Document", prejoining: "Pre-joining Travel Document" }[genericModal.type]
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
                <div className="form-group"><label>Engine Type</label><input type="text" className="form-control" value={genericModal.form.engine_type} onChange={(e) => handleGenericFormChange("engine_type", e.target.value)} /></div>
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
                  <select
                    className="form-control"
                    value={genericModal.form.owner_company}
                    onChange={(e) => handleGenericFormChange("owner_company", e.target.value)}
                  >
                    <option value="">Select owner / company</option>
                    {genericModal.form.owner_company &&
                      !ownersList.some(
                        (o) => String(o.principle_name ?? o.owner_name ?? "").trim() === String(genericModal.form.owner_company).trim(),
                      ) && (
                        <option value={genericModal.form.owner_company}>
                          {genericModal.form.owner_company} (current)
                        </option>
                      )}
                    {Array.from(
                      new Set(
                        ownersList
                          .map((o) => String(o.principle_name ?? o.owner_name ?? "").trim())
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
                <div className="form-group"><label>Tentative Joining Schedule</label><input type="date" className="form-control" value={genericModal.form.tentative_joining_schedule} onChange={(e) => handleGenericFormChange("tentative_joining_schedule", e.target.value)} /></div>
                <div className="form-group"><label>Wages</label><input type="text" className="form-control" value={genericModal.form.wages} onChange={(e) => handleGenericFormChange("wages", e.target.value)} /></div>
                <div className="form-group"><label>Proposal Status</label>
                  <select className="form-control" value={genericModal.form.proposal_status} onChange={(e) => handleGenericFormChange("proposal_status", e.target.value)}>
                    <option value="">Select status</option>
                    <option value="propose_to_client">Propose to client</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="proposal_cancel">Proposal cancel</option>
                    <option value="awaiting_reply client">Awaiting reply client</option>
                  </select>
                </div>
                <div className="form-group"><label>Proposal Date</label><input type="date" className="form-control" value={genericModal.form.proposal_date} onChange={(e) => handleGenericFormChange("proposal_date", e.target.value)} /></div>
                <div className="form-group"><label>Approval Date</label><input type="date" className="form-control" value={genericModal.form.approval_date} onChange={(e) => handleGenericFormChange("approval_date", e.target.value)} /></div>
                <div className="form-group"><label>Tentative Travel Date</label><input type="date" className="form-control" value={genericModal.form.tentative_travel_date} onChange={(e) => handleGenericFormChange("tentative_travel_date", e.target.value)} /></div>
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
                    onChange={(e) => setMedicalDocFile(e.target.files?.[0] || null)}
                  />
                </div>
              </>)}

              {genericModal.type === "flagstate" && (<>
                <div className="form-group"><label>Flag Doc Country</label><input type="text" className="form-control" value={genericModal.form.flag_doc_country} onChange={(e) => handleGenericFormChange("flag_doc_country", e.target.value)} /></div>
                <div className="form-group"><label>Flag Doc Name</label><input type="text" className="form-control" value={genericModal.form.flag_doc_name} onChange={(e) => handleGenericFormChange("flag_doc_name", e.target.value)} /></div>
                <div className="form-group"><label>Flag Doc Grade</label><input type="text" className="form-control" value={genericModal.form.flag_doc_grade} onChange={(e) => handleGenericFormChange("flag_doc_grade", e.target.value)} /></div>
                <div className="form-group"><label>Issue Date</label><input type="date" className="form-control" value={genericModal.form.issue_date} onChange={(e) => handleGenericFormChange("issue_date", e.target.value)} /></div>
                <div className="form-group"><label>Expiry Date</label><input type="date" className="form-control" value={genericModal.form.expiry_date} onChange={(e) => handleGenericFormChange("expiry_date", e.target.value)} /></div>
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
                    onChange={(e) => setPreJoiningTravelFile(e.target.files?.[0] || null)}
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
        onSubmitSuccess={fetchCandidateData}
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
          fetchCandidateData();
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
                        <tr><td colSpan={3} className="text-muted">No documents yet. Add one below.</td></tr>
                      ) : (
                        signOnDocList.map((d) => (
                          <tr key={d.id}>
                            <td>{d.document_name ?? d.document_id ?? "-"}</td>
                            <td>
                              {d.view_url ? (
                                <a href={d.view_url} target="_blank" rel="noopener noreferrer">View</a>
                              ) : "-"}
                            </td>
                            <td>
                              <div className="action-icons-toolbar">
                                <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => handleEditSignOnDocument(d)}><i className="fas fa-pen" /></button>
                                <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => handleDeleteSignOnDocument(d.id)}><i className="fas fa-trash" /></button>
                              </div>
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
          fetchCandidateData();
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
          fetchCandidateData();
        }}
      />

      <EducationFormModal
        show={educationModal.open}
        onClose={() => setEducationModal({ open: false, editingDoc: null })}
        candidateId={id}
        editingDoc={educationModal.editingDoc}
        onSubmitSuccess={() => {
          setEducationModal({ open: false, editingDoc: null });
          fetchCandidateData();
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
          fetchCandidateData();
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
          fetchCandidateData();
        }}
      />
    </div>
  );
};

/** API dates may be epoch seconds, epoch ms (from normalizeDoc), or YYYY-MM-DD. */
const toDateInputValue = (val) => {
  if (val == null || val === "" || val === 0 || val === "0") return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  if (typeof val === "string" && /^\d+$/.test(val.trim())) {
    const n = Number(val.trim());
    if (n <= 0) return "";
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }
  if (typeof val === "number") {
    if (val <= 0) return "";
    const ms = val < 1e12 ? val * 1000 : val;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

// Personal Info form – aligned with candidate_edit.blade.php BasicDetail and API response
const BasicDetailsForm = ({
  formData,
  candidateData,
  handleInputChange,
  handleSubmit,
  handleFileChange,
  countries,
  masterSearchOpts = { ranks: [], vesselTypes: [], availabilityStatus: [] },
}) => {
  return (
    <form onSubmit={handleSubmit} className="basic-details-form personal-info-form">
      <div className="personal-info-header">
        <div>
          <div className="personal-info-header-title">Personal Information</div>
          <div className="personal-info-header-subtitle">Basic details, passport and CDC</div>
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
            />
          </div>
          <div className="form-group">
            <label>RANK</label>
            <select
              name="rank_id"
              className="form-control"
              value={formData.rank_id ?? ""}
              onChange={handleInputChange}
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
            >
              <option value="">Select vessel type</option>
              {(masterSearchOpts.vesselTypes || []).map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>DATE OF BIRTH</label>
            <input
              type="date"
              name="date_of_birth"
              className="form-control"
              value={toDateInputValue(formData.date_of_birth)}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>PLACE OF BIRTH</label>
            <input
              type="text"
              name="place_of_birth"
              className="form-control"
              value={formData.place_of_birth || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>NATIONALITY</label>
            <select
              name="nationality_id"
              className="form-control"
              value={formData.nationality_id ?? ""}
              onChange={handleInputChange}
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
            <select name="religion" className="form-control" value={formData.religion || ""} onChange={handleInputChange}>
              <option value="">Select</option>
              <option value="hindu">HINDU</option>
              <option value="muslim">MUSLIM</option>
              <option value="christian">CHRISTIAN</option>
            </select>
          </div>
          <div className="form-group">
            <label>GENDER</label>
            <select name="gender" className="form-control" value={formData.gender || ""} onChange={handleInputChange}>
              <option value="">Select</option>
              <option value="male">MALE</option>
              <option value="female">FEMALE</option>
              <option value="other">OTHER</option>
            </select>
          </div>
          <div className="form-group">
            <label>MARITAL STATUS</label>
            <select name="marital_status" className="form-control" value={formData.marital_status || ""} onChange={handleInputChange}>
              <option value="">Select</option>
              <option value="married">MARRIED</option>
              <option value="single">SINGLE</option>
            </select>
          </div>
          <div className="form-group">
            <label>LICENSE AUTHORITY</label>
            <select name="license" className="form-control" value={formData.license ?? ""} onChange={handleInputChange}>
              <option value="">Select</option>
              {(countries || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>PASSPORT NUMBER</label>
            <input type="text" name="passport_number" className="form-control" value={formData.passport_number || ""} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>PASSPORT ISSUE</label>
            <input type="date" name="passport_issue_date" className="form-control" value={toDateInputValue(formData.passport_issue_date)} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>PASSPORT EXPIRY *</label>
            <input type="date" name="passport_expiry_date" className="form-control" value={toDateInputValue(formData.passport_expiry_date)} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>CDC NUMBER</label>
            <input type="text" name="cdc_number" className="form-control" value={formData.cdc_number || ""} onChange={handleInputChange} required />
          </div>
        </div>

        <div className="form-row personal-info-row">
          <div className="form-group">
            <label>CDC ISSUE DATE</label>
            <input type="date" name="cdc_issue_date" className="form-control" value={toDateInputValue(formData.cdc_issue_date)} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>CDC EXPIRY DATE *</label>
            <input type="date" name="cdc_expiry_date" className="form-control" value={toDateInputValue(formData.cdc_expiry_date)} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>INDOS NUMBER</label>
            <input type="text" name="indos_number" className="form-control" value={formData.indos_number || ""} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>STATUS</label>
            <input
              type="hidden"
              name="availability_status_id"
              value={formData.availability_status_id ?? ""}
            />
            <input
              type="text"
              readOnly
              className="form-control"
              value={(() => {
                const label = resolveAvailabilityStatusLabel(
                  formData,
                  masterSearchOpts.availabilityStatus,
                );
                if (label) return label;
                const availabilityId = formData.availability_status_id;
                if (availabilityId === null || availabilityId === undefined || availabilityId === "") return "N/A";
                return `Status ${availabilityId}`;
              })()}
            />
          </div>
          <div className="form-group">
            <label>AVAILABILITY DATE</label>
            <input type="date" name="availability_date" className="form-control" value={toDateInputValue(formData.availability_date)} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>ARAMCO CHARTER</label>
            <select name="aramco_charter" className="form-control" value={formData.aramco_charter || ""} onChange={handleInputChange} required>
              <option value="">Select</option>
              <option value="yes">YES</option>
              <option value="no">NO</option>
            </select>
          </div>
          <div className="form-group">
            <label>FOLLOW-UP DATE</label>
            <input type="date" name="followup_date" className="form-control" value={toDateInputValue(formData.followup_date)} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>EMAIL</label>
            <input type="email" name="email_id" className="form-control" value={formData.email_id || ""} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>CONTACT NO. 1</label>
            <input type="text" name="contact_no_1" className="form-control" value={formData.contact_no_1 || ""} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>CONTACT NO. 2</label>
            <input type="text" name="contact_no_2" className="form-control" value={formData.contact_no_2 || ""} onChange={handleInputChange} />
          </div>
          <div className="form-group form-group-file">
            <label>PHOTO</label>
            <div className="personal-info-file-cell">
              <input type="file" name="photo_upload" className="form-control" accept="image/*" onChange={handleFileChange} />
              {formData.photo_upload && candidateData?.photo && (
                <a href={candidateData.photo} target="_blank" rel="noopener noreferrer" className="view-file-btn" title="View photo">View</a>
              )}
            </div>
          </div>
          <div className="form-group form-group-file">
            <label>CV</label>
            <div className="personal-info-file-cell">
              <input type="file" name="cv_upload" className="form-control" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
              {formData.cv_upload_path && candidateData?.cv && (
                <a href={candidateData.cv} target="_blank" rel="noopener noreferrer" className="view-file-btn" title="View CV">View</a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Update Candidate</button>
      </div>
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
                  <AuditCell record={nok}>{(nok.name || "").toString().toUpperCase()}</AuditCell>
                  <td>{nok.nomineeRelationship?.relationship ?? nok.relationship ?? "-"}</td>
                  <td>{(nok.gender || "").toString().toUpperCase()}</td>
                  <td>{(nok.nok || "").toString().toUpperCase()}</td>
                  <td>{(nok.beneficiary || "").toString().toUpperCase()}</td>
                  <td>{nok.emergency_contact ?? "-"}</td>
                  <td>{nok.contact_number ?? nok.contact ?? "-"}</td>
                  <td>{formatDate(nok.dob)}</td>
                  <td>{(nok.remark || "").toString().toUpperCase()}</td>
                  <td>{nok.file_path ? <a href={nok.file_path} target="_blank" rel="noopener noreferrer">View</a> : "-"}</td>
                  <td>
                    <div className="action-icons-toolbar">
                      <button type="button" className="action-icon-btn action-icon-edit" title="Edit" onClick={() => onEdit && onEdit(nok)}><i className="fas fa-pen" /></button>
                      <button type="button" className="action-icon-btn action-icon-delete" title="Delete" onClick={() => { /* delete */ }}><i className="fas fa-trash" /></button>
                    </div>
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

/** Compact icon toolbar for document tables — tooltips + aria-labels for clarity */
function DocumentRowActions({
  previewOpen,
  hasFile,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
}) {
  return (
    <div className="doc-actions-toolbar" role="toolbar" aria-label="Document actions">
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
                      <td className="doc-row-audit-cell">
                        <span className="doc-row-audit-index">{idx + 1}</span>
                        <RecordAuditPopover record={doc} />
                      </td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td>{doc.country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td><DocFileCell url={doc.file_path} /></td>
                      <td className="doc-list-actions-cell">
                        <DocumentRowActions
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
                      <td className="doc-row-audit-cell">
                        <span className="doc-row-audit-index">{idx + 1}</span>
                        <RecordAuditPopover record={doc} />
                      </td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td>{doc.country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td><DocFileCell url={doc.file_path} /></td>
                      <td className="doc-list-actions-cell">
                        <DocumentRowActions
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
                      <td className="doc-row-audit-cell">
                        <span className="doc-row-audit-index">{idx + 1}</span>
                        <RecordAuditPopover record={license} />
                      </td>
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
                      <td className="doc-list-actions-cell">
                        {license.upload_file ? (
                          <>
                            <a href={license.upload_file} target="_blank" rel="noopener noreferrer">View</a>
                            {" | "}
                          </>
                        ) : null}
                        <DocumentRowActions
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
                      <td className="doc-row-audit-cell">
                        <span className="doc-row-audit-index">{idx + 1}</span>
                        <RecordAuditPopover record={doc} />
                      </td>
                      <td>{doc.country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.document_name?.toUpperCase() || "-"}</td>
                      <td>{doc.stcw_regulation?.toUpperCase() || "-"}</td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td><DocFileCell url={doc.file_path} /></td>
                      <td className="doc-list-actions-cell">
                        <DocumentRowActions
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
                      <td className="doc-row-audit-cell">
                        <span className="doc-row-audit-index">{idx + 1}</span>
                        <RecordAuditPopover record={doc} />
                      </td>
                      <td>{doc.country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.document_name?.toUpperCase() || "-"}</td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td><DocFileCell url={fileUrl(doc)} /></td>
                      <td className="doc-list-actions-cell">
                        <DocumentRowActions
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
                      <td className="doc-row-audit-cell">
                        <span className="doc-row-audit-index">{idx + 1}</span>
                        <RecordAuditPopover record={doc} />
                      </td>
                      <td>{doc.country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.document_name?.toUpperCase() || "-"}</td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td><DocFileCell url={fileUrl(doc)} /></td>
                      <td className="doc-list-actions-cell">
                        <DocumentRowActions
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

const VisaSection = ({ seafarersDocs, onAddNew, onDelete, onEdit }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const visaDocs = seafarersDocs.filter(
    (doc) => doc.document_name === "VISA Copy",
  );

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(doc.file_path, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Visa_${doc.certificate_number || "document"}.pdf`,
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
                  <th>Expiry Date</th>
                  <th>Remark</th>
                  <th>Document File</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visaDocs.map((doc, idx) => {
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
                      <td className="doc-row-audit-cell">
                        <span className="doc-row-audit-index">{idx + 1}</span>
                        <RecordAuditPopover record={doc} />
                      </td>
                      <td>{doc.visa_country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.visa_issue_country_name?.toUpperCase() || "-"}</td>
                      <td>{doc.place_of_issue?.toUpperCase() || "-"}</td>
                      <td>{doc.visa_category || "-"}</td>
                      <td>{labelForVisaEntryType(doc.visa_entry_type).toUpperCase()}</td>
                      <td>{doc.certificate_number || "-"}</td>
                      <td>{formatDocDate(doc.issue_date)}</td>
                      <td>{formatDocDate(doc.visa_arrive_date)}</td>
                      <td>{doc.border_number || "-"}</td>
                      <td>{formatDocDate(doc.expiry_date)}</td>
                      <td title={doc.remark || ""}>{doc.remark ? String(doc.remark).slice(0, 12) : "-"}</td>
                      <td><DocFileCell url={doc.file_path} /></td>
                      <td className="doc-list-actions-cell">
                        <DocumentRowActions
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
          <p>No visa documents available</p>
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
                      <td className="doc-row-audit-cell">
                        <span className="doc-row-audit-index">{idx + 1}</span>
                        <RecordAuditPopover record={edDoc} />
                      </td>
                      <td>{edDoc.type?.replace(/_/g, " ").toUpperCase() || "-"}</td>
                      <td>{edDoc.name?.toUpperCase() || "-"}</td>
                      <td>{formatDocDate(edDoc.from_year)}</td>
                      <td>{formatDocDate(edDoc.to_year)}</td>
                      <td>{edDoc.qualification_attained?.toUpperCase() || "-"}</td>
                      <td>{edDoc.address?.toUpperCase() || "-"}</td>
                      <td title={edDoc.remark || ""}>{edDoc.remark?.toUpperCase() || "-"}</td>
                      <td className="doc-list-actions-cell">
                        {edDoc.upload_file ? (
                          <>
                            <a href={edDoc.upload_file} target="_blank" rel="noopener noreferrer">View</a>
                            {" | "}
                          </>
                        ) : null}
                        <DocumentRowActions
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
                      <td className="doc-row-audit-cell">
                        <span className="doc-row-audit-index">{idx + 1}</span>
                        <RecordAuditPopover record={edDoc} />
                      </td>
                      <td>{(edDoc.document_type_name || edDoc.document_id || "-").toString().toUpperCase()}</td>
                      <td>{edDoc.document_number || "-"}</td>
                      <td>{formatDocDate(edDoc.verification_date)}</td>
                      <td>{edDoc.verification_mode ? String(edDoc.verification_mode).replace(/_/g, " ").toUpperCase() : "-"}</td>
                      <td>{edDoc.verified === 1 || edDoc.verified === true ? "Yes" : edDoc.verified === 0 || edDoc.verified === false ? "No" : "-"}</td>
                      <td title={edDoc.remark || ""}>{edDoc.remark ? String(edDoc.remark).slice(0, 12) : "-"}</td>
                      <td className="doc-list-actions-cell">
                        {edDoc.file_upload ? (
                          <>
                            <a href={edDoc.file_upload} target="_blank" rel="noopener noreferrer">View</a>
                            {" | "}
                          </>
                        ) : null}
                        <DocumentRowActions
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
      await onSubmitSuccess?.();
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
      await onSubmitSuccess?.();
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
              <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
      certificate_number: d?.certificate_number || "",
      place_of_issue: d?.place_of_issue || "",
      issue_date: toDateInputValue(d?.issue_date),
      expiry_date: toDateInputValue(d?.expiry_date),
      stcw_regulation: d?.stcw_regulation || "",
      visa_category: d?.visa_category || "",
      visa_entry_type: normalizeVisaEntryTypeForSelect(d?.visa_entry_type),
      visa_arrive_date: toDateInputValue(d?.visa_arrive_date),
    });
    setFile(null);
  }, [show, editingDoc?.id, fixedType, pickType, documentTypes]);

  const stcwTypeChoices = (documentTypes || []).filter(
    (dt) => !MAIN_SEAFARER_DOC_NAMES.includes(dt.name),
  );

  const resolvedDocumentTypeId = () => {
    if (editingDoc?.document_type_id != null) return String(editingDoc.document_type_id);
    if (pickType) return pickedTypeId;
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
    if (!form.country_id) {
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
      fd.append("country_id", form.country_id);
      fd.append("certificate_number", form.certificate_number || "");
      fd.append("place_of_issue", form.place_of_issue || "");
      fd.append("issue_date", String(form.issue_date).trim());
      fd.append("expiry_date", form.expiry_date ? String(form.expiry_date).trim() : "");
      if (showVisaFields) {
        fd.append("visa_category", form.visa_category || "");
        fd.append("visa_entry_type", form.visa_entry_type || "");
        fd.append("visa_arrive_date", form.visa_arrive_date || "");
      }
      if (showStcwField) {
        fd.append("stcw_regulation", form.stcw_regulation || "");
      }
      if (file) fd.append("file_path", file);
      const path = editingDoc
        ? `/api/candidates/${candidateId}/seafarers-documents/${editingDoc.id}`
        : `/api/candidates/${candidateId}/seafarers-documents`;
      if (editingDoc) await axios.put(path, fd);
      else await axios.post(path, fd);
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
          <div className="form-group">
            <label>Certificate / document number</label>
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
                <label>Visa type</label>
                <select
                  name="visa_entry_type"
                  className="form-control"
                  value={form.visa_entry_type || ""}
                  onChange={handleChange}
                  required
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
              <div className="form-group">
                <label>Arrival date</label>
                <input
                  type="date"
                  name="visa_arrive_date"
                  className="form-control"
                  value={form.visa_arrive_date || ""}
                  onChange={handleChange}
                />
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
          <div className="form-group">
            <label>Upload document {editingDoc ? "(optional — leave empty to keep current file)" : ""}</label>
            <input
              type="file"
              className="form-control"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
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
            <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
            <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
            <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
            <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
