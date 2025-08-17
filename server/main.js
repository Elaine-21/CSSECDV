const express = require('express');
const router = express.Router();

const Profile = require('../db/schema/profile');
const Post = require('../db/schema/post');
const Comment = require('../db/schema/comment');

const auth = require('../controller/authenticator.js');
const api = require('../controller/profiles_controller.js');

const logger = require('./middleware/logger'); // ← added

// GET /
router.get('', auth.checkAuthenticated, async (req, res, next) => {
  try {
    const data = await Post.find().sort({ datePosted: -1 });
    const topPosts = await Post.find().sort({ votes: -1 }).limit(4);

    res.render('index', {
      data,
      user: req.user.username,
      status:req.user.status,
      userID: req.user._id,
      topPosts,
    });
  } catch (error) {
    logger.error({ event: 'server_error', path: req.originalUrl, message: error.message, stack: error.stack });
    next(error);
  }
});

// GET /newPost
router.get('/newPost', auth.checkAuthenticated, async (req, res, next) => {
  try {
    res.render('new_post', { user: req.user.username, status:req.user.status });
  } catch (error) {
    logger.error({ event: 'server_error', path: req.originalUrl, message: error.message, stack: error.stack });
    next(error);
  }
});

/*
POST
*/

// POST /newPost
// - require authentication
// - accept optional image (won't crash if none uploaded)
// - forward errors to central handler
router.post(
  '/newPost',
  auth.checkAuthenticated,
  api.upload.single('image_url'),
  async (req, res, next) => {
    try {

      const contentType = req.body['content-type'];           
      const captionRaw  = req.body.caption || '';
      const textRaw     = req.body.text_content || '';
      const caption     = captionRaw.trim();
      const text        = textRaw.trim();

      const errors = [];
      if (!['image', 'text'].includes(contentType)) {
        errors.push('Choose a content type (Image or Text).');
      }

      if (caption.length < 3 || caption.length > 100) {
        errors.push('Caption must be 3–100 characters.');
      }

      if (contentType === 'text') {
        if (text.length === 0) errors.push('Text content is required for text posts.');
        if (text.length > 3000) errors.push('Text content must be 3,000 characters or fewer.');
      } else if (contentType === 'image') {
        if (text.length > 0) errors.push('Do not include text for an image post.');
      }

      if (errors.length) {
        logger.warn({
          event: 'post_validation_failed',
          path: req.originalUrl,
          userId: req.user._id,
          username: req.user.username,
          reasons: errors,
          contentType,
          caption_len: caption.length,
          text_len: text.length,
          ip: req.ip,
          ua: req.headers['user-agent'],
        });
        errors.forEach(msg => req.flash('error', msg)); 
        return res.status(400).render('new_post', {
          user: req.user.username,
          status: req.user.status,
          old: req.body, 
        });
      }

      // Build image path if a file was uploaded
      let imgPath = null;
      if (req.file && req.file.path) {
        // normalize to URL-ish path (remove leading directory like 'public/')
        imgPath = '/' + req.file.path.split('/').slice(1).join('/');
      }

      const newPost = new Post({
        title: req.body.caption,
        text_content: req.body.text_content,
        image_url: imgPath || '', // allow empty if no image
        author: req.user.username,
      });

      await Post.create(newPost);

      logger.info({
        event: 'post_created',
        userId: req.user._id,
        username: req.user.username,
        contentType,
        withImage: !!imgPath,
        caption_len: caption.length,
        text_len: text.length,
      });

      res.redirect('/');
    } catch (error) {
      logger.error({ event: 'server_error', path: req.originalUrl, message: error.message, stack: error.stack });
      next(error);
    }
  }
);

/*
GET
*/

// GET /editPost/:id
router.get('/editPost/:id', auth.checkAuthenticated, async (req, res, next) => {
  try {
    const data = await Post.findOne({ _id: req.params.id });
    res.render('edit_post', { data, user: req.user.username, status:req.user.status });
  } catch (error) {
    logger.error({ event: 'server_error', path: req.originalUrl, message: error.message, stack: error.stack });
    next(error);
  }
});

