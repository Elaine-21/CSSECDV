// controller/api_controller.js
const Post = require('../db/schema/post');

/**
 * Helper to compute net votes after update.
 */
async function _computeNetVotes(postId) {
  const updated = await Post.findById(postId).select('upvotes downvotes').lean();
  const numVotes = (updated?.upvotes?.length || 0) - (updated?.downvotes?.length || 0);
  return { updated, numVotes };
}

/**
 * Toggle UPVOTE for the logged-in user.
 * ENGAGE:   add upvote (+1)
 * DISENGAGE:remove upvote (-1)
 * SWITCH:   down->up (+2)
 */
async function upvoteFunction(req) {
  try {
    const userId = req.user?._id;
    const { postID } = req.body || {};
    if (!userId) return { ok: false, status: 401, error: 'Unauthorized' };
    if (!postID) return { ok: false, status: 400, error: 'Missing postID' };

    const post = await Post.findById(postID);
    if (!post) return { ok: false, status: 404, error: 'Post not found' };

    const uid = String(userId);
    const hasUp = (post.upvotes || []).some(id => String(id) === uid);
    const hasDown = (post.downvotes || []).some(id => String(id) === uid);

    let action = 'ENGAGE';
    const update = {};

    if (hasUp) {
      action = 'DISENGAGE';
      update.$pull = { upvotes: userId };
      update.$inc  = { votes: -1 };
    } else if (hasDown) {
      action = 'SWITCH';
      update.$pull     = { downvotes: userId };
      update.$addToSet = { upvotes: userId };
      update.$inc      = { votes: 2 };
    } else {
      update.$addToSet = { upvotes: userId };
      update.$inc      = { votes: 1 };
    }

    await Post.updateOne({ _id: post._id }, update);
    const { numVotes } = await _computeNetVotes(post._id);
    return { ok: true, status: 200, userAction: action, numVotes };
  } catch (err) {
    console.error(err);
    return { ok: false, status: 500, error: 'Internal Server Error' };
  }
}

/**
 * Toggle DOWNVOTE for the logged-in user.
 * ENGAGE:   add downvote (-1)
 * DISENGAGE:remove downvote (+1)
 * SWITCH:   up->down (-2)
 */
async function downvoteFunction(req) {
  try {
    const userId = req.user?._id;
    const { postID } = req.body || {};
    if (!userId) return { ok: false, status: 401, error: 'Unauthorized' };
    if (!postID) return { ok: false, status: 400, error: 'Missing postID' };

    const post = await Post.findById(postID);
    if (!post) return { ok: false, status: 404, error: 'Post not found' };

    const uid = String(userId);
    const hasUp = (post.upvotes || []).some(id => String(id) === uid);
    const hasDown = (post.downvotes || []).some(id => String(id) === uid);

    let action = 'ENGAGE';
    const update = {};

    if (hasDown) {
      action = 'DISENGAGE';
      update.$pull = { downvotes: userId };
      update.$inc  = { votes: +1 };
    } else if (hasUp) {
      action = 'SWITCH';
      update.$pull     = { upvotes: userId };
      update.$addToSet = { downvotes: userId };
      update.$inc      = { votes: -2 };
    } else {
      update.$addToSet = { downvotes: userId };
      update.$inc      = { votes: -1 };
    }

    await Post.updateOne({ _id: post._id }, update);
    const { numVotes } = await _computeNetVotes(post._id);
    return { ok: true, status: 200, userAction: action, numVotes };
  } catch (err) {
    console.error(err);
    return { ok: false, status: 500, error: 'Internal Server Error' };
  }
}

module.exports = { upvoteFunction, downvoteFunction };
