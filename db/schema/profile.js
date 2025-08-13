const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const USER_TYPES = {
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    USER: 'user'
};

const ProfileSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    }, 
    dateJoined: {
        type: Date,
        default: Date.now
    },
    profilePicture: {
        type: String
    },
    backgroundPicture: {
        type: String
    },
    profileDescription: {
        type: String
    },
    userType:{
        type: String,
        enum: Object.values(USER_TYPES),
        required: true
    },
    status: {
        type: String,
        enum: ['active','muted','banned'],
        default: 'active'
    }
});

module.exports = mongoose.model('Profile', ProfileSchema);