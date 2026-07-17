export const getVerdictMeaning = (verdict) => {
  const normalized = String(verdict || "").toUpperCase();

  if (normalized === "VERIFIED GENUINE") {
    return "The uploaded copy matched the locked registrar original and no major tamper risk was detected.";
  }

  if (normalized === "SUSPICIOUS") {
    return "The copy has mismatch signals or tamper indicators and should be reviewed manually.";
  }

  if (normalized === "HIGH RISK / FAKE") {
    return "The copy differs strongly from the locked registrar original and is likely forged.";
  }

  return "The document has not been verified yet.";
};

