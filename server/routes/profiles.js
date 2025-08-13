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
            // For a better user experience, use connect-flash to show the error message on the edit page.
            res.redirect(`/profiles/${req.body.currentUser}/edit`);
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