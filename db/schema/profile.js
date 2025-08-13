const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const SecurityQuestionSchema = new Schema({
    question: { 
        type: String, 
        required: true 
    },
    answer: { 
        type: String, 
        required: true 
    }
});

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
    failedLoginAttempts: {
        type: Number
    },
    lockUntil: {
        type: Date, 
        default: null
    },
    securityQuestions: { 
        type: [SecurityQuestionSchema], 
        default: [] 
    },
    passwordHistory: { 
        type: [String], 
        default: []
    },
    passwordAge: {
        type: Date, 
        default: Date.now
    },
    last_successful_login: { 
        type: Date, 
        default: null 
    },
    last_unsuccessful_login: { 
        type: Date, 
        default: null 
    }
});

module.exports = mongoose.model('Profile', ProfileSchema);