const express = require("express");

const { getAllOffices, getOfficeById } = require("../controllers/officeController");

const router = express.Router();

router.get("/offices", getAllOffices);
router.get("/offices/:id", getOfficeById);

module.exports = router;
