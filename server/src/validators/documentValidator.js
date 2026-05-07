const { body } = require("express-validator");
const sanitizeHtml = require("sanitize-html");

const sanitizeText = (value) =>
  sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {}
  });

const createDocumentValidation = [
  body("title")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Title must be at least 3 characters")
    .customSanitizer(sanitizeText),
  body("propertyId")
    .optional({ values: "falsy" })
    .trim()
    .customSanitizer(sanitizeText)
];

const addParticipantValidation = [
  body("userEmail")
    .isEmail()
    .withMessage("Valid collaborator email is required")
    .normalizeEmail()
];

const suggestionValidation = [
  body("suggestionText")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Suggestion text must be at least 3 characters")
    .customSanitizer(sanitizeText),
  body("context").optional().trim().customSanitizer(sanitizeText)
];

const reviewSuggestionValidation = [
  body("status")
    .isIn(["Accepted", "Rejected"])
    .withMessage("status must be Accepted or Rejected"),
  body("reviewNote").optional().trim().customSanitizer(sanitizeText)
];

const suggestionCommentValidation = [
  body("text")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Comment text is required")
    .customSanitizer(sanitizeText)
];

module.exports = {
  createDocumentValidation,
  addParticipantValidation,
  suggestionValidation,
  reviewSuggestionValidation,
  suggestionCommentValidation
};
