const toneByVerdict = {
  "VERIFIED GENUINE": "badge-green",
  SUSPICIOUS: "badge-orange",
  "HIGH RISK / FAKE": "badge-red",
  Pending: "badge-gray",
  "Not verified yet": "badge-gray"
};

const displayLabelByVerdict = {
  "VERIFIED GENUINE": "Certified Genuine",
  SUSPICIOUS: "Suspicious",
  "HIGH RISK / FAKE": "High Risk / Fake",
  Pending: "Pending",
  "Not verified yet": "Not verified yet"
};

function VerdictBadge({ verdict }) {
  const label = verdict || "Pending";
  return <span className={`badge ${toneByVerdict[label] || "badge-gray"}`}>{displayLabelByVerdict[label] || label}</span>;
}

export default VerdictBadge;
