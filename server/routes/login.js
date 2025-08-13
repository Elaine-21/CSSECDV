const express = require('express');
const router = express.Router();
const passport = require('passport')
const auth = require('../../controller/authenticator.js')

const api = require('../../controller/profiles_controller.js')

router.get('/register', async (req, res) =>{
    console.log("user is registering");
    try {
        res.render('register');
    } catch (error) {
        console.log(error);
    }
});

router.post('/register', async (req, res) => {
    const result = await api.registerUser(req.body);

    res.redirect('/')
});

router.get('/login', async (req, res) =>{
    console.log("user is try to log in");
    try {
        res.render('login');
    } catch (error) {
        console.log(error);
    }
});

router.post('/login', passport.authenticate('local', {
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