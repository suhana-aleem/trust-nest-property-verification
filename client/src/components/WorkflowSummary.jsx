function WorkflowSummary({ document, blockchainState }) {
  const approvals = document?.approvals || {};

  const steps = [
    { label: "Seller Approval", done: approvals.sellerApproved },
    { label: "Buyer Approval", done: approvals.buyerApproved },
    { label: "Legal Approval", done: approvals.legalApproved },
    { label: "AI Verified", done: document?.status !== "Uploaded" && Boolean(document?.aiAnalysis?.analyzedAt) },
    { label: "Registrar Approval", done: approvals.registrarApproved },
    {
      label: "Blockchain Registered",
      done: document?.status === "Blockchain Registered" || document?.status === "Locked"
    },
    { label: "Locked", done: document?.isLocked },
    { label: "Certificate Issued", done: document?.certificateIssued }
  ];

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Workflow Status</p>
          <h3>Approval Timeline</h3>
        </div>
      </div>

      <div className="timeline">
        {steps.map((step) => (
          <div className={`timeline-step ${step.done ? "is-done" : ""}`} key={step.label}>
            <span className="timeline-dot" />
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      <div className="summary-grid">
        <article className="summary-card">
          <span>Current Status</span>
          <strong>{document?.status || "Unknown"}</strong>
        </article>
        <article className="summary-card">
          <span>Certificate</span>
          <strong>{document?.certificateNumber || "Pending"}</strong>
        </article>
        <article className="summary-card">
          <span>On-chain Hash</span>
          <strong>{blockchainState === null ? "Unchecked" : blockchainState ? "Verified" : "Missing"}</strong>
        </article>
        <article className="summary-card">
          <span>Forgery Probability</span>
          <strong>
            {document?.aiAnalysis?.forgeryProbability ?? document?.aiAnalysis?.forgeryProbability === 0
              ? document.aiAnalysis.forgeryProbability
              : "N/A"}
          </strong>
        </article>
      </div>
    </section>
  );
}

export default WorkflowSummary;
