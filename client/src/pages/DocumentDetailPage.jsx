import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import VerdictBadge from "../components/VerdictBadge";
import SuggestionBoard from "../components/SuggestionBoard";
import WorkflowSummary from "../components/WorkflowSummary";
import {
  analyzeDocumentApi,
  adminDecisionApi,
  approveBuyerApi,
  approveLegalApi,
  approveRegistrarApi,
  approveSellerApi,
  commentSuggestionApi,
  deleteDocumentApi,
  getCertificateApi,
  getDocumentPreviewBlobApi,
  createSuggestionApi,
  getDocumentApi,
  getLatestVerificationReportForDocumentApi,
  getSuggestionsApi,
  getVerificationReportApi,
  issueCertificateApi,
  lockDocumentApi,
  registerBlockchainApi,
  reviewSuggestionApi,
  verifyDocumentApi,
  verifyBlockchainApi
} from "../api/documentApi";
import { useAuth } from "../context/AuthContext";

function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [document, setDocument] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [blockchainState, setBlockchainState] = useState(null);
  const [verificationReport, setVerificationReport] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewVariants, setPreviewVariants] = useState({ grayscale: "", preprocessed: "" });
  const [previewProcessing, setPreviewProcessing] = useState(false);
  const [previewProcessingError, setPreviewProcessingError] = useState("");
  const [certificatePreviewUrl, setCertificatePreviewUrl] = useState("");
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [certificateError, setCertificateError] = useState("");
  const [showVerificationLogs, setShowVerificationLogs] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const canVerify = ["Admin", "LegalOfficer", "Seller", "Buyer"].includes(user?.role);
  const isRegistrar = user?.role === "Registrar";
  const isAdmin = user?.role === "Admin";
  const isParticipant = ["Seller", "Buyer"].includes(user?.role);
  const canEditOfficialDraft = ["Registrar", "Admin"].includes(user?.role) && !document?.isLocked;
  const canDeleteDocument = isAdmin && !document?.isLocked;

  const loadDocument = async () => {
    const [documentData, suggestionData] = await Promise.all([
      getDocumentApi(id),
      getSuggestionsApi(id)
    ]);
    setDocument(documentData.document);
    setSuggestions(suggestionData.suggestions || []);
    try {
      const reportData = await getLatestVerificationReportForDocumentApi(id);
      setVerificationReport(reportData.verificationReport);
    } catch {
      setVerificationReport(null);
    }
  };

  useEffect(() => {
    loadDocument().catch((err) => setError(err.response?.data?.message || "Failed to load"));
  }, [id]);

  useEffect(() => {
    let nextUrl = "";

    const loadPreview = async () => {
      if (!document?.canPreviewInline) {
        setPreviewUrl("");
        return;
      }

      try {
        const blob = await getDocumentPreviewBlobApi(id);
        nextUrl = URL.createObjectURL(blob);
        setPreviewUrl(nextUrl);
      } catch {
        setPreviewUrl("");
      }
    };

    loadPreview();

    return () => {
      if (nextUrl) {
        URL.revokeObjectURL(nextUrl);
      }
    };
  }, [document?.canPreviewInline, id]);

  useEffect(() => {
    let nextUrl = "";

    const loadCertificate = async () => {
      if (!document?.certificateIssued) {
        setCertificatePreviewUrl("");
        setCertificateError("");
        setCertificateLoading(false);
        return;
      }

      setCertificateLoading(true);
      setCertificateError("");

      try {
        const blob = await getCertificateApi(id);
        nextUrl = URL.createObjectURL(blob);
        setCertificatePreviewUrl(nextUrl);
      } catch {
        setCertificatePreviewUrl("");
        setCertificateError("We could not load the issued certificate.");
      } finally {
        setCertificateLoading(false);
      }
    };

    loadCertificate();

    return () => {
      if (nextUrl) {
        URL.revokeObjectURL(nextUrl);
      }
    };
  }, [document?.certificateIssued, id]);

  useEffect(() => {
    let cancelled = false;

    const buildImageVariants = async () => {
      if (!document?.previewMimeType?.startsWith("image/") || !previewUrl) {
        setPreviewVariants({ grayscale: "", preprocessed: "" });
        setPreviewProcessing(false);
        setPreviewProcessingError("");
        return;
      }

      setPreviewProcessing(true);
      setPreviewProcessingError("");

      try {
        const image = new Image();
        image.src = previewUrl;
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });

        if (cancelled) {
          return;
        }

        const { naturalWidth: width, naturalHeight: height } = image;
        const grayscaleCanvas = window.document.createElement("canvas");
        grayscaleCanvas.width = width;
        grayscaleCanvas.height = height;
        const grayscaleContext = grayscaleCanvas.getContext("2d");
        grayscaleContext.drawImage(image, 0, 0);
        const grayscaleData = grayscaleContext.getImageData(0, 0, width, height);

        for (let index = 0; index < grayscaleData.data.length; index += 4) {
          const r = grayscaleData.data[index];
          const g = grayscaleData.data[index + 1];
          const b = grayscaleData.data[index + 2];
          const luminance = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
          grayscaleData.data[index] = luminance;
          grayscaleData.data[index + 1] = luminance;
          grayscaleData.data[index + 2] = luminance;
        }

        grayscaleContext.putImageData(grayscaleData, 0, 0);

        const preprocessedCanvas = window.document.createElement("canvas");
        preprocessedCanvas.width = width;
        preprocessedCanvas.height = height;
        const preprocessedContext = preprocessedCanvas.getContext("2d");
        preprocessedContext.drawImage(grayscaleCanvas, 0, 0);
        const preprocessedData = preprocessedContext.getImageData(0, 0, width, height);

        for (let index = 0; index < preprocessedData.data.length; index += 4) {
          const value = preprocessedData.data[index];
          const sharpened = value > 168 ? 255 : 0;
          preprocessedData.data[index] = sharpened;
          preprocessedData.data[index + 1] = sharpened;
          preprocessedData.data[index + 2] = sharpened;
        }

        preprocessedContext.putImageData(preprocessedData, 0, 0);

        setPreviewVariants({
          grayscale: grayscaleCanvas.toDataURL("image/png"),
          preprocessed: preprocessedCanvas.toDataURL("image/png")
        });
      } catch (err) {
        if (!cancelled) {
          setPreviewVariants({ grayscale: "", preprocessed: "" });
          setPreviewProcessingError("We could not generate the grayscale and preprocessed previews for this file.");
        }
      } finally {
        if (!cancelled) {
          setPreviewProcessing(false);
        }
      }
    };

    buildImageVariants();

    return () => {
      cancelled = true;
    };
  }, [document?.previewMimeType, previewUrl]);

  const act = async (fn, successLabel) => {
    setError("");
    setActionMsg("");
    try {
      const data = await fn();
      setActionMsg(data.message || successLabel);
      await loadDocument();
    } catch (err) {
      setError(err.response?.data?.message || "Action failed");
    }
  };

  const handleDeleteDocument = async () => {
    setError("");
    setActionMsg("");
    setDeleteLoading(true);
    try {
      const data = await deleteDocumentApi(id);
      setActionMsg(data.message || "Document deleted");
      setDeleteDialogOpen(false);
      navigate("/admin/dashboard", {
        replace: true,
        state: { message: data.message || "Document deleted successfully." }
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete document");
    } finally {
      setDeleteLoading(false);
    }
  };

  const downloadPreviewImage = (href, fileName) => {
    const link = window.document.createElement("a");
    link.href = href;
    link.download = fileName;
    link.click();
  };

  const downloadCertificate = async () => {
    try {
      const blob = await getCertificateApi(id, { download: true });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${(document?.certificateNumber || document?.title || "certificate").replace(/[^\w.-]+/g, "_")}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download certificate");
    }
  };

  if (!document) return <p className="page-msg">Loading document...</p>;

  const showVerifyDocument = canVerify && !document.isLocked;
  const showAdminApprove = isAdmin && document.status === "AI Verified";
  const showAdminCorrections = isAdmin && ["AI Verified", "Admin Rejected", "Corrections Requested"].includes(document.status);
  const showRegisterBlockchain = isRegistrar && document.status === "Admin Approved";
  const showLockDocument = isRegistrar && document.status === "Blockchain Registered";
  const showIssueCertificate = isRegistrar && document.status === "Locked" && !document.certificateIssued;
  const verdictLabelByStatus = {
    "VERIFIED GENUINE": "Certified Genuine",
    SUSPICIOUS: "Suspicious",
    "HIGH RISK / FAKE": "High Risk / Fake"
  };
  const verdictLabel = verdictLabelByStatus[document.aiAnalysis?.genuineVerdict] || "Not verified yet";

  return (
    <>
      <Navbar />
      <main className="container">
        <section className="card">
          <div className="detail-head">
            <div>
              <p className="eyebrow">Review File</p>
              <h2>{document.title}</h2>
              <p className="detail-meta">Property Title: {document.propertyTitle}</p>
              <p className="detail-meta">Property ID: {document.propertyId}</p>
              <p className="detail-meta">Type: {document.documentType === "Original" ? "Registrar Original" : "Submitted Copy"}</p>
              {document.sourceDocument ? (
                <p className="detail-meta">
                  Compared Against: {document.sourceDocument.title} ({document.sourceDocument.propertyId})
                </p>
              ) : null}
              <p className="detail-meta">File: {document.fileName}</p>
            </div>
            <div className="detail-status">
              <span className="detail-label">Current State</span>
              <StatusBadge status={document.status} />
              <span className="detail-label">AI Verdict</span>
              <VerdictBadge verdict={document.aiAnalysis?.genuineVerdict || document?.latestVerificationReport?.status || "Pending"} />
            </div>
          </div>
          <div className="action-stack">
            {showVerifyDocument ? (
              <div className="action-group">
                <span className="action-group-title">{isParticipant ? "Verification" : "Review"}</span>
                <div className="btn-row">
                  <button
                    className="btn"
                    onClick={async () => {
                      setError("");
                      setActionMsg("");
                      try {
                        const data = await verifyDocumentApi(id);
                        setVerificationReport(data.verificationReport);
                        setActionMsg(data.message || "Verification report generated");
                        await loadDocument();
                      } catch (err) {
                        setError(err.response?.data?.message || "Verification failed");
                      }
                    }}
                  >
                    Verify Document
                  </button>
                  {canEditOfficialDraft ? (
                    <Link className="btn btn-link" to={`/documents/${id}/editor`}>
                      Edit Official Document
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isAdmin ? (
              <div className="action-group">
                <span className="action-group-title">Admin Decision</span>
                <div className="btn-row">
                  {showAdminApprove ? (
                    <button
                      className="btn"
                      onClick={() => act(() => adminDecisionApi(id, { verdict: "Approved" }), "Admin approved document")}
                    >
                      Approve
                    </button>
                  ) : null}
                  {showAdminCorrections ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        act(
                          () => adminDecisionApi(id, { verdict: "CorrectionsRequested" }),
                          "Admin requested corrections"
                        )
                      }
                    >
                      Request Corrections
                    </button>
                  ) : null}
                  {showAdminCorrections ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() => act(() => adminDecisionApi(id, { verdict: "Rejected" }), "Admin rejected document")}
                    >
                      Reject
                    </button>
                  ) : null}
                  {canDeleteDocument ? (
                    <button className="btn btn-danger" type="button" onClick={() => setDeleteDialogOpen(true)}>
                      Delete Document
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isRegistrar ? (
              <div className="action-group">
                <span className="action-group-title">Registrar Actions</span>
                <div className="btn-row">
                  {showRegisterBlockchain ? (
                    <button
                      className="btn"
                      onClick={() => act(() => registerBlockchainApi(id), "Registered on blockchain")}
                    >
                      Register Blockchain
                    </button>
                  ) : null}
                  {showLockDocument ? (
                    <button
                      className="btn"
                      onClick={() => act(() => lockDocumentApi(id), "Document locked")}
                    >
                      Lock Document
                    </button>
                  ) : null}
                  {showIssueCertificate ? (
                    <button
                      className="btn"
                      onClick={() => act(() => issueCertificateApi(id), "Certificate issued")}
                    >
                      Issue Certificate
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          {actionMsg ? <p className="success">{actionMsg}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Document Preview</p>
              <h3>File Inspection</h3>
            </div>
          </div>
          {document.canPreviewInline && previewUrl ? (
            <div className="preview-layout">
              <div className="document-preview-frame">
                {document.previewMimeType?.startsWith("image/") ? (
                  <img className="document-preview-image" src={previewUrl} alt={document.fileName} />
                ) : (
                  <iframe className="document-preview-pdf" src={previewUrl} title={document.fileName} />
                )}
              </div>
              <div className="inspection-sidebar">
                <article className="inspection-card">
                  <span className="inspection-label">Preview Mode</span>
                  <strong>{document.previewMimeType?.startsWith("image/") ? "Image" : "PDF"}</strong>
                  <p className="section-copy">
                    This preview is streamed from the protected backend endpoint so the document stays access-controlled.
                  </p>
                </article>
                <article className="inspection-card">
                  <span className="inspection-label">Linked Original</span>
                  <strong>{document.sourceDocument?.title || "Authoritative original file"}</strong>
                  <p className="section-copy">
                    {document.sourceDocument
                      ? `Copy validation uses the registrar original "${document.sourceDocument.title}".`
                      : "Original reference documents are the source-of-truth records for future copy verification."}
                  </p>
                </article>
              </div>
            </div>
          ) : (
            <p className="section-copy">
              Inline preview is currently available for PDF, JPG, JPEG, PNG, and WEBP files. This file can still be
              reviewed through its verification report and metadata.
            </p>
          )}
        </section>

        {document.previewMimeType?.startsWith("image/") && previewUrl ? (
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Screenshot Views</p>
                <h3>Original, Grayscale, and Preprocessed Preview</h3>
              </div>
            </div>
            {previewProcessingError ? <p className="error">{previewProcessingError}</p> : null}
            {previewProcessing ? <p className="hint">Generating grayscale and preprocessed image previews...</p> : null}
            <div className="preview-variants">
              <article className="preview-variant">
                <div className="preview-variant-head">
                  <div>
                    <p className="inspection-label">Original Preview</p>
                    <p className="section-copy">Use this for the first screenshot.</p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() =>
                      downloadPreviewImage(previewUrl, `${document.fileName}-original.png`)
                    }
                  >
                    Download
                  </button>
                </div>
                <img className="preview-variant-image" src={previewUrl} alt={`${document.fileName} original`} />
              </article>

              <article className="preview-variant">
                <div className="preview-variant-head">
                  <div>
                    <p className="inspection-label">Grayscale Preview</p>
                    <p className="section-copy">Use this for the second screenshot.</p>
                  </div>
                  {previewVariants.grayscale ? (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => downloadPreviewImage(previewVariants.grayscale, `${document.fileName}-grayscale.png`)}
                    >
                      Download
                    </button>
                  ) : null}
                </div>
                {previewVariants.grayscale ? (
                  <img className="preview-variant-image" src={previewVariants.grayscale} alt={`${document.fileName} grayscale`} />
                ) : (
                  <div className="preview-variant-placeholder">Grayscale preview will appear here.</div>
                )}
              </article>

              <article className="preview-variant">
                <div className="preview-variant-head">
                  <div>
                    <p className="inspection-label">Preprocessed Preview</p>
                    <p className="section-copy">Use this for the third screenshot.</p>
                  </div>
                  {previewVariants.preprocessed ? (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() =>
                        downloadPreviewImage(previewVariants.preprocessed, `${document.fileName}-preprocessed.png`)
                      }
                    >
                      Download
                    </button>
                  ) : null}
                </div>
                {previewVariants.preprocessed ? (
                  <img
                    className="preview-variant-image"
                    src={previewVariants.preprocessed}
                    alt={`${document.fileName} preprocessed`}
                  />
                ) : (
                  <div className="preview-variant-placeholder">Preprocessed preview will appear here.</div>
                )}
              </article>
            </div>
          </section>
        ) : null}

        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Machine Review</p>
              <h3>AI Analysis</h3>
            </div>
            {isParticipant && document?.aiAnalysis ? (
              <button className="btn btn-secondary" type="button" onClick={() => setShowVerificationLogs((value) => !value)}>
                {showVerificationLogs ? "Clear Logs" : "Show Logs"}
              </button>
            ) : null}
          </div>
          {showVerificationLogs ? (
            <>
              <div className="summary-grid">
                <article className="summary-card">
                  <span>Authenticity</span>
                  <strong>{verdictLabel}</strong>
                </article>
                <article className="summary-card">
                  <span>Forgery Probability</span>
                  <strong>{document.aiAnalysis?.forgeryProbability ?? "N/A"}</strong>
                </article>
                <article className="summary-card">
                  <span>Signature Score</span>
                  <strong>{document.aiAnalysis?.signatureScore ?? "N/A"}</strong>
                </article>
                <article className="summary-card">
                  <span>Checked At</span>
                  <strong>
                    {document.aiAnalysis?.analyzedAt
                      ? new Date(document.aiAnalysis.analyzedAt).toLocaleString()
                      : "Not available"}
                  </strong>
                </article>
              </div>
              {document.aiAnalysis?.extractedText ? (
                <div className="reference-panel">
                  <p className="eyebrow">OCR Extract</p>
                  <p className="section-copy">{document.aiAnalysis.extractedText}</p>
                </div>
              ) : null}
              {document.referenceCheck?.summary ? (
                <div className="reference-panel">
                  <p className="eyebrow">Original Comparison</p>
                  <p className="section-copy">{document.referenceCheck.summary}</p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="reference-panel">
              <p className="eyebrow">Logs Hidden</p>
              <p className="section-copy">Verification details are cleared from the screen.</p>
            </div>
          )}
        </section>

        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Authenticity Report</p>
              <h3>Verification Summary</h3>
            </div>
          </div>
          {showVerificationLogs && verificationReport ? (
            <>
              <div className="summary-grid">
                <article className="summary-card">
                  <span>Verification Status</span>
                  <strong>{verificationReport.status}</strong>
                </article>
                <article className="summary-card">
                  <span>Confidence Score</span>
                  <strong>{verificationReport.confidenceScore}%</strong>
                </article>
                <article className="summary-card">
                  <span>Forgery Probability</span>
                  <strong>{verificationReport.forgeryProbability ?? "N/A"}</strong>
                </article>
                <article className="summary-card">
                  <span>Verified By</span>
                  <strong>{verificationReport.verifiedBy?.name || "Unknown"}</strong>
                </article>
              </div>
              <div className="reference-panel">
                <p className="eyebrow">Verification Summary</p>
                <p className="section-copy">{verificationReport.verificationSummary}</p>
                <div className="risk-visualization">
                  <article className="risk-visual-card">
                    <span>Risk Level</span>
                    <div className="risk-meter">
                      <div
                        className="risk-meter-fill"
                        style={{ width: `${Math.max(6, verificationReport.forgeryProbability * 100 || 0)}%` }}
                      />
                    </div>
                    <strong>{verificationReport.status}</strong>
                  </article>
                  <article className="risk-visual-card">
                    <span>Suspicious Signals</span>
                    <strong>{verificationReport.suspiciousAreas?.length || 0}</strong>
                    <p className="section-copy">Combined from tamper markers, original mismatch checks, and AI risk cues.</p>
                  </article>
                </div>
                {verificationReport.suspiciousAreas?.length ? (
                  <div className="suspicious-grid">
                    {verificationReport.suspiciousAreas.map((area, index) => (
                      <article className="suspicious-card" key={`${area}-${index}`}>
                        <span className="suspicious-index">Flag {index + 1}</span>
                        <p>{area}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
                {verificationReport.tamperedRegions?.length ? (
                  <div className="tamper-pills">
                    {verificationReport.tamperedRegions.map((region, index) => (
                      <span className="tamper-pill" key={`${region}-${index}`}>
                        {region}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="inline-actions">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await getVerificationReportApi(verificationReport._id);
                        setVerificationReport(data.verificationReport);
                      } catch (err) {
                        setError(err.response?.data?.message || "Failed to refresh verification report");
                      }
                    }}
                    >
                      Refresh Report
                    </button>
                  {isParticipant ? (
                    <button className="btn btn-secondary" type="button" onClick={() => setShowVerificationLogs(false)}>
                      Clear Logs
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="reference-panel">
              <p className="eyebrow">{showVerificationLogs ? "No Verification Report" : "Logs Cleared"}</p>
              <p className="section-copy">
                {showVerificationLogs
                  ? "No verification report yet. Run AI verification or use Verify Document to create one."
                  : "The verification log is hidden from view. Use Show Logs to bring it back."}
              </p>
              {!showVerificationLogs ? (
                <button className="btn btn-secondary" type="button" onClick={() => setShowVerificationLogs(true)}>
                  Show Logs
                </button>
              ) : null}
            </div>
          )}
        </section>

        <WorkflowSummary document={document} blockchainState={blockchainState} />

        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Certificate</p>
              <h3>Verification Certificate</h3>
            </div>
          </div>

          {document.certificateIssued ? (
            <>
              <div className="summary-grid">
                <article className="summary-card">
                  <span>Certificate Number</span>
                  <strong>{document.certificateNumber}</strong>
                </article>
                <article className="summary-card">
                  <span>Current Verdict</span>
                  <strong>{document.aiAnalysis?.genuineVerdict || verificationReport?.status || "Pending"}</strong>
                </article>
                <article className="summary-card">
                  <span>Status</span>
                  <strong>{document.status}</strong>
                </article>
                <article className="summary-card">
                  <span>Preview State</span>
                  <strong>{certificateLoading ? "Loading..." : certificatePreviewUrl ? "Ready" : "Unavailable"}</strong>
                </article>
              </div>

              {certificateError ? <p className="error">{certificateError}</p> : null}

              <div className="btn-row">
                <button className="btn btn-secondary" type="button" onClick={downloadCertificate}>
                  Download Certificate
                </button>
                {certificatePreviewUrl ? (
                  <a className="btn" href={certificatePreviewUrl} target="_blank" rel="noreferrer">
                    Open in New Tab
                  </a>
                ) : null}
              </div>

              {certificatePreviewUrl ? (
                <div className="reference-panel" style={{ marginTop: "1rem" }}>
                  <iframe
                    className="document-preview-pdf"
                    src={certificatePreviewUrl}
                    title={`${document.certificateNumber} certificate`}
                    style={{ minHeight: "900px" }}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div className="reference-panel">
              <p className="eyebrow">Pending</p>
              <p className="section-copy">
                No certificate has been issued yet. Once the registrar issues it, you will be able to preview and download the PDF here.
              </p>
            </div>
          )}
        </section>

        <SuggestionBoard
          user={user}
          suggestions={suggestions}
          disabled={document.isLocked}
          onCreateSuggestion={async (payload) => {
            await createSuggestionApi(id, payload);
            await loadDocument();
          }}
          onReviewSuggestion={async (suggestionId, payload) => {
            await reviewSuggestionApi(id, suggestionId, payload);
            await loadDocument();
          }}
          onCommentSuggestion={async (suggestionId, payload) => {
            await commentSuggestionApi(id, suggestionId, payload);
            await loadDocument();
          }}
        />

        {deleteDialogOpen ? (
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={() => {
              if (!deleteLoading) {
                setDeleteDialogOpen(false);
              }
            }}
          >
            <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-document-title" onClick={(event) => event.stopPropagation()}>
              <p className="eyebrow">Confirmation</p>
              <h3 id="delete-document-title">Delete Verification Record</h3>
              <p className="modal-message">
                Are you sure you want to remove this document verification record? This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
                  Cancel
                </button>
                <button className="btn btn-danger" type="button" onClick={handleDeleteDocument} disabled={deleteLoading}>
                  {deleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}

export default DocumentDetailPage;
