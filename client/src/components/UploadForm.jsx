import { useMemo, useState } from "react";

function UploadForm({ onSubmit, loading, userRole, originals = [] }) {
  const isBackofficeUploader = ["Registrar", "Admin"].includes(userRole);
  const [title, setTitle] = useState("");
  const [propertyTitle, setPropertyTitle] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [sourceDocumentId, setSourceDocumentId] = useState("");
  const [file, setFile] = useState(null);

  const sourceOptions = useMemo(
    () =>
      originals.map((doc) => ({
        id: doc._id,
        label: `${doc.title} - ${doc.propertyId}`
      })),
    [originals]
  );

  const submit = (e) => {
    e.preventDefault();
    if (!file) return;
    if (!isBackofficeUploader && !sourceDocumentId) return;

    onSubmit({
      title,
      propertyTitle,
      propertyId,
      sourceDocumentId: isBackofficeUploader ? "" : sourceDocumentId,
      documentType: isBackofficeUploader ? "Original" : "SubmittedCopy",
      file
    });

    setTitle("");
    setPropertyTitle("");
    setPropertyId("");
    setSourceDocumentId("");
    setFile(null);
  };

  return (
    <form className="card upload-form" onSubmit={submit}>
      <div className="upload-head">
        <div>
          <p className="eyebrow">{isBackofficeUploader ? "Registrar Intake" : "Verification Intake"}</p>
          <h3>{isBackofficeUploader ? "Upload Original" : "Upload for Verification"}</h3>
          {!isBackofficeUploader ? (
            <p className="upload-note">
              Buyers and sellers can only submit copies for verification against a locked registrar original.
            </p>
          ) : null}
        </div>
        <div className="upload-role-badge">{isBackofficeUploader ? "Original" : "Verification Copy"}</div>
      </div>

      <div className="upload-grid">
        <label className="field-card">
          <span>Document Title</span>
          <input
            placeholder="Sale Deed / Lease Agreement"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label className="field-card">
          <span>Property Title</span>
          <input
            placeholder="Green Park Villa / Apartment Name"
            value={propertyTitle}
            onChange={(e) => setPropertyTitle(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="field-card field-wide">
        <span>Property ID</span>
        <input
          placeholder="PROP-TN-1001"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          required
        />
      </label>

      {!isBackofficeUploader ? (
        <label className="field-card field-wide">
          <span>Locked Registrar Original</span>
          <select
            value={sourceDocumentId}
            onChange={(e) => setSourceDocumentId(e.target.value)}
            required
            disabled={!sourceOptions.length}
          >
            <option value="">
              {sourceOptions.length ? "Select original document to verify against" : "No locked registrar originals available"}
            </option>
            {sourceOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="file-drop">
        <div>
          <span className="file-label">Document File</span>
        </div>
        <div className="file-controls">
          <input
            className="file-input"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
          <div className="file-name-chip">{file?.name || "No file selected"}</div>
        </div>
      </div>

      <button disabled={loading} className="btn upload-submit">
        {loading ? "Uploading..." : isBackofficeUploader ? "Upload Original" : "Submit for Verification"}
      </button>
    </form>
  );
}

export default UploadForm;