/*
PUT
*/

// PUT /editPost/:id
router.put('/editPost/:id', async (req, res, next) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, {
      title: req.body.caption,
      text_content: req.body.text_content,
      image_url: req.body.image_url,
      author: req.user.username,
      postEdit: true,
      datePosted: new Date(),
    });

    res.redirect(`/posts/${req.params.id}`);
  } catch (error) {
    logger.error({ event: 'server_error', path: req.originalUrl, message: error.message, stack: error.stack });
    next(error);
  }
});

/*
DELETE
*/

// DELETE /deletePost/:id
router.delete('/deletePost/:id', async (req, res, next) => {
  try {
    await Post.deleteOne({ _id: req.params.id });
    res.redirect('/');
  } catch (error) {
    logger.error({ event: 'server_error', path: req.originalUrl, message: error.message, stack: error.stack });
    next(error);
  }
});

// POST / (search)
router.post('', async (req, res, next) => {
  try {
    const searchTerm = req.body.searchTerm || '';
    const searchNoSpecialChar = searchTerm.replace(/[^a-zA-Z0-9 ]/g, '');
    const topPosts = await Post.find().sort({ votes: -1 }).limit(4);

    const data = await Post.find({
      $or: [
        { title:   { $regex: new RegExp(searchNoSpecialChar, 'i') } },
        { caption: { $regex: new RegExp(searchNoSpecialChar, 'i') } },
        { author:  { $regex: new RegExp(searchNoSpecialChar, 'i') } },
      ],
    });

    res.render('index', {
      data,
      currentRoute: '/',
      user: req.user.username,
      status:req.user.status,
      userID: req.user._id,
      topPosts,
    });
  } catch (error) {
    logger.error({ event: 'server_error', path: req.originalUrl, message: error.message, stack: error.stack });
    next(error);
  }
});

// POST /posts/:id (add comment)
router.post('/posts/:id', async (req, res, next) => {
  try {
    const postId = req.params.id;

    if (req.body.comTerm && req.body.comTerm.trim() !== '') {
      const newComment = {
        commentPostId: postId,
        comment: req.body.comTerm,
        commentAuthor: req.user.username,
      };
      await Comment.create(newComment);
    }

    res.redirect(`/posts/${postId}`);
  } catch (error) {
    logger.error({ event: 'server_error', path: req.originalUrl, message: error.message, stack: error.stack });
    next(error);
  }
});

// POST /posts/:postId/comments/:commentId/edit
router.post('/posts/:postId/comments/:commentId/edit', async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const commentId = req.params.commentId;

    const comment = await Comment.findById(commentId);
    if (comment) {
      comment.comment = req.body.editTerm;
      comment.commentEdit = true;
      comment.commentDate = new Date();
      await comment.save();
    }

    res.redirect(`/posts/${postId}`);
  } catch (error) {
    logger.error({ event: 'server_error', path: req.originalUrl, message: error.message, stack: error.stack });
    next(error);
  }
});

// POST /posts/:postId/comments/:commentId/delete
router.post('/posts/:postId/comments/:commentId/delete', async (req, res, next) => {
  try {
    await Comment.deleteOne({ _id: req.params.commentId });
    res.redirect(`/posts/${req.params.postId}`);
  } catch (error) {
    logger.error({ event: 'server_error', path: req.originalUrl, message: error.message, stack: error.stack });
    next(error);
  }
});

// POST /posts/:postId/comments/:commentId/reply
router.post('/posts/:postId/comments/:commentId/reply', async (req, res, next) => {
  try {
    const postId = req.params.postId;
    if (req.body.replyTerm && req.body.replyTerm.trim() !== '') {
      const newComment = {
        commentPostId: postId,
        comment: req.body.replyTerm,
        commentAuthor: req.user.username,
      };
      await Comment.create(newComment);
    }
    res.redirect(`/posts/${postId}`);
  } catch (error) {
    logger.error({ event: 'server_error', path: req.originalUrl, message: error.message, stack: error.stack });
    next(error);
  }
});

module.exports = router;
