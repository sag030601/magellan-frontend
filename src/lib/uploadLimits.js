/** Maximum upload size for document files (20 MB). */
export const MAX_DOCUMENT_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_DOCUMENT_UPLOAD_MB = 20;

/**
 * Largest total request body the proxy accepts. The Proposal form can send five
 * 20 MB files in one multipart request, so nginx `client_max_body_size` must
 * cover the sum — not just one file.
 */
export const MAX_REQUEST_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_REQUEST_UPLOAD_MB = 100;

/** Returns the file if within limit; otherwise alerts, clears the input, and returns null. */
export function rejectOversizedFile(file, inputEl) {
  if (!file) return null;
  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    alert(`File is too large. Maximum allowed size is ${MAX_DOCUMENT_UPLOAD_MB} MB.`);
    if (inputEl) inputEl.value = "";
    return null;
  }
  return file;
}

/** Read a file from a change event and enforce the upload size limit. */
export function pickDocumentFile(event) {
  const input = event?.target;
  return rejectOversizedFile(input?.files?.[0], input);
}

/**
 * Total size of the files about to be sent, so we can fail with a clear message
 * instead of nginx's HTML 413 page.
 * @param {Array<File|null|undefined>} files
 */
export function totalUploadBytes(files) {
  return (files || []).reduce((sum, f) => sum + (f?.size || 0), 0);
}

/** @param {Array<File|null|undefined>} files */
export function exceedsRequestLimit(files) {
  return totalUploadBytes(files) > MAX_REQUEST_UPLOAD_BYTES;
}

/**
 * Human-readable message for a failed upload. A 413 from nginx has an HTML body,
 * so `response.data.error` is missing and the raw axios message is unhelpful.
 * @param {any} err
 * @param {string} [fallback]
 */
export function uploadErrorMessage(err, fallback = "Save failed") {
  const status = err?.response?.status;
  const apiError = err?.response?.data?.error;
  if (status === 413) {
    return apiError && typeof apiError === "string"
      ? apiError
      : `Upload rejected: the request is larger than the server allows (limit ${MAX_REQUEST_UPLOAD_MB} MB total, ${MAX_DOCUMENT_UPLOAD_MB} MB per file). Remove or shrink a file and try again. If this keeps happening, the server's nginx client_max_body_size needs raising.`;
  }
  if (apiError && typeof apiError === "string") return apiError;
  return err?.message || fallback;
}
