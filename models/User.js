const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    pointsNo: {
        type: Number,
        default: 0
    },
    referralPoints: {
        type: Number,
        default: 0
    },
    referralContest: {
        type: Number,
        default: 0
    },
    referrerCode: {
        type: String,
        default: ''
    },

    gender: {
        type: String,
        default: null
    },
    earlyAdopterBonusClaimed: {
        type: Boolean,
        default: false
    },

    user: {
        id: Number,
        first_name: String,
        last_name: String,
        username: String,
        language_code: String,
        allows_write_to_pm: Boolean
    },
    taskCompleted: {
        type: Boolean,
        default: false
    },
    tgStatus: {
        type: Boolean,
        default: false
    },
    referralCode: { type: String, unique: true },
    wallet: { type: String },
    referredBy: { type: Boolean, default: false },


})

const User = mongoose.model("User", UserSchema);
module.exports = User;