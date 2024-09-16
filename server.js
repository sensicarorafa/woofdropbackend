// Required Modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const User = require('./models/User');
const Leaderboard = require('./models/Leaderboard');
const cron = require('node-cron');
const ReferralLeaderboard = require('./models/ReferralLeaderboard');
const Task = require('./models/Task');
require('dotenv').config();

// Express App Initialization
const app = express();

// Bot Initialization
const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken);

// MongoDB Connection
const mongooseUrl = process.env.MONGOOSE_URL;
mongoose.connect(mongooseUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 60000, // Increase this value
  socketTimeoutMS: 60000, 
  maxPoolSize: 50,
  minPoolSize: 30
});
const db = mongoose.connection;
db.on("error", (error) => console.error("MongoDB connection error:", error));
db.once("open", () => {
  console.log("MongoDB connected successfully");
});

// Middleware Setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// View Engine Setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

const cache = new Map(); 

async function getTop100Users() {
  const cacheKey = 'top100Users';

  // Check if the data is in cache
  if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
  }

  try {
      // Use aggregation to calculate the product of pointsNo and referralPoints, and sort by this product
      const topUsers = await User.aggregate([
          {
              $addFields: {
                  totalScore: { $multiply: ["$pointsNo", "$referralPoints"] }
              }
          },
          {
              $sort: { totalScore: -1 }
          },
          {
              $limit: 100
          },
          {
              $project: {
                  _id: 1,
                  user: 1,
                  pointsNo: 1,
                  referralPoints: 1,
                  totalScore: 1
              }
          }
      ]);

      // Cache the result
      cache.set(cacheKey, topUsers);

      // Clear existing Leaderboard data
      await Leaderboard.deleteMany({});

      // Save new top users to Leaderboard
      const leaderboardEntries = topUsers.map(user => ({
          userId: user._id,
          firstName: user.user.first_name,
          lastName: user.user.last_name,
          username: user.user.username,
          pointsNo: user.pointsNo,
          referralPoints: user.referralPoints,
          totalScore: user.totalScore
      }));

      await Leaderboard.insertMany(leaderboardEntries);
      console.log('Leaderboard updated successfully');
      return topUsers;
  } catch (err) {
      console.error('Error fetching top users:', err);
      throw err; // Handle or throw the error further
  }
}


async function getTop100UsersByReferrals() {
  const cacheKey = 'top100Users';

  // Check if the data is in cache
  if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
  }

  try {
      const topUsers = await User.find({}, { _id: 1, user: 1, pointsNo: 1, referralContest: 1 })
          .sort({ referralContest: -1 })
          .limit(100); // Limit to top 100 users

      // Cache the result
      cache.set(cacheKey, topUsers);

      // Clear existing Leaderboard data
      await ReferralLeaderboard.deleteMany({});

      // Save new top users to Leaderboard
      const leaderboardEntries = topUsers.map(user => ({
          userId: user._id,
          firstName: user.user.first_name,
          lastName: user.user.last_name,
          username: user.user.username,
          pointsNo: user.pointsNo,
          referralPoints: user.referralContest
      }));

      await ReferralLeaderboard.insertMany(leaderboardEntries);
      return topUsers;
  } catch (err) {
      console.error('Error fetching top users:', err);
      throw err; // Handle or throw the error further
  }
}

app.post('/leaderboard-data', async (req, res) => {
  const { user } = req.body;
  
  let userRank = 0;
  //if (user && user.id) userRank = await getUserRankByUserId(user.id)

  try {
    const leaderboardOrder = await Leaderboard.find();
    return res.status(200).send({ message: 'Leaderboard retrieved successfully', leaderboardData: leaderboardOrder, userRank });
  } catch (error) {
    console.error('Error getting leaderboard data:', error);
    res.status(500).send({ message: 'Internal Server Error' }); 
  }
  
})

