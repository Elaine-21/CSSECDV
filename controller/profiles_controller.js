const Profile = require('../db/schema/profile');
const Post = require('../db/schema/post');
const Comment = require('../db/schema/comment');

const multer = require('multer');
const path = require('path');

const bcrypt = require('bcrypt');
const comment = require('../db/schema/comment');

/**
 * Validates a password based on complexity requirements.
 * @param {string} password The password to validate.
 * @throws {Error} If the password does not meet the requirements.
 */
function validatePassword(password) {
    if (!password || password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
    }
    if (/\s/.test(password)) {
        throw new Error("Password must not contain spaces.");
    }
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(password)) {
        throw new Error("Password must contain at least one special character.");
    }
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'profile') {
            cb(null, './public/images/profile_pics/profile_pic')
        }
        else if (file.fieldname === 'background') {
            cb(null, './public/images/profile_pics/cover_pics')
        }
        else if(file.fieldname === 'image_url') {
            cb(null, './public/images/post_pics')
        }
    },
    filename: function (req, file, cb) {
        if(file.fieldname === 'image_url'){
            cb(null, req.user.id + req.body.caption + path.extname(file.originalname))
        }
        else{
            cb(null, req.user._id + path.extname(file.originalname))
        }
    }
});
function fileFilter (req, file, cb) {
  
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true)
    }
    else {
        cb(null, false)
    }
  
}

const upload = multer({ storage: storage , fileFilter: fileFilter})

async function updateUser(req_body, req_files) {
    if (req_body.password_change.length !== 0) {
        validatePassword(req_body.password_change);

        const userProfile = await Profile.findOne({"username": req_body.currentUser});
        if (!userProfile) {
            throw new Error("User profile not found.");
        }

        // Password Reuse Check
        const newHashedPassword = await bcrypt.hash(req_body.password_change, 10);
        for (const oldHashedPassword of userProfile.passwordHistory) {
            if (await bcrypt.compare(req_body.password_change, oldHashedPassword)) {
                throw new Error("PasswordReuseError: Old password cannot be reused.");
            }
        }

        // Add current password to history and manage limit
        if (userProfile.password) { // Only add if a password exists
            userProfile.passwordHistory.push(userProfile.password);
        }
        
        await Profile.updateOne(
            {"username": req_body.currentUser},
            {$set:{"password": newHashedPassword, "passwordHistory": userProfile.passwordHistory}}
        );
    }

    if (req_body.email.length !== 0) {
        await Profile.updateOne({"username": req_body.currentUser}, {$set:{"email": req_body.email}});
    }

    if (req_body.username_change.length !== 0) {
        await Profile.updateOne({"username": req_body.currentUser}, {$set:{"username": req_body.username_change}});

        await Post.updateMany({"author": req_body.currentUser}, {$set: {"author": req_body.username_change}});

        await Comment.updateMany({"commentAuthor": req_body.currentUser}, {$set: {"commentAuthor": req_body.username_change}});
    }

    if (req_files['profile']) {
        console.log("The path to picture is: " + req_files['profile'][0].path);
        await Profile.updateOne({"username": req_body.currentUser}, {$set:{"profilePicture": '/' + req_files['profile'][0].path.split('/').slice(1).join('/')}});
    }
    
    if (req_files['background']) {
        await Profile.updateOne({"username": req_body.currentUser}, {$set:{"backgroundPicture": '/' + req_files['background'][0].path.split('/').slice(1).join('/')}});
    }
}

async function registerUser(req_body) {
    validatePassword(req_body.password);
    const hashedPW = await bcrypt.hash(req_body.password, 10)
    // Let this throw an error on failure (e.g. duplicate key)
    // The route handler will catch it.
    await Profile.create({
        username: req_body.username,
        password: hashedPW,
        email: req_body.email,
    });
}

async function getProfile_username(username) {
    return await Profile.findOne({"username": username});
}

async function getProfile_id(id) {
    return await Profile.findById(id);
}

async function getProfile_email(email) {
    return await Profile.findOne({"email": email});
}

async function renderProfile(req, res) {
    const postData = await Post.find({"author": req.username});
    const profileData = await getProfile_username(req.username);
    const commentData = await Comment.find({"commentAuthor": req.username});

    try {
        const profilePic = profileData.profilePicture;
        const backgroundPic = profileData.backgroundPicture;

        res.render("profile", { user: req.user.username,
            username: req.username,
            data: postData,
            pPicPath: profilePic,
            bgPicPath: backgroundPic,
            userID: req.user._id,
            commentD: commentData});
    } catch (err) {
        console.log(err);
        res.redirect('/');
    }
}

async function verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

module.exports = { renderProfile, getProfile_username, getProfile_id, getProfile_email, updateUser, registerUser, 
                    upload, verifyPassword }