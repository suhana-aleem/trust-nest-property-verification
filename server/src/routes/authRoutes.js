const express = require("express");
const {
  register,
  inviteRegister,
  login,
  adminLogin,
  me,
  refreshAccessToken,
  logout,
  generateInviteCode,
  listInviteCodes,
  listUsers,
  blockUser,
  unblockUser
} = require("../controllers/authController");
const { protect } = require("../middlewares/auth");
const { authorize } = require("../middlewares/rbac");
const { validateRequest } = require("../middlewares/validate");
const { buildRateLimiter } = require("../middlewares/rateLimit");
const {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  adminInviteValidation,
  inviteRegisterValidation,
  blockUserValidation
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
router.post("/refresh", authLimiter, refreshTokenValidation, validateRequest, refreshAccessToken);
router.post("/logout", logout);
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
router.patch(
  "/admin/users/:id/block",
  protect,
  authorize(USER_ROLES.ADMIN),
  blockUserValidation,
  validateRequest,
  blockUser
);
router.patch(
  "/admin/users/:id/unblock",
  protect,
  authorize(USER_ROLES.ADMIN),
  unblockUser
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