app.post('/referral-leaderboard-data', async (req, res) => {
  const { user } = req.body;
  
  let userRank = 0;
  //if (user && user.id) userRank = await getUserRankByUserId(user.id)

  try {
    const leaderboardOrder = await ReferralLeaderboard.find();
    return res.status(200).send({ message: 'Leaderboard retrieved successfully', leaderboardData: leaderboardOrder, userRank });
  } catch (error) {
    console.error('Error getting leaderboard data:', error);
    res.status(500).send({ message: 'Internal Server Error' }); 
  }
  
})

async function getAllTasks() {
  try {
      const tasks = await Task.find();
      return tasks;
  } catch (error) {
      console.error('Error retrieving tasks:', error);
      throw error; // You can throw the error to handle it where the function is called
  }
}

/*async function updateSocialRewardDeets(userId) {
  try {
      // Define the new fields to add to the socialRewardDeets array
      const newFields = [
          { claimTreshold: 'follow', rewardClaimed: false },
          { claimTreshold: 'repost', rewardClaimed: false },
          { claimTreshold: 'telegram', rewardClaimed: false },
          { claimTreshold: 'two-frens', rewardClaimed: false },
          { claimTreshold: 'youtube', rewardClaimed: false },
          { claimTreshold: 'instagram', rewardClaimed: false },
          { claimTreshold: 'five-frens', rewardClaimed: false },
          { claimTreshold: 'ten-frens', rewardClaimed: false },
          { claimTreshold: 'youtube', rewardClaimed: false },
          { claimTreshold: 'instagram', rewardClaimed: false },
          { claimTreshold: 'five-frens', rewardClaimed: false },
          { claimTreshold: 'ten-frens', rewardClaimed: false },
          { claimTreshold: 'yt-vid-one', rewardClaimed: false },
          { claimTreshold: 'rt-tag-three-frens', rewardClaimed: false },
          { claimTreshold: 'twenty-frens', rewardClaimed: false },
          { claimTreshold: 'thirty-frens', rewardClaimed: false },
          { claimTreshold: 'gift-for-tomarket', rewardClaimed: false },
          { claimTreshold: 'invite-url-tomarket', rewardClaimed: false },
          { claimTreshold: 'rt-tag-three-frens-two', rewardClaimed: false },
          { claimTreshold: 'join-goats', rewardClaimed: false },
          { claimTreshold: 'yt-vid-two', rewardClaimed: false },
          { claimTreshold: 'rt-tag-three-frens-three', rewardClaimed: false },
          { claimTreshold: 'play-birds', rewardClaimed: false },
          { claimTreshold: 'sub-birds-yt', rewardClaimed: false },
          { claimTreshold: 'follow-birds-x', rewardClaimed: false },
          { claimTreshold: 'rt-tag-three-frens-four', rewardClaimed: false },
          { claimTreshold: 'ton-ai', rewardClaimed: false },
          { claimTreshold: 'hold-coin-bot', rewardClaimed: false },
          { claimTreshold: 'hold-coin-channel', rewardClaimed: false },
          { claimTreshold: 'yt-vid-three', rewardClaimed: false },
          { claimTreshold: 'rt-tag-three-frens-five', rewardClaimed: false },
          { claimTreshold: 'pigs-bot', rewardClaimed: false },
          { claimTreshold: 'pigs-channel', rewardClaimed: false },
          { claimTreshold: 'ton-party-bot', rewardClaimed: false },
          { claimTreshold: 'ton-party-channel', rewardClaimed: false },
          { claimTreshold: 'yt-vid-four', rewardClaimed: false },
          { claimTreshold: 'yt-vid-five', rewardClaimed: false },
          { claimTreshold: 'fish-coin-bot', rewardClaimed: false },
          { claimTreshold: 'fish-coin-channel', rewardClaimed: false },
          { claimTreshold: 'yt-vid-six', rewardClaimed: false },
          { claimTreshold: 'tiktok-aidogs', rewardClaimed: false },
          { claimTreshold: 'aidogs-ugc', rewardClaimed: false },
          { claimTreshold: 'send-to-binance', rewardClaimed: false },
          { claimTreshold: 'send-to-hamster', rewardClaimed: false },
          { claimTreshold: 'piggy-bot', rewardClaimed: false },
          { claimTreshold: 'dl-coin-bot', rewardClaimed: false },
          { claimTreshold: 'dl-coin-channel', rewardClaimed: false },
          { claimTreshold: 'ghost-drive-bot', rewardClaimed: false },
          { claimTreshold: 'ghost-drive-channel', rewardClaimed: false },
          { claimTreshold: 'pokemon-ball-bot', rewardClaimed: false },
          { claimTreshold: 'pokemon-bot-channel', rewardClaimed: false },
          {
            claimTreshold: 'whatsapp-status',
            rewardClaimed: false,
            taskPoints: 1725738671029
          },
          {
            claimTreshold: 'whatsapp-group',
            rewardClaimed: false,
            taskPoints: 1725738671029
          },
          {
            claimTreshold: 'instagram-reels',
            rewardClaimed: false,
            taskPoints: 1725738671029
          },
          {
            claimTreshold: 'facebook',
            rewardClaimed: false,
            taskPoints: 1725738671029
          },
          {
            claimTreshold: 'tiktok',
            rewardClaimed: false,
            taskPoints: 1725738671029
          },
          {
            claimTreshold: 'snapchat',
            rewardClaimed: false,
            taskPoints: 1725738671029
          },
          {
            claimTreshold: 'telegram-group',
            rewardClaimed: false,
            taskPoints: 1725738671029
          },
          {
            claimTreshold: 'facebook-post',
            rewardClaimed: false,
            taskPoints: 1725738671029
          }
      ];

      // Find the user by user.id and update the socialRewardDeets field
      const user = await User.findOne({ 'user.id': userId });

      if (user) {
          const currentSocialRewardDeets = user.socialRewardDeets;

          // Add the new fields only if they do not already exist in socialRewardDeets
          newFields.forEach(field => {
              if (!currentSocialRewardDeets.some(reward => (reward.claimTreshold === field.claimTreshold))) {
                  currentSocialRewardDeets.push(field);
              }
          });

          // Save the updated user document
          user.socialRewardDeets = currentSocialRewardDeets;
          await user.save();

          console.log(`Updated socialRewardDeets for user with id: ${userId}`);
      } else {
          console.log(`User with id: ${userId} not found`);
      }
  } catch (error) {
      console.error('Error updating socialRewardDeets:', error);
  }
}*/

