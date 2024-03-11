const express = require("express");
const {
  loginUser,
  getAllUsers,
  createUser,
  userExists,
  refreshToken,
  changePassword,
  updateAdditionalDetails,
  requireSignin,
  checkError,
  decodeToken,
} = require("../controller/user");
const router = express.Router();  

router.post("/loginUser", loginUser);
router.post("/changePassword", changePassword);
router.post("/getAllProfiles", getAllUsers, decodeToken,requireSignin);
router.post("/createUser", createUser);
router.post("/userExists", userExists);
router.post("/refreshToken", refreshToken);
// router.post("/secret", requireSignin, checkError, decodeToken, (req, res)=>{
//   return res.status(200).send(req.user);
// });

module.exports = router;
