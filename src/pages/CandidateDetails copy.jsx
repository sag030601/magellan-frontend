import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./CandidateDetails.css";

const CandidateDetails = () => {
  const { id } = useParams();

  // State for main tabs
  const [activeMainTab, setActiveMainTab] = useState("basic_details");
  const [activeSeafarersTab, setActiveSeafarersTab] = useState("Passport");

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
      const candidate = data.candidate || data;

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
      const apiBase = import.meta.env.VITE_API_URL || "";

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
      setDceDocs((data.dce_docs || []).map(normalizeDoc));
      setValueCourses(data.value_courses || []);
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
      setCountries(data.countries || []);
      setDocumentTypes(data.document_types || []);
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

      {/* Main Tab Navigation */}
      <div className="main-tabs">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "basic_details" ? "active" : ""}`}
              onClick={() => setActiveMainTab("basic_details")}
              role="tab"
            >
              📋 Profile Information
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeMainTab === "seafarers_documents" ? "active" : ""}`}
              onClick={() => setActiveMainTab("seafarers_documents")}
              role="tab"
            >
              📁 Documents & Certificates
            </button>
          </li>
        </ul>
      </div>

      {/* Basic Details Tab */}
      {activeMainTab === "basic_details" && (
        <div className="tab-content">
          {/* Sub-tabs for Basic Details */}
          <div className="sub-tabs">
            <button
              className={`sub-tab ${activeSeafarersTab === "BasicDetail" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("BasicDetail")}
              role="tab"
            >
              Personal Info
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
              Physical Details
            </button>
          </div>

          {/* Basic Info Sub-tab */}
          {activeSeafarersTab === "BasicDetail" && (
            <BasicDetailsForm
              formData={formData}
              candidateData={candidateData}
              handleInputChange={handleInputChange}
              handleSubmit={handleBasicDetailsSubmit}
              countries={countries}
            />
          )}

          {/* NOK Sub-tab */}
          {activeSeafarersTab === "Nok" && (
            <NokSection
              nokDocs={nokDocs}
              candidateData={candidateData}
              onAddNew={() => setShowNokModal(true)}
            />
          )}

          {/* Additional Info Sub-tab */}
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
              className={`sub-tab ${activeSeafarersTab === "Visa" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("edDocs")}
              role="tab"
            >
              ✈️ Educational Documents
            </button>
            <button
              className={`sub-tab ${activeSeafarersTab === "Visa" ? "active" : ""}`}
              onClick={() => setActiveSeafarersTab("verificationDocs")}
              role="tab"
            >
              ✈️ Verfication Documents
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
        </div>
      )}

      {/* Modals */}
      <NokModal
        show={showNokModal}
        onClose={() => setShowNokModal(false)}
        candidateId={id}
      />

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

// Enhanced Basic Details Form Component
const BasicDetailsForm = ({
  formData,
  candidateData,
  handleInputChange,
  handleSubmit,
  countries,
}) => {
  return (
    <form onSubmit={handleSubmit} className="basic-details-form compact">
      <div className="form-container">
        {/* Row 1: Names */}
        <div className="form-row">
          <div className="form-group">
            <label>Given Name *</label>
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
            <label>Middle Name</label>
            <input
              type="text"
              name="middle_name"
              className="form-control"
              value={formData.middle_name || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Surname *</label>
            <input
              type="text"
              name="surname"
              className="form-control"
              value={formData.surname || ""}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        {/* Row 2: Personal Details */}
        <div className="form-row">
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              name="date_of_birth"
              className="form-control"
              value={formData.date_of_birth || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select
              name="gender"
              className="form-control"
              value={formData.gender || ""}
              onChange={handleInputChange}
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="form-group">
            <label>Nationality</label>
            <input
              type="text"
              name="nationality_id"
              className="form-control"
              value={formData.nationality_id || ""}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Row 3: Religion & Status */}
        <div className="form-row">
          <div className="form-group">
            <label>Religion</label>
            <input
              type="text"
              name="religion"
              className="form-control"
              value={formData.religion || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Marital Status</label>
            <select
              name="marital_status"
              className="form-control"
              value={formData.marital_status || ""}
              onChange={handleInputChange}
            >
              <option value="">Select</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>
          <div className="form-group">
            <label>Place of Birth</label>
            <input
              type="text"
              name="place_of_birth"
              className="form-control"
              value={formData.place_of_birth || ""}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Row 4: Contact */}
        <div className="form-row">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email_id"
              className="form-control"
              value={formData.email_id || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Contact No. 1</label>
            <input
              type="text"
              name="contact_no_1"
              className="form-control"
              value={formData.contact_no_1 || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Contact No. 2</label>
            <input
              type="text"
              name="contact_no_2"
              className="form-control"
              value={formData.contact_no_2 || ""}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Row 5: Address */}
        <div className="form-row">
          <div className="form-group">
            <label>House No.</label>
            <input
              type="text"
              name="house_no"
              className="form-control"
              value={formData.house_no || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Building Name</label>
            <input
              type="text"
              name="building_name"
              className="form-control"
              value={formData.building_name || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Street/Area</label>
            <input
              type="text"
              name="residence_address"
              className="form-control"
              value={formData.residence_address || ""}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Row 6: Location */}
        <div className="form-row">
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city_id"
              className="form-control"
              value={formData.city_id || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>State/Province</label>
            <input
              type="text"
              name="state_id"
              className="form-control"
              value={formData.state_id || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Country</label>
            <select
              name="country_id"
              className="form-control"
              value={formData.country_id || ""}
              onChange={handleInputChange}
            >
              <option value="">Select Country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 7: Travel & Documents */}
        <div className="form-row">
          <div className="form-group">
            <label>Domestic Airport</label>
            <input
              type="text"
              name="domestic_airport"
              className="form-control"
              value={formData.domestic_airport || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>International Airport</label>
            <input
              type="text"
              name="international_airport"
              className="form-control"
              value={formData.international_airport || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>INDOS Number</label>
            <input
              type="text"
              name="indos_number"
              className="form-control"
              value={formData.indos_number || ""}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Row 8: Availability */}
        <div className="form-row">
          <div className="form-group">
            <label>Availability Date</label>
            <input
              type="date"
              name="availability_date"
              className="form-control"
              value={formData.availability_date || ""}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          💾 Update Candidate
        </button>
      </div>
    </form>
  );
};

const NokSection = ({ nokDocs, candidateData, onAddNew }) => {
  return (
    <div className="nok-section">
      <div className="section-header">
        <h3>👨‍👩‍👧‍👦 Next of Kin Information</h3>
        <button className="btn btn-primary" onClick={onAddNew}>
          ➕ Add New NOK
        </button>
      </div>

      {nokDocs.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Relationship</th>
              <th>Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {nokDocs.map((nok) => (
              <tr key={nok.id}>
                <td>{nok.name || "-"}</td>
                <td>{nok.relationship || "-"}</td>
                <td>{nok.contact || "-"}</td>
                <td>
                  <button className="btn btn-danger btn-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : candidateData && candidateData.nok_name ? (
        <div className="info-card">
          <div className="info-row">
            <span className="info-label">Name:</span>
            <span className="info-value">{candidateData.nok_name || "-"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Relationship:</span>
            <span className="info-value">
              {candidateData.nok_relationship || "-"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Contact:</span>
            <span className="info-value">
              {candidateData.nok_contact_number || "-"}
            </span>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>No Next of Kin information available</p>
          <button className="btn btn-primary" onClick={onAddNew}>
            ➕ Add NOK Information
          </button>
        </div>
      )}
    </div>
  );
};

const AdditionalInfoSection = ({ additionalInfo, candidateData, onEdit }) => {
  const hasInfo = candidateData.height || candidateData.weight;

  return (
    <div className="additional-info-section">
      <div className="section-header">
        <h3>📏 Physical Details</h3>
        <button className="btn btn-primary" onClick={onEdit}>
          {hasInfo ? "✏️ Edit" : "➕ Add"} Physical Details
        </button>
      </div>

      {hasInfo ? (
        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon">📏</div>
            <div className="info-content">
              <span className="info-label">Height</span>
              <span className="info-value">{candidateData.height || "-"}</span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">⚖️</div>
            <div className="info-content">
              <span className="info-label">Weight</span>
              <span className="info-value">{candidateData.weight || "-"}</span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">👁️</div>
            <div className="info-content">
              <span className="info-label">Eye Colour</span>
              <span className="info-value">
                {candidateData.eye_color?.toUpperCase() || "-"}
              </span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">💇</div>
            <div className="info-content">
              <span className="info-label">Hair Colour</span>
              <span className="info-value">
                {candidateData.hair_color?.toUpperCase() || "-"}
              </span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">🔍</div>
            <div className="info-content">
              <span className="info-label">Identification Mark</span>
              <span className="info-value">
                {candidateData.identification_mark?.toUpperCase() || "-"}
              </span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">📊</div>
            <div className="info-content">
              <span className="info-label">BMI</span>
              <span className="info-value">
                {candidateData.bmi?.toUpperCase() || "-"}
              </span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">👔</div>
            <div className="info-content">
              <span className="info-label">Boiler Suit Size</span>
              <span className="info-value">
                {candidateData.boiler_suit_size || "-"}
              </span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">👟</div>
            <div className="info-content">
              <span className="info-label">Shoe Size</span>
              <span className="info-value">
                {candidateData.shoe_size || "-"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>No physical details available</p>
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
const NokModal = ({ show, onClose, candidateId }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add / Edit NOK</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form>
          <div className="form-group">
            <label>NOK Name</label>
            <input type="text" className="form-control" />
          </div>
          <div className="form-group">
            <label>Relationship</label>
            <input type="text" className="form-control" />
          </div>
          <div className="form-group">
            <label>Contact Number</label>
            <input type="text" className="form-control" />
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
