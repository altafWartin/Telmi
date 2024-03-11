const User = require("../models/profile/user");
const BasicInfo = require("../models/profile/basic_info");
var { expressjwt } = require("express-jwt");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt"); // for password hashing


exports.createUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user with the same email already exists
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      const jwtToken = jwt.sign({ _id: oldUser._id }, process.env.JWT_SECRET, {
        expiresIn: "90 days",
      });
      const userResponse = {
        _id: oldUser._id,
      };
      return res.json({
        error: "This user is already exists",
      });
    }
    

    // Create a new user with minimal information
    const newUser = new User({
      fullName,
      email,
      password,
    });

    try {
      const data = await newUser.save();
      const jwtToken = jwt.sign({ _id: data._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY,
      });
      const userResponse = {
        _id: data._id,
        fullName: data.fullName,
        email: data.email,
        // You can include additional fields if needed
      };
      console.log("signup call")
      return res.json({ user: userResponse, jwtToken });
    } catch (saveError) {
      console.error("Error saving user:", saveError);
      return res.status(400).json({ error: "Error saving user." });
    }
  } catch (error) {
    console.error("Error in createUser:", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
};


exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ error :"Invalid Email Address"});
      // return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare the provided password with the hashed password stored in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // return res.status(401).json({ error: "Invalid credentials" });
      return res.json({ error :"Invalid Password" });

    }

    // If the password is valid, create a JWT token for the user
    const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    });

    return res.json({ user, jwtToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


exports.getAllUsers = async (req, res) => {
  const { _id } = req.body;
  console.log(_id)

  console.log("Hello, fetching all users...");
  try {
    // Fetch all users from the database
    const allUsers = await User.find();

    // Log the fetched users
    // console.log("Fetched users:", allUsers);

    // Return the list of users in the response
    return res.json({ users: allUsers });
  } catch (error) {
    // Log any errors that occur during the process
    console.error("Error in getAllUsers:", error);
    return res.status(500).json({ error: error.message });
  }
};


exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, _id } = req.body;

  try {
    // Fetch the user from the database based on the user ID
    const user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("cp", currentPassword);
    console.log("np", newPassword);
    // Compare the provided current password with the hashed password stored in the database
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: "Invalid current password" });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    console.log("hashedNewPassword", hashedNewPassword);
    // Update the user's password in the database
    user.password = newPassword;
    console.log("userp", user.password);
    await user.save();

    // Create a new JWT token for the user with the updated password
    const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    });

    return res.json({ message: "Password changed successfully", jwtToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


exports.requireSignin = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
  // userProperty: "auth",
});

exports.checkError = (err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    // console.log("Profile Called");
    return res.status(401).json("invalid token...");
  } else {
    console.log(err.name);
    next(err);
  }
};

exports.decodeToken = (req, res, next) => {
  var id = req.headers.authorization.split(" ")[1];
  var decoded = jwt.verify(id, process.env.JWT_SECRET);
  console.log(decoded);
  req.user = decoded;
  // console.log(decoded);
  next();
};

exports.refreshToken = (req, res) => {
  var { id } = req.body;
  const jwtToken = jwt.sign({ _id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });
  return res.json({ jwtToken });
};

exports.userExists = async (req, res) => {
  var { phoneNo, device_tokens, email, fullName, type } = req.body;

  var user;
  if (type === "phone") {
    user = await User.findOne({ phoneNo: phoneNo });
  } else if (type === "email") {
    user = await User.findOne({ email: email });
  }

  // console.log(user);
  // if user exists then add fcm token to here.

  if (user) {
    const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    });
    var token = await User.findOne({
      device_tokens: { $in: [device_tokens] },
    });
    if (!token) {
      await User.findOneAndUpdate(
        { _id: user._id },
        { $push: { device_tokens: device_tokens } }
      );
    }
    var user = {
      error:"User already exists",
      fullName: user.name,
      device_tokens: token != null ? [device_tokens] : [],
      images: [],
      describe: [],
      _id: user._id,
      gender: user.gender,
      jwtToken,
    };
    return res.json({ user });
  } else {
    var user = {
      fullName: "User Not Exists",
      device_tokens: [],
      images: [],
      describe: [],
    };
    return res.json({ user });
  }
};



let astro_sign = "";

function zodiac_sign(day, month) {
  if (month == "12") {
    if (day < 22) return (astro_sign = "Sagittarius");
    else return (astro_sign = "capricorn");
  } else if (month == "01") {
    if (day < 20) return (astro_sign = "Capricorn");
    else return (astro_sign = "aquarius");
  } else if (month == "02") {
    if (day < 19) return (astro_sign = "Aquarius");
    else return (astro_sign = "pisces");
  } else if (month == "03") {
    if (day < 21) return (astro_sign = "Pisces");
    else return (astro_sign = "aries");
  } else if (month == "04") {
    if (day < 20) return (astro_sign = "Aries");
    else return (astro_sign = "taurus");
  } else if (month == "05") {
    if (day < 21) return (astro_sign = "Taurus");
    else return (astro_sign = "gemini");
  } else if (month == "06") {
    if (day < 21) return (astro_sign = "Gemini");
    else return (astro_sign = "cancer");
  } else if (month == "07") {
    if (day < 23) return (astro_sign = "Cancer");
    else return (astro_sign = "leo");
  } else if (month == "08") {
    if (day < 23) return (astro_sign = "Leo");
    else return (astro_sign = "virgo");
  } else if (month == "09") {
    if (day < 23) return (astro_sign = "Virgo");
    else return (astro_sign = "libra");
  } else if (month == "10") {
    if (day < 23) return (astro_sign = "Libra");
    else return (astro_sign = "scorpio");
  } else if (month == "11") {
    if (day < 22) return (astro_sign = "scorpio");
    else return (astro_sign = "sagittarius");
  }
}
