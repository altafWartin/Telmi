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

const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});





const httpServer = new http.Server(app);

// app.get('/', (req, res) =>{
//   res.render('index');
// });
let viewerCount = 0;

// type Message = { text: string, date: Date };

// const messageList: Message[] = [];

// function purgeLastHundred() {
//   if (messageList.length > 200) {
//     messageList.slice(100);
//   }
// }

// setInterval(purgeLastHundred, 10000);

io.on('connection', (socket) => {
  viewerCount++;
  console.log('a user connected. Total viewer count:', viewerCount);
  socket.emit('viewer-count', viewerCount);

  socket.on('disconnect', () => {
    viewerCount--;
    console.log('A user disconnected. Total viewer count:', viewerCount);
    socket.emit('viewer-count', viewerCount);
  });

  socket.on('join-as-streamer', (streamerId) => {
    socket.broadcast.emit('streamer-joined', streamerId);
    console.log("streamer",socket.id)


  });

  socket.on('disconnect-as-streamer', (streamerId) => {
    socket.broadcast.emit('streamer-disconnected', streamerId);

  });

  socket.on('join-as-viewer', (viewerId) => {
    socket.broadcast.emit('viewer-connected', viewerId);
    console.log("viewer ",socket.id)

    // socket.emit('backfill-messages', messageList);
  });

  // socket.on('add-message-to-live-chat', (messageText: string) => {
  //   const message: Message = {
  //     text: messageText,
  //     date: new Date(),
  //   };

  //   messageList.push(message);
  //   socket.emit('new-message', message);
  //   socket.broadcast.emit('new-message', message);
  // });
});





const port =  8000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



app.get("/", async (req, res, next) => {
  res
    .status(200)
    .send(`This is telmi project working at port ${port} !!!!!!!!!`);
});

console.log("home page");
