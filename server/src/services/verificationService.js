const Document = require("../models/Document");
const VerificationReport = require("../models/VerificationReport");
const { DOCUMENT_STATUS, DOCUMENT_TYPES, USER_ROLES } = require("../utils/constants");
const { analyzeDocumentBufferWithAI } = require("./aiService");
const { readStoredFile } = require("./storage/storageService");

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeCompactText = (value = "") => normalizeText(value).replace(/\s+/g, " ");

const calculateTextMatchScore = (leftText = "", rightText = "") => {
  const leftWords = new Set(normalizeText(leftText).split(" ").filter(Boolean));
  const rightWords = new Set(normalizeText(rightText).split(" ").filter(Boolean));

  if (!leftWords.size || !rightWords.size) return 0;

  let overlap = 0;
  leftWords.forEach((word) => {
    if (rightWords.has(word)) overlap += 1;
  });

  return Number((overlap / Math.max(leftWords.size, rightWords.size)).toFixed(2));
};

const buildRiskStatus = (forgeryProbability) => {
  if (forgeryProbability < 0.5) return "VERIFIED GENUINE";
  if (forgeryProbability < 0.8) return "SUSPICIOUS";
  return "HIGH RISK / FAKE";
};

const FIELD_ALIASES = {
  "document title": ["document title", "title", "deed title"],
  "property id": ["property id", "property id no", "survey number", "survey no", "plot number", "plot no"],
  "owner name": ["owner name", "property owner", "owner"],
  "buyer name": ["buyer name", "buyer", "vendee name"],
  "seller name": ["seller name", "seller", "vendor name"],
  "registration number": ["registration number", "registration no", "reg no", "document number", "doc no"],
  "sale amount": ["sale amount", "consideration amount", "amount", "sale consideration"],
  "registration status": ["registration status", "status"],
  "date of execution": ["date of execution", "execution date", "date"]
};

const SEVERE_REFERENCE_FIELDS = new Set([
  "document title",
  "property id",
  "owner name",
  "buyer name",
  "seller name",
  "registration number"
]);

const parseLabeledFields = (text = "") => {
  const fields = {};

  String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line) => {
      const match = line.match(/^([^:]{2,60}):\s*(.+)$/);
      if (!match) return;
      const label = normalizeText(match[1]);
      const value = normalizeText(match[2]);
      if (label && value) {
        fields[label] = value;
      }
    });

  return fields;
};

const findMatchingField = (fields = {}, aliases = []) => {
  const normalizedAliases = aliases.map((alias) => normalizeCompactText(alias));

  for (const [label, value] of Object.entries(fields)) {
    const normalizedLabel = normalizeCompactText(label);
    if (
      normalizedAliases.some(
        (alias) => normalizedLabel === alias || normalizedLabel.includes(alias) || alias.includes(normalizedLabel)
      )
    ) {
      return value;
    }
  }

  return "";
};

const compareImportantFields = (sourceText = "", copyText = "") => {
  const sourceFields = parseLabeledFields(sourceText);
  const copyFields = parseLabeledFields(copyText);
  const mismatches = [];

  Object.entries(FIELD_ALIASES).forEach(([canonicalLabel, aliases]) => {
    const sourceValue = findMatchingField(sourceFields, aliases);
    const copyValue = findMatchingField(copyFields, aliases);

    if (!sourceValue || !copyValue) return;

    if (sourceValue !== copyValue) {
      mismatches.push({
        label: canonicalLabel,
        sourceValue,
        copyValue
      });
    }
  });

  return { sourceFields, copyFields, mismatches };
};

const formatMismatchList = (mismatches = []) =>
  mismatches.map(({ label }) => label).filter(Boolean).join(", ");

