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
    referredBy: { type: Boolean, default: false },
    referralRewardDeets: {
        type: Array,
        default: [
            {
                claimTreshold: 5,
                rewardClaimed: false
            },
            {
                claimTreshold: 10,
                rewardClaimed: false
            },
            {
                claimTreshold: 15,
                rewardClaimed: false
            },
            {
                claimTreshold: 20,
                rewardClaimed: false
            },
            {
                claimTreshold: 25,
                rewardClaimed: false
            },
            {
                claimTreshold: 30,
                rewardClaimed: false
            },
            {
                claimTreshold: 35,
                rewardClaimed: false
            },
            {
                claimTreshold: 40,
                rewardClaimed: false
            },
            {
                claimTreshold: 45,
                rewardClaimed: false
            },
            {
                claimTreshold: 50,
                rewardClaimed: false
            }
        ]
    },

})

const User = mongoose.model("User", UserSchema);
module.exports = User;