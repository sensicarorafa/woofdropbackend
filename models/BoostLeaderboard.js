const mongoose = require('mongoose');

const BoostLeaderboardSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true
    },
    firstName: String,
    lastName: String,
    username: String,
    pointsNo: {
        type: Number,
        default: 0
    },
    boostCode: {
        type: String,
    },
    referralPoints: {
        type: Number,
        default: 0
    },
    boostActivated:{ 
        type: Boolean,
        default:false

    },
    referrerBoostCode: {
        type: String,
        default: ''
    }
});

const BoostLeaderboard = mongoose.model("boostLeaderboard", BoostLeaderboardSchema);
module.exports = BoostLeaderboard;