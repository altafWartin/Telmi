const express = require("express");
const {
  getCountries,
  getStates,
  getCities,
} = require("../controller/countries.js");
const router = express.Router();

router.get("/getCities/:text", getCities);

module.exports = router;
