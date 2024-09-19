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
const BoostLeaderboard = require('./models/BoostLeaderboard');
const cron = require('node-cron');
const ReferralLeaderboard = require('./models/ReferralLeaderboard');
const Task = require('./models/Task');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
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

// Telegram API credentials
const apiId = process.env.APP_ID;   // Replace with your actual API ID
const apiHash = process.env.APP_HASH; // Replace with your actual API Hash
const BOT_TOKEN = process.env.BOT_TOKEN; // Replace with your bot token

// Session initialization
let client;
let stringSession = ""; // Placeholder for the session string



// Initialize Telegram Client
const initializeTelegramClient = async () => {
  client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, {
    connectionRetries: 5,
  });

  // Start the bot with the bot token
  await client.start({
    botAuthToken: BOT_TOKEN,
  });

  // Save session string for reuse
  stringSession = client.session.save();
  console.log('Bot is logged in and session is saved:', stringSession);
};

// Call the initialization function
initializeTelegramClient();


// Middleware to ensure the Telegram client is initialized
const ensureClientInitialized = (req, res, next) => {
  if (!client) {
    return res.status(500).json({ error: 'Telegram client is not initialized' });
  }
  next();
};

const uploadMediaFile = async (filePath) => {
  const file = fs.readFileSync(filePath); // Read the file from the file system

  const uploadedFile = await client.uploadFile({
    file, // Pass the file buffer
    fileName: 'aidogs.png', // Provide a file name
    mimeType: 'image/png', // Adjust the mime type if necessary
    fileSize: fs.statSync(filePath).size, // Get the file size
  });

  return uploadedFile;
};

// Example API to post a story
app.post('/share-story', ensureClientInitialized, async (req, res) => {
  const { caption } = req.body;
  const defaultImagePath = path.join(__dirname, 'public', 'aidogs.png');

      // Step 1: Upload the media file to Telegram
   const uploadedMedia = await uploadMediaFile(defaultImagePath);
  try {
    // MTProto call to post the story
    await client.invoke({
      _: 'stories.editStory',
      peer: {
        _: 'inputPeerSelf',
      },
      media: {
        _: 'inputMediaUploadedPhoto',
        file: uploadedMedia, // File to upload
      },
      caption,
    });

    res.status(200).json({ message: 'Story posted successfully' });
  } catch (error) {
    console.error('Error posting story:', error);
    res.status(500).json({ error: 'Failed to post story' });
  }
});

// Example API to edit a story
app.post('/api/editStory', ensureClientInitialized, async (req, res) => {
  const { storyId, newCaption, newMediaFile } = req.body;

  try {
    // MTProto call to edit the story
    await client.invoke({
      _: 'stories.editStory',
      peer: {
        _: 'inputPeerSelf',
      },
      id: storyId,
      media: {
        _: 'inputMediaUploadedPhoto',
        file: newMediaFile, // New media to upload
      },
      caption: newCaption,
    });

    res.status(200).json({ message: 'Story edited successfully' });
  } catch (error) {
    console.error('Error editing story:', error);
    res.status(500).json({ error: 'Failed to edit story' });
  }
});






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
              existingReward.btnText = task.btnText !== undefined ? task.btnText : existingReward.btnText;
              existingReward.rewardClaimed = existingReward.rewardClaimed !== undefined ? existingReward.rewardClaimed : task.rewardClaimed;
              existingReward.taskText = task.taskText !== undefined ?  task.taskText : existingReward.taskText;
              existingReward.taskPoints = task.taskPoints !== undefined ? task.taskPoints : existingReward.taskPoints;
              existingReward.taskCategory =  task.taskCategory !== undefined ? task.taskCategory : existingReward.taskCategory;
              existingReward.taskStatus = task.taskStatus;
              existingReward.taskUrl = existingReward.taskUrl !== undefined ? existingReward.taskUrl : task.taskUrl;
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

