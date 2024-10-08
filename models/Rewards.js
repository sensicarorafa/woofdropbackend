const mongoose = require('mongoose');

const rewardsSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    unique: true,
  },
  dailyClaims: [
    {
      date: {
        type: Date,
        required: true,
      },
      points: {
        type: Number,
        default: 10, // Number of points claimed daily
      },
    },
  ],
  cycleStartDate: {
    type: Date,
    default: Date.now,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },

});

rewardsSchema.methods.isClaimedToday = function () {
  const today = new Date();
  return this.dailyClaims.some(claim => {
    const claimDate = new Date(claim.date);
    return (
      claimDate.getFullYear() === today.getFullYear() &&
      claimDate.getMonth() === today.getMonth() &&
      claimDate.getDate() === today.getDate()
    );
  });
};

module.exports = mongoose.model('Rewards', rewardsSchema);
