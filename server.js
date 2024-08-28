// Required Modules
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const User = require('./models/User'); // Assuming you have a User model in the models folder
const cron = require('node-cron');
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

async function getUsersSortedByTotalPoints() {
  try {
    // Fetch all users from the database
    const users = await User.find();

    // Map users to add the totalPoints field
    const usersWithTotalPoints = users.slice(0, 50).map(user => {
      const totalPoints = user.pointsNo;
      return { ...user._doc, totalPoints }; // user._doc contains the raw user data
    });

    // Sort users by totalPoints in descending order
    usersWithTotalPoints.sort((a, b) => b.totalPoints - a.totalPoints);

    // Return sorted users
    return usersWithTotalPoints;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

async function getTop100Users() {
  try {
      const topUsers = await User.find({})
          .sort({ pointsNo: -1 }) // Sort by pointsNo in descending order
          .limit(100); // Limit the results to the first 100 users

      return topUsers;
  } catch (err) {
      console.error('Error fetching top users:', err);
      throw err; // Optionally, you can handle the error or throw it further
  }
}

async function getUserRankByUserId(userId) {
    try {
        const rankPipeline = [
            {
                $sort: { pointsNo: -1 } // Sort by pointsNo in descending order
            },
            {
                $group: {
                    _id: null,
                    users: { $push: "$user.id" }, // Push user.id into an array
                    rank: { $push: "$pointsNo" } // Push pointsNo into a corresponding array
                }
            },
            {
                $project: {
                    userIndex: { $indexOfArray: ["$users", userId] } // Find index of the specific user.id
                }
            }
        ];

        const result = await User.aggregate(rankPipeline).exec();

        if (result.length > 0 && result[0].userIndex !== -1) {
            return result[0].userIndex; // +1 to get rank instead of 0-based index
        } else {
            return null; // User not found
        }
    } catch (err) {
        console.error('Error fetching user rank:', err);
        throw err;
    }
}

app.post('/leaderboard-data', async (req, res) => {
  const { user } = req.body;
  
  let userRank = 0;
  if (user && user.id) userRank = await getUserRankByUserId(user.id)

  try {
    const leaderboardOrder = await getTop100Users()
    return res.status(200).send({ message: 'Leaderboard retrieved successfully', leaderboardData: leaderboardOrder, userRank });
  } catch (error) {
    console.error('Error getting leaderboard data:', error);
    res.status(500).send({ message: 'Internal Server Error' }); 
  }
  
})

app.post('/get-user-data', async (req, res) => {
  const { user } = req.body;

  try {
    // Find the user by id and username
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
        console.log(userReferrer)
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

// Additional routes as per your requirement...


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
    //user.pointsNo += 250000;
    await user.save();
    const userAgain = await User.findOne({ referralCode });
  }
};

// Telegram Bot Setup
bot.start(async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const referralCode = ctx.payload;
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
        caption: `<b>Hey, @${ctx.from.username}</b> \nWelcome to AiDogs\n\nAIDOGS portal is open for Dog lovers to have fun and earn\n\nInvite family and friends to earn  10% of all their $AIDOGS reward`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: "Open Portal",  web_app: { url: 'https://aidawgs.xyz' }}],
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
