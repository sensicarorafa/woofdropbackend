const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config()

// Assuming User is your Mongoose model for users
const User = require('./models/User'); // Adjust the path based on your project structure

const filePath = path.join(__dirname, 'ref_accounts.json');

// Helper function to generate random number within a range
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Step 1: Retrieve the user with the highest pointsNo and referralContest
const getMaxValuesFromDB = async () => {
  const userWithHighestPoints = await User.findOne().sort({ pointsNo: -1 }).exec();
  const userWithHighestReferralContest = await User.findOne().sort({ referralContest: -1 }).exec();

  return {
    highestPointsNo: userWithHighestPoints ? userWithHighestPoints.pointsNo : 0,
    highestReferralContest: userWithHighestReferralContest ? userWithHighestReferralContest.referralContest : 0
  };
};

// Step 2: Update the accounts in ref_accounts.json
const updateAccountsWithHigherValues = async () => {
  // Step 3: Retrieve max points and referral contest from the database
  const { highestPointsNo, highestReferralContest } = await getMaxValuesFromDB();

  // Read the ref_accounts.json file
  fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return;
    }

    // Parse the existing data
    let accounts = [];
    try {
      accounts = JSON.parse(data);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return;
    }

    // Update the pointsNo, referralPoints, and referralContest
    accounts.forEach(account => {
      // Generate higher points
      const newPointsNo = randomInt(highestPointsNo + 1, highestPointsNo + 500);
      const newReferralContest = randomInt(highestReferralContest + 1, highestReferralContest + 200);
      const newReferralPoints = randomInt(newReferralContest + 1, newReferralContest + 100);

      account.pointsNo = newPointsNo;
      account.referralPoints = newReferralPoints;
      account.referralContest = newReferralContest;
    });

    // Save the updated accounts back to ref_accounts.json
    fs.writeFile(filePath, JSON.stringify(accounts, null, 2), async (err) => {
      if (err) {
        console.error("Error writing file:", err);
      } else {
        console.log("Accounts updated with new values!");

        // Step 4: Update or save these accounts in the database
        for (const account of accounts) {
          await updateOrSaveUser(account);
        }

        console.log("All accounts have been updated in the database.");
      }
    });
  });
};

// Step 4: Update or save user in the database based on user.id
const updateOrSaveUser = async (account) => {
  try {
    const existingUser = await User.findOne({ 'user.id': account.user.id });

    if (existingUser) {
      // Update the user if they already exist
      existingUser.pointsNo = account.pointsNo;
      existingUser.referralPoints = account.referralPoints;
      existingUser.referralContest = account.referralContest;

      await existingUser.save();
      console.log(`User with id ${account.user.id} updated.`);
    } else {
      // Create a new user if they don't exist
      const newUser = new User(account);
      await newUser.save();
      console.log(`New user with id ${account.user.id} saved.`);
    }
  } catch (error) {
    console.error(`Error updating/saving user with id ${account.user.id}:`, error);
  }
};

// Function to initiate the update process
const processAccounts = async () => {
  try {

    // MongoDB Connection
    const mongooseUrl = process.env.MONGOOSE_URL;

    await mongoose.connect(mongooseUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to the database.');
    await updateAccountsWithHigherValues();
  } catch (error) {
    console.error("Database connection error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the process
processAccounts();
