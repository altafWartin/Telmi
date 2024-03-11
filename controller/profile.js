const User = require("../models/profile/user");
const LikeDislikeRequested = require("../models/profile/like_dislike_requested");
const LikeDislikeStatus = require("../models/profile/like_dislike_status");

const Notification = require("../models/profile/Notification");

var crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const { uploadFile, deleteFile } = require("../s3");
const ChatRoom = require("../models/chat/chatroom");
const Chat = require("../models/chat/chatMessages");
const { getMessaging } = require("firebase-admin/messaging");

exports.getProfile = async (req, res) => {
  var { gender } = req.body;
  // console.log(profileID);

  var profile = await User.find({ gender: gender })
    .populate(
      "basic_Info",
      "sun_sign cuisine political_views looking_for personality first_date drink smoke religion fav_pastime"
    )
    .select("name images height live dob gender")
    .limit(20);

  if (profile) {
    // var age = getAge(profile.dob);
    return res.json({ profile });
  } else {
    return res.status(400).json({ failed: true, profile });
  }
};

exports.getFilterProfile = async (req, res) => {
  try {
    const { gender, location, distance, minAge, maxAge } = req.body;

    let query = {};

    if (gender) {
      query.gender = gender;
    }

    if (location && distance) {
      const [longitude, latitude] = location.split(",").map(parseFloat);

      query.loc = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: parseFloat(distance) * 1000,
        },
      };
    }

    if (minAge || maxAge) {
      query.dob = {};

      if (minAge) {
        const minBirthYear = new Date().getFullYear() - parseInt(minAge, 10);
        query.dob.$gte = new Date(`${minBirthYear}-01-01T00:00:00.000Z`);
      }

      if (maxAge) {
        const maxBirthYear = new Date().getFullYear() - parseInt(maxAge, 10);
        query.dob.$lte = new Date(`${maxBirthYear}-12-31T23:59:59.999Z`);
      }
    }

    const filteredUsers = await User.find(query);

    // res.json({ data: filteredUsers });
    return res.json({ users: filteredUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// LikedOrNotProfile route handler
exports.LikedOrNotProfile = async (req, res) => {
  try {
    // Destructure request body
    const { userID, requestSenderID, status } = req.body;

    // Create a new instance of LikeDislikeRequested model
    const likeDislikeProfile = new LikeDislikeRequested({
      userID,
      requestSenderID,
      status,
    });

    console.log(status, "status");

    // Check if the profile already exists
    const profileExists = await LikeDislikeRequested.findOne({
      $and: [{ userID: userID }, { requestSenderID: requestSenderID }],
    });

    if (profileExists === null) {
      if (status === 0) {
        // Send Notification
        console.log(status);

        // Query for the user with requestSenderID
        const user = await User.findOne({ _id: requestSenderID });

        // Check if the user exists
        if (user) {
          // Create a new notification for the user whose profile was liked
          const newNotification = new Notification({
            userId: requestSenderID,
            title: "Hey! Good News",
            body: `${userID} recently liked your profile. If you like their profile, you can start chatting.`,
          });

          // Save the notification to the database
          await newNotification.save();

          return res.status(201).json({ Notification: newNotification });
        } else {
          return res.status(404).json({ error: "Liked user not found" });
        }
      }

      // Save the new profile
      const savedProfile = await likeDislikeProfile.save();
      console.log("Profile Saved:", savedProfile);
      return res.status(201).json(savedProfile);
    } else {
      console.log("Profile Already Exists:", profileExists);
      return res.status(200).json(profileExists);
    }
  } catch (error) {
    console.error("Error processing LikedOrNotProfile:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Define the API endpoint function
exports.getLikedDislikeProfile = async (req, res) => {
  const { userID, status } = req.body;

  try {
    const likedProfiles = await LikeDislikeRequested.find({
      requestSenderID: userID,
      status: status,
    }).populate({
      path: "userID",
      select: { name: 1, images: 1, dob: 1, email: 1 }, // Include device tokens for push notification
    });

    // Send push notification for each like
    likedProfiles.forEach(async (like) => {
      const { name, device_tokens } = like.userID;

      const message = {
        notification: {
          title: "New Like",
          body: `${name} liked your profile.`,
        },
        tokens: device_tokens, // Array of device tokens
      };

      try {
        const response = await getMessaging();
      } catch (error) {
        console.error("Error sending like notification:", error);
      }
    });

    return res.json({ likedProfiles });
  } catch (error) {
    console.error("Error retrieving liked profiles:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    var { userID, requestSenderID, status, requestID } = req.body;

    if (!userID || !requestSenderID || !status || !requestID) {
      console.log("Invalid request parameters");
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    if (status == 1) {
      // declined and delete from Like_Dislike_Requested
      // Check for Request Existence
      var existingRequest = await LikeDislikeRequested.findById(requestID);
      if (!existingRequest) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Delete the request using requestID
      var deleteRequestResult = await LikeDislikeRequested.deleteOne({
        _id: requestID,
      });

      console.log(" Reject and Delete Request Result:", deleteRequestResult);

      return res.json({
        success: true,
        message: "Request rejected successfully.",
        likedProfiles: filteredLikedProfiles,
      });
    } else {
      // Accepted then create chatroom and delete from Like_Dislike_Requested
      var participants = [userID, requestSenderID];
      // console.log("Participants:", participants);

      var findChatRoom = await ChatRoom.find({ participants: participants });

      // console.log("Find Chat Room:", findChatRoom.toString());

      var chatroomID = uuidv4();
      var lastMessage = "Hey, I liked your profile too...";

      var chatRoom = new ChatRoom({
        chatroomID,
        participants,
        lastMessage,
      });

      await chatRoom.save();

      // Create Message to chat
      status = "SENT";
      var senderID = userID;
      var recieveID = requestSenderID;
      var msg = lastMessage;
      var messageID = chatroomID;

      var chat = new Chat({
        senderID,
        msg,
        messageID,
        chatroomID: chatRoom._id,
        status,
        recieveID,
      });

      await chat.save();

      // Check for Request Existence
      var existingRequest = await LikeDislikeRequested.findById(requestID);
      if (!existingRequest) {
        return res.status(404).json({ error: "Request not found" });
      }

      const userProfileToUpdate = await User.findById(requestSenderID);

      if (!userProfileToUpdate) {
        return res.status(404).json({ error: "Profile not found" });
      } else {
        // Extract relevant information
        const { _id, fullName, profilePhoto } = userProfileToUpdate;

        // Add the user ID, name, and profilePicture to the friend's friend list
        const updateUser = {
          friendId: _id.toString(), // Convert ObjectId to string
          name: fullName || "", // Handle undefined values
          profilePicture: profilePhoto || "", // Handle undefined values
        };

        try {
          // Debugging: Print updateUser object
          console.log("updateUser:", updateUser);

          await User.findByIdAndUpdate(userID, {
            $push: { friends: updateUser },
          });
          console.log("Friends list updated successfully!");
        } catch (error) {
          console.error("Error updating friends list:", error.message);
          // Handle the error appropriately (e.g., send an error response)
        }
      }

      const SenderProfileToUpdate = await User.findById(userID);

      if (!userProfileToUpdate) {
        return res.status(404).json({ error: "Profile not found" });
      } else {
        // Extract relevant information
        const { _id, fullName, profilePhoto } = SenderProfileToUpdate;

        // Add the user ID, name, and profilePicture to the friend's friend list
        const updateSender = {
          friendId: _id.toString(), // Convert ObjectId to string
          name: fullName || "", // Handle undefined values
          profilePicture: profilePhoto || "", // Handle undefined values
        };

        try {
          // Debugging: Print updateUser object
          console.log("updateUser:", updateUser);

          await User.findByIdAndUpdate(requestSenderID, {
            $push: { friends: updateSender },
          });
          console.log("Friends list updated successfully!");
        } catch (error) {
          console.error("Error updating friends list:", error.message);
          // Handle the error appropriately (e.g., send an error response)
        }
      }

      // Delete the request using requestID
      var deleteRequestResult = await LikeDislikeRequested.deleteOne({
        _id: requestID,
      });

      // console.log("Accept and Delete Request Result:", deleteRequestResult);

      return res.json({
        success: true,
        message: "Request accepted successfully.",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEYS,
  secretAccessKey: process.env.AWS_SECRET_KEYS,
  region: process.env.AWS_BUCKET_REGION,
});


const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEYS,
  secretAccessKey: process.env.AWS_SECRET_KEYS,
  region: process.env.AWS_BUCKET_REGION,
});

// exports.uploadImage = async (req, res) => {
//   try {
//     const { id } = req.body;
//     const photo = req.file;

//     console.log("Received image upload request for user:", id, photo);

//     if (!id) {
//       console.log("id is not provided");
//       return res.json("id is not provided");
//     }

//     if (!photo || !photo.buffer) {
//       console.log("Photo data is not provided");
//       return res.json("Photo data is not provided");
//     }

//     const params = {
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: `images/${id}_${Date.now()}_${photo.originalname}`,
//       Body: photo.buffer,
//     };

//     const uploadResult = await s3.upload(params).promise();
//     console.log("Image uploaded to AWS S3:", uploadResult);

//     // Update the user's document with the image URL
//     const updatedUser = await User.findByIdAndUpdate(
//       id,
//       { $push: { images: uploadResult.Location } }, // Assuming 'images' is an array field in your User model
//       { new: true }
//     );

//     if (updatedUser) {
//       console.log("User profile updated:", updatedUser);
//       return res.json({
//         message: 'Image uploaded and user profile updated successfully',
//         imageUrl: uploadResult.Location,
//         profile: updatedUser,
//       });
//     } else {
//       console.log("findOneAndUpdate not working");
//       return res.json("findOneAndUpdate not working");
//     }
//   } catch (error) {
//     console.error("Error uploading image:", error);
//     return res.status(500).json("Internal Server Error");
//   }
// };

exports.uploadImage = async (req, res) => {
  try {
    const { id } = req.body;
    const photo = req.file;
    console.log("Received image upload request for user:", id, photo);

    if (!id) {
      console.log("id is not provided");
      return res.status(400).json({ error: "id is not provided" });
    }

    if (!photo || !photo.buffer) {
      console.log("Photo data is not provided");
      return res.status(400).json({ error: "Photo data is not provided" });
    }

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `images/${id}_${Date.now()}_${photo.originalname}`,
      Body: photo.buffer,
    };

    try {
      // Attempt S3 upload
      const uploadResult = await s3.upload(params).promise();
      console.log("Image uploaded to AWS S3:", uploadResult);

      // Attempt to update the user's document with the image URL
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $push: { images: uploadResult.Location } },
        { new: true }
      );

      if (updatedUser) {
        console.log("User profile updated:", updatedUser);
        return res.json({
          message: "Image uploaded and user profile updated successfully",
          imageUrl: uploadResult.Location,
          profile: updatedUser,
        });
      } else {
        console.log("findOneAndUpdate not working");
        return res.status(500).json({ error: "findOneAndUpdate not working" });
      }
    } catch (uploadError) {
      console.error("Error uploading image to AWS S3:", uploadError);
      return res.status(500).json({ error: "Error uploading image to AWS S3" });
    }
  } catch (error) {
    console.error("Error processing image upload request:", error);
    return res.status(500).json("Internal Server Error");
  }
};

// Assuming you have the necessary imports and setup for multer, AWS SDK, and Mongoose

// Add this function to handle profile image uploads
exports.profileUpload = async (req, res) => {
  try {
    const { id } = req.body;
    const photo = req.file;
    console.log("Received profile image upload request for user:", id, photo);

    if (!id) {
      console.log("id is not provided");
      return res.status(400).json({ error: "id is not provided" });
    }

    if (!photo || !photo.buffer) {
      console.log("Photo data is not provided");
      return res.status(400).json({ error: "Photo data is not provided" });
    }

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `profileImages/${id}_${Date.now()}_${photo.originalname}`,
      Body: photo.buffer,
    };

    try {
      // Attempt S3 upload
      const uploadResult = await s3.upload(params).promise();
      console.log("Profile Image uploaded to AWS S3:", uploadResult);

      // Attempt to update the user's document with the profile image URL
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { profilePhoto: uploadResult.Location },
        { new: true }
      );

      if (updatedUser) {
        console.log("User profile updated with profile image:", updatedUser);
        return res.json({
          message:
            "Profile Image uploaded and user profile updated successfully",
          profileImageUrl: uploadResult.Location,
          profile: updatedUser,
        });
      } else {
        console.log("findOneAndUpdate not working");
        return res.status(500).json({ error: "findOneAndUpdate not working" });
      }
    } catch (uploadError) {
      console.error("Error uploading profile image to AWS S3:", uploadError);
      return res
        .status(500)
        .json({ error: "Error uploading profile image to AWS S3" });
    }
  } catch (error) {
    console.error("Error processing profile image upload request:", error);
    return res.status(500).json("Internal Server Error");
  }
};

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_BUCKET_REGION,
});

// Function to check if a string is a valid URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (error) {
    return false;
  }
}

