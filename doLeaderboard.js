const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Leaderboard = require('./models/Leaderboard');
const ReferralLeaderboard = require('./models/ReferralLeaderboard');
const refAccountsPath = path.join(__dirname, 'ref_accounts.json');
require('dotenv').config()

// MongoDB Connection
const mongooseUrl = process.env.MONGOOSE_URL;

// Function to generate random number within a range
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Function to generate a valid ObjectId
const generateObjectId = () => new mongoose.Types.ObjectId();

// Retrieve the highest values from Leaderboard and ReferralLeaderboard
const getMaxValuesFromDB = async () => {
  try {
    // Get highest pointsNo from Leaderboard
    const highestLeaderboardUser = await Leaderboard.findOne().sort({ pointsNo: -1 }).exec();
    const highestPointsNo = highestLeaderboardUser ? highestLeaderboardUser.pointsNo : 0;

    // Get highest referralPoints and pointsNo from ReferralLeaderboard
    const highestReferralUser = await ReferralLeaderboard.findOne().sort({ referralPoints: -1 }).exec();
    const highestReferralPoints = highestReferralUser ? highestReferralUser.referralPoints : 0;
    const highestReferralContest = highestReferralUser ? highestReferralUser.pointsNo : 0;

    return {
      highestPointsNo,
      highestReferralPoints,
      highestReferralContest
    };
  } catch (error) {
    console.error('Error retrieving max values from DB:', error);
  }
};

// Update ref_accounts with higher values and save to file
const updateAccountsWithHigherValues = async () => {
  try {

    // Read the ref_accounts.json file
    const refAccountsData = fs.readFileSync(refAccountsPath, 'utf8');
    const refAccounts = JSON.parse(refAccountsData);

    // Update or insert records in Leaderboard and ReferralLeaderboard
    await Leaderboard.deleteMany({})
    await ReferralLeaderboard.deleteMany({})
    let index = 0;
    for (const account of refAccounts) {
        index++
        console.log(`account ${index}: ${account.user.id}`)
        // Update or insert in Leaderboard
        await Leaderboard.findOneAndUpdate(
            { userId: account.user.id },
            {
            userId: account.user.id, // Use generated ObjectId for userId
            pointsNo: account.pointsNo,
            referralPoints: account.referralPoints,
            firstName: account.user.first_name,
            lastName: account.user.last_name,
            username: account.user.username
            },
            { upsert: true, new: true }
        );

        // Update or insert in ReferralLeaderboard
        await ReferralLeaderboard.findOneAndUpdate(
            { userId: account.user.id },
            {
            userId: account.user.id, // Use generated ObjectId for userId
            pointsNo: account.pointsNo,
            referralPoints: account.referralPoints,
            firstName: account.user.first_name,
            lastName: account.user.last_name,
            username: account.user.username
            },
            { upsert: true, new: true }
        );
    }

    console.log('Accounts updated successfully!');
  } catch (error) {
    console.error('Error updating accounts:', error);
  }
};

// Call the function to process accounts
const processAccounts = async () => {
  try {
    await mongoose.connect(mongooseUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to the database.');
    await updateAccountsWithHigherValues();
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the process
processAccounts();
