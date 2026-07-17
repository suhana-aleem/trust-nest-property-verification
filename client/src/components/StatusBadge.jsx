const toneByStatus = {
  Uploaded: "badge-gray",
  "AI Verified": "badge-blue",
  "Admin Approved": "badge-green",
  "Admin Rejected": "badge-orange",
  "Corrections Requested": "badge-orange",
  "Blockchain Registered": "badge-orange",
  Locked: "badge-green"
};

function StatusBadge({ status }) {
  return <span className={`badge ${toneByStatus[status] || "badge-gray"}`}>{status}</span>;
}

export default StatusBadge;
