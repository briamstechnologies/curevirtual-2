// FILE: backend/server.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const http = require("http");
const { Server } = require("socket.io");

// ✅ Global Allowed Origins (Moved up for Socket.io)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "https://cure-virtual-2.vercel.app",
  "https://curevirtual-2.vercel.app",
  "https://curevirtual.vercel.app",
  "https://cure-virtual-2-git-main-briamstechnologies.vercel.app",
  "https://curevirtual-2-production.up.railway.app",
  "https://curevirtual-2-production-ee33.up.railway.app",
  "https://curevirtual-2-production-6eaa.up.railway.app",
  "https://bite-dash-railway-app.up.railway.app", // Added based on context if needed, but sticking to existing pattern
  process.env.FRONTEND_URL,
  process.env.RAILWAY_STATIC_URL,
].filter(Boolean);

const server = http.createServer(app);
const io = new Server(server, {
  transports: ["polling", "websocket"], // Polling first for better compatibility, upgrade to websocket
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  cors: {
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl requests)
      // also allow literal "null" origin which is common in some mobile environments
      if (!origin || origin === "null") return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.some((o) => origin.startsWith(o))
      ) {
        callback(null, true);
      } else {
        console.warn(`[Socket CORS] Origin blocked: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket Authentication Middleware
const socketAuth = require("./middleware/socketAuth");
io.use(socketAuth);

// Initialize Socket Handler
require("./socket/socketHandler.cjs")(io);

// ✅ Inject io into registration-requests route (must run after socketHandler)
const registrationRequestsRoute = require("./routes/registrationRequests");
registrationRequestsRoute.setIo(io);

// ✅ Global Middlewares
// allowedOrigins is defined above

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.some((o) => origin.startsWith(o))
      ) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());

// ✅ STRIPE WEBHOOK (Must be BEFORE express.json() for raw body verification)
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10mb" }));

// ✅ Root Route
app.get("/", (_req, res) => {
  res.send("Backend is live on Railway");
});

// ✅ Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "UP",
    version: "1.0.5",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ----------------------------
// ✅ AUTH / VIDEO
// ----------------------------
const authRoutes = require("./routes/auth");
const videocallRoutes = require("./routes/videocall");
const otpRoutes = require("./routes/otp");

app.use("/api/auth", authRoutes);
app.use("/api/videocall", videocallRoutes);
app.use("/api/otp", otpRoutes);

// ----------------------------
// ✅ SUPERADMIN / SHARED ADMIN ROUTES
// ----------------------------
const reportsRoutes = require("./routes/reports");
app.use("/api/superadmin/reports", reportsRoutes);

const superadminRoutes = require("./routes/superadmin");
const settingsRoutes = require("./routes/settings");
const logsRoutes = require("./routes/logs");
const activityLogsRoutes = require("./routes/activityLogs");

app.use("/api/superadmin", superadminRoutes);
app.use("/api/superadmin/settings", settingsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/superadmin/logs", logsRoutes);
app.use("/api/superadmin/activity-logs", activityLogsRoutes);

// ----------------------------
// ✅ ADMIN ROUTES
// ----------------------------
const adminRoutes = require("./routes/admins"); // manage admins (superadmin)
const adminUsersRoutes = require("./routes/adminUsers"); // manage users (patients/doctors)
const adminDashboardRoutes = require("./routes/adminRoutes"); // admin dashboard
const adminMessagesRoutes = require("./routes/messages"); // admin messaging

app.use("/api/admins", adminRoutes); // ONLY for superadmin use
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin", adminDashboardRoutes); // admin dashboard & user management
app.use("/api/admin/messages", adminMessagesRoutes);

// ----------------------------
// ✅ DOCTOR ROUTES
// ----------------------------
const doctorRoutes = require("./routes/doctor");
const doctorVideoRoutes = require("./routes/doctorVideo");
const doctorPatientsRoutes = require("./routes/doctorPatients");
const clinicalEncounterRoutes = require("./routes/clinicalEncounter");

app.use("/api", doctorPatientsRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/doctor/video", doctorVideoRoutes);
app.use("/api/clinical-encounter", clinicalEncounterRoutes);
app.use("/api/appointments", require("./routes/appointmentApi"));

// ----------------------------
// ✅ SCHEDULE ROUTES
// ----------------------------
const scheduleRoutes = require("./routes/scheduleRoutes");
app.use("/api/schedule", scheduleRoutes);

// ----------------------------
// ✅ PATIENT ROUTES
// ----------------------------
const patientRoutes = require("./routes/patientRoutes");
const patientDoctorsRoutes = require("./routes/patientDoctors");

// 👇 mount under /api
app.use("/api", patientDoctorsRoutes);
app.use("/api/patient", patientRoutes);

const notificationsRoutes = require("./routes/notifications");
app.use("/api/notifications", notificationsRoutes);

const chatbotRoutes = require("./routes/chatbot.routes");
const internalRoutes = require("./routes/internal");

app.use("/api/chatbot", chatbotRoutes);
app.use("/api/internal", internalRoutes);

// ----------------------------
// ✅ SUBSCRIPTION ROUTES
// ----------------------------
const subscriptionRoutes = require("./routes/subscription");
app.use("/api/subscription", subscriptionRoutes);
// Alias for subscribers (frontend compatibility)
app.use("/api/subscribers", subscriptionRoutes);

// ADMIN subscription views
const adminSubscriptionRoutes = require("./routes/adminSubscription");
app.use("/api/admin/subscription-management", adminSubscriptionRoutes);

// PHARMACY ROUTES
const pharmacyRoute = require("./routes/pharmacy");
app.use("/api/pharmacy", pharmacyRoute);

// SUPPORT ROUTES
const supportRoutes = require("./routes/support");
app.use("/api/support", supportRoutes);

// ✅ REGISTRATION APPROVAL WORKFLOW (Doctor & Pharmacy)
app.use("/api/registration-requests", registrationRequestsRoute);

// ✅ NEW PAYMENTS SYSTEM
const paymentRoutes = require("./routes/payments");
app.use("/api/payments", paymentRoutes);

// ✅ SESSION (APPOINTMENT) PAYMENT SYSTEM (Stripe Elements)
const sessionRoutes = require("./routes/session");
app.use("/api/session", sessionRoutes);

// Legacy Stripe webhook (existing logic)
app.post(
  "/api/subscription/stripe/webhook",
  express.raw({ type: "application/json" }),
  subscriptionRoutes.stripeWebhook
);

// ✅ MESSAGES (Unified)
const messagesRoutes = require("./routes/messages");
app.use("/api/messages", messagesRoutes);

// ✅ USER PROFILE / LIST
const usersRoutes = require("./routes/user");
app.use("/api/users", usersRoutes);

// In App.js - add this before other routes for testing
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

app.get("/api/doctor/test", (req, res) => {
  res.json({ message: "Doctor routes are working!" });
});

// ✅ Global Error Handler (Must be last)
app.use((err, req, res, _next) => {
  // 3. Structured Error Logging
  console.error("❌ [Global Error Handler] Unhandled exception:", {
    message: err.message,
    stack: err.stack,
    context: {
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    }
  });

  // Custom response for CORS or other well-known errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: "Security violation: Origin not allowed by CORS policy." });
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "An internal server error occurred"
        : err.message || "An unexpected error occurred",
    errorId: Date.now() // Simple way to correlate client reports with server logs
  });
});

// ✅ Diagnostics (Temporary)
app.use("/api/diagnostics", require("./routes/diagnostic"));

// ✅ Server start
const PORT = process.env.PORT || 5001;
const HOST = "0.0.0.0"; // Required for Railway compatibility

server.listen(PORT, HOST, () => {
  console.log("-------------------------------------------");
  console.log(`🚀 Server running on: http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log("-------------------------------------------");
});
