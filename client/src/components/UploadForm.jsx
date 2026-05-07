import { useState } from "react";

function UploadForm({ onSubmit, loading }) {
  const [title, setTitle] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [file, setFile] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!file) return;
    onSubmit({ title, propertyId, file });
    setTitle("");
    setPropertyId("");
    setFile(null);
  };

  return (
    <form className="card form-grid" onSubmit={submit}>
      <p className="eyebrow">Seller Intake</p>
      <h3>Upload Property Document</h3>
      <p className="section-copy">
        Start a new review cycle by uploading the source property file and optional property code.
      </p>
      <input
        placeholder="Document title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        placeholder="Property ID (optional)"
        value={propertyId}
        onChange={(e) => setPropertyId(e.target.value)}
      />
      <p className="hint">If left empty, system auto-generates a Property ID.</p>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        required
      />
      <button disabled={loading} className="btn">
        {loading ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}

export default UploadForm;
