const mongoose = require("mongoose");
// const crypto = require("crypto");
const { ObjectId } = mongoose.Schema;

const userSchema = mongoose.Schema(
  {
    user: { type: ObjectId, ref: "User", required: true, index: true },
    cuisine: { type: String },
    political_views: { type: String },
    looking_for: { type: String },
    sun_sign: { type: String },
    personality: { type: String },
    first_date: { type: String },
    drink: { type: String },
    smoke: { type: String },
    religion: { type: String },
    fav_pastime: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Basic_Info", userSchema);
