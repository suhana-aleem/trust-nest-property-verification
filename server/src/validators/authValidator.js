const { body } = require("express-validator");
const { USER_ROLES } = require("../utils/constants");

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .withMessage("Password must include at least one letter and one number"),
  body("role")
    .isIn([USER_ROLES.SELLER, USER_ROLES.BUYER])
    .withMessage("Public registration is allowed only for Seller or Buyer")
];

const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required")
];

const refreshTokenValidation = [
  body("refreshToken").notEmpty().withMessage("refreshToken is required")
];

const adminInviteValidation = [
  body("role")
    .isIn([USER_ROLES.REGISTRAR])
    .withMessage("Invite role must be Registrar")
];

const inviteRegisterValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .withMessage("Password must include at least one letter and one number"),
  body("inviteCode").trim().notEmpty().withMessage("Invite code is required")
];

const blockUserValidation = [
  body("reason").optional().trim().isLength({ min: 3 }).withMessage("Block reason must be at least 3 characters")
];

module.exports = {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  adminInviteValidation,
  inviteRegisterValidation,
  blockUserValidation
};
