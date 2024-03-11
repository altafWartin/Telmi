const express = require("express");
const {
  requireSignin,
  checkError,
  decodeToken,
} = require("../controller/user");
const {
  getProfile,
  LikedOrNotProfile,
  AddComment,
  GetComment,
  getFilterProfile,
  profileUpload,
  GetNotifications,
  getLikedDislikeProfile,
  uploadImage,
  replaceImage,
  getSingleProfile,
  updateRequestStatus,
  updateUserFields,
} = require("../controller/profile");
const router = express.Router();
const multer = require("multer");
const AWS = require("aws-sdk");

// Set up Multer to handle file uploads
const storage = multer.memoryStorage(); // Use memory storage for storing file buffers
const upload = multer({ storage: storage });

router.post("/getProfile", checkError, getProfile);
router.post("/getFilterProfile", checkError, getFilterProfile);
router.post("/sendFriendRequest", LikedOrNotProfile);
router.post("/getFriendRequest", checkError, getLikedDislikeProfile);
router.post("/updateRequestStatus", updateRequestStatus);
router.post("/addComment", AddComment);
router.post("/getComment", GetComment);
router.post("/notifications", GetNotifications);
router.post("/uploadImage", upload.single("photo"), uploadImage);
router.post('/updateUserFields', upload.fields([{ name: 'profilePhoto', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), updateUserFields);

router.post("/profileUpload", upload.single("photo"), profileUpload);
// router.post("/updateUserFields", updateUserFields);
router.post("/replaceImage", upload.single("newPhoto"), replaceImage);
router.post("/getSingleProfile", getSingleProfile);

module.exports = router;
