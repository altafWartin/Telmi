const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;


const Like_Dislike_status = mongoose.Schema({
    userID: { type: ObjectId, ref: "User", required: true, index: true }, //own ID
    likedID: { type: ObjectId, ref: "User", required: true, index: true }, // the one who like ID
    status: { type: Number } // 0 means Accepted, 1 means Declined
});

module.exports = mongoose.model("Like_Dislike_status", Like_Dislike_status);
