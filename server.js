// server.js

// --- load env first ---
require("dotenv").config();

const express = require("express");
const app = express();

const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const methodOverride = require("method-override");

const logger = require("./server/middleware/logger");
logger.info({ event: "boot", msg: "server starting" });

// --- database ---
const connectDB = require("./db/config/db");
connectDB();

// --- auth/session ---
const session = require("express-session");
const passport = require("passport");
const initializePassport = require("./controller/passport_config");
const profile_ctrl = require("./controller/profiles_controller.js");
initializePassport(
  passport,
  profile_ctrl.getProfile_email,
  profile_ctrl.getProfile_id
);

const flash = require("express-flash");

// role guards + admin routes
const { requireAuth, requireRole } = require("./server/middleware/roles");
const adminRouter = require("./server/routes/admin");
const apiAuthRouter = require("./server/routes/api_auth");

// --- app-level security middleware (order matters) ---
app.set("trust proxy", 1); // if behind proxy/load balancer

app.use(
  helmet({
    contentSecurityPolicy: false, // keep off if using inline scripts/styles
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- parsers & utilities ---
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// request logging → winston file
app.use(morgan("combined", { stream: logger.stream }));

// (optional probe; remove when done)
app.use((req, res, next) => {
  logger.info({ event: "probe", path: req.originalUrl, method: req.method });
  next();
});

// --- sessions & passport (must come BEFORE protected routes) ---
app.use(
  session({
    secret: process.env.SESSION_PW, // keep secret in env
    resave: false,
    saveUninitialized: false,
    name: "sid",
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
  res.locals.messages = req.flash();   
  next();
});

// --- views & static ---
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

// --- protected admin routes (admin-only logs etc.) ---
app.use("/admin", requireAuth, requireRole("admin"), adminRouter);

// Admin-only API routes
app.use("/api/auth", requireAuth, requireRole("admin"), apiAuthRouter);

// --- routes ---
const loginRoutes = require("./server/routes/login");
app.use("", loginRoutes);

const postsRoutes = require("./server/routes/posts");
app.use("/posts", postsRoutes);

const profilesRoutes = require("./server/routes/profiles");
app.use("/profiles", profilesRoutes);

const mainRoute = require("./server/main");
app.use("/", mainRoute);

const apiRoutes = require("./server/routes/api");
app.use("/api", apiRoutes);

// --- health & test crash (keep above 404) ---
app.get("/health", (req, res) => res.status(200).send("OK"));
app.get("/crash", (req, res, next) => next(new Error("Test error from /crash")));

// --- 404 ---
app.use((req, res) => {
  res.status(404).render("errors/404");
});

// --- centralized error handler (no stack to users) ---
app.use((err, req, res, next) => {
  logger.error({
    event: "server_error",
    path: req.originalUrl,
    method: req.method,
    userId: req.user?._id,
    message: err.message,
    stack: err.stack, // stays in logs; not shown to users
  });
  res
    .status(err.status || 500)
    .render("errors/500", { message: "Something went wrong." });
});

// --- start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening at http://localhost:${PORT}`);
});
