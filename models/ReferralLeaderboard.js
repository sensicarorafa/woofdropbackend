const mongoose = require('mongoose');

const ReferralLeaderboardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    firstName: String,
    lastName: String,
    username: String,
    pointsNo: Number,
    referralPoints: Number
});

const ReferralLeaderboard = mongoose.model("ReferralLeaderboard", ReferralLeaderboardSchema);
module.exports = ReferralLeaderboard;