// controller/profile.js (or wherever you retrieve notifications)
exports.GetNotifications = async (req, res) => {
  const { userId } = req.body;

  try {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: "desc" })
      // .populate('commenterId', 'name') // Populate commenterId with 'name' field
      .exec();

    return res.json({ notifications });
  } catch (error) {
    console.error("Error retrieving notifications:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// controller/profile.js
const Comment = require("../models/profile/comment"); // Adjust the path accordingly

// ... other imports ...

exports.AddComment = async (req, res) => {
  const { userId, commenterId, imageUrl, text } = req.body;

  try {
    const newComment = new Comment({
      userId,
      commenterId,
      imageUrl,
      text,
    });

    const savedComment = await newComment.save();

    // Create a new notification for the user whose image received a comment
    const newNotification = new Notification({
      userId,
      commenterId,
      imageUrl,
      title: "New Comment",
      body: `some one commented on your image: ${text}`,
    });

    await newNotification.save(); // Save the notification to the database

    return res.json({ comment: savedComment });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.GetComment = async (req, res) => {
  const { userId, imageUrl } = req.body;

  try {
    const comments = await Comment.find({ userId, imageUrl }).sort({
      createdAt: "desc",
    });

    return res.json({ comments });
  } catch (error) {
    console.error("Error retrieving comments:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.replaceImage = async (req, res) => {
  try {
    const { id, oldPhotoURL, index = 1 } = req.body;
    const newPhoto = req.file;

    console.log("Received replaceImage request:", {
      id,
      oldPhotoURL,
      newPhoto,
      index,
    });

    if (!id || !isValidUrl(oldPhotoURL) || isNaN(index)) {
      console.log("Invalid request parameters");
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    console.log("Finding and updating user document in the database");
    const user = await User.findOneAndUpdate(
      { _id: id },
      { $pull: { images: oldPhotoURL } },
      { new: true }
    );

    if (user) {
      console.log("User document updated successfully:", user);

      try {
        console.log("Deleting old image file from storage (if needed)");

        // Add any logic here if you need to delete the old image file from your storage system

        console.log("Uploading new image to AWS S3 and updating the server");

        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `images/${id}_${Date.now()}_${newPhoto.originalname}`,
          Body: newPhoto.buffer,
        };

        try {
          // Attempt S3 upload
          const uploadResult = await s3.upload(params).promise();
          console.log("Image uploaded to AWS S3:", uploadResult);

          // Attempt to update the user's document with the image URL
          const updatedUser = await User.findByIdAndUpdate(
            id,
            { $push: { images: uploadResult.Location } },
            { new: true }
          );

          if (updatedUser) {
            console.log("User profile updated:", updatedUser);
            return res.json({
              message: "Image uploaded and user profile updated successfully",
              imageUrl: uploadResult.Location,
              profile: updatedUser,
            });
          } else {
            console.log("findOneAndUpdate not working");
            return res
              .status(500)
              .json({ error: "findOneAndUpdate not working" });
          }
        } catch (uploadError) {
          console.error("Error uploading image to AWS S3:", uploadError);
          return res
            .status(500)
            .json({ error: "Error uploading image to AWS S3" });
        }
      } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    } else {
      console.log("Error: User not found or error updating user document");
      return res
        .status(500)
        .json({ error: "Error removing old image from DB" });
    }
  } catch (error) {
    console.error("Error processing image replace request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getSingleProfile = async (req, res) => {
  var { _id } = req.body;
  var profile = await User.find({ _id: _id });

  if (profile) {
    return res.json({ profile });
  } else {
    return res.status(400).json({ failed: true, profile });
  }
};

exports.updateUserFields = async (req, res) => {
  try {
    const {
      _id,
      fullName,
      dob,
      email,
      gender,
      location,
      job,
      company,
      college,
      about,
    } = req.body;
    console.log("1");
    // Access uploaded files
    const profilePhotoFile = req.files.profilePhoto
      ? req.files.profilePhoto[0]
      : null;
    const coverPhotoFile = req.files.coverPhoto
      ? req.files.coverPhoto[0]
      : null;
    console.log("2");

    console.log(
      _id,
      fullName,
      dob,
      email,
      gender,
      location,
      job,
      company,
      college,
      about,
      profilePhotoFile,
      coverPhotoFile
    );
    // Update fields
    const update = {
      fullName,
      dob,
      gender,
      email,
      location,
      job,
      company,
      college,
      about,
      // Add any other fields you want to update here
    };
    console.log("3");

    // Check if profilePhoto and coverPhoto files are uploaded
    if (profilePhotoFile) {
      // Upload profilePhoto to S3 and update the user document
      console.log("Uploading profile");
      const profilePhotoParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `profileImages/${_id}_${Date.now()}_profilePhoto_${
          profilePhotoFile.originalname
        }`,
        Body: profilePhotoFile.buffer,
      };

      try {
        const profilePhotoUploadResult = await s3
          .upload(profilePhotoParams)
          .promise();
        update.profilePhoto = profilePhotoUploadResult.Location;
      } catch (profilePhotoUploadError) {
        console.error(
          "Error uploading profile photo to AWS S3:",
          profilePhotoUploadError
        );
        return res
          .status(500)
          .json({ error: "Error uploading profile photo to AWS S3" });
      }
    }

    if (coverPhotoFile) {
      // Upload coverPhoto to S3 and update the user document
      console.log("Uploading cover");
      const coverPhotoParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `profileImages/${_id}_${Date.now()}_coverPhoto_${
          coverPhotoFile.originalname
        }`,
        Body: coverPhotoFile.buffer,
      };

      try {
        const coverPhotoUploadResult = await s3
          .upload(coverPhotoParams)
          .promise();
        update.coverPhoto = coverPhotoUploadResult.Location;
      } catch (coverPhotoUploadError) {
        console.error(
          "Error uploading cover photo to AWS S3:",
          coverPhotoUploadError
        );
        return res
          .status(500)
          .json({ error: "Error uploading cover photo to AWS S3" });
      }
    }
    console.log("4");

    const filter = { _id: _id };
    console.log("5");

    // Update user in the database
    const user = await User.findOneAndUpdate(filter, update, { new: true });
    console.log("6");


   return res.json({ success: true, message: 'User updated successfully', data: user });
    console.log(user);

    console.log("7");
  } catch (error) {
    // Handle error appropriately
    console.log("8");

    console.error("Error processing update user fields request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// exports.updateUserFields = async (req, res) => {
//   const { _id, fullName, dob, gender, location, job, company, college, about } = req.body;

//   // Access uploaded files
//   const profilePhotoFile = req.files.profilePhoto[0];
//   const coverPhotoFile = req.files.coverPhoto[0];

//   // Update fields
//   const update = {
//     fullName,
//     dob,
//     gender,
//     location,
//     job,
//     company,
//     college,
//     about,
//     // Add any other fields you want to update here
//   };

//   // Check if profilePhoto and coverPhoto files are uploaded
//   if (req.files && req.files.profilePhoto && req.files.coverPhoto) {
//     // Upload profilePhoto to S3 and update the user document
//     console.log("profilePhoto")
//     const profilePhotoParams = {
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: `profileImages/${_id}_${Date.now()}_profilePhoto_${req.files.profilePhoto[0].originalname}`,
//       Body: req.files.profilePhoto[0].buffer,
//     };

//     try {
//       const profilePhotoUploadResult = await s3.upload(profilePhotoParams).promise();
//       update.profilePhoto = profilePhotoUploadResult.Location;
//     } catch (profilePhotoUploadError) {
//       console.error("Error uploading profile photo to AWS S3:", profilePhotoUploadError);
//       return res.status(500).json({ error: "Error uploading profile photo to AWS S3" });
//     }

//     // Upload coverPhoto to S3 and update the user document
//     const coverPhotoParams = {
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: `profileImages/${_id}_${Date.now()}_coverPhoto_${req.files.coverPhoto[0].originalname}`,
//       Body: req.files.coverPhoto[0].buffer,
//     };

//     try {
//       const coverPhotoUploadResult = await s3.upload(coverPhotoParams).promise();
//       update.coverPhoto = coverPhotoUploadResult.Location;
//     } catch (coverPhotoUploadError) {
//       console.error("Error uploading cover photo to AWS S3:", coverPhotoUploadError);
//       return res.status(500).json({ error: "Error uploading cover photo to AWS S3" });
//     }
//   }

//   const filter = { _id: _id };

//   try {
//     // Update user in the database
//     const user = await User.findOneAndUpdate(filter, update, { new: true });

//     return res.json({ user });
//   } catch (error) {
//     // Handle error appropriately
//     console.error(error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// exports.updateUserFields = async (req, res) => {
//   const { _id, name, dob, gender, location, job, company, college, about } =
//     req.body;

//   // Update fields
//   const update = {
//     name,
//     dob,
//     gender,
//     location,
//     job,
//     company,
//     college,
//     about,
//     // Add a field to store the photo key in the user document
//   };

//   const filter = { _id: _id };

//   try {
//     // Update user in the database
//     const user = await User.findOneAndUpdate(filter, update, { new: true });

//     return res.json({ user });
//   } catch (error) {
//     // Handle error appropriately
//     console.error(error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// function getAge(DOB) {
//   var today = new Date();
//   var birthDate = new Date(DOB);
//   var age = today.getFullYear() - birthDate.getFullYear();
//   var m = today.getMonth() - birthDate.getMonth();
//   if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
//     age = age - 1;
//   }
//   return age;
// }
