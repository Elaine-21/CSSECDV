const express = require('express');
const router = express.Router();
require('dotenv').config();
const auth = require('../../controller/authenticator.js')
const api = require('../../controller/api_controller.js')

router.use(express.urlencoded({ extended: true }))
router.use(auth.checkAuthenticated);

router.post("/upvote", async (req, res) => {
    const result = await api.upvoteFunction(req, res);

    if (result !== null) {
        res.send(result)
    }
});

router.post("/downvote", async (req, res) => {
    const result = await api.downvoteFunction(req,res);

    if (result !== null) {
        res.send(result)
    }
});

module.exports = router;