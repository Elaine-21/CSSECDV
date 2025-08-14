const express = require('express');
const router = express.Router();
const passport = require('passport')
const auth = require('../../controller/authenticator.js')

const api = require('../../controller/profiles_controller.js')

router.get('/register', auth.checkAlreadyAuthenticated, async (req, res) =>{
    console.log("user is registering");
    try {
        res.render('register', { error: req.flash('error') });
    } catch (error) {
        console.log(error);
    }
});

router.post('/register', auth.checkAlreadyAuthenticated,async (req, res) => {
    try {
        await api.registerUser(req.body);
        // On successful registration, redirect to the login page.
        req.flash('success_msg', 'Registration successful. Please log in.');
        res.redirect('/login');
    } catch (e) {
        // If registration fails (e.g., duplicate username/email), redirect back to the registration page.
        req.flash('error', e.message);
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
    async (req, res) => {
        if (req.body.remember) {
            const days = 21
            req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * days
        }
        
        const user = await api.getProfile_email(req.body.email);

        // Prepare messages
        let lastSuccess = user.last_successful_login
            ? `Last successful login: ${user.last_successful_login.toLocaleString()}`
            : 'This is your first login.';

        let lastFail = user.last_unsuccessful_login
            ? `Last unsuccessful login: ${user.last_unsuccessful_login.toLocaleString()}`
            : 'No failed login attempts recorded.';

        console.log(lastSuccess)
        console.log(lastFail)
        req.flash('success_msg', `${lastSuccess} <br> ${lastFail}`);
        res.redirect('/');
    }
);

router.get('/reset_password', (req, res) => {
    res.render('reset_password_email', { error: null });
});

router.post('/reset_password', async (req, res) => {
    const { email } = req.body;
    const user = await api.getProfile_email(req.body.email);

    if (!user) {
        return res.render('reset_password_email', { error: 'No account found with that email.' });
    }

    res.redirect(`/reset_password/${encodeURIComponent(email)}`);
});

router.get('/reset_password/:email', async (req, res) => {
    const email = req.params.email;
    const user = await api.getProfile_email(email);

    if (!user || !user.securityQuestions || user.securityQuestions.length < 2) {
        return res.render('reset_password_question', { 
            email, 
            questions: [], 
            error: "Security questions not found" 
        });
    }

    res.render('reset_password_question', { 
        email, 
        questions: user.securityQuestions, 
        error: null 
    });
});

router.post('/reset_password/:email', async (req, res) => {
    const email = req.params.email;
    const { answer1, answer2 } = req.body;

    const user = await api.getProfile_email(email);

    if (!user || !user.securityQuestions || user.securityQuestions.length < 2) {
        return res.render("reset_password_question", { 
            email, 
            questions: [], 
            error: "Security questions not found" 
        });
    }

    const match1 = await api.verifyPassword(answer1, user.securityQuestions[0].answer);
    const match2 = await api.verifyPassword(answer2, user.securityQuestions[1].answer);

    if (!match1 || !match2) {
        return res.render("reset_password_question", { 
            email, 
            questions: user.securityQuestions, 
            error: "One or both answers are incorrect" 
        });
    }

    // If correct, issue token
    const token = await issuePasswordResetToken(user._id);

    // Redirect to password entry page with token in URL
    res.redirect(`/reset_password/${req.params.email}/new-password?token=${token}`);
});

router.get('/reset_password/:email/new', async (req, res) => {
    try {
        //only allow access if a session flag or token is set
        if (!req.session.allowPasswordReset || req.session.resetEmail !== req.params.email) {
            req.flash('error', 'You are not authorized to access this page.');
            return res.redirect('/reset_password');
        }

        res.render('reset_password_new', { email: req.params.email });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong.');
        res.redirect('/reset_password');
    }
});

router.post('/reset_password/:email/new-password', async (req, res) => {
    const { password, token } = req.body;

    const profile = await Profile.findOne({ email: req.params.email });

    if (!profile) {
        req.flash('error', 'User not found.');
        return res.redirect('/reset_password');
    }

    // Hash token and compare with stored
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    if (
        profile.passwordResetToken !== hashedToken ||
        Date.now() > profile.passwordResetExpires
    ) {
        req.flash('error', 'Token invalid or expired.');
        return res.redirect(`/reset_password/${req.params.email}`);
    }

    // Save new password
    const hashedPW = await bcrypt.hash(password, 10);
    profile.password = hashedPW;
    profile.passwordResetToken = undefined;
    profile.passwordResetExpires = undefined;
    await profile.save();

    req.flash('success_msg', 'Password reset successful. Please log in.');
    res.redirect('/login');
});

router.delete('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
});

module.exports = router;