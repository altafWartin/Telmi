require("dotenv").config();

// Install the required dependencies:
// npm install express socket.io

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
// const io = socketIo(server);

const cors = require("cors");
const mongoose = require("mongoose");
const sls = require("serverless-http");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

const socketIO = require("socket.io");
const bodyParser = require("body-parser"); // Import body-parser middleware

// const io = require('socket.io')(server, {
//   cors: {
//     origin: "http://localhost:3001", // Replace with your frontend URL
//     methods: ["GET", "POST"],
//   },
//   transports: ['websocket'],
// });

// Middleware to parse incoming JSON requests
app.use(bodyParser.json());

// for FCM
process.env.GOOGLE_APPLICATION_CREDENTIALS;

// for FCM
initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

mongoose
  .connect(process.env.DATABASE_CLOUD)
  .then((res) => {
    console.log("Database connected");
  })
  .catch((error) => {
    console.log(error);
  });

app.use(express.json({ limit: "50mb" }));
// cors
if (process.env.NODE_ENV == "development") {
  app.use(cors({ origin: `${process.env.CLIENT_URL}` }));
}

const userRoutes = require("./routes/user");
const countriesRoutes = require("./routes/countries");
const profileRoutes = require("./routes/profile");
const chatRoutes = require("./routes/chat");

app.use("/api", userRoutes);
app.use("/api", countriesRoutes);
app.use("/api", profileRoutes);
app.use("/api", chatRoutes);

// server.js

app.use(cors({
  origin: 'http://localhost:3001'
}));



let users = {};
let viewerCount = 0;
// Now attach event listeners to socketServer




app.use(cors({
  origin: 'http://localhost:3001'
}));

const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('stream', (stream) => {
    socket.broadcast.emit('stream', stream);
    console.log('stream', stream);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});



const port =  8000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


let firstUserSocketId;

// io.on('connection', (socket) => {
//   // Set the socket ID for the first user
//   if (!firstUserSocketId) {
//     firstUserSocketId = socket.id;
//   }
//   console.log('A user connected', socket.id, firstUserSocketId);

//   // Handle WebRTC signaling events only for the first user
//   if (socket.id === firstUserSocketId) {
//     socket.on('offer', (data) => {
//       socket.broadcast.emit('offer', data);
//     });

//   }
//     socket.on('answer', (data) => {
//       socket.broadcast.emit('answer', data);
//     });

//     socket.on('ice-candidate', (data) => {
//       socket.broadcast.emit('ice-candidate', data);
//     });
// });


// io.on('connection', (socket) => {
//   console.log('A user connected');

//   socket.on('join-as-streamer', (streamerId) => {
//     socket.broadcast.emit('streamer-joined', streamerId); 
//     console.log('streamer joined', streamerId)
//   });

//   socket.on('disconnect-as-streamer', (streamerId) => {
//     socket.broadcast.emit('streamer-disconnected', streamerId);
//   });

//   socket.on('join-as-viewer', (viewerId) => {
//     socket.broadcast.emit('viewer-connected', viewerId);
//     console.log('viewerId joined', viewerId)

//   });

//   socket.on('disconnect', () => {
//     console.log('A user disconnected');
//   });
// });


// io.on('connection', (socket) => {
//  console.log('A user connected',socket.id);

//  socket.on('userSelection', (userType) => {
//     console.log(`User selected: ${userType}`);
//     users[socket.id] = userType;

//     if (userType === 'telmi') {
//       socket.emit('startVideoCall');
//     } else if (userType === 'watch') {
//       socket.emit('displayVideo');
//     }
//  });

//  socket.on('offer', (data) => {
//     console.log('Offer received');
//     socket.to(data.to).emit('offer', data);
//  });

//  socket.on('answer', (data) => {
//     console.log('Answer received');
//     socket.to(data.to).emit('answer', data);
//  });

//  socket.on('iceCandidate', (data) => {
//     console.log('ICE candidate received');
//     socket.to(data.to).emit('iceCandidate', data);
//  });

//  socket.on('disconnect', () => {
//     console.log('User disconnected');
//     delete users[socket.id];
//  });
// });

app.get("/", async (req, res, next) => {
  res
    .status(200)
    .send(`This is telmi project working at port ${port} !!!!!!!!!`);
});

console.log("home page");