async function updateSocialRewardDeets(userId) {
  try {
    // Define the new fields to add/update in the socialRewardDeets array
    const newFields = [
      { claimTreshold: 'follow', rewardClaimed: false },
      { claimTreshold: 'repost', rewardClaimed: false },
      { claimTreshold: 'telegram', rewardClaimed: false },
      { claimTreshold: 'two-frens', rewardClaimed: false },
      { claimTreshold: 'youtube', rewardClaimed: false },
      { claimTreshold: 'instagram', rewardClaimed: false },
      { claimTreshold: 'five-frens', rewardClaimed: false },
      { claimTreshold: 'ten-frens', rewardClaimed: false },
      { claimTreshold: 'yt-vid-one', rewardClaimed: false },
      { claimTreshold: 'rt-tag-three-frens', rewardClaimed: false },
      { claimTreshold: 'twenty-frens', rewardClaimed: false },
      { claimTreshold: 'thirty-frens', rewardClaimed: false },
      { claimTreshold: 'gift-for-tomarket', rewardClaimed: false },
      { claimTreshold: 'invite-url-tomarket', rewardClaimed: false },
      { claimTreshold: 'rt-tag-three-frens-two', rewardClaimed: false },
      { claimTreshold: 'join-goats', rewardClaimed: false },
      { claimTreshold: 'yt-vid-two', rewardClaimed: false },
      { claimTreshold: 'rt-tag-three-frens-three', rewardClaimed: false },
      { claimTreshold: 'play-birds', rewardClaimed: false },
      { claimTreshold: 'sub-birds-yt', rewardClaimed: false },
      { claimTreshold: 'follow-birds-x', rewardClaimed: false },
      { claimTreshold: 'rt-tag-three-frens-four', rewardClaimed: false },
      { claimTreshold: 'ton-ai', rewardClaimed: false },
      { claimTreshold: 'hold-coin-bot', rewardClaimed: false },
      { claimTreshold: 'hold-coin-channel', rewardClaimed: false },
      { claimTreshold: 'yt-vid-three', rewardClaimed: false },
      { claimTreshold: 'rt-tag-three-frens-five', rewardClaimed: false },
      { claimTreshold: 'pigs-bot', rewardClaimed: false },
      { claimTreshold: 'pigs-channel', rewardClaimed: false },
      { claimTreshold: 'ton-party-bot', rewardClaimed: false },
      { claimTreshold: 'ton-party-channel', rewardClaimed: false },
      { claimTreshold: 'yt-vid-four', rewardClaimed: false },
      { claimTreshold: 'yt-vid-five', rewardClaimed: false },
      { claimTreshold: 'fish-coin-bot', rewardClaimed: false },
      { claimTreshold: 'fish-coin-channel', rewardClaimed: false },
      { claimTreshold: 'yt-vid-six', rewardClaimed: false },
      { claimTreshold: 'tiktok-aidogs', rewardClaimed: false },
      { claimTreshold: 'aidogs-ugc', rewardClaimed: false },
      { claimTreshold: 'send-to-binance', rewardClaimed: false },
      { claimTreshold: 'send-to-hamster', rewardClaimed: false },
      { claimTreshold: 'piggy-bot', rewardClaimed: false },
      { claimTreshold: 'dl-coin-bot', rewardClaimed: false },
      { claimTreshold: 'dl-coin-channel', rewardClaimed: false },
      { claimTreshold: 'ghost-drive-bot', rewardClaimed: false },
      { claimTreshold: 'ghost-drive-channel', rewardClaimed: false },
      { claimTreshold: 'pokemon-ball-bot', rewardClaimed: false },
      { claimTreshold: 'pokemon-bot-channel', rewardClaimed: false },
      { claimTreshold: 'whatsapp-status', rewardClaimed: false, taskPoints: 1725738671029 },
      { claimTreshold: 'whatsapp-group', rewardClaimed: false, taskPoints: 1725738671029 },
      { claimTreshold: 'instagram-reels', rewardClaimed: false, taskPoints: 1725738671029 },
      { claimTreshold: 'facebook', rewardClaimed: false, taskPoints: 1725738671029 },
      { claimTreshold: 'tiktok', rewardClaimed: false, taskPoints: 1725738671029 },
      { claimTreshold: 'snapchat', rewardClaimed: false, taskPoints: 1725738671029 },
      { claimTreshold: 'telegram-group', rewardClaimed: false, taskPoints: 1725738671029 },
      { claimTreshold: 'facebook-post', rewardClaimed: false, taskPoints: 1725738671029 }
    ];

    // Find the user by user.id and update the socialRewardDeets field
    const user = await User.findOne({ 'user.id': userId });

    if (user) {
      const currentSocialRewardDeets = user.socialRewardDeets;

      // Loop through newFields and update existing objects or add new ones
      newFields.forEach((newField) => {
        const existingReward = currentSocialRewardDeets.find(
          (reward) => reward.claimTreshold === newField.claimTreshold
        );

        if (existingReward) {
          // If the reward already exists, add any missing fields from newField
          Object.keys(newField).forEach((key) => {
            if (!(key in existingReward)) {
              existingReward[key] = newField[key];
            }
          });
        } else {
          // If the reward doesn't exist, add it to socialRewardDeets
          currentSocialRewardDeets.push(newField);
        }
      });

      // Save the updated user document
      user.socialRewardDeets = currentSocialRewardDeets;
      await user.save();

      console.log(`Updated socialRewardDeets for user with id: ${userId}`);
    } else {
      console.log(`User with id: ${userId} not found`);
    }
  } catch (error) {
    console.error('Error updating socialRewardDeets:', error);
  }
}


