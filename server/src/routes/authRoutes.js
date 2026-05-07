const express = require("express");
const {
  register,
  inviteRegister,
  login,
  adminLogin,
  me,
  generateInviteCode,
  listInviteCodes,
  listUsers
} = require("../controllers/authController");
const { protect } = require("../middlewares/auth");
const { authorize } = require("../middlewares/rbac");
const { validateRequest } = require("../middlewares/validate");
const { buildRateLimiter } = require("../middlewares/rateLimit");
const {
  registerValidation,
  loginValidation,
  adminInviteValidation,
  inviteRegisterValidation
} = require("../validators/authValidator");
const { USER_ROLES } = require("../utils/constants");
const { env } = require("../config/env");

const router = express.Router();
const authLimiter = buildRateLimiter({
  windowMs: env.authWindowMs,
  max: env.authMaxRequests,
  message: "Too many authentication attempts. Please try again later."
});

router.post("/register", authLimiter, registerValidation, validateRequest, register);
router.post("/login", authLimiter, loginValidation, validateRequest, login);
router.post("/admin/login", authLimiter, loginValidation, validateRequest, adminLogin);
router.post(
  "/admin/invite-register",
  authLimiter,
  inviteRegisterValidation,
  validateRequest,
  inviteRegister
);
router.get("/me", protect, me);
router.get(
  "/admin/users",
  protect,
  authorize(USER_ROLES.ADMIN),
  listUsers
);
router.get(
  "/admin/invites",
  protect,
  authorize(USER_ROLES.ADMIN),
  listInviteCodes
);
router.post(
  "/admin/invites",
  protect,
  authorize(USER_ROLES.ADMIN),
  adminInviteValidation,
  validateRequest,
  generateInviteCode
);

module.exports = router;
