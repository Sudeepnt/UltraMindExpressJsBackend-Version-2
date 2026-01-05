const express = require("express");
const router = express.Router();

const { createSourceImage } = require("../controllers/sourceImageController");

router.post("/createSourceImage", createSourceImage);

module.exports = router;