async function getUserAndEnsureLastLogin(userId) {
  try {
    // Find user by `user.id`
    const user = await User.findOne({ 'user.id': userId });

    if (!user) {
      console.log(`User with id: ${userId} not found`);
    }

    // Check if `lastLogin` is missing or null
    if (user && !user.lastLogin) {
      // Set `lastLogin` to the current date
      user.lastLogin = '2024-09-09T14:39:52.043Z'
      
      // Save the updated user document
      await user.save();
    }

    return user;
  } catch (error) {
    console.error('Error fetching or updating user:', error);
    throw error; // Re-throw the error for further handling if needed
  }
}


async function updateUserSocialRewards(userId) {
  try {
      // Fetch all tasks from the Task collection
      const tasks = await Task.find();

      // Fetch the user based on user.id
      const user = await User.findOne({ 'user.id': userId });

      if (!user) {
          console.log(`No user found with user.id ${userId}`);
          return null;
      }

      // Loop through the tasks and update user's socialRewardDeets
      tasks.forEach(task => {
          // Find existing reward for the task's claimTreshold
          let existingReward = user.socialRewardDeets.find(reward => reward.claimTreshold === task.claimTreshold);

          if (existingReward) {
              // Update only missing fields in the existingReward
              existingReward.btnText = task.btnText || existingReward.btnText;
              existingReward.rewardClaimed = existingReward.rewardClaimed !== undefined ? existingReward.rewardClaimed : task.rewardClaimed;
              existingReward.taskText = task.taskText || existingReward.taskText;
              existingReward.taskPoints = task.taskPoints !== undefined ? task.taskPoints : existingReward.taskPoints;
              existingReward.taskCategory = task.taskCategory || existingReward.taskCategory;
              existingReward.taskStatus = task.taskStatus;
              existingReward.taskUrl = existingReward.taskUrl || task.taskUrl;
          } else {
              // If the task is not found in socialRewardDeets, add it with all fields from Task
              user.socialRewardDeets.push({
                  claimTreshold: task.claimTreshold,
                  rewardClaimed: task.rewardClaimed,
                  btnText: task.btnText,
                  taskText: task.taskText,
                  taskPoints: task.taskPoints,
                  taskCategory: task.taskCategory,
                  taskStatus : task.taskStatus,
                  taskUrl : task.taskUrl
              });
          }
      });

      // Mark the array as modified for Mongoose to detect the change
      user.markModified('socialRewardDeets');

      // Save the updated user document
      await user.save();

      console.log(`User with user.id ${userId} updated successfully`);
      return user;

  } catch (error) {
      console.error('Error updating user social rewards:', error);
      throw error;
  }
}



