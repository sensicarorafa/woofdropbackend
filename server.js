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
  useUnifiedTopology: true
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

// Utility Functions
async function getUsersSortedByTotalPoints() {
  try {
    const users = await User.find();
    const usersWithTotalPoints = users.map(user => {
      const totalPoints = user.pointsNo;
      return { ...user._doc, totalPoints };
    });
    usersWithTotalPoints.sort((a, b) => b.totalPoints - a.totalPoints);
    return usersWithTotalPoints;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

// Routes
app.post('/leaderboard-data', async (req, res) => {
  try {
    const leaderboardOrder = await getUsersSortedByTotalPoints();
    res.status(200).send({ message: 'Leaderboard retrieved successfully', leaderboardData: leaderboardOrder });
  } catch (error) {
    console.error('Error getting leaderboard data:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

app.post('/get-user-data', async (req, res) => {
  const { user } = req.body;

  try {
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
    console.error('Error retrieving user data:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

app.post('/update-early-adopter', async (req, res) => {
  const { pointsNo, user } = req.body;

  try {
    let existingUser = await User.findOne({
      'user.id': user.id,
      'user.username': user.username
    });

    if (existingUser) {
      existingUser.pointsNo += pointsNo;
      existingUser.earlyAdopterBonusClaimed = true;
      await existingUser.save();

      if (existingUser.referrerCode.length > 0) {
        const userReferrer = await User.findOne({ referralCode: existingUser.referrerCode });
        if (userReferrer) {
          userReferrer.pointsNo += (pointsNo / 10);
          await userReferrer.save();
        }
      }
    } else {
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
});

// Additional routes as per your requirement...

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
      ctx.reply(`You have already been referred previously`);
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
      ctx.reply(`Welcome back!`);
    }

    await ctx.replyWithPhoto('https://i.ibb.co/BcmccLN/Whats-App-Image-2024-08-26-at-2-12-54-PM.jpg', { 
      caption: `<b>Hey, @${ctx.from.username}</b> \nWelcome to AiDogs\n\nAIDOGS portal is open for Dog lovers to have fun and earn. Invite family and friends to earn more`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: "Open Portal",  web_app: { url: 'https://aidawgs.xyz' }}]
        ],
      }
    });    
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
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
