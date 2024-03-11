const mongoose = require("mongoose");
// const crypto = require("crypto");

const userSchema = mongoose.Schema(
  {
    user: { type: ObjectId, ref: "User", required: true },
    min_age: { type: Number },
    max_age: { type: Number }

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
