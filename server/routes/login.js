// server/routes/login.js
const express = require('express');
const router = express.Router();
const passport = require('passport');

const logger = require('../middleware/logger');                 // require first
const auth = require('../../controller/authenticator.js');
const api = require('../../controller/profiles_controller.js');

// Optional: prove this file is loaded
logger.info({ evt: 'ROUTE_LOAD', route: 'login.js loaded' });

/* -----------------------
 * Registration
 * --------------------- */
router.get('/register', auth.checkAlreadyAuthenticated, async (req, res) => {
    logger.info({
        event: 'auth_attempt',
        status: 'register_page',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

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

    logger.info({
        event: 'auth_attempt',
        status: 'register_submit',
        username: req.body.username,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });
    try{
        const result = await api.registerUser(req.body);
        if(!result){
            req.flash('error', 'Username or email already exists.');
            return res.status(400).render('register', { old: req.body });
        }
        req.flash('success', 'Account created. Please log in.');

        logger.info({
            evt: 'AUTH_REGISTER',
            ok: !!result,
            username: req.body.username,
            ip: req.ip,
        });

        return res.redirect('/');
    } catch (error) {
        req.flash('error', 'Server error. Please try again.');
        return res.status(500).render('register', { old: req.body });
    }
    
});

/* -----------------------
 * Login
 * --------------------- */
router.get('/login', auth.checkAlreadyAuthenticated, async (req, res) => {
  logger.info({
    event: 'auth_attempt',
    status: 'login_page',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  try {
    res.render('login');
  } catch (error) {
    logger.error({ event: 'error', msg: error.message });
  }
});

// <<< Your requested handler, integrated >>>
router.post('/login', auth.checkAlreadyAuthenticated, (req, res, next) => {
    const { email, password, remember } = req.body;
    const identifier = req.body?.email || req.body?.username || '';

  // Emit an explicit "received" line on every POST /login
  logger.info({
    evt: 'AUTH_LOGIN_ATTEMPT',
    stage: 'received',
    ok: null,
    emailOrUsername: identifier,
    ip: req.ip,
    ua: req.headers['user-agent'],
  });

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      logger.error({
        evt: 'AUTH_LOGIN_ATTEMPT',
        ok: false,
        reason: 'strategy_error',
        emailOrUsername: identifier,
        message: err.message,
        ip: req.ip,
      });
      return next(err);
    }

    if (!user) {
      logger.warn({
        evt: 'AUTH_LOGIN_ATTEMPT',
        ok: false,
        reason: info?.message || 'invalid_credentials',
        emailOrUsername: identifier,
        ip: req.ip,
      });
      req.flash('error', 'Invalid email or password.');
      return res.status(401).render('login', { message: 'Invalid credentials.' });
    }

    req.logIn(user, (err2) => {
      if (err2) {
        logger.error({
          evt: 'AUTH_LOGIN_ATTEMPT',
          ok: false,
          reason: 'session_error',
          emailOrUsername: identifier,
          message: err2.message,
          userId: user?._id,
          ip: req.ip,
        });
        return next(err2);
      }

      if (user.status === 'banned') {
        logger.warn({
          evt: 'AUTH_LOGIN_ATTEMPT',
          ok: false,
          reason: 'banned',
          emailOrUsername: identifier,
          userId: user._id,
          ip: req.ip,
        });
        req.logout(() => res.status(403).render('errors/banned'));
        return;
      }

      // SUCCESS
      logger.info({
        evt: 'AUTH_LOGIN_ATTEMPT',
        ok: true,
        userId: user._id,
        email: user.email || undefined,
        username: user.username || undefined,
        role: user.userType,
        ip: req.ip,
      });

      if (req.body.remember) {
        req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 21; // 21 days
      }

      return res.redirect('/');
    });
  })(req, res, next);
});

/* -----------------------
 * Logout
 * --------------------- */
router.delete('/logout', function (req, res, next) {
  logger.info({
    evt: 'AUTH_LOGOUT',
    userId: req.user?._id,
    email: req.user?.email,
    username: req.user?.username,
    ip: req.ip,
    ua: req.headers['user-agent'],
  });
  req.logout(function (err) {
    if (err) {
      logger.error({ evt: 'AUTH_LOGOUT', ok: false, message: err.message });
      return next(err);
    }
    res.redirect('/');
  });
});

module.exports = router;
