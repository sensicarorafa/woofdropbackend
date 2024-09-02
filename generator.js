const mongoose = require('mongoose');
const fs = require('fs');
const Chance = require('chance');
const chance = new Chance();
require('dotenv').config()

// MongoDB Connection
const mongooseUrl = process.env.MONGOOSE_URL;

mongoose.connect(mongooseUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected successfully");
});

const User = require('./models/User'); // Update this to the correct path of your User model

async function generateDemoUsers() {
    const users = [];

    for (let i = 0; i < 80; i++) {
        const firstName = chance.first();
        const lastName = chance.last();
        const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${chance.integer({ min: 1, max: 1000 })}`;

        const user = new User({
            pointsNo: chance.integer({ min: 0, max: 1000 }),
            referralPoints: chance.integer({ min: 0, max: 1000 }),
            referralContest: chance.integer({ min: 0, max: 1000 }),
            referrerCode: chance.string({ length: 8, pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' }),
            userLevel: chance.integer({ min: 1, max: 10 }),
            totalSteps: chance.integer({ min: 0, max: 100000 }),
            pointsToday: chance.integer({ min: 0, max: 500 }),
            totalStepsToday: chance.integer({ min: 0, max: 10000 }),
            gender: chance.gender(),
            earlyAdopterBonusClaimed: chance.bool(),
            isTracking: chance.bool(),
            user: {
                id: chance.integer({ min: 1, max: 10000 }),
                first_name: firstName,
                last_name: lastName,
                username: username,
                language_code: 'en',
                allows_write_to_pm: chance.bool()
            },
            referralCode: chance.string({ length: 10, pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' }),
            referredBy: chance.bool(),
            referralRewardDeets: [
                { claimTreshold: 5, rewardClaimed: chance.bool() },
                { claimTreshold: 10, rewardClaimed: chance.bool() },
                { claimTreshold: 15, rewardClaimed: chance.bool() },
                { claimTreshold: 20, rewardClaimed: chance.bool() },
                { claimTreshold: 25, rewardClaimed: chance.bool() },
                { claimTreshold: 30, rewardClaimed: chance.bool() },
                { claimTreshold: 35, rewardClaimed: chance.bool() },
                { claimTreshold: 40, rewardClaimed: chance.bool() },
                { claimTreshold: 45, rewardClaimed: chance.bool() },
                { claimTreshold: 50, rewardClaimed: chance.bool() }
            ],
            socialRewardDeets: [
                { claimTreshold: 'follow', rewardClaimed: chance.bool() },
                { claimTreshold: 'repost', rewardClaimed: chance.bool() },
                { claimTreshold: 'telegram', rewardClaimed: chance.bool() },
                { claimTreshold: 'two-frens', rewardClaimed: chance.bool() },
                { claimTreshold: 'youtube', rewardClaimed: chance.bool() },
                { claimTreshold: 'instagram', rewardClaimed: chance.bool() },
                { claimTreshold: 'five-frens', rewardClaimed: chance.bool() },
                { claimTreshold: 'ten-frens', rewardClaimed: chance.bool() }
            ]
        });

        users.push(user);
    }

    // Save users to the database
    await User.insertMany(users);

    // Save users to ref_accounts.json
    fs.writeFileSync('ref_accounts.json', JSON.stringify(users, null, 2));
    console.log('80 demo users generated and saved to ref_accounts.json');
}

generateDemoUsers().catch(console.error);
