// controller/api_controller.js
const Profile = require('../db/schema/profile');
const Post = require('../db/schema/post');

/**
 * Toggle an upvote for the logged-in user.
 * - If already upvoted: disengage (remove upvote, votes -1)
 * - If downvoted: remove downvote and add upvote (votes +2)
 * - Else: add upvote (votes +1)
 * Returns: { ok, status, numVotes, userAction, votes? }
 */
async function upvoteFunction(req, res) {
  try {
    const userId = req.user?._id;
    const { postID } = req.body || {};

    if (!userId) return { ok: false, status: 401, error: 'Unauthorized' };
    if (!postID) return { ok: false, status: 400, error: 'Missing postID' };

    const post = await Post.findById(postID);
    if (!post) return { ok: false, status: 404, error: 'Post not found' };

    // Normalize arrays to avoid null/undefined
    if (!Array.isArray(post.upvotes)) post.upvotes = [];
    if (!Array.isArray(post.downvotes)) post.downvotes = [];

    const uid = userId.toString();
    const hasUp = post.upvotes.some((id) => id?.toString() === uid);
    const hasDown = post.downvotes.some((id) => id?.toString() === uid);

    let action = 'ENGAGE';
    let update = {};

    if (hasUp) {
      // remove upvote (disengage)
      action = 'DISENGAGE';
      update = {
        $pull: { upvotes: userId },
        $inc: { votes: -1 },
      };
    } else {
      // add upvote
      update = {
        $addToSet: { upvotes: userId },
        $inc: { votes: hasDown ? 2 : 1 },
      };
      if (hasDown) {
        update.$pull = { ...(update.$pull || {}), downvotes: userId };
      }
    }

    await Post.updateOne({ _id: post._id }, update);

    // Re-read the updated counts (lean is fine here)
    const updated = await Post.findById(post._id).select('votes upvotes downvotes').lean();
    const numVotes = (updated?.upvotes?.length || 0) - (updated?.downvotes?.length || 0);

    return { ok: true, status: 200, numVotes, userAction: action, votes: updated?.votes ?? 0 };
  } catch (err) {
    console.error(err);
    return { ok: false, status: 500, error: 'Internal Server Error' };
  }
}

/**
 * Toggle a downvote for the logged-in user.
 * - If already downvoted: disengage (remove downvote, votes +1)
 * - If upvoted: remove upvote and add downvote (votes -2)
 * - Else: add downvote (votes -1)
 * Returns: { ok, status, numVotes, userAction, votes? }
 */
async function downvoteFunction(req, res) {
  try {
    const userId = req.user?._id;
    const { postID } = req.body || {};

    if (!userId) return { ok: false, status: 401, error: 'Unauthorized' };
    if (!postID) return { ok: false, status: 400, error: 'Missing postID' };

    const post = await Post.findById(postID);
    if (!post) return { ok: false, status: 404, error: 'Post not found' };

    if (!Array.isArray(post.upvotes)) post.upvotes = [];
    if (!Array.isArray(post.downvotes)) post.downvotes = [];

    const uid = userId.toString();
    const hasUp = post.upvotes.some((id) => id?.toString() === uid);
    const hasDown = post.downvotes.some((id) => id?.toString() === uid);

    let action = 'ENGAGE';
    let update = {};

    if (hasDown) {
      // remove downvote (disengage)
      action = 'DISENGAGE';
      update = {
        $pull: { downvotes: userId },
        $inc: { votes: +1 },
      };
    } else {
      // add downvote
      update = {
        $addToSet: { downvotes: userId },
        $inc: { votes: hasUp ? -2 : -1 },
      };
      if (hasUp) {
        update.$pull = { ...(update.$pull || {}), upvotes: userId };
      }
    }

    await Post.updateOne({ _id: post._id }, update);

    const updated = await Post.findById(post._id).select('votes upvotes downvotes').lean();
    const numVotes = (updated?.upvotes?.length || 0) - (updated?.downvotes?.length || 0);

    return { ok: true, status: 200, numVotes, userAction: action, votes: updated?.votes ?? 0 };
  } catch (err) {
    console.error(err);
    return { ok: false, status: 500, error: 'Internal Server Error' };
  }
}

module.exports = { upvoteFunction, downvoteFunction };
