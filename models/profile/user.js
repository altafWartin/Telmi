const mongoose = require("mongoose");
// const crypto = require("crypto");
const bcrypt = require("bcrypt"); // Add this line

const { ObjectId } = mongoose.Schema;

const userSchema = mongoose.Schema(
  {
    email: { type: String, index: true },
    password: { type: String },
    phoneNo: { type: Number, index: true },
    fullName: { type: String },
    profilePhoto: { type: String },
    coverPhoto: { type: String },
    images: [{ type: String }],
    gender: { type: String },
    friends: [
      {
        friendId: { type: String, required: true },
        name: { type: String, default: "" },
        profilePicture: { type: String, default: "" },
      },
    ],
    dob: { type: Date },
    designation: { type: String },
    location: { type: String }, ///
    about: { type: String }, ///
    describe: [{ type: String }],
    visibility: { type: Number, default: 0 }, //0 means Visible to everyone, 1 means private
    bio: { type: String },
    spark: { type: Number, default: 1 },
    isOnline: { type: Number, default: 0 }, //0 means online, 1 means offine
  },
  { timestamps: true }
);
userSchema.index({ loc: "2dsphere" });

// Hash the password before saving it to the database
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare the provided password with the stored hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
