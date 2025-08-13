const express = require('express');
const router = express.Router();
const Post = require('../../db/schema/post');
const Comment = require('../../db/schema/comment');
const auth = require('../../controller/authenticator.js')
require('dotenv').config()

router.use(auth.checkAuthenticated);

router.get('/:postId', async (req, res) => {

    try {
        let slug = req.params.postId;
        const data = await Post.findById({_id: slug});
        const cmt = await Comment.find({commentPostId: slug});

        res.render('post', {data, currentRoute:`/post/${slug}`, user: req.user.username, userID: req.user._id, cmt});
    } catch (error) {
        console.log(error);
    }
    
});

module.exports = router;