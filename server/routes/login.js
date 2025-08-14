const logger = require('../middleware/logger');
const express = require('express');
const router = express.Router();
const passport = require('passport');
const auth = require('../../controller/authenticator.js');
const api = require('../../controller/profiles_controller.js');

router.get('/register', auth.checkAlreadyAuthenticated, async (req, res) =>{
    logger.info({ event: 'auth_attempt', status: 'register_page', ip: req.ip, userAgent: req.headers['user-agent'] });
    try {
        res.render('register');
    } catch (error) {
        logger.error({ event: 'error', msg: error.message });
    }
});

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        req.flash('error', 'All fields are required.');
        return res.status(400).render('register', { old: req.body });
    }

    logger.info({ event: 'auth_attempt', status: 'register_submit', username: req.body.username, ip: req.ip, userAgent: req.headers['user-agent'] });
    const result = await api.registerUser(req.body);
    res.redirect('/');

});

router.get('/login', auth.checkAlreadyAuthenticated, async (req, res) =>{
    logger.info({ event: 'auth_attempt', status: 'login_page', ip: req.ip, userAgent: req.headers['user-agent'] });
    try {
        res.render('login');
    } catch (error) {
        logger.error({ event: 'error', msg: error.message });
    }
});

router.post('/login', auth.checkAlreadyAuthenticated, (req, res, next) => {
    // Log every login attempt
    logger.info({ event: 'auth_attempt', status: 'login_attempt', username: req.body.username, ip: req.ip, userAgent: req.headers['user-agent'] });

    passport.authenticate('local', (err, user, info) => {
        if (err) {
            logger.error({ event: 'auth_attempt', status: 'error', username: req.body.username, msg: err.message });
            return next(err);
        }
        if (!user) {
            logger.warn({ event: 'auth_attempt', status: 'failure', username: req.body.username, reason: info?.message || 'Invalid credentials' });
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                logger.error({ event: 'auth_attempt', status: 'error', username: req.body.username, msg: err.message });
                return next(err);
            }

            if (user.status === 'banned') {
                logger.warn({ event: 'auth_attempt', status: 'denied_banned', username: req.body.username });
                req.logout(() => {
                return res.render('errors/banned');
                });
                return;
            }

            logger.info({ event: 'auth_attempt', status: 'success', username: req.body.username });
            if (req.body.remember) {
                const days = 21;
                req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * days;
            }
            res.redirect('/');
        });
    })(req, res, next);
});

router.delete('/logout', function(req, res, next) {
    logger.info({ event: 'auth_attempt', status: 'logout', username: req.user?.username, ip: req.ip, userAgent: req.headers['user-agent'] });
    req.logout(function(err) {
        if (err) {
            logger.error({ event: 'auth_attempt', status: 'logout_error', msg: err.message });
            return next(err);
        }
        res.redirect('/');
    });
});

module.exports = router;