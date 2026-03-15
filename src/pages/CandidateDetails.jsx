import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./CandidateDetails.css";

const CandidateDetails = () => {
  const { id } = useParams();

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
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [showCdcModal, setShowCdcModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  // Data lists
  const [seafarersDocs, setSeafarersDocs] = useState([]);
  const [dceDocs, setDceDocs] = useState([]);
  const [valueCourses, setValueCourses] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [nokDocs, setNokDocs] = useState([]);
  const [educationalDocuments, setEducationalDocuments] = useState([]);
  const [verificationDocuments, setverificationDocuments] = useState([]);
  const [recordOfSeaServices, setRecordOfSeaServices] = useState([]);
  const [planings, setPlanings] = useState([]);
  const [preJoiningMedicals, setPreJoiningMedicals] = useState([]);
  const [preJoiningTravelDocs, setPreJoiningTravelDocs] = useState([]);
  const [postSignOnDocs, setPostSignOnDocs] = useState([]);
  const [signOnDocumentTypes, setSignOnDocumentTypes] = useState([]);
  const [showSignOnDocModal, setShowSignOnDocModal] = useState(false);
  const [signOnDocSignonId, setSignOnDocSignonId] = useState(null);
  const [signOnDocList, setSignOnDocList] = useState([]);
  const [signOnDocUploading, setSignOnDocUploading] = useState(false);
  const [flagStateCrewDocuments, setFlagStateCrewDocuments] = useState([]);
  const [countries, setCountries] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [errors, setErrors] = useState([]);

  // Fetch candidate data on mount
  useEffect(() => {
    fetchCandidateData();
  }, [id]);

  const fetchCandidateData = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/candidates/${id}`,
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
          const path = doc.file_path || "";
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
          const path = doc.file_path || doc.file_upload || "";
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
          const path = doc.file_path || doc.file_upload || "";
          const pathWithoutPublic = path.replace(/^public\/?/, "");
          const fileName = pathWithoutPublic ? pathWithoutPublic.split("/").pop() : null;
          const fileUrl =
            fileName && cid
              ? `${apiBase}/uploads/documents/${cid}/${fileName}`
              : path.startsWith("http") ? path : null;
          return { ...doc, file_path: fileUrl || path || null };
        }),
      );

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
        position: c.rank_id || c.position || "",
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
        const path = doc.file_path || doc.file_upload || "";
        const fileName = path ? path.replace(/^public\//, "").split("/").pop() : null;
        const fileUrl = fileName && candidate?.id ? `${apiBase}/uploads/documents/${candidate.id}/${fileName}` : null;
        const normalized = normalizeDoc({ ...doc, file_path: path || undefined });
        return { ...normalized, file_path: fileUrl || normalized.file_path || null };
      };
      setDceDocs((data.dce_docs || []).map(normalizeDceDoc));
      setValueCourses(
        (data.value_courses || []).map((doc) => {
          const apiBase = import.meta.env.VITE_API_URL || "";
          const filePath = doc.file_upload || doc.file_path || "";
          const fileName = filePath ? filePath.replace(/^public\//, "").split("/").pop() : null;
          const fileUrl = fileName && candidate?.id
            ? `${apiBase}/uploads/documents/${candidate.id}/${fileName}`
            : null;
          return {
            ...doc,
            issue_date: doc.issue_date ? (typeof doc.issue_date === "number" ? doc.issue_date * 1000 : doc.issue_date) : null,
            expiry_date: doc.expiry_date ? (typeof doc.expiry_date === "number" ? doc.expiry_date * 1000 : doc.expiry_date) : null,
            file_path: fileUrl || filePath || null,
          };
        }),
      );
      // setLicenses((data.licenses || []).map(normalizeDoc));
      setLicenses(
        (data.licenses || []).map((doc) => {
          const apiBase = import.meta.env.VITE_API_URL || "";

          return {
            ...doc,
            upload_file: doc.upload_file
              ? `${apiBase}/uploads/documents/${candidate.id}/${doc.upload_file}`
              : null,
          };
        }),
      );

      setNokDocs((data.nok_docs || []).map(normalizeDoc));
      setRecordOfSeaServices(data.record_of_sea_services || []);
      setPlanings(data.planings || []);
      setCountries(data.countries || []);
      setDocumentTypes(data.document_types || []);
      setSignOnDocumentTypes(data.sign_on_document_types || []);
      setEducationalDocuments(
        (data.document || []).map((doc) => {
          const apiBase = import.meta.env.VITE_API_URL;
          return {
            ...doc,
            upload_file: doc.upload_file
              ? `${apiBase}/uploads/documents/${candidate.id}/${doc.upload_file}`
              : null,
          };
        }),
      );
   setverificationDocuments(
  (data.docsVerfication || []).map((doc) => {
    const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
    console.log("Verification URL:", doc.file_upload.replace(/^public\//, ""));
console.log("Final URL:", `${apiBase}/uploads/documents/${doc.file_upload.replace(/^public\//, "")}`);

    return {
      ...doc,
      file_upload: doc.file_upload
        ? `${apiBase}/uploads/documents/${doc.file_upload.replace(/^public\//, "")}`
        : null,
    };
  })
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
    setShowSignOnDocModal(true);
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
    if (!documentId || !fileInput?.files?.length) {
      alert("Please select document type and a file.");
      return;
    }
    setSignOnDocUploading(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const fd = new FormData();
      fd.append("signon_id", String(signOnDocSignonId));
      fd.append("document_id", String(documentId));
      fd.append("file_path", fileInput.files[0]);
      const res = await fetch(`${apiBase}/api/candidates/${id}/sign-on-documents`, {
        method: "POST",
        body: fd,
      });
      const contentType = res.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      const result = isJson ? await res.json() : { error: await res.text() || "Server error" };
      if (res.ok) {
        await fetchSignOnDocuments(signOnDocSignonId);
        if (typeof form.reset === "function") form.reset();
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
        { method: "DELETE" },
      );
      if (res.ok) await fetchSignOnDocuments(signOnDocSignonId);
      else alert("Failed to delete");
    } catch (err) {
      console.error(err);
      alert("Failed to delete document");
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle additional info changes
  const handleAdditionalInfoChange = (e) => {
    const { name, value } = e.target;
    setAdditionalInfo((prev) => ({ ...prev, [name]: value }));
  };

  // Submit basic details form
  const handleBasicDetailsSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/candidate/edit/${id}`, formData);
      alert("Candidate updated successfully");
      fetchCandidateData();
    } catch (error) {
      setErrors(error.response?.data?.errors || []);
    }
  };

  // Submit additional info
  const handleAdditionalInfoSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/candidate/saveAdditionalInfo", {
        candidate_id: id,
        ...additionalInfo,
      });
      setShowAdditionalModal(false);
      fetchCandidateData();
    } catch (error) {
      console.error("Error saving additional info:", error);
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId, type) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        await axios.delete(`/candidate/deleteDocument/${docId}?type=${type}`);
        fetchCandidateData();
      } catch (error) {
        console.error("Error deleting document:", error);
      }
    }
  };

  // Format date for Services table (MySQL date string or timestamp)
  const formatServiceDate = (val) => {
    if (!val) return "";
    const d = typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)
      ? new Date(val + "Z")
      : new Date(typeof val === "number" ? val * 1000 : val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
  };

  // Populate modal for editing
  const populatePassportModal = (doc = null) => {
    if (doc) {
      setFormData((prev) => ({
        ...prev,
        certificate_number: doc.certificate_number,
        issue_date: doc.issue_date,
        expiry_date: doc.expiry_date,
        place_of_issue: doc.place_of_issue,
      }));
    }
    setShowPassportModal(true);
  };

  return (
    <div className="candidate-details-container">
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
            {candidateData.position || candidateData.raw?.rank_id || "N/A"}
          </div>

          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">📧 Email:</span>
              <span className="summary-value">
                {candidateData.email_id || "N/A"}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">📱 Phone:</span>
              <span className="summary-value">
                {candidateData.contact1 || "N/A"}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">🎂 DOB:</span>
              <span className="summary-value">
                {candidateData.dob
                  ? new Date(candidateData.dob).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">🛂 Passport:</span>
              <span className="summary-value">
                {candidateData.passport_number || "N/A"}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">📘 CDC:</span>
              <span className="summary-value">
                {candidateData.cdc_number || "N/A"}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">📜 License:</span>
              <span className="summary-value">
                {candidateData.license || "N/A"}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">🆔 Candidate ID:</span>
              <span className="summary-value">{candidateData.id || "-"}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">📅 Available:</span>
              <span className="summary-value">
                {candidateData.availability_date
                  ? new Date(
                      candidateData.availability_date,
                    ).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
          </div>

          {candidateData.cv && (
            <div className="cv-section">
              <span className="summary-label">CV:</span>
              <a
                href={candidateData.cv}
                target="_blank"
                rel="noopener noreferrer"
                className="cv-link"
              >
                📄 View
              </a>
              <a href={candidateData.cv} download className="cv-link">
                ⬇ Download
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Navigation - aligned with candidate_edit.blade.php */}
      <div className="main-tabs">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "basic_details" ? "active" : ""}`}
              onClick={() => { setActiveMainTab("basic_details"); setActiveSeafarersTab("BasicDetail"); }}
              role="tab"
            >
              Basic
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "seafarers_documents" ? "active" : ""}`}
              onClick={() => { setActiveMainTab("seafarers_documents"); setActiveSeafarersTab("Passport"); }}
              role="tab"
            >
              Documents
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "record_of_sea_services" ? "active" : ""}`}
              onClick={() => setActiveMainTab("record_of_sea_services")}
              role="tab"
            >
              Services
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "planings" ? "active" : ""}`}
              onClick={() => setActiveMainTab("planings")}
              role="tab"
            >
              Proposal
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "pre_joining_medicals" ? "active" : ""}`}
              onClick={() => setActiveMainTab("pre_joining_medicals")}
              role="tab"
            >
              Medicals
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "flag_state_crew_documents" ? "active" : ""}`}
              onClick={() => setActiveMainTab("flag_state_crew_documents")}
              role="tab"
            >
              Flag state doc
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "pre_joining_travel_documents" ? "active" : ""}`}
              onClick={() => setActiveMainTab("pre_joining_travel_documents")}
              role="tab"
            >
              Pre Joining
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "post_sign_on_documents" ? "active" : ""}`}
              onClick={() => setActiveMainTab("post_sign_on_documents")}
              role="tab"
            >
              Sign On
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "post_sign_off_documents" ? "active" : ""}`}
              onClick={() => setActiveMainTab("post_sign_off_documents")}
              role="tab"
            >
              Sign Off
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "remarks" ? "active" : ""}`}
              onClick={() => setActiveMainTab("remarks")}
              role="tab"
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
          <div className="sub-tabs">
            <button
              className={`sub-tab ${activeSeafarersTab === "BasicDetail" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("BasicDetail")}
              role="tab"
            >
              Personal Info
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "Address" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Address")}
              role="tab"
            >
              Address
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "Nok" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Nok")}
              role="tab"
            >
              Next of Kin
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "AdditionalInfo" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("AdditionalInfo")}
              role="tab"
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
              countries={countries}
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
              onAddNew={() => setShowNokModal(true)}
              onEdit={(nok) => setShowNokModal(true)}
              fetchCandidateData={fetchCandidateData}
            />
          )}

          {activeSeafarersTab === "AdditionalInfo" && (
            <AdditionalInfoSection
              additionalInfo={additionalInfo}
              candidateData={candidateData}
              onEdit={() => setShowAdditionalModal(true)}
            />
          )}
        </div>
      )}

      {/* Seafarers Documents Tab */}
      {activeMainTab === "seafarers_documents" && (
        <div className="tab-content">
          {/* Seafarers Sub-tabs */}
          <div className="sub-tabs">
            <button
              className={`sub-tab ${activeSeafarersTab === "Passport" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Passport")}
              role="tab"
            >
              🛂 Passport
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "Cdc" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Cdc")}
              role="tab"
            >
              📘 CDC
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "Licence" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Licence")}
              role="tab"
            >
              📜 License
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "Documents" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Documents")}
              role="tab"
            >
              📑 STCW
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "Visa" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Visa")}
              role="tab"
            >
              ✈️ Visa
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "edDocs" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("edDocs")}
              role="tab"
            >
              📚 Educational Documents
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "verificationDocs" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("verificationDocs")}
              role="tab"
            >
              ✅ Document Verification
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "Dce" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("Dce")}
              role="tab"
            >
              📋 Dce
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "ValueAddedCourse" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("ValueAddedCourse")}
              role="tab"
            >
              📌 Value Added Course
            </button>
          </div>

          {/* Passport Section */}
          {activeSeafarersTab === "Passport" && (
            <PassportSection
              seafarersDocs={seafarersDocs}
              onAddNew={() => setShowPassportModal(true)}
              onDelete={(id) => handleDeleteDocument(id, "seafarers")}
              onEdit={(doc) => populatePassportModal(doc)}
            />
          )}

          {/* CDC Section */}
          {activeSeafarersTab === "Cdc" && (
            <CdcSection
              seafarersDocs={seafarersDocs}
              onAddNew={() => setShowCdcModal(true)}
              onDelete={(id) => handleDeleteDocument(id, "seafarers")}
              onEdit={(doc) => populatePassportModal(doc)}
            />
          )}

          {/* License Section */}
          {activeSeafarersTab === "Licence" && (
            <LicenseSection
              licenses={licenses}
              onAddNew={() => setShowLicenseModal(true)}
              onDelete={(id) => handleDeleteDocument(id, "license")}
              onEdit={(doc) => populatePassportModal(doc)}
            />
          )}

          {/* STCW Documents Section */}
          {activeSeafarersTab === "Documents" && (
            <StcwDocumentsSection
              seafarersDocs={seafarersDocs}
              onDelete={(id) => handleDeleteDocument(id, "seafarers")}
              onEdit={(doc) => populatePassportModal(doc)}
            />
          )}

          {/* Visa Section */}
          {activeSeafarersTab === "Visa" && (
            <VisaSection
              seafarersDocs={seafarersDocs}
              onDelete={(id) => handleDeleteDocument(id, "seafarers")}
              onEdit={(doc) => populatePassportModal(doc)}
            />
          )}

          {/* Education Section */}
          {activeSeafarersTab === "edDocs" && (
            <EducationalDocuments
              edDocs={educationalDocuments}
              onDelete={(id) => handleDeleteDocument(id, "document")}
              onEdit={(doc) => populatePassportModal(doc)}
            />
          )}

          {/* Verification Section */}
          {activeSeafarersTab === "verificationDocs" && (
            <VerificationDocuments
              edDocs={verificationDocuments}
              onDelete={(id) => handleDeleteDocument(id, "document")}
              onEdit={(doc) => populatePassportModal(doc)}
            />
          )}

          {/* Dce Section */}
          {activeSeafarersTab === "Dce" && (
            <DceDocumentsSection
              dceDocs={dceDocs}
              onDelete={(id) => handleDeleteDocument(id, "dce")}
              onEdit={(doc) => populatePassportModal(doc)}
            />
          )}

          {/* Value Added Course Section */}
          {activeSeafarersTab === "ValueAddedCourse" && (
            <ValueAddedDocumentsSection
              valueCourses={valueCourses}
              onDelete={(id) => handleDeleteDocument(id, "value_course")}
              onEdit={(doc) => populatePassportModal(doc)}
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
              <button type="button" className="btn btn-sm btn-info" disabled title="Add New (coming soon)">
                Add New
              </button>
            </div>
            {recordOfSeaServices.length > 0 ? (
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
                    {recordOfSeaServices.map((row) => (
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
                        <td><span className="text-muted small">Edit/Delete (coming soon)</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <button type="button" className="btn btn-sm btn-info" disabled title="Add New (coming soon)">
                Add New
              </button>
            </div>
            {planings.length > 0 ? (
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
                    {planings.map((row) => (
                      <tr key={row.id}>
                        <td>{row.rank_name ?? row.rank ?? "-"}</td>
                        <td>{row.vessel_name ?? "-"}</td>
                        <td>{row.contract_duration ?? "-"}</td>
                        <td>{row.tentative_joining_schedule ? formatServiceDate(row.tentative_joining_schedule) : "-"}</td>
                        <td title={row.wages}>{row.wages ?? "-"}</td>
                        <td>{row.proposal_status ? String(row.proposal_status).replace(/_/g, " ") : "-"}</td>
                        <td>{row.proposal_date ? formatServiceDate(row.proposal_date) : "-"}</td>
                        <td>{row.approval_date ? formatServiceDate(row.approval_date) : "-"}</td>
                        <td>{row.tentative_travel_date ? formatServiceDate(row.tentative_travel_date) : "-"}</td>
                        <td>
                          <span className="text-muted small">Edit</span>
                          {row.upload_file && (
                            <>
                              {" | "}
                              <a
                                href={String(row.upload_file).startsWith("http") ? row.upload_file : `${import.meta.env.VITE_API_URL || ""}/uploads/documents/${id}/${String(row.upload_file).replace(/^\/+/, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View
                              </a>
                            </>
                          )}
                          <span className="text-muted small"> | Delete (coming soon)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <button type="button" className="btn btn-sm btn-info" disabled title="Add New (coming soon)">
                Add New
              </button>
            </div>
            {preJoiningMedicals.length > 0 ? (
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
                    {preJoiningMedicals.map((row) => (
                      <tr key={row.id}>
                        <td>{row.document_name ?? row.medical_id ?? "-"}</td>
                        <td>{row.certificate_number ?? "-"}</td>
                        <td>{row.country_name ?? row.country_id ?? "-"}</td>
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
                          <span className="text-muted small">Edit / Delete (coming soon)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <button type="button" className="btn btn-sm btn-info" disabled title="Add New (coming soon)">
                Add New
              </button>
            </div>
            {flagStateCrewDocuments.length > 0 ? (
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
                    {flagStateCrewDocuments.map((row) => (
                      <tr key={row.id}>
                        <td>{row.flag_doc_country ?? "-"}</td>
                        <td>{row.flag_doc_name ?? "-"}</td>
                        <td>{row.flag_doc_grade ?? "-"}</td>
                        <td>{row.issue_date ? formatServiceDate(row.issue_date) : "-"}</td>
                        <td>{row.expiry_date ? formatServiceDate(row.expiry_date) : "-"}</td>
                        <td>
                          <span className="text-muted small">Edit / Delete (coming soon)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <button type="button" className="btn btn-sm btn-info" disabled title="Add New (coming soon)">
                Add New
              </button>
            </div>
            {preJoiningTravelDocs.length > 0 ? (
              <div className="table-responsive">
                <table className="basic-detail-table medicals-table">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Country</th>
                      <th>Issue Date</th>
                      <th>Expiry Date</th>
                      <th>Document File</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preJoiningTravelDocs.map((row) => (
                      <tr key={row.id}>
                        <td>{row.document_name ?? row.document_id ?? "-"}</td>
                        <td>{row.country_name ?? row.country_id ?? "-"}</td>
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
                          <span className="text-muted small">Edit / Delete (coming soon)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <button type="button" className="btn btn-sm btn-info" disabled title="Add New (coming soon)">
                Add New
              </button>
            </div>
            {postSignOnDocs.length > 0 ? (
              <div className="table-responsive">
                <table className="basic-detail-table medicals-table">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Country</th>
                      <th>Issue Date</th>
                      <th>Expiry Date</th>
                      <th>Document File</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postSignOnDocs.map((row) => (
                      <tr key={row.id}>
                        <td>{row.document_name ?? row.document_id ?? "-"}</td>
                        <td>{row.country_name ?? row.country_id ?? "-"}</td>
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
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => openSignOnDocModal(row.id)}
                          >
                            Documents
                          </button>
                          <span className="text-muted small">Edit / Delete (coming soon)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="tab-placeholder">
                <p>No sign on records found.</p>
                <p className="text-muted small">Add records via backend or when Add New is available.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sign Off - Post sign off documents */}
      {activeMainTab === "post_sign_off_documents" && (
        <div className="tab-content">
          <div className="tab-content-section">
            <h6 className="tab-section-title">Sign off documents</h6>
            <div className="tab-placeholder">
              <p>Sign off documents will appear here when available.</p>
              <p className="text-muted small">Add / edit via backend integration.</p>
            </div>
          </div>
        </div>
      )}

      {/* Communication - Remarks */}
      {activeMainTab === "remarks" && (
        <div className="tab-content">
          <div className="tab-content-section">
            <h6 className="tab-section-title">Candidate remarks / communication</h6>
            <div className="tab-placeholder">
              <p>Remarks and communication history will appear here when available.</p>
              <p className="text-muted small">Add / edit via backend integration.</p>
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
        onClose={() => setShowNokModal(false)}
        candidateId={id}
        formData={formData}
        onSubmitSuccess={fetchCandidateData}
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
                  onClick={() => { setShowSignOnDocModal(false); setSignOnDocSignonId(null); setSignOnDocList([]); }}
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
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteSignOnDocument(d.id)}>Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <hr />
                <h6 className="mb-2">Add Document</h6>
                <form onSubmit={handleAddSignOnDocument} className="small">
                  <div className="mb-2">
                    <label className="form-label">Document type</label>
                    <select name="document_id" className="form-select form-select-sm" required>
                      <option value="">Select document</option>
                      {signOnDocumentTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name ?? t.option ?? t.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">File</label>
                    <input type="file" name="file_path" className="form-control form-control-sm" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={signOnDocUploading}>
                    {signOnDocUploading ? "Uploading…" : "Add Document"}
                  </button>
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

      <PassportModal
        show={showPassportModal}
        countries={countries}
        documentTypes={documentTypes}
        onClose={() => setShowPassportModal(false)}
        candidateId={id}
        onSubmitSuccess={fetchCandidateData}
      />

      <CdcModal
        show={showCdcModal}
        countries={countries}
        documentTypes={documentTypes}
        onClose={() => setShowCdcModal(false)}
        candidateId={id}
        onSubmitSuccess={fetchCandidateData}
      />

      <LicenseModal
        show={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        candidateId={id}
        onSubmitSuccess={fetchCandidateData}
      />
    </div>
  );
};

// Format date for input[type=date] (YYYY-MM-DD)
const toDateInputValue = (val) => {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const d = new Date(typeof val === "number" ? val * 1000 : val);
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
}) => {
  return (
    <form onSubmit={handleSubmit} className="basic-details-form personal-info-form">
      <div className="form-wrapper-inner">
        {/* Row 1: Surname, Given name, Middle name, Rank, Vessel type, DOB, Place of birth, Nationality */}
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
            <input
              type="text"
              name="rank_id"
              className="form-control"
              value={formData.rank_id ?? ""}
              onChange={handleInputChange}
              placeholder="Rank ID"
            />
          </div>
          <div className="form-group">
            <label>VESSEL TYPE</label>
            <input
              type="text"
              name="vessel_type_id"
              className="form-control"
              value={formData.vessel_type_id ?? ""}
              onChange={handleInputChange}
              placeholder="Vessel type"
            />
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

        {/* Row 2: Religion, Gender, Marital status, License authority, Passport, CDC */}
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
            <label>PASSPORT EXPIRY</label>
            <input type="date" name="passport_expiry_date" className="form-control" value={toDateInputValue(formData.passport_expiry_date)} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>CDC NUMBER</label>
            <input type="text" name="cdc_number" className="form-control" value={formData.cdc_number || ""} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>CDC ISSUE DATE</label>
            <input type="date" name="cdc_issue_date" className="form-control" value={toDateInputValue(formData.cdc_issue_date)} onChange={handleInputChange} />
          </div>
        </div>

        {/* Row 3: CDC expiry, INDOS, Status, Availability date, Aramco, Follow-up, Photo, CV */}
        <div className="form-row personal-info-row">
          <div className="form-group">
            <label>CDC EXPIRY DATE</label>
            <input type="date" name="cdc_expiry_date" className="form-control" value={toDateInputValue(formData.cdc_expiry_date)} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>INDOS NUMBER</label>
            <input type="text" name="indos_number" className="form-control" value={formData.indos_number || ""} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>STATUS</label>
            <input type="text" name="availability_status_id" className="form-control" value={formData.availability_status_id ?? ""} onChange={handleInputChange} placeholder="Status ID" />
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

        {/* Row 4: Address – residence, province, house, building, airports, country, state, city */}
        <div className="form-row personal-info-row">
          <div className="form-group">
            <label>RESIDENCE ADDRESS</label>
            <input type="text" name="residence_address" className="form-control" value={formData.residence_address || ""} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>PROVINCE</label>
            <input type="text" name="province" className="form-control" value={formData.province || ""} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>HOUSE NO</label>
            <input type="text" name="house_no" className="form-control" value={formData.house_no || ""} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>BUILDING NAME</label>
            <input type="text" name="building_name" className="form-control" value={formData.building_name || ""} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>DOMESTIC AIRPORT</label>
            <input type="text" name="domestic_airport" className="form-control" value={formData.domestic_airport || ""} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>INTERNATIONAL AIRPORT</label>
            <input type="text" name="international_airport" className="form-control" value={formData.international_airport || ""} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>COUNTRY</label>
            <select name="country_id" className="form-control" value={formData.country_id ?? ""} onChange={handleInputChange}>
              <option value="">Select Country</option>
              {(countries || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>STATE</label>
            <input type="text" name="state_id" className="form-control" value={formData.state_id ?? ""} onChange={handleInputChange} placeholder="State ID" />
          </div>
          <div className="form-group">
            <label>CITY</label>
            <input type="text" name="city_id" className="form-control" value={formData.city_id ?? ""} onChange={handleInputChange} placeholder="City ID" />
          </div>
        </div>

        {/* Row 5: Contact */}
        <div className="form-row personal-info-row">
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
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Update Candidate</button>
      </div>
    </form>
  );
};

// Address section – match Blade: table when data exists + Add/Edit button
const AddressSection = ({ formData, candidateData, countries, onAddEdit }) => {
  const hasData = formData?.state_id || formData?.email_id || formData?.house_no || formData?.residence_address;
  const countryName = countries?.find((c) => Number(c.id) === Number(formData?.country_id))?.name || "-";

  return (
    <div className="basic-sub-section address-section">
      <div className="section-header-row">
        <h6 className="section-title">Address</h6>
        <button type="button" className="btn btn-sm btn-primary" onClick={onAddEdit} title="Add/Edit Address">
          {hasData ? "Edit" : "Add"} Address
        </button>
      </div>
      {hasData ? (
        <table className="basic-detail-table">
          <thead>
            <tr>
              <th colSpan={2}>ADDRESS DETAIL</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="label-cell">HOUSE/FLAT NO</td><td className="value-cell">{formData?.house_no || "-"}</td></tr>
            <tr><td className="label-cell">BUILDING NAME</td><td className="value-cell">{(formData?.building_name || "-").toString().toUpperCase()}</td></tr>
            <tr><td className="label-cell">STREET / ROAD / AREA</td><td className="value-cell">{(formData?.residence_address || "-").toString().toUpperCase()}</td></tr>
            <tr><td className="label-cell">STATE</td><td className="value-cell">{formData?.state_id || "-"}</td></tr>
            <tr><td className="label-cell">PROVINCE</td><td className="value-cell">{(formData?.province || "-").toString().toUpperCase()}</td></tr>
            <tr><td className="label-cell">COUNTRY</td><td className="value-cell">{(countryName || "-").toString().toUpperCase()}</td></tr>
            <tr><td className="label-cell">EMAIL</td><td className="value-cell">{formData?.email_id || "-"}</td></tr>
            <tr><td className="label-cell">CONTACT NO 1</td><td className="value-cell">{formData?.contact_no_1 || "-"}</td></tr>
            <tr><td className="label-cell">CONTACT NO 2</td><td className="value-cell">{formData?.contact_no_2 || "-"}</td></tr>
            <tr><td className="label-cell">NEAREST DOMESTIC AIRPORT</td><td className="value-cell">{formData?.domestic_airport || "-"}</td></tr>
            <tr><td className="label-cell">NEAREST INTERNATIONAL AIRPORT</td><td className="value-cell">{(formData?.international_airport || "-").toString().toUpperCase()}</td></tr>
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <p>No address details. Click &quot;Add Address&quot; to add.</p>
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
                  <td>
                    <button type="button" className="btn-link text-danger" onClick={() => { /* delete */ }}>Delete</button>
                    {" | "}
                    <button type="button" className="btn-link text-primary" onClick={() => onEdit && onEdit(nok)}>Edit</button>
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
          <div className="passport-details-grid">
            {passportDocs.map((doc) => {
              const isExpired =
                doc.expiry_date && new Date(doc.expiry_date) < new Date();

              return (
                <div
                  key={doc.id}
                  className={`passport-card ${selectedDoc?.id === doc.id ? "active" : ""} ${isExpired ? "expired" : ""}`}
                >
                  <div className="passport-header">
                    <h4>Passport #{doc.certificate_number || "N/A"}</h4>
                    {isExpired && (
                      <span className="status-badge expired">Expired</span>
                    )}
                    {!isExpired && doc.expiry_date && (
                      <span className="status-badge valid">Valid</span>
                    )}
                  </div>

                  <div className="passport-details">
                    <div className="detail-row">
                      <label>Passport Number:</label>
                      <span>{doc.certificate_number || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Country:</label>
                      <span>{doc.country_name?.toUpperCase() || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Issue Date:</label>
                      <span>
                        {doc.issue_date
                          ? new Date(doc.issue_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Expiry Date:</label>
                      <span>
                        {doc.expiry_date
                          ? new Date(doc.expiry_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Place of Issue:</label>
                      <span>{doc.place_of_issue?.toUpperCase() || "-"}</span>
                    </div>
                  </div>

                  <div className="passport-actions">
                    <button
                      className={`btn btn-link ${selectedDoc?.id === doc.id ? "active" : ""}`}
                      onClick={() =>
                        setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)
                      }
                    >
                      {selectedDoc?.id === doc.id
                        ? "👁️ Hide Preview"
                        : "👁️ View Preview"}
                    </button>
                    {doc.file_path && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleDownload(doc)}
                      >
                        ⬇️ Download
                      </button>
                    )}
                    <button
                      className="btn btn-info btn-sm"
                      onClick={() => onEdit(doc)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(doc.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  📄 Document Preview - Passport #
                  {selectedDoc.certificate_number}
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
          <div className="passport-details-grid">
            {cdcDocs.map((doc) => {
              const isExpired =
                doc.expiry_date && new Date(doc.expiry_date) < new Date();

              return (
                <div
                  key={doc.id}
                  className={`passport-card ${selectedDoc?.id === doc.id ? "active" : ""} ${isExpired ? "expired" : ""}`}
                >
                  <div className="passport-header">
                    <h4>CDC #{doc.certificate_number || "N/A"}</h4>
                    {isExpired && (
                      <span className="status-badge expired">Expired</span>
                    )}
                    {!isExpired && doc.expiry_date && (
                      <span className="status-badge valid">Valid</span>
                    )}
                  </div>

                  <div className="passport-details">
                    <div className="detail-row">
                      <label>CDC Number:</label>
                      <span>{doc.certificate_number || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Country:</label>
                      <span>{doc.country_name?.toUpperCase() || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Issue Date:</label>
                      <span>
                        {doc.issue_date
                          ? new Date(doc.issue_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Expiry Date:</label>
                      <span>
                        {doc.expiry_date
                          ? new Date(doc.expiry_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Place of Issue:</label>
                      <span>{doc.place_of_issue?.toUpperCase() || "-"}</span>
                    </div>
                  </div>

                  <div className="passport-actions">
                    <button
                      className={`btn btn-link ${selectedDoc?.id === doc.id ? "active" : ""}`}
                      onClick={() =>
                        setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)
                      }
                    >
                      {selectedDoc?.id === doc.id
                        ? "👁️ Hide Preview"
                        : "👁️ View Preview"}
                    </button>
                    {doc.file_path && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleDownload(doc)}
                      >
                        ⬇️ Download
                      </button>
                    )}
                    <button
                      className="btn btn-info btn-sm"
                      onClick={() => onEdit(doc)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(doc.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  📄 Document Preview - CDC #{selectedDoc.certificate_number}
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
          <div className="passport-details-grid">
            {licenses.map((license) => {
              const isExpired =
                license.expiry_date &&
                new Date(license.expiry_date) < new Date();

              return (
                <div
                  key={license.id}
                  className={`passport-card ${selectedDoc?.id === license.id ? "active" : ""} ${isExpired ? "expired" : ""}`}
                >
                  <div className="passport-header">
                    <h4>License #{license.document_number || "N/A"}</h4>
                    {isExpired && (
                      <span className="status-badge expired">Expired</span>
                    )}
                    {!isExpired && license.expiry_date && (
                      <span className="status-badge valid">Valid</span>
                    )}
                  </div>

                  <div className="passport-details">
                    <div className="detail-row">
                      <label>Type:</label>
                      <span>
                        {license.type?.replace(/_/g, " ").toUpperCase() || "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Document Number:</label>
                      <span>{license.document_number || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Rank:</label>
                      <span>{license.rank?.toUpperCase() || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Issue Date:</label>
                      <span>
                        {license.original_issue_date
                          ? new Date(
                              license.original_issue_date,
                            ).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Expiry Date:</label>
                      <span>
                        {license.expiry_date
                          ? new Date(license.expiry_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="passport-actions">
                    <button
                      className={`btn btn-link ${selectedDoc?.id === license.id ? "active" : ""}`}
                      onClick={() =>
                        setSelectedDoc(
                          selectedDoc?.id === license.id ? null : license,
                        )
                      }
                    >
                      {selectedDoc?.id === license.id
                        ? "👁️ Hide Preview"
                        : "👁️ View Preview"}
                    </button>
                    {license.upload_file && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleDownload(license)}
                      >
                        ⬇️ Download
                      </button>
                    )}
                    <button
                      className="btn btn-info btn-sm"
                      onClick={() => onEdit(license)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(license.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  📄 Document Preview - License #{selectedDoc.document_number}
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

const StcwDocumentsSection = ({ seafarersDocs, onDelete, onEdit }) => {
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
      <h3>📑 STCW Documents</h3>

      {stcwDocs.length > 0 ? (
        <div className="passport-container">
          <div className="passport-details-grid">
            {stcwDocs.map((doc) => {
              const isExpired =
                doc.expiry_date && new Date(doc.expiry_date) < new Date();

              return (
                <div
                  key={doc.id}
                  className={`passport-card ${selectedDoc?.id === doc.id ? "active" : ""} ${isExpired ? "expired" : ""}`}
                >
                  <div className="passport-header">
                    <h4>{doc.document_name || "N/A"}</h4>
                    {isExpired && (
                      <span className="status-badge expired">Expired</span>
                    )}
                    {!isExpired && doc.expiry_date && (
                      <span className="status-badge valid">Valid</span>
                    )}
                  </div>

                  <div className="passport-details">
                    <div className="detail-row">
                      <label>Country:</label>
                      <span>{doc.country_name?.toUpperCase() || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Document Name:</label>
                      <span>{doc.document_name || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Certificate Number:</label>
                      <span>{doc.certificate_number || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Issue Date:</label>
                      <span>
                        {doc.issue_date
                          ? new Date(doc.issue_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Expiry Date:</label>
                      <span>
                        {doc.expiry_date
                          ? new Date(doc.expiry_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="passport-actions">
                    <button
                      className={`btn btn-link ${selectedDoc?.id === doc.id ? "active" : ""}`}
                      onClick={() =>
                        setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)
                      }
                    >
                      {selectedDoc?.id === doc.id
                        ? "👁️ Hide Preview"
                        : "👁️ View Preview"}
                    </button>
                    {doc.file_path && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleDownload(doc)}
                      >
                        ⬇️ Download
                      </button>
                    )}
                    <button
                      className="btn btn-info btn-sm"
                      onClick={() => onEdit(doc)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(doc.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  📄 Document Preview - {selectedDoc.document_name} #
                  {selectedDoc.certificate_number}
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

const DceDocumentsSection = ({ dceDocs, onDelete, onEdit }) => {
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
      <h3>📋 Dce Documents</h3>
      {dceDocs.length > 0 ? (
        <div className="passport-container">
          <div className="passport-details-grid">
            {dceDocs.map((doc) => {
              const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
              return (
                <div
                  key={doc.id}
                  className={`passport-card ${selectedDoc?.id === doc.id ? "active" : ""} ${isExpired ? "expired" : ""}`}
                >
                  <div className="passport-header">
                    <h4>{doc.document_name || "N/A"}</h4>
                    {isExpired && <span className="status-badge expired">Expired</span>}
                    {!isExpired && doc.expiry_date && <span className="status-badge valid">Valid</span>}
                  </div>
                  <div className="passport-details">
                    <div className="detail-row"><label>Country:</label><span>{doc.country_name?.toUpperCase() || "-"}</span></div>
                    <div className="detail-row"><label>Certificate Number:</label><span>{doc.certificate_number || "-"}</span></div>
                    <div className="detail-row"><label>Place of Issue:</label><span>{doc.place_of_issue || "-"}</span></div>
                    <div className="detail-row"><label>Issue Date:</label><span>{doc.issue_date ? new Date(doc.issue_date).toLocaleDateString() : "-"}</span></div>
                    <div className="detail-row"><label>Expiry Date:</label><span>{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : "-"}</span></div>
                  </div>
                  <div className="passport-actions">
                    <button className={`btn btn-link ${selectedDoc?.id === doc.id ? "active" : ""}`} onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}>
                      {selectedDoc?.id === doc.id ? "👁️ Hide Preview" : "👁️ View Preview"}
                    </button>
                    {fileUrl(doc) && <button className="btn btn-success btn-sm" onClick={() => handleDownload(doc)}>⬇️ Download</button>}
                    <button className="btn btn-info btn-sm" onClick={() => onEdit(doc)}>✏️ Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(doc.id)}>🗑️ Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>📄 Document Preview - {selectedDoc.document_name} #{selectedDoc.certificate_number}</h3>
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

const ValueAddedDocumentsSection = ({ valueCourses, onDelete, onEdit }) => {
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
      <h3>📌 Value Added Course Documents</h3>
      {valueCourses.length > 0 ? (
        <div className="passport-container">
          <div className="passport-details-grid">
            {valueCourses.map((doc) => {
              const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
              return (
                <div
                  key={doc.id}
                  className={`passport-card ${selectedDoc?.id === doc.id ? "active" : ""} ${isExpired ? "expired" : ""}`}
                >
                  <div className="passport-header">
                    <h4>{doc.document_name || "N/A"}</h4>
                    {isExpired && <span className="status-badge expired">Expired</span>}
                    {!isExpired && doc.expiry_date && <span className="status-badge valid">Valid</span>}
                  </div>
                  <div className="passport-details">
                    <div className="detail-row"><label>Country:</label><span>{doc.country_name?.toUpperCase() || "-"}</span></div>
                    <div className="detail-row"><label>Certificate Number:</label><span>{doc.certificate_number || "-"}</span></div>
                    <div className="detail-row"><label>Place of Issue:</label><span>{doc.place_of_issue || "-"}</span></div>
                    <div className="detail-row"><label>Issue Date:</label><span>{doc.issue_date ? new Date(doc.issue_date).toLocaleDateString() : "-"}</span></div>
                    <div className="detail-row"><label>Expiry Date:</label><span>{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : "-"}</span></div>
                  </div>
                  <div className="passport-actions">
                    <button className={`btn btn-link ${selectedDoc?.id === doc.id ? "active" : ""}`} onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}>
                      {selectedDoc?.id === doc.id ? "👁️ Hide Preview" : "👁️ View Preview"}
                    </button>
                    {fileUrl(doc) && <button className="btn btn-success btn-sm" onClick={() => handleDownload(doc)}>⬇️ Download</button>}
                    <button className="btn btn-info btn-sm" onClick={() => onEdit(doc)}>✏️ Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(doc.id)}>🗑️ Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>📄 Document Preview - {selectedDoc.document_name} #{selectedDoc.certificate_number}</h3>
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

const VisaSection = ({ seafarersDocs, onDelete, onEdit }) => {
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
      <h3>✈️ Visa Documents</h3>

      {visaDocs.length > 0 ? (
        <div className="passport-container">
          <div className="passport-details-grid">
            {visaDocs.map((doc) => {
              const isExpired =
                doc.expiry_date && new Date(doc.expiry_date) < new Date();

              return (
                <div
                  key={doc.id}
                  className={`passport-card ${selectedDoc?.id === doc.id ? "active" : ""} ${isExpired ? "expired" : ""}`}
                >
                  <div className="passport-header">
                    <h4>Visa #{doc.certificate_number || "N/A"}</h4>
                    {isExpired && (
                      <span className="status-badge expired">Expired</span>
                    )}
                    {!isExpired && doc.expiry_date && (
                      <span className="status-badge valid">Valid</span>
                    )}
                  </div>

                  <div className="passport-details">
                    <div className="detail-row">
                      <label>Country:</label>
                      <span>{doc.country_name?.toUpperCase() || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Visa Number:</label>
                      <span>{doc.certificate_number || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Category:</label>
                      <span>{doc.visa_category?.toUpperCase() || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Entry Type:</label>
                      <span>
                        {doc.visa_entry_type
                          ?.replace(/_/g, " ")
                          .toUpperCase() || "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Arrival Date:</label>
                      <span>
                        {doc.visa_arrive_date
                          ? new Date(doc.visa_arrive_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Expiry Date:</label>
                      <span>
                        {doc.expiry_date
                          ? new Date(doc.expiry_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="passport-actions">
                    <button
                      className={`btn btn-link ${selectedDoc?.id === doc.id ? "active" : ""}`}
                      onClick={() =>
                        setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)
                      }
                    >
                      {selectedDoc?.id === doc.id
                        ? "👁️ Hide Preview"
                        : "👁️ View Preview"}
                    </button>
                    {doc.file_path && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleDownload(doc)}
                      >
                        ⬇️ Download
                      </button>
                    )}
                    <button
                      className="btn btn-info btn-sm"
                      onClick={() => onEdit(doc)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(doc.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  📄 Document Preview - Visa #{selectedDoc.certificate_number}
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
  console.log("edDocsv", edDocs);

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

      {edDocs.length > 0 ? (
        <div className="passport-container">
          <div className="passport-details-grid">
            {edDocs.map((edDoc) => {
              const isExpired =
                edDocs.expiry_date && new Date(edDoc.expiry_date) < new Date();

              return (
                <div
                  key={edDoc.id}
                  className={`passport-card ${selectedDoc?.id === edDoc.id ? "active" : ""} ${isExpired ? "expired" : ""}`}
                >
                  <div className="passport-header">
                    <h4>edDoc #{edDoc.document_number || "N/A"}</h4>
                    {isExpired && (
                      <span className="status-badge expired">Expired</span>
                    )}
                    {!isExpired && edDoc.expiry_date && (
                      <span className="status-badge valid">Valid</span>
                    )}
                  </div>

                  <div className="passport-details">
                    <div className="detail-row">
                      <label>Type:</label>
                      <span>
                        {edDoc.type?.replace(/_/g, " ").toUpperCase() || "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Document Number:</label>
                      <span>{edDoc.document_number || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Rank:</label>
                      <span>{edDoc.rank?.toUpperCase() || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Issue Date:</label>
                      <span>
                        {edDoc.original_issue_date
                          ? new Date(
                              edDoc.original_issue_date,
                            ).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Expiry Date:</label>
                      <span>
                        {edDoc.expiry_date
                          ? new Date(edDoc.expiry_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="passport-actions">
                    <button
                      className={`btn btn-link ${selectedDoc?.id === edDoc.id ? "active" : ""}`}
                      onClick={() =>
                        setSelectedDoc(
                          selectedDoc?.id === edDoc.id ? null : edDoc,
                        )
                      }
                    >
                      {selectedDoc?.id === edDoc.id
                        ? "👁️ Hide Preview"
                        : "👁️ View Preview"}
                    </button>
                    {edDoc.upload_file && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleDownload(edDoc)}
                      >
                        ⬇️ Download
                      </button>
                    )}
                    <button
                      className="btn btn-info btn-sm"
                      onClick={() => onEdit(edDoc)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(edDoc.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  📄 Document Preview - edDoc #{selectedDoc.document_number}
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
                          alt={`edDoc ${selectedDoc.document_number}`}
                        />
                      </div>
                    ) : isPdfFile(selectedDoc.upload_file) ? (
                      <div className="pdf-preview">
                        <iframe
                          src={`${selectedDoc.upload_file}#toolbar=1`}
                          width="100%"
                          height="600px"
                          title={`edDoc ${selectedDoc.document_number}`}
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

const VerificationDocuments = ({ edDocs, onDelete, onEdit, onAddNew }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  console.log("edDocsv", edDocs);

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

      {edDocs.length > 0 ? (
        <div className="passport-container">
          <div className="passport-details-grid">
            {edDocs.map((edDoc) => {
              const isExpired =
                edDocs.expiry_date && new Date(edDoc.expiry_date) < new Date();

              return (
                <div
                  key={edDoc.id}
                  className={`passport-card ${selectedDoc?.id === edDoc.id ? "active" : ""} ${isExpired ? "expired" : ""}`}
                >
                  <div className="passport-header">
                    <h4>edDoc #{edDoc.document_number || "N/A"}</h4>
                    {isExpired && (
                      <span className="status-badge expired">Expired</span>
                    )}
                    {!isExpired && edDoc.expiry_date && (
                      <span className="status-badge valid">Valid</span>
                    )}
                  </div>

                  <div className="passport-details">
                    <div className="detail-row">
                      <label>Type:</label>
                      <span>
                        {edDoc.type?.replace(/_/g, " ").toUpperCase() || "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Document Number:</label>
                      <span>{edDoc.document_number || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Rank:</label>
                      <span>{edDoc.rank?.toUpperCase() || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <label>Issue Date:</label>
                      <span>
                        {edDoc.original_issue_date
                          ? new Date(
                              edDoc.original_issue_date,
                            ).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>Expiry Date:</label>
                      <span>
                        {edDoc.expiry_date
                          ? new Date(edDoc.expiry_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="passport-actions">
                    <button
                      className={`btn btn-link ${selectedDoc?.id === edDoc.id ? "active" : ""}`}
                      onClick={() =>
                        setSelectedDoc(
                          selectedDoc?.id === edDoc.id ? null : edDoc,
                        )
                      }
                    >
                      {selectedDoc?.id === edDoc.id
                        ? "👁️ Hide Preview"
                        : "👁️ View Preview"}
                    </button>
                    {edDoc.file_upload && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleDownload(edDoc)}
                      >
                        ⬇️ Download
                      </button>
                    )}
                    <button
                      className="btn btn-info btn-sm"
                      onClick={() => onEdit(edDoc)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(edDoc.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Preview Section */}
          {selectedDoc && (
            <div className="document-preview-container">
              <div className="preview-header">
                <h3>
                  📄 Document Preview - edDoc #{selectedDoc.document_number}
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
          <p>No license documents available</p>
        </div>
      )}
    </div>
  );
};

// Modal Components
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

  useEffect(() => {
    if (show && formData) {
      setData({
        house_no: formData.house_no || "",
        building_name: formData.building_name || "",
        residence_address: formData.residence_address || "",
        country_id: formData.country_id ?? "",
        state_id: formData.state_id ?? "",
        city_id: formData.city_id ?? "",
        domestic_airport: formData.domestic_airport || "",
        international_airport: formData.international_airport || "",
        email_id: formData.email_id || "",
        contact_no_1: formData.contact_no_1 || "",
        contact_no_2: formData.contact_no_2 || "",
        province: formData.province || "",
      });
    }
  }, [show, formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/candidate/saveAddress", { ...data, candidate_id: candidateId });
      onClose();
      onSubmitSuccess?.();
    } catch (err) {
      console.error("Error saving address:", err);
    }
  };

  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add / Edit Address</h3>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body modal-form-row">
            <div className="form-group"><label>House/Flat No</label><input type="text" className="form-control" name="house_no" value={data.house_no} onChange={handleChange} /></div>
            <div className="form-group"><label>Building Name</label><input type="text" className="form-control" name="building_name" value={data.building_name} onChange={handleChange} /></div>
            <div className="form-group"><label>Street / Area</label><input type="text" className="form-control" name="residence_address" value={data.residence_address} onChange={handleChange} /></div>
            <div className="form-group"><label>Country</label>
              <select name="country_id" className="form-control" value={data.country_id} onChange={handleChange}>
                <option value="">Select Country</option>
                {(countries || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>State</label><input type="text" className="form-control" name="state_id" value={data.state_id} onChange={handleChange} placeholder="State" /></div>
            <div className="form-group"><label>City</label><input type="text" className="form-control" name="city_id" value={data.city_id} onChange={handleChange} placeholder="City" /></div>
            <div className="form-group"><label>Nearest Domestic Airport</label><input type="text" className="form-control" name="domestic_airport" value={data.domestic_airport} onChange={handleChange} /></div>
            <div className="form-group"><label>Nearest International Airport</label><input type="text" className="form-control" name="international_airport" value={data.international_airport} onChange={handleChange} /></div>
            <div className="form-group"><label>Email</label><input type="email" className="form-control" name="email_id" value={data.email_id} onChange={handleChange} required /></div>
            <div className="form-group"><label>Contact No 1</label><input type="text" className="form-control" name="contact_no_1" value={data.contact_no_1} onChange={handleChange} /></div>
            <div className="form-group"><label>Contact No 2</label><input type="text" className="form-control" name="contact_no_2" value={data.contact_no_2} onChange={handleChange} /></div>
            <div className="form-group"><label>Province</label><input type="text" className="form-control" name="province" value={data.province} onChange={handleChange} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const NokModal = ({ show, onClose, candidateId, formData, onSubmitSuccess }) => {
  const [data, setData] = useState({
    nok_name: "",
    nok_relationship: "",
    nok: "",
    nok_beneficiary: "",
    nok_emergency_contact: "",
    nok_contact_number: "",
    nok_dob: "",
    nok_gender: "",
    nok_remark: "",
  });

  useEffect(() => {
    if (show && formData) {
      setData({
        nok_name: formData.nok_name || "",
        nok_relationship: formData.nok_relationship || "",
        nok: formData.nok || "",
        nok_beneficiary: formData.nok_beneficiary || "",
        nok_emergency_contact: formData.nok_emergency_contact || "",
        nok_contact_number: formData.nok_contact_number || "",
        nok_dob: formData.nok_dob ? String(formData.nok_dob).slice(0, 10) : "",
        nok_gender: formData.nok_gender || "",
        nok_remark: formData.nok_remark || "",
      });
    }
  }, [show, formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/candidate/saveNok", { ...data, candidate_id: candidateId });
      onClose();
      onSubmitSuccess?.();
    } catch (err) {
      console.error("Error saving NOK:", err);
    }
  };

  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add / Edit Nok</h3>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body modal-form-row">
            <div className="form-group"><label>NAME</label><input type="text" className="form-control" name="nok_name" value={data.nok_name} onChange={handleChange} /></div>
            <div className="form-group"><label>RELATIONSHIP</label><input type="text" className="form-control" name="nok_relationship" value={data.nok_relationship} onChange={handleChange} /></div>
            <div className="form-group"><label>NOK</label>
              <select name="nok" className="form-control" value={data.nok} onChange={handleChange}>
                <option value="">-- Select --</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group"><label>BENEFICIARY IN CASE OF DEATH</label><input type="text" className="form-control" name="nok_beneficiary" value={data.nok_beneficiary} onChange={handleChange} /></div>
            <div className="form-group"><label>CONTACT IN CASE OF EMERGENCY</label>
              <select name="nok_emergency_contact" className="form-control" value={data.nok_emergency_contact} onChange={handleChange}>
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="form-group"><label>CONTACT</label><input type="text" className="form-control" name="nok_contact_number" value={data.nok_contact_number} onChange={handleChange} /></div>
            <div className="form-group"><label>D.O.B</label><input type="date" className="form-control" name="nok_dob" value={data.nok_dob} onChange={handleChange} /></div>
            <div className="form-group"><label>GENDER</label>
              <select name="nok_gender" className="form-control" value={data.nok_gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group"><label>REMARK</label><input type="text" className="form-control" name="nok_remark" value={data.nok_remark} onChange={handleChange} /></div>
            <div className="form-group"><label>Upload File</label><input type="file" className="form-control" name="nok_upload" /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
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

const PassportModal = ({
  show,
  countries,
  documentTypes,
  onClose,
  candidateId,
  onSubmitSuccess,
}) => {
  const [formData, setFormData] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/candidate/saveDocuments", {
        ...formData,
        candidate_id: candidateId,
        document_type_id: documentTypes.find((dt) => dt.name === "Passport")
          ?.id,
      });
      onClose();
      onSubmitSuccess();
    } catch (error) {
      console.error("Error saving passport:", error);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add / Edit Passport</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Country</label>
            <select
              name="country_id"
              className="form-control"
              onChange={handleChange}
            >
              <option value="">Select Country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Certificate Number</label>
            <input
              type="text"
              name="certificate_number"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Place of Issue</label>
            <input
              type="text"
              name="place_of_issue"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Issue Date</label>
            <input
              type="date"
              name="issue_date"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Expiry Date</label>
            <input
              type="date"
              name="expiry_date"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Upload Document</label>
            <input type="file" name="document" className="form-control" />
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

const CdcModal = ({
  show,
  countries,
  documentTypes,
  onClose,
  candidateId,
  onSubmitSuccess,
}) => {
  const [formData, setFormData] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/candidate/saveDocuments", {
        ...formData,
        candidate_id: candidateId,
        document_type_id: documentTypes.find((dt) => dt.name === "Seaman Book")
          ?.id,
      });
      onClose();
      onSubmitSuccess();
    } catch (error) {
      console.error("Error saving CDC:", error);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add / Edit CDC</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Country</label>
            <select
              name="country_id"
              className="form-control"
              onChange={handleChange}
            >
              <option value="">Select Country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Certificate Number</label>
            <input
              type="text"
              name="certificate_number"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Place of Issue</label>
            <input
              type="text"
              name="place_of_issue"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Issue Date</label>
            <input
              type="date"
              name="issue_date"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Expiry Date</label>
            <input
              type="date"
              name="expiry_date"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Upload Document</label>
            <input type="file" name="document" className="form-control" />
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

const LicenseModal = ({ show, onClose, candidateId, onSubmitSuccess }) => {
  const [formData, setFormData] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/candidate/saveLicense", {
        ...formData,
        candidate_id: candidateId,
      });
      onClose();
      onSubmitSuccess();
    } catch (error) {
      console.error("Error saving license:", error);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add / Edit License</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type</label>
            <input
              type="text"
              name="type"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Document Number</label>
            <input
              type="text"
              name="document_number"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Rank</label>
            <input
              type="text"
              name="rank"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Issue Date</label>
            <input
              type="date"
              name="original_issue_date"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Expiry Date</label>
            <input
              type="date"
              name="expiry_date"
              className="form-control"
              onChange={handleChange}
            />
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

export default CandidateDetails;