const updateReferralRewards = async (userId) => {
  try {
    const user = await User.findOne({ 'user.id': userId });

    if (!user) {
      throw new Error('User not found', userId);
    }
  
    // Step 1: Reduce referralRewardDeets array to length 7 if it's longer
    if (user.referralRewardDeets.length > 7) {
      user.referralRewardDeets = user.referralRewardDeets.slice(0, 7);
    }
  
    // Step 2: Check if all rewardClaimed are true, set them to false if so
    const allRewardsClaimed = user.referralRewardDeets.every(reward => reward.rewardClaimed === true);
  
    if (allRewardsClaimed) {
      user.referralRewardDeets.forEach(reward => reward.rewardClaimed = false);
    }
  
    // Step 3: Check if lastLogin was more than 24 hours ago
    const lastLoginDate = new Date(user.lastLogin);
    const currentDate = new Date();
    const timeDifference = currentDate - lastLoginDate;
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  
    if (timeDifference > oneDayInMilliseconds) {
      user.referralRewardDeets.forEach(reward => reward.rewardClaimed = false);
    }
  
    // Save the updated user data
    await user.save(); 
  } catch (error) {
    console.log(error)
  }
};

app.post('/get-user-data', async (req, res) => {
  const { user, referralCode } = req.body;

  try {
    let existingUser = await User.findOne({
      'user.id': user.id,
      'user.username': user.username
    });

    if (existingUser) {
      await updateUserSocialRewards(user.id);
      await getUserAndEnsureLastLogin(user.id);
      await updateReferralRewards(user.id);
      return res.status(200).send({ message: 'User retrieved successfully', userData: existingUser, success: true });
    } else {

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
        user,
        pointsNo: 0,
        referralPoints: 0,
        referralCode: uniqueReferralCode,
        referredBy: referralCode ? true : false,
        referrerCode: referralCode || '',
        gender: null
      });
      await newUser.save();
      await updateUserSocialRewards(user.id);
      await getUserAndEnsureLastLogin(user.id);
      await updateReferralRewards(user.id);
      return res.status(200).send({
        message: 'User retrieved successfully',
        userData: newUser,
        success: false
      });
    }
  } catch (error) {
    console.error('Error updating points:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
})

/*app.post('/get-user-data', async (req, res) => {
  const { user } = req.body;

  try {
    // Find the user by id and username
    //await updateSocialRewardDeets(user.id);
    await updateUserSocialRewards(user.id);
    await getUserAndEnsureLastLogin(user.id);
    await updateReferralRewards(user.id);
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
})*/

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


//Boost leaderboard


app.post('/activate-boost', async (req, res) => {
  const { user, boostCode, refBoostCode } = req.body;

  try {
    // Find the refuser by boostcode
    let existingUser = await BoostLeaderboard.findOne({
      userId: user.id
    });

    if (existingUser) {
    res.status(200).send({ message: 'Boost already activated', userData: existingUser, success: true });

      return
    } else {
 
      const userReferrer = await BoostLeaderboard.findOne({ boostCode: refBoostCode });
      if(userReferrer || !boostCode) {
        existingUser = new BoostLeaderboard({
          pointsNo: 7000,
          userId: user.id,
          boostCode: boostCode,
          boostActivated: true,
          referrerBoostCode:refBoostCode
  
        });
  
        await existingUser.save();
      

      const dbUser = await User.findOne({ "user.id": user.id });
      if (dbUser) {
        dbUser.pointsNo += 7000
        dbUser.save()
      }
          userReferrer.pointsNo += 2800;
          userReferrer.referralPoints += 1;

          await userReferrer.save();
          const refUser = await User.findOne({ "user.id": userReferrer.userId });
          if (refUser) {
            refUser.pointsNo += 2800
            refUser.save()

          
        
      }
         // If user doesn't exist, create a new user
         const rankData = await BoostLeaderboard.aggregate([
          // Sort documents by points in descending order
          { $sort: { pointsNo: -1 } },
    
          // Add a rank field using $rank
          {
            $setWindowFields: {
              sortBy: { pointsNo: -1 },
              output: {
                rank: { $rank: {} },
              },
            },
          },
    
          // Match the document with the given userId
          { $match: { userId: user.id } },
        ]);
        const rank= rankData.length > 0 ? rankData[0].rank : null;

    res.status(200).send({ message: 'Points updated successfully', userData: existingUser, userRank:rank, success: true });
    } else {
      res.status(200).send({ message: 'Boost key not active', userData: existingUser, success: true });

    }}
  } catch (error) {
    console.error('Error updating points:', error);
    res.status(500).send({ message: 'Internal Server Error', success: false });
  }
})

