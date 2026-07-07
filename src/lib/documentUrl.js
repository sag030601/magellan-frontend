import { apiUrl } from "./api.js";

/** Encode each path segment; avoid mangling already-encoded `%` via blind encodeURI. */
function encodePathSegments(relPath) {
  if (relPath == null || relPath === "") return "";
  return String(relPath)
    .replace(/\\/g, "/")
    .split("/")
    .map((seg) => {
      if (seg === "") return seg;
      try {
        return encodeURIComponent(decodeURIComponent(seg));
      } catch {
        return encodeURIComponent(seg);
      }
    })
    .join("/");
}

/**
 * Normalize DB / legacy paths for static file URLs served by Express
 * (`/uploads` and `/storage` both map to the uploads root).
 */
export function documentHref(path) {
  if (path == null) return "";
  const raw = String(path).trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const lower = raw.toLowerCase();
  const stripPublic = (p) => p.replace(/^public\/?/i, "");
  const pub = stripPublic(raw);
  const pubLower = pub.toLowerCase();

  if (lower.startsWith("storage/") || lower.startsWith("uploads/")) {
    return apiUrl(`/${encodePathSegments(raw)}`);
  }

  const normalizeFolder = (p) => {
    let out = p;
    if (/^manager_chain\//i.test(out) && !/^manager_chains\//i.test(out)) {
      out = out.replace(/^manager_chain\//i, "manager_chains/");
    }
    if (/^other_document\//i.test(out) && !/^other_documents\//i.test(out)) {
      out = out.replace(/^other_document\//i, "other_documents/");
    }
    return out;
  };

  const isKnownDiskPath =
    pubLower.startsWith("agreements/") ||
    pubLower.startsWith("manager_chains/") ||
    pubLower.startsWith("manager_chain/") ||
    pubLower.startsWith("other_documents/") ||
    pubLower.startsWith("other_document/") ||
    pubLower.startsWith("vessel_documents/");

  if (isKnownDiskPath) {
    const rest = normalizeFolder(pub);
    return apiUrl(`/uploads/${encodePathSegments(rest)}`);
  }

  if (pubLower.startsWith("licences/")) {
    return apiUrl(`/uploads/${encodePathSegments(pub)}`);
  }

  if (pub.includes("/")) {
    return apiUrl(`/uploads/${encodePathSegments(normalizeFolder(pub))}`);
  }

  return apiUrl(`/storage/${encodePathSegments(pub)}`);
}

const LARAVEL_TYPE_ROOT = /^(educations|dce_docs|planings|prejoining_medicals|travel|medicals)\//i;

/** Normalize licence `upload_file` from DB to `licences/{filename}`. */
export function normalizeLicenceUploadPath(uploadFile) {
  if (uploadFile == null || String(uploadFile).trim() === "") return "";
  let rel = String(uploadFile).trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/^public\/?/i, "");
  if (/^https?:\/\//i.test(rel)) return rel;
  if (/^\d+\/licences\//i.test(rel)) return rel.replace(/^\d+\//i, "");
  if (/^licences\//i.test(rel)) return rel;
  if (rel.includes("/")) return `licences/${rel.split("/").filter(Boolean).pop()}`;
  return `licences/${rel}`;
}

/**
 * Licence file URL — disk and URL under uploads/licences/
 * DB value: licences/{filename}
 */
export function licenceDocumentUrl(_candidateId, uploadFile) {
  if (uploadFile == null || String(uploadFile).trim() === "") return "";
  const raw = String(uploadFile).trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  const rel = normalizeLicenceUploadPath(raw);
  if (!rel) return "";
  return apiUrl(`/uploads/${encodePathSegments(rel)}`);
}

/**
 * Build a URL for a candidate document file path from the DB.
 */
export function candidateDocumentUrl(candidateId, filePath) {
  if (filePath == null || String(filePath).trim() === "") return "";
  const raw = String(filePath).trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(raw)) return raw;

  let rel = raw.replace(/^\/+/, "").replace(/^public\/?/i, "");
  const cid = candidateId != null ? String(candidateId).trim() : "";

  if (/^licences\//i.test(rel) || (rel.includes("/") && /\/licences\//i.test(rel))) {
    return licenceDocumentUrl(null, rel);
  }

  if (LARAVEL_TYPE_ROOT.test(rel)) {
    return apiUrl(`/uploads/documents/${encodePathSegments(rel)}`);
  }

  if (cid && new RegExp(`^${cid}/`, "i").test(rel)) {
    return apiUrl(`/uploads/documents/${encodePathSegments(rel)}`);
  }

  if (rel.includes("/")) {
    return apiUrl(`/uploads/documents/${cid}/${encodePathSegments(rel)}`);
  }

  if (cid) {
    return apiUrl(`/uploads/documents/${cid}/${encodePathSegments(rel)}`);
  }

  return documentHref(rel);
}
