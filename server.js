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

const Task = require('./models/Task');
const Rewards = require('./models/Rewards');


const axios = require('axios');
require('dotenv').config();

/**
 * Update or create dogsEarned for a user
 * @param {Number} userId - The ID of the user
 * @param {Number} value - The value to update dogsEarned with
 * @returns {Object} - The updated or created DogsEarned document
 */


/**
 * Get or create dogsEarned for a user
 * @param {Number} userId - The ID of the user
 * @returns {Object} - The found or newly created DogsEarned document
 */



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
app.set('view engine', 'jade')




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
    const currentUser = await SlotsGame.findOne(
      { userId: user.user.id }
    );

    if (currentUser) {
      const updateTickets = await SlotsGame.findOneAndUpdate(
        { userId: user.user.id },
        { $set: { totalTickets: currentUser.totalTickets + 1 } },
        { new: true }
      );
    }
    
    if (!currentUser) {
      const slotsUser = new SlotsGame({
        userId: user.user.id,
        totalTicketSpinsUsed: 0,
        totalFreeSpinsLeft: 0,
        totalTickets: 11
      });
      await slotsUser.save();  // Save the new document
      console.log('New slots user created')
    }

    await updateOrCreateDogsEarned(user.user.id, 2)
    
    const userAgain = await User.findOne({ referralCode });
  }
};


app.post('/get-user-data', async (req, res) => {
  const { user, referralCode } = req.body;

  try {
    //await removeDuplicateClaimTreshold();

    // Fetch the user based on user.id and user.username
    let existingUser = await User.findOne({
      'user.id': user.id,
      'user.username': user.username
    }).lean(); // Using .lean() to get a plain JavaScript object

    if (referralCode && !existingUser) {
      await addReferralPoints(referralCode);
    }



    if (existingUser) {
      return res.status(200).send({
        message: 'User retrieved successfully',
        userData: existingUser,
        success: true
      });
    } else {
      // Generate unique referral code
      let uniqueReferralCode;
      let isUnique = false;

      while (!isUnique) {
        uniqueReferralCode = crypto.randomBytes(4).toString('hex');
        const referralUser = await User.findOne({ referralCode: uniqueReferralCode }).lean();
        if (!referralUser) {
          isUnique = true;
        }
      }

      // Create and save new user
      const newUser = new User({
        user,
        pointsNo: 0,
        referralPoints: 0,
        referralCode: uniqueReferralCode,
        referredBy: !!referralCode,
        referrerCode: referralCode || '',
        gender: null
      });

      await newUser.save();

      return res.status(200).send({
        message: 'User retrieved successfully',
        userData: newUser,
        success: true
      });
    }
  } catch (error) {
    console.error('Error getting user data:');
    res.status(500).send({ message: 'Internal Server Error', error });
  }
});


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











