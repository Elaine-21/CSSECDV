const express = require("express");
const app = express();

const connectDB = require("./db/config/db");
const { post } = require("./server/routes/profiles");
const db = connectDB();

const profile_ctrl = require("./controller/profiles_controller.js")

var session = require('express-session');
const passport = require('passport')
const initializePassport = require('./controller/passport_config')
initializePassport(
  passport,
  profile_ctrl.getProfile_email,
  profile_ctrl.getProfile_id
)

const flash = require('express-flash')

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_PW,
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize())
app.use(passport.session())

app.use(flash())

app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));

app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    next();
});

const loginRoutes = require('./server/routes/login');
app.use('', loginRoutes);

const postsRoutes = require('./server/routes/posts');
app.use('/posts', postsRoutes);

const profilesRoutes = require('./server/routes/profiles');
app.use('/profiles', profilesRoutes);

const mainRoute = require('./server/main');
app.use('/', mainRoute);

const apiRoutes = require('./server/routes/api');
app.use('/api', apiRoutes);

app.listen(3000);