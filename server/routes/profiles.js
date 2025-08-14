const express = require('express');
const router = express.Router();
const auth = require('../../controller/authenticator.js')
require('dotenv').config()

const api = require('../../controller/profiles_controller.js')

const Profile = require('../../db/schema/profile');

router.use(auth.checkAuthenticated);

router.get('/:username', async (req, res) => {
    await api.renderProfile(req, res);
});

router.post('/reauthenticate', async (req, res) => {
    try {
        const { password } = req.body;
        const user = await api.getProfile_id(req.user._id);
        const isMatch = await api.verifyPassword(password, user.password);
        if (isMatch) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'An error occurred.' });
    }
});

router.get('/:username/edit', (req, res) => {
    res.render("edit_profile", { user: req.user })
});

router.post('/edit-profile', api.upload.fields([{name: 'profile', maxCount: 1}, {name: 'background', maxCount: 1}]), 
    async (req, res) => {
        try {
            console.log("current user" + req.body.currentUser);
            console.log("new user" + req.body.username_change);
            
            await api.updateUser(req.body, req.files);
    
            const newUsername = req.body.username_change || req.body.currentUser;
            res.redirect("/profiles/" + newUsername);
        } catch (err) {
            console.error(err);
            if (err.message === "PasswordCooldownError: You can only change your password once every 24 hours.") {
                // Calculate when the user can change it again
                const userProfile = await api.getProfile_username(req.user.username); // Re-fetch to get passwordAge
                const nextChangeTimestamp = userProfile.passwordAge.getTime() + (24 * 60 * 60 * 1000);
                const nextChangeDate = new Date(nextChangeTimestamp);

                res.render("edit_profile", {
                    user: req.user,
                    error: 'password_cooldown',
                    nextChangeTime: nextChangeDate.toLocaleString() // Format for display
                });
            } else if (err.message === "PasswordReuseError: Old password cannot be reused.") {
                res.render("edit_profile", { user: req.user, error: 'password_reuse' });
            } else {
                // For other errors, redirect to edit page without specific error message
                res.render("edit_profile", { user: req.user, error: null }); // Or handle other errors as needed
            }
        }
});

router.get('/checkUsernameExist/:username', async (req, res) => {
    const username = req.params.username;
    const exist = await Profile.findOne({username : username});

    if (exist) {
        res.send({valid: false});
    }
    else {
        res.send({valid: true});
    }
});

router.get('/checkEmailExist/:email', async (req, res) => {
    const email = req.params.email;
    const exist = await Profile.findOne({email : email});

    if (exist) {
        res.send({valid: false});
    }
    else {
        res.send({valid: true});
    }
});

router.param("username", (req, res, next, username) => {
    req.username = username;
    next();
});

module.exports = router;