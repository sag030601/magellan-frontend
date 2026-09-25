import { pickDocumentFile } from "../lib/uploadLimits";
import { SIGN_ON_DOCUMENT_CATEGORIES } from "../lib/signOnDocumentCategories";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.eml,.msg";

function fileLabel(doc) {
  const name = String(doc?.file_path || "").split("/").filter(Boolean).pop();
  return name || doc?.document_name || "Document";
}

function SavedDocumentRow({ doc, onDelete, onReplace, disabled, typeLabel }) {
  return (
    <li className={`signon-doc-file${typeLabel ? " signon-doc-file--legacy" : ""}`}>
      {typeLabel && <span className="signon-doc-legacy-type">{typeLabel}</span>}
      <span className="signon-doc-file-name" title={fileLabel(doc)}>{fileLabel(doc)}</span>
      <span className="signon-doc-file-actions">
        {doc.view_url ? (
          <>
            <a href={doc.view_url} target="_blank" rel="noopener noreferrer" className="view-file-btn">View</a>
            <a href={doc.view_url} download className="view-file-btn">Download</a>
          </>
        ) : (
          <span className="text-muted small">No file</span>
        )}
        {onReplace && (
          <label className={`view-file-btn mb-0${disabled ? " disabled" : ""}`} title="Replace this file">
            Replace
            <input
              type="file"
              hidden
              accept={ACCEPT}
              disabled={disabled}
              onChange={(e) => {
                const file = pickDocumentFile(e);
                e.target.value = "";
                if (file) onReplace(doc, file);
              }}
            />
          </label>
        )}
        {onDelete && (
          <button
            type="button"
            className="action-icon-btn action-icon-delete"
            title="Delete"
            disabled={disabled}
            onClick={() => onDelete(doc)}
          >
            <i className="fas fa-trash" />
          </button>
        )}
      </span>
    </li>
  );
}

/**
 * Seven fixed Sign-on document categories laid out like the Proposal upload grid.
 * Saved documents are grouped by `category_key`; rows without one (legacy lookup types)
 * are listed under "Other existing documents" so they stay visible.
 */
export default function SignOnDocumentsGrid({
  documents = [],
  pending,
  onAddFile,
  onRemovePending,
  onDelete,
  onReplace,
  busyKey = null,
  disabled = false,
  loading = false,
}) {
  const byCategory = new Map(SIGN_ON_DOCUMENT_CATEGORIES.map((c) => [c.key, []]));
  const legacy = [];
  for (const d of documents) {
    if (d.category_key && byCategory.has(d.category_key)) byCategory.get(d.category_key).push(d);
    else legacy.push(d);
  }

  return (
    <div className="proposal-upload-grid signon-doc-grid">
      {SIGN_ON_DOCUMENT_CATEGORIES.map(({ key, label }) => {
        const saved = byCategory.get(key);
        const staged = pending?.[key] || [];
        const isBusy = busyKey === key;
        const addDisabled = disabled || Boolean(busyKey);
        return (
          <div key={key} className="proposal-upload-item">
            <div className="proposal-upload-label">
              <span className="signon-doc-title">
                {label}
                {saved.length + staged.length > 0 && (
                  <span className="signon-doc-count">{saved.length + staged.length}</span>
                )}
              </span>
              {onAddFile && (
                <label
                  className={`signon-doc-add-btn mb-0${addDisabled ? " disabled" : ""}`}
                  title={`Add ${label} file (max 20 MB)`}
                >
                  {isBusy ? "Uploading…" : "+ Add"}
                  <input
                    type="file"
                    hidden
                    accept={ACCEPT}
                    disabled={addDisabled}
                    aria-label={`Add ${label} file`}
                    onChange={(e) => {
                      const file = pickDocumentFile(e);
                      e.target.value = "";
                      if (file) onAddFile(key, file);
                    }}
                  />
                </label>
              )}
            </div>
            {loading ? (
              <span className="text-muted small">Loading…</span>
            ) : saved.length === 0 && staged.length === 0 && !onAddFile ? (
              <span className="text-muted small">No files</span>
            ) : (
              (saved.length > 0 || staged.length > 0) && (
                <ul className="signon-doc-files">
                  {saved.map((d) => (
                    <SavedDocumentRow
                      key={d.id}
                      doc={d}
                      onDelete={onDelete}
                      onReplace={onReplace}
                      disabled={disabled || Boolean(busyKey)}
                    />
                  ))}
                  {staged.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="signon-doc-file">
                      <span className="signon-doc-file-name" title={f.name}>{f.name}</span>
                      <span className="signon-doc-file-actions">
                        <span className="text-muted small">(selected)</span>
                        {onRemovePending && (
                          <button
                            type="button"
                            className="action-icon-btn action-icon-delete"
                            title="Remove"
                            disabled={disabled}
                            onClick={() => onRemovePending(key, i)}
                          >
                            <i className="fas fa-times" />
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        );
      })}
      {legacy.length > 0 && (
        <div className="proposal-upload-item signon-doc-legacy">
          <div className="proposal-upload-label">Other existing documents</div>
          <ul className="signon-doc-files">
            {legacy.map((d) => (
              <SavedDocumentRow
                key={d.id}
                doc={d}
                typeLabel={d.document_name || "Document"}
                onDelete={onDelete}
                onReplace={onReplace}
                disabled={disabled || Boolean(busyKey)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