const buildVerificationSummary = ({
  document,
  sourceDocument,
  verificationStatus,
  textMatchScore,
  titleMatch,
  propertyIdMatch,
  mismatches
}) => {
  if (document.documentType === DOCUMENT_TYPES.ORIGINAL) {
    return "Registrar original certified as the source document.";
  }

  const matchText = textMatchScore === null || textMatchScore === undefined ? "N/A" : textMatchScore;
  const fieldText = mismatches.length ? formatMismatchList(mismatches) : "no key field mismatches";

  if (verificationStatus === "VERIFIED GENUINE") {
    return `Compared against registrar original "${sourceDocument.title}". Text match ${matchText}, property ID ${
      propertyIdMatch ? "matched" : "did not match"
    }, title ${titleMatch ? "matched" : "did not match"}, with ${fieldText}. Copy accepted as genuine.`;
  }

  if (verificationStatus === "HIGH RISK / FAKE") {
    return `Compared against registrar original "${sourceDocument.title}". Text match ${matchText}, property ID ${
      propertyIdMatch ? "matched" : "did not match"
    }, title ${titleMatch ? "matched" : "did not match"}, with ${fieldText}. Copy marked as high risk / fake.`;
  }

  return `Compared against registrar original "${sourceDocument.title}". Text match ${matchText}, property ID ${
    propertyIdMatch ? "matched" : "did not match"
  }, title ${titleMatch ? "matched" : "did not match"}, with ${fieldText}. Copy requires manual review.`;
};

const buildFinalConfidenceScore = ({ document, aiResult, verificationStatus, textMatchScore, mismatches }) => {
  if (document.documentType === DOCUMENT_TYPES.ORIGINAL) return 99.99;

  const aiConfidence = Math.max(0, Math.min(100, (1 - (aiResult.forgery_probability || 0)) * 100));

  if (verificationStatus === "VERIFIED GENUINE") {
    return Number(Math.max(aiConfidence, 90).toFixed(2));
  }

  if (verificationStatus === "HIGH RISK / FAKE") {
    const penalty = (mismatches.length * 8) + (textMatchScore < 0.55 ? 15 : 0);
    return Number(Math.max(12, Math.min(aiConfidence - penalty, 39)).toFixed(2));
  }

  const moderateScore = aiConfidence * 0.7 + Math.max(0, Math.min(1, textMatchScore || 0)) * 30;
  return Number(Math.max(40, Math.min(moderateScore, 79)).toFixed(2));
};

const canRunVerification = (role) =>
  [USER_ROLES.ADMIN, USER_ROLES.REGISTRAR, USER_ROLES.SELLER, USER_ROLES.BUYER].includes(role);

