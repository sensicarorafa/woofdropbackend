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
    userLevel: {
        type: Number,
        default: 1
    },
    totalSteps: {
        type: Number,
        default: 0
    },
    pointsToday: {
        type: Number,
        default: 0
    },
    totalStepsToday: {
        type: Number,
        default: 0
    },
    gender: {
        type: String,
        default: null
    },
    earlyAdopterBonusClaimed: {
        type: Boolean,
        default: false
    },
    isTracking: {
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
    socialRewardDeets: {
        type: Array,
        default: [
            {
                claimTreshold: 'follow',
                rewardClaimed: false,
                btnText: String,
                taskText: String,
                taskPoints: Number,
                taskCategory: String,
                taskUrl: String
            },
            {
                claimTreshold: 'repost',
                rewardClaimed: false,
                btnText: String,
                taskText: String,
                taskPoints: Number,
                taskCategory: String,
                taskUrl: String
            },
            {
                claimTreshold: 'telegram',
                rewardClaimed: false,
                btnText: String,
                taskText: String,
                taskPoints: Number,
                taskCategory: String,
                taskUrl: String
            },
            {
                claimTreshold: 'two-frens',
                rewardClaimed: false,
                btnText: String,
                taskText: String,
                taskPoints: Number,
                taskCategory: String,
                taskUrl: String
            },
            {
                claimTreshold: 'youtube',
                rewardClaimed: false,
                btnText: String,
                taskText: String,
                taskPoints: Number,
                taskCategory: String,
                taskUrl: String
            },
            {
                claimTreshold: 'instagram',
                rewardClaimed: false,
                btnText: String,
                taskText: String,
                taskPoints: Number,
                taskCategory: String,
                taskUrl: String
            },
            {
                claimTreshold: 'five-frens',
                rewardClaimed: false,
                btnText: String,
                taskText: String,
                taskPoints: Number,
                taskCategory: String,
                taskUrl: String
            },
            {
                claimTreshold: 'ten-frens',
                rewardClaimed: false,
                btnText: String,
                taskText: String,
                taskPoints: Number,
                taskCategory: String,
                taskUrl: String
            }
        ]
    }
})

const User = mongoose.model("User", UserSchema);
module.exports = User;