app.post('/get-user-data/boost-data', async (req, res) => {
  const { user } = req.body;

  try {
    // Find the user by id and username

    let existingUser = await BoostLeaderboard.findOne({
      userId: user.id,
    });
    

    if (existingUser) {
      const rankData = await BoostLeaderboard.aggregate([
        // Sort documents by points in descending order
        { $sort: { pointsNo: -1 } },
  
        // Add a rank field using $rank
        {
          $setWindowFields: {
            sortBy: { pointsNo: -1 },
            output: {
              rank: { $rank: {} },
            },
          },
        },
  
        // Match the document with the given userId
        { $match: { userId: user.id } },
      ]);
  
      const rank= rankData.length > 0 ? rankData[0].rank : null;
      return res.status(200).send({ message: 'Boost data retrieved successfully', userData: existingUser, userRank:rank, success: true });
    } else {
         // Step 1: Sort users by points in descending order and get all users
       
      
      return res.status(200).send({
        message: 'User retrieved successfully',
        userData: {
          pointsNo: 0,
          referralPoints: 0,
          boostCode: "",
          boostActivated:false,
          
        },
        success: false
      });
    }



  } catch (error) {
    console.error('Error fetching boost data:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
})

app.post('/get-boost-participants', async (req, res) => {


  try {
    // Find the user by id and username

    const count = await BoostLeaderboard.countDocuments();

 
      return res.status(200).send({
        message: 'Total boost participants',
        boostData: {
     count:count
        },
        success: false
      });
    



  } catch (error) {
    console.error('Error fetching boost data:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
})
// app.post('/share-story', upload.single('file'), async(req,res) => {
//   try {
//     const {user} = req.body
//     const defaultImagePath = path.join(__dirname, 'public', 'aidogs.png');
//     const chatId = user.id; // Replace with the user's chat ID

//     // Read the default image file
//     fs.readFile(defaultImagePath, async (err, data) => {
//       if (err) {
//         console.error('Error reading the default image file:', err);
//         return res.status(500).send('Error reading the default image file.');
//       }

//       // Sending the image to the user's Telegram chat
//       // try {
//       //   await bot.telegram.sendPhoto(chatId, { source: data }, {
//       //     caption: 'Check out this story!',
//       //     reply_markup: {
//       //       inline_keyboard: [
//       //         [{ text: 'View Story', url: 'https://t.me/Aidogs_bot' }],
//       //       ],
//       //     },
//       //   });
//       //   res.status(200).send('Default image sent to Telegram successfully.');
//       // } catch (error) {
//       //   console.error('Error uploading to Telegram:', error);
//       //   res.status(500).send('Error uploading to Telegram.');
//       // }

//       try {
//         await bot.telegram.sendMessage(chatId, 'Check out this story!', {
//           reply_markup: {
//             inline_keyboard: [
//               [{ text: 'View Story', url: 'https://t.me/Aidogs_bot' }],
//             ],
//           },
//         });
//         res.status(200).send('Message sent to Telegram successfully.');
//       } catch (error) {
//         console.error('Error sending message to Telegram:', error);
//         res.status(500).send('Error sending message to Telegram.');
//       }
//     });
//   } catch (error) {
//     console.error('Error in upload-story endpoint:', error);
//     res.status(500).send('Server error.');
//   }
// })

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
    let referralCode = ctx.payload;
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


