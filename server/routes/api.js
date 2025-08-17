const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/roles');
const api = require('../../controller/api_controller.js');

// Parse body if not already done globally
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

router.post(
  '/upvote',
  requireAuth,
  body('postID').isMongoId().withMessage('Invalid postID'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // optional: audit logger.warn({ evt: 'VALIDATION_FAIL', ... })
        return res.status(400).json({ ok: false, errors: errors.array() });
      }

      const result = await api.upvoteFunction(req, res);
      if (!result.ok) {
        return res.status(result.status || 400).json(result);
      }
      return res.status(200).json(result);
    } catch (err) {
      return next(err); // centralized error handler logs and renders 500
    }
  }
);

router.post(
  '/downvote',
  requireAuth,
  body('postID').isMongoId().withMessage('Invalid postID'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, errors: errors.array() });
      }
      const result = await api.downvoteFunction(req, res);
      return res.status(result.status || (result.ok ? 200 : 400)).json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
