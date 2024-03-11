const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const Like_Dislike_Profiles = mongoose.Schema({
  userID: { type: ObjectId, ref: "User", required: true, index: true },
  requestSenderID: { type: ObjectId, ref: "User", required: true, index: true }, // the one who like ID
  status: { type: Number }, // 0 means liked, 1 means not disliked
});

module.exports = mongoose.model("Like_Dislike_Profiles", Like_Dislike_Profiles);