// Clear cache periodically (Optional)
setInterval(() => {
  cache.clear();
}, 5 * 60 * 1000); // Clear cache every 5 minutes


app.post('/get-user-data', async (req, res) => {
  const { user } = req.body;

  try {
    // Find the user by id and username
    //await updateSocialRewardDeets(user.id);
    await updateUserSocialRewards(user.id);
    await getUserAndEnsureLastLogin(user.id)
    let existingUser = await User.findOne({
      'user.id': user.id,
      'user.username': user.username
    });

    if (existingUser) {
      return res.status(200).send({ message: 'User retrieved successfully', userData: existingUser, success: true });
    } else {
      return res.status(200).send({ 
        message: 'User retrieved successfully', 
        userData: {
          user,
          pointsNo: 0,
          referralPoints: 0,
          referralCode: null,
          referredBy: null,
          gender: null
        },
        success: false 
      });
    }
  } catch (error) {
    console.error('Error updating points:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
})

app.post('/update-early-adopter', async (req, res) => {
  const { pointsNo, user } = req.body;

  try {
    // Find the user by id and username
    let existingUser = await User.findOne({
      'user.id': user.id,
      'user.username': user.username
    });

    if (existingUser) {
      // If user exists, update points
      existingUser.pointsNo += pointsNo;
      existingUser.earlyAdopterBonusClaimed = true
      await existingUser.save();

      if (existingUser.referrerCode.length > 0) {
        const userReferrer = await User.findOne({ referralCode: existingUser.referrerCode });
        if (userReferrer) {
          userReferrer.pointsNo += (pointsNo / 20);
          await userReferrer.save();
        }
      }
    } else {
      // If user doesn't exist, create a new user
      existingUser = new User({
        pointsNo: pointsNo,
        user: user
      });
      await existingUser.save();
    }

    res.status(200).send({ message: 'Points updated successfully', userData: existingUser, success: true });
  } catch (error) {
    console.error('Error updating points:', error);
    res.status(500).send({ message: 'Internal Server Error', success: false });
  }
})

app.post('/update-task-points', async (req, res) => {
  const { pointsNo, user } = req.body;

  try {
    // Find the user by id and username
    let existingUser = await User.findOne({
      'user.id': user.id,
      'user.username': user.username
    });

    if (existingUser) {
      // If user exists, update points
      existingUser.pointsNo += pointsNo;
      await existingUser.save();

      if (existingUser.referrerCode.length > 0) {
        const userReferrer = await User.findOne({ referralCode: existingUser.referrerCode });
        if (userReferrer) {
          userReferrer.pointsNo += (pointsNo / 20);
          await userReferrer.save();
        }
      }
    } else {
      // If user doesn't exist, create a new user
      existingUser = new User({
        pointsNo: pointsNo,
        user: user
      });
      await existingUser.save();
    }

    res.status(200).send({ message: 'Points updated successfully', userData: existingUser, success: true });
  } catch (error) {
    console.error('Error updating points:', error);
    res.status(500).send({ message: 'Internal Server Error', success: false });
  }
})

app.post('/update-social-reward', async (req, res) => {
  const { user, claimTreshold } = req.body;
  const userId = user.id

  if (!userId || !claimTreshold) {
      return res.status(400).send('userId and claimTreshold are required');
  }

  try {
      // Use findOneAndUpdate to directly update the rewardClaimed field
      const updateResult = await User.findOneAndUpdate(
          { 'user.id': userId, "socialRewardDeets.claimTreshold": claimTreshold },
          { $set: { "socialRewardDeets.$.rewardClaimed": true } },
          { new: true }
      );

      if (!updateResult) {
          return res.status(404).send('User or claimTreshold not found');
      }

      // Return the updated user document
      const updatedUser = await User.findOne({ 'user.id': user.id });
      res.status(200).send({ message: 'Points updated successfully', userData: updatedUser, success: true });
  } catch (error) {
    console.error('Error updating social reward:', error);
    res.status(500).send({ message: 'Internal Server Error', success: false });
  }
});

app.post('/update-social-timer', async (req, res) => {
  const { user, claimTreshold, time } = req.body;
  const userId = user.id

  if (!userId || !claimTreshold || !time) {
      return res.status(400).send('userId, time and claimTreshold are required');
  }

  try {
      // Use findOneAndUpdate to directly update the rewardClaimed field
      const updateResult = await User.findOneAndUpdate(
          { 'user.id': userId, "socialRewardDeets.claimTreshold": claimTreshold },
          { $set: { "socialRewardDeets.$.rewardClaimed": true, "socialRewardDeets.$.taskPoints": time } },
          { new: true }
      );

      if (!updateResult) {
          return res.status(404).send('User or claimTreshold not found');
      }

      // Return the updated user document
      const updatedUser = await User.findOne({ 'user.id': user.id });
      res.status(200).send({ message: 'Points updated successfully', userData: updatedUser, success: true });
  } catch (error) {
    console.error('Error updating social reward:', error);
    res.status(500).send({ message: 'Internal Server Error', success: false });
  }
});

app.post('/update-daily-reward', async (req, res) => {
  const { user, claimTreshold } = req.body;
  const userId = user.id

  if (!userId || !claimTreshold) {
      return res.status(400).send('userId and claimTreshold are required');
  }

  try {
      // Use findOneAndUpdate to directly update the rewardClaimed field
      const updateResult = await User.findOneAndUpdate(
          { 'user.id': userId, "referralRewardDeets.claimTreshold": claimTreshold },
          { 
            $set: { 
              "referralRewardDeets.$.rewardClaimed": true,
              pointsToday: 1,
              lastLogin: new Date()
            } 
          },
          { new: true }
      );

      if (!updateResult) {
          return res.status(404).send('User or claimTreshold not found');
      }

      // Return the updated user document
      const updatedUser = await User.findOne({ 'user.id': user.id });
      res.status(200).send({ message: 'Points updated successfully', userData: updatedUser, success: true });
  } catch (error) {
    console.error('Error updating social reward:', error);
    res.status(500).send({ message: 'Internal Server Error', success: false });
  }
});

app.post('/get-user-referrals', async (req, res) => {
  const { referralCode } = req.body;

  try {
    // Find the user by id and username
    let allUsers = await User.find({
      referrerCode: referralCode
    }).limit(50);

    return res.status(200).send({ message: 'Users retrieved successfully', userData: allUsers, success: true });
  } catch (error) {
    console.error('Error updating points:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
})

// POST /tasks - Create a new Task
app.post('/tasks', async (req, res) => {
  try {
      const newTask = new Task(req.body);
      const savedTask = await newTask.save();
      res.status(201).json(savedTask);
  } catch (error) {
      res.status(400).json({ message: 'Error creating task', error });
  }
});


// PUT /tasks/:id - Edit a Task by its ID
app.put('/tasks/:id', async (req, res) => {
  try {
      const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updatedTask) {
          return res.status(404).json({ message: 'Task not found' });
      }
      res.json(updatedTask);
  } catch (error) {
      res.status(400).json({ message: 'Error updating task', error });
  }
});

// DELETE /tasks/:id - Delete a Task by its ID
app.delete('/tasks/:id', async (req, res) => {
  try {
      const deletedTask = await Task.findByIdAndDelete(req.params.id);
      if (!deletedTask) {
          return res.status(404).json({ message: 'Task not found' });
      }
      res.json({ message: 'Task deleted successfully' });
  } catch (error) {
      res.status(400).json({ message: 'Error deleting task', error });
  }
});




async function generateUniqueReferralCode(userId) {
  try {
      // Find the user by their ID
      const user = await User.findOne({ 'user.id': userId });

      if (!user) {
          console.log('User not found');
          return;
      }

      // Check if referralCode is missing or null
      if (!user.referralCode) {
          // Generate a unique referral code
          let uniqueReferralCode;
          let isUnique = false;

          while (!isUnique) {
              // Generate a random referral code
              uniqueReferralCode = crypto.randomBytes(4).toString('hex');

              // Check if the generated code is unique
              const existingUser = await User.findOne({ referralCode: uniqueReferralCode });
              if (!existingUser) {
                  isUnique = true;
              }
          }

          // Assign the unique referral code to the user
          user.referralCode = uniqueReferralCode;

          // Save the updated user back to the database
          await user.save();

          console.log('Referral code generated and saved:', uniqueReferralCode);
      } else {
          console.log('User already has a referral code:', user.referralCode);
      }
  } catch (error) {
      console.error('Error generating referral code:', error);
  }
}

const addReferralPoints = async (referralCode) => {
  const user = await User.findOne({ referralCode });
  if (user) {
    user.referralPoints += 1;
    user.referralContest += 1;
    await user.save();
    const userAgain = await User.findOne({ referralCode });
  }
};

// Telegram Bot Setup
bot.start(async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const referralCode = ctx.payload ? ctx.payload : ctx.startPayload;
    let existingUser = await User.findOne({ 'user.id': telegramId });

    if (referralCode && !existingUser) {
      await addReferralPoints(referralCode);
    }

    if (referralCode && existingUser) {
      try {
        await ctx.reply(`You have already been referred previously`);
      } catch (error) {
        if (error.response && error.response.error_code === 403) {
          console.error('Bot was blocked by the user:', ctx.from.id);
        } else {
          console.error('Failed to send message:', error);
        }
      }
      
    }

    if (!existingUser) {
      let uniqueReferralCode;
      let isUnique = false;

      while (!isUnique) {
        uniqueReferralCode = crypto.randomBytes(4).toString('hex');
        const existingUser = await User.findOne({ referralCode: uniqueReferralCode });
        if (!existingUser) {
          isUnique = true;
        }
      }

      const newUser = new User({
        pointsNo: 0,
        referralPoints: 0,
        user: {
          id: telegramId,
          first_name: ctx.from.first_name,
          last_name: ctx.from.last_name,
          username: ctx.from.username,
          language_code: ctx.from.language_code,
          allows_write_to_pm: true
        },
        referralCode: uniqueReferralCode,
        referredBy: referralCode ? true : false,
        referrerCode: referralCode || ''
      });
      await newUser.save();
    } else {
      await generateUniqueReferralCode(telegramId);
      try {
        await ctx.reply(`Welcome back!`);
      } catch (error) {
        if (error.response && error.response.error_code === 403) {
          console.error('Bot was blocked by the user:', ctx.from.id);
        } else {
          console.error('Failed to send message:', error);
        }
      }
    }

    try {
      await ctx.replyWithPhoto('https://i.ibb.co/BcmccLN/Whats-App-Image-2024-08-26-at-2-12-54-PM.jpg', { 
        caption: `<b>Welcome to AIDogs, @${ctx.from.username}!</b> \nThe AIDogs portal is live for dog lovers to have fun and earn rewards.\n\n Telegram users can claim an exclusive early bonus of 2,500 $AIDOGS tokens.\n\nInvite friends and earn 20% of whatever they make!`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: "Open Portal",  web_app: { url: 'https://shalom.aidawgs.xyz/' }}],
            [{ text: 'Join Community', url: 'https://t.me/aidogs_community' }],
            [{ text: 'Twitter(X)', url: 'https://x.com/aidogscomm' }]
          ],
        }
      }); 
    } catch (error) {
      if (error.response && error.response.error_code === 403) {
        console.error('Bot was blocked by the user:', ctx.from.id);
      } else {
        console.error('Failed to send message:', error);
      }
    }

       
  } catch (error) {
    console.log(error);
  }
});

