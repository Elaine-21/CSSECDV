const express = require('express');
const router = express.Router();
const passport = require('passport')
const auth = require('../../controller/authenticator.js')

const api = require('../../controller/profiles_controller.js')

router.get('/register', auth.checkAlreadyAuthenticated, async (req, res) =>{
    console.log("user is registering");
    try {
        res.render('register');
    } catch (error) {
        console.log(error);
    }
});

router.post('/register', auth.checkAlreadyAuthenticated,async (req, res) => {
    try {
        await api.registerUser(req.body);
        // On successful registration, redirect to the login page.
        // You might want to add a flash message here saying "Registration successful. Please log in."
        res.redirect('/login');
    } catch (e) {
        // If registration fails (e.g., duplicate username/email), redirect back to the registration page.
        // It's a good practice to use connect-flash to show an error message.
        res.redirect('/register');
    }
});

router.get('/login', auth.checkAlreadyAuthenticated, async (req, res) =>{
    console.log("user is try to log in");
    try {
        res.render('login');
    } catch (error) {
        console.log(error);
    }
});

router.post('/login', auth.checkAlreadyAuthenticated, passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true,
}),
    (req, res) => {
        if (req.body.remember) {
            const days = 21
            req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * days
        }

        res.redirect('/');
    }
);

router.delete('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
});

module.exports = router;