//Boost leaderboard
app.post('/activate-boost', async (req, res) => {
  const { user, boostCode, refBoostCode } = req.body;

  console.log("about user",user,  boostCode, refBoostCode )

  try {
    // Find the refuser by boostcode
    let existingUser = await BoostLeaderboard.findOne({
      userId: user.id
    });
    let existingBoostUser = await BoostLeaderboard.findOne({
      boostCode: refBoostCode
    });

    console.log("existingBoostUser", existingBoostUser, existingUser)

 

    if (existingBoostUser) {
      if (existingUser) {
        res.status(200).send({ message: 'Boost already activated', userData: existingUser, success: true });

        return
      } else {


 
          existingUser = new BoostLeaderboard({
            pointsNo: 7000,
            userId: user.id,
            boostCode: boostCode,
            boostActivated: true,
            referrerBoostCode: refBoostCode

          });

          await existingUser.save();


          const dbUser = await User.findOne({ "user.id": user.id });
          if (dbUser) {
            dbUser.pointsNo += 7000
            dbUser.save()
          }
          existingBoostUser.pointsNo += 2800;
          existingBoostUser.referralPoints += 1;

          await existingBoostUser.save();
          const refUser = await User.findOne({ "user.id": existingBoostUser.userId });
          if (refUser) {
            refUser.pointsNo += 2800
            refUser.save()



          }
          const rankData = await BoostLeaderboard.aggregate([
            // Step 1: Sort documents by pointsNo and registrationTime
            { $sort: { pointsNo: -1, registrationTime: 1 } },
          
            // Step 2: Create a rank based on the sorting order
            {
              $group: {
                _id: null,
                docs: { $push: "$$ROOT" },  // Push the documents into an array
              },
            },
            {
              $set: {
                rankedDocs: {
                  $map: {
                    input: { $range: [0, { $size: "$docs" }] },  // Create an array of indices
                    as: "index",
                    in: {
                      rank: { $add: ["$$index", 1] },  // Assign ranks
                      doc: { $arrayElemAt: ["$docs", "$$index"] },  // Get the document
                    },
                  },
                },
              },
            },
            {
              $unwind: "$rankedDocs",
            },
            {
              $replaceRoot: { newRoot: { $mergeObjects: ["$rankedDocs.doc", { rank: "$rankedDocs.rank" }] } },
            },
            // Step 3: Match the document with the given userId
            { $match: { "userId": user.id } },
          ]);
          
          const rank = rankData.length > 0 ? rankData[0].rank : null;
          



         

          res.status(200).send({ message: 'Points updated successfully', userData: existingUser, userRank: rank, success: true });
        
      }


    } else {
      res.status(200).send({ message: 'Boost key not valid', userData: existingUser, success: true });

    }

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
      // const rankData = await BoostLeaderboard.aggregate([
      //   // Sort documents by points in descending order
      //   { $sort: { pointsNo: -1, registrationTime: 1 } },

      //   // Add a rank field using $rank
      //   {
      //     $setWindowFields: {
      //       sortBy: {pointsNo: -1, registrationTime: 1},
      //       output: {
      //         rank: { $rank: {} },
      //       },
      //     },
      //   },

      //   // Match the document with the given userId
      //   // { $match: { userId: user.id } },
      // ]);

      const rankData = await BoostLeaderboard.aggregate([
        // Step 1: Sort documents by pointsNo and registrationTime
        { $sort: { pointsNo: -1, registrationTime: 1 } },
      
        // Step 2: Create a rank based on the sorting order
        {
          $group: {
            _id: null,
            docs: { $push: "$$ROOT" },  // Push the documents into an array
          },
        },
        {
          $set: {
            rankedDocs: {
              $map: {
                input: { $range: [0, { $size: "$docs" }] },  // Create an array of indices
                as: "index",
                in: {
                  rank: { $add: ["$$index", 1] },  // Assign ranks
                  doc: { $arrayElemAt: ["$docs", "$$index"] },  // Get the document
                },
              },
            },
          },
        },
        {
          $unwind: "$rankedDocs",
        },
        {
          $replaceRoot: { newRoot: { $mergeObjects: ["$rankedDocs.doc", { rank: "$rankedDocs.rank" }] } },
        },
        // Step 3: Match the document with the given userId
        { $match: { "userId": user.id } },
      ]);
      
      const rank = rankData.length > 0 ? rankData[0].rank : null;
      

      console.log("rankData", rankData)

   
      console.log("user", user, rank)
      return res.status(200).send({ message: 'Boost data retrieved successfully', userData: existingUser, userRank: rank, success: true });
    } else {
      // Step 1: Sort users by points in descending order and get all users


      return res.status(200).send({
        message: 'User retrieved successfully',
        userData: {
          pointsNo: 0,
          referralPoints: 0,
          boostCode: "",
          boostActivated: false,

        },
        success: false
      });
    }



  } catch (error) {
    console.error('Error fetching boost data:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
})






app.post('/daily-reward-claim', async (req, res) => {
  // Assuming you are using authentication middleware that sets req.user
  const { user } = req.body;
  const userId = user.id;
  try {
    let rewards = await Rewards.findOne({ userId });

    if (!rewards) {
      rewards = new Rewards({ userId });
    }

    // Check if points are already claimed today
    /*if (rewards.isClaimedToday()) {
      return res.status(400).json({ message: 'Points already claimed for today' });
    }*/

    // Check if 7-day cycle is complete, reset if necessary
    const today = new Date();
    const cycleEndDate = new Date(rewards.cycleStartDate);
    cycleEndDate.setDate(cycleEndDate.getDate() + 7);

    if (today >= cycleEndDate) {
      rewards.cycleStartDate = today;
      rewards.dailyClaims = [];
    }


    // Determine the current day within the cycle (0 - 6)
    const daysSinceCycleStart = Math.floor(
      (today - new Date(rewards.cycleStartDate)) / (1000 * 60 * 60 * 24)
    );

    // Define different points for each day of the 7-day cycle
    const pointsForDay = [250, 500, 1000, 1500, 2000, 2500, 3000];

    // Get the points for today's claim based on the cycle day
    const pointsToday = pointsForDay[rewards.dailyClaims.length];



    // Add today's claim
    rewards.dailyClaims.push({ 
      date: today,
      points: pointsToday
    });
    rewards.lastDayClaimed = daysSinceCycleStart;
    rewards.totalPoints += pointsToday;

    await rewards.save();

    res.status(200).json({ message: 'Points claimed successfully', totalPoints: rewards.totalPoints, reward:rewards });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error', error });
  }
});








// Endpoint 4: Check if userId exists, if not, create a document with default values
app.post('/check-or-create-user', async (req, res) => {
  try {
    const { userId } = req.body;

    let existingUser = await User.findOne({
      'user.id': userId
    }).lean();

    if (!userId) {
      return res.status(400).send('userId is required');
    }

    let user = await SlotsGame.findOne({ userId: userId });

    // If user doesn't exist, create a new document with default values
    if (!user) {
      user = new SlotsGame({
        userId: userId,
        totalTicketSpinsUsed: 0,  // Default value
        totalFreeSpinsLeft: 0     // Default value
      });
      await user.save();  // Save the new document
      console.log('New slots user created')
    }

    res.status(200).send({user, userData: existingUser});// Return the user document (whether existing or newly created)
  } catch (error) {
    res.status(500).send('Error finding or creating user: ' + error.message);
  }
});

const CHANNEL_ID = -1002464147819

app.post('/confirm-tg-channel', async (req, res) => {
  const { userId } = req.body;
  const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${userId}`;

  try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.ok) {
          const status = data.result.status;
          // If the status is "member", "administrator", or "creator", the user is in the channel
          const confirmation = ['member', 'administrator', 'creator'].includes(status);
          res.send({confirmation});
      } else {
          console.log('Error:', data.description);
          res.send({confirmation : false});
      }
  } catch (error) {
      console.error('Error checking membership:', error);
      res.send({confirmation : false});
  }
})

app.post('/update-task-status', async (req, res) => {
  const { wallet,user } = req.body;

  try {
      // Find the user by id and username
      let existingUser = await User.findOne({
          'user.id': user.id,
          'user.username': user.username
      });

      if (existingUser) {
          // If user exists, update points
          // existingUser.pointsNo += pointsNo;
          existingUser.tgStatus = true;
          existingUser.taskCompleted = true
          existingUser.wallet = wallet
          await existingUser.save();


      } else {
          // If user doesn't exist, create a new user
          existingUser = new User({
              user: user
          });
          await existingUser.save();
      }
      res.status(200).send({
          message: 'Task Completed',
          userData: existingUser,
          success: true
      });
  } catch (error) {
      console.error('Error updating points:', error);
      res.status(500).send({ message: 'Internal Server Error', success: false });
  }
})

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
        caption: `<b>Welcome to WoofDrop, @${ctx.from.username}!</b> \nThis is a demo message.\n\nInvite friends and earn 20% of whatever they make!`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: "Open Portal",  web_app: { url: 'https://woofdropui.onrender.com' }}],
            [{ text: 'Join Community', url: 'https://t.me/wfdemo' }],
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