const verifyDocumentWithAI = async ({ document, actor }) => {
  if (!canRunVerification(actor.role)) {
    const error = new Error("Role not allowed to run AI verification");
    error.statusCode = 403;
    throw error;
  }

  const fileBuffer = await readStoredFile(document);
  const aiResult = await analyzeDocumentBufferWithAI({
    buffer: fileBuffer,
    fileName: document.fileName
  });

  let referenceCheck = {
    textMatchScore: null,
    titleMatch: null,
    propertyIdMatch: null,
    summary: "",
    comparedAt: null
  };
  let verificationStatus = buildRiskStatus(aiResult.forgery_probability);
  let suspiciousAreas = uniqueList(aiResult.tampered_regions || []);
  let referenceMismatches = [];

  if (document.documentType === DOCUMENT_TYPES.ORIGINAL) {
    referenceCheck = {
      textMatchScore: 1,
      titleMatch: true,
      propertyIdMatch: true,
      summary: "Registrar original certified as the trusted source document.",
      comparedAt: new Date()
    };
    verificationStatus = "VERIFIED GENUINE";
    suspiciousAreas = [];
  }

  if (document.documentType === DOCUMENT_TYPES.SUBMITTED_COPY && document.sourceDocument) {
    const sourceDocument = await Document.findById(document.sourceDocument);

    if (sourceDocument) {
      let originalText = sourceDocument.currentText || sourceDocument.aiAnalysis?.extractedText || "";

      if (!originalText) {
        const originalBuffer = await readStoredFile(sourceDocument);
        const originalAiResult = await analyzeDocumentBufferWithAI({
          buffer: originalBuffer,
          fileName: sourceDocument.fileName
        });
        originalText = originalAiResult.extracted_text || "";
        sourceDocument.currentText = originalText;
        sourceDocument.aiAnalysis = {
          ...sourceDocument.aiAnalysis,
          extractedText: originalText
        };
        await sourceDocument.save();
      }

      const titleMatch = normalizeText(document.title) === normalizeText(sourceDocument.title);
      const propertyIdMatch = String(document.propertyId).trim() === String(sourceDocument.propertyId).trim();
      const textMatchScore = calculateTextMatchScore(aiResult.extracted_text || "", originalText);
      const { mismatches } = compareImportantFields(originalText, aiResult.extracted_text || "");
      referenceMismatches = mismatches;
      const severeMismatch = mismatches.some((item) => SEVERE_REFERENCE_FIELDS.has(item.label));
      const strongTamperSignal =
        (aiResult.forgery_probability || 0) >= 0.8 || (aiResult.tampered_regions || []).length >= 2;
      const cleanReferenceMatch =
        titleMatch &&
        propertyIdMatch &&
        textMatchScore >= 0.82 &&
        !mismatches.length &&
        (aiResult.forgery_probability || 0) < 0.6;

      if (!titleMatch || !propertyIdMatch || severeMismatch || (strongTamperSignal && mismatches.length > 0)) {
        verificationStatus = "HIGH RISK / FAKE";
      } else if (cleanReferenceMatch) {
        verificationStatus = "VERIFIED GENUINE";
      } else if (textMatchScore >= 0.62 || (aiResult.forgery_probability || 0) < 0.8) {
        verificationStatus = "SUSPICIOUS";
      } else {
        verificationStatus = "HIGH RISK / FAKE";
      }

      referenceCheck = {
        textMatchScore,
        titleMatch,
        propertyIdMatch,
        summary: buildVerificationSummary({
          document,
          sourceDocument,
          verificationStatus,
          textMatchScore,
          titleMatch,
          propertyIdMatch,
          mismatches
        }),
        comparedAt: new Date()
      };
      suspiciousAreas =
        verificationStatus === "VERIFIED_GENUINE"
          ? []
          : uniqueList([
              ...(aiResult.tampered_regions || []),
              ...(mismatches.length ? mismatches.map((item) => `${item.label} mismatch`) : []),
              !titleMatch ? "Document title differs from the registrar original" : "",
              !propertyIdMatch ? "Property ID differs from the registrar original" : "",
              referenceCheck.summary
            ]);
    }
  }

  const confidenceScore = buildFinalConfidenceScore({
    document,
    aiResult,
    verificationStatus,
    textMatchScore: referenceCheck.textMatchScore || 0,
    mismatches: referenceMismatches
  });

  document.aiAnalysis = {
    signatureScore: aiResult.signature_score,
    forgeryProbability: aiResult.forgery_probability,
    tamperedRegions: aiResult.tampered_regions || [],
    extractedText: aiResult.extracted_text || "",
    genuineVerdict: verificationStatus,
    analyzedAt: new Date()
  };
  document.referenceCheck = referenceCheck;
  document.currentText = aiResult.extracted_text || document.currentText;
  document.status = DOCUMENT_STATUS.AI_VERIFIED;

  const report = await VerificationReport.create({
    documentId: document._id,
    verifiedBy: actor._id,
    confidenceScore,
    status: verificationStatus,
    suspiciousAreas,
    blockchainHash: "",
    signatureScore: aiResult.signature_score,
    forgeryProbability: aiResult.forgery_probability,
    extractedText: aiResult.extracted_text || "",
    tamperedRegions: aiResult.tampered_regions || [],
    verificationSummary:
      verificationStatus === "VERIFIED GENUINE"
        ? document.documentType === DOCUMENT_TYPES.ORIGINAL
          ? "Registrar original certified as genuine."
          : "The submitted copy matched the locked registrar original."
        : verificationStatus === "HIGH RISK / FAKE"
          ? "The copy conflicts with the registrar original and should be treated as fake until manually cleared."
          : "The copy shows partial mismatches and should be reviewed manually.",
    referenceCheck
  });

  document.latestVerificationReport = report._id;
  await document.save();

  return {
    aiResult,
    referenceCheck,
    report,
    confidenceScore,
    verificationStatus
  };
};

function uniqueList(values = []) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

module.exports = {
  verifyDocumentWithAI
};