bot.launch();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1); // Exit the process to trigger a PM2 restart
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1); // Exit the process to trigger a PM2 restart
});

// This will run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running a job to reset spins for all users');
  await User.updateMany({}, { pointsToday: 0 });
});

cron.schedule('0 */6 * * *', async () => {
  console.log('Running cron job to update leaderboard...');
  try {
      await getTop100UsersByReferrals();
      console.log('Leaderboard updated successfully');
  } catch (err) {
      console.error('Failed to update leaderboard:', err);
  }
});

// Schedule the cron job to run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Running cron job to update leaderboard...');
  try {
      await getTop100Users();
      console.log('Leaderboard updated successfully');
  } catch (err) {
      console.error('Failed to update leaderboard:', err);
  }
});

const refAccountsFilePath = path.join(__dirname, 'ref_accounts.json');

async function updateLeaderboardBatch(batch) {
    const leaderboard = await ReferralLeaderboard.find({}).sort({ pointsNo: -1 }).limit(80);
    const leaderboardIds = leaderboard.map(user => user.userId.toString());
    
    // Update each account in the batch
    for (const account of batch) {
        const userId = account._id.toString();
        if (!leaderboardIds.includes(userId)) {
            // Fetch the current points of the user
            const user = await User.findById(userId);
            if (user) {
                // Update points to ensure they are in the top 80
                user.pointsNo += 1000 * Math.random(0, 9); // Add enough points to ensure they are in the top 80
                user.referralPoints += Math.random(496, 935);
                user.referralContest += Math.random(496, 935);
                
                await user.save();
            }
        }
    }
}



let currentIndex = 0;

cron.schedule('0 */4 * * *', async () => {
    try {
        // Read ref_accounts file
        const data = fs.readFileSync(refAccountsFilePath);
        const refAccounts = JSON.parse(data);

        // Get the batch of 20 accounts
        const batch = refAccounts.slice(currentIndex, currentIndex + 20);
        if (batch.length === 0) return; // No more accounts to process

        // Update leaderboard
        await updateLeaderboardBatch(batch);

        // Increment index
        currentIndex += 20;

        // If all accounts processed, reset index
        if (currentIndex >= refAccounts.length) {
            currentIndex = 0;
        }

        console.log('Leaderboard updated successfully.');
    } catch (err) {
        console.error('Error updating leaderboard:', err);
    }
});


// Error Handling
app.use((req, res, next) => {
  res.status(404).send('Not Found');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});

// Start the Server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
