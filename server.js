// server.js
const express = require("express");
const app = express();

const morgan = require("morgan");
const logger = require("./server/middleware/logger");
logger.info({ event: "boot", msg: "server starting" });

const connectDB = require("./db/config/db");
connectDB();

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
const methodOverride = require("method-override");

// ------- middleware (order matters) -------
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// request logging → winston file
app.use(morgan("combined", { stream: logger.stream }));
// probe (temporary, for debugging; remove later)
app.use((req, res, next) => {
  logger.info({ event: "probe", path: req.originalUrl, method: req.method });
  next();
});

app.use(
  session({
    secret: process.env.SESSION_PW,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

// ------- routes -------
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

// health check (keep above 404)
app.get("/health", (req, res) => res.status(200).send("OK"));

app.get('/crash', (req, res, next) => next(new Error('Test error from /crash')));

// ------- errors -------
app.use((req, res) => {
  res.status(404).render("errors/404");
});

app.use((err, req, res, next) => {
  logger.error({
    event: "server_error",
    path: req.originalUrl,
    method: req.method,
    userId: req.user?._id,
    message: err.message,
    stack: err.stack,
  });
  res
    .status(err.status || 500)
    .render("errors/500", { message: "Something went wrong." });
});

// ------- start -------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening at http://localhost:${PORT}`);
});
