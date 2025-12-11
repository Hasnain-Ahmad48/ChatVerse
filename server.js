import dotenv from "dotenv";
import {fileURLToPath} from "url";
import {dirname, join} from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({path: join(__dirname, ".env")});

import express from "express";
import cors from "cors";
import helmet from "helmet";
import {createServer} from "http";
import {Server} from "socket.io";
import rateLimit from "express-rate-limit";
import connectDB from "./config/database.js";
import {errorHandler} from "./middleware/errorHandler.js";
import {initializeSocket} from "./socket/socketHandler.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

// Connect to database
connectDB();

// Initialize Express app
const app = express();

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Initialize socket handlers
initializeSocket(io);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.CLIENT_URL || "https://chatting-app-buddy.netlify.app",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api/", limiter);

// Body parser middleware
app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({extended: true, limit: "10mb"}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.json({status: "OK", message: "Server is running"});
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Check Cloudinary configuration on startup
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    console.log("✓ Cloudinary configured");
  } else {
    console.warn("Cloudinary not configured. Image uploads will fail.");
    console.warn("  Missing:", {
      CLOUDINARY_CLOUD_NAME: !cloudName,
      CLOUDINARY_API_KEY: !apiKey,
      CLOUDINARY_API_SECRET: !apiSecret,
    });
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", err => {
  console.error("Unhandled Rejection:", err);
  httpServer.close(() => process.exit(1));
});
