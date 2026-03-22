const express = require("express");

const { loginAdmin } = require("../controllers/adminController");
const {
  createOffice,
  updateOffice,
  deleteOffice
} = require("../controllers/officeController");
const {
  getAllEnquiries,
  updateEnquiryStatus
} = require("../controllers/enquiryController");
const { protectAdmin } = require("../middleware/authMiddleware");
const loginRateLimiter = require("../middleware/loginRateLimiter");
const upload = require("../middleware/uploadMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");
const {
  adminLoginValidation,
  createOfficeValidation,
  updateOfficeValidation,
  enquiryStatusValidation
} = require("../middleware/validators");

const router = express.Router();

router.get("/login", (req, res) => {
  return res.status(200).json({
    message: "Use POST /api/admin/login with email and password in JSON body"
  });
});

router.post("/login", loginRateLimiter, adminLoginValidation, validateRequest, loginAdmin);

router.post(
  "/offices",
  protectAdmin,
  upload.array("images", 10),
  createOfficeValidation,
  validateRequest,
  createOffice
);
router.put(
  "/offices/:id",
  protectAdmin,
  upload.array("images", 10),
  updateOfficeValidation,
  validateRequest,
  updateOffice
);
router.delete("/offices/:id", protectAdmin, deleteOffice);

router.get("/enquiries", protectAdmin, getAllEnquiries);
router.put("/enquiries/:id/status", protectAdmin, enquiryStatusValidation, validateRequest, updateEnquiryStatus);

module.exports = router;
