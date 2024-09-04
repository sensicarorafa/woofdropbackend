const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const ReferralLeaderboard = require('./models/ReferralLeaderboard');
const mongoose= require('mongoose')
require('dotenv').config()
const Leaderboard = require('./models/Leaderboard');

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

const cache = new Map(); 

/*const getUserByReferrer = async () => {
    const users = await User.find({
        referrerCode: ''
    }).limit(100);

    console.log(users);
}

const cache = new Map(); 

async function getTop100Users() {
    const cacheKey = 'top100Users';
  
    // Check if the data is in cache
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    try {
        const topUsers = await User.find({})
            .sort({ referralContest: -1 })
            .limit(100); // Limit to top 100 users

        // Cache the result
        cache.set(cacheKey, topUsers);
        
        //console.log(topUsers[0]);

        const currentUser = topUsers[0];

        const getUser = await User.findOne({
          'user.id': currentUser.user.id
        })

        console.log('old points no', getUser.pointsNo, 'referralPoints', getUser.referralPoints, 'referralContest', getUser.referralContest, 'user id', getUser.user.id, 'referrer code', getUser.referrerCode);

        if (getUser) {
          getUser.pointsNo = 0;
          getUser.referralPoints = 0;
          getUser.referralContest = 0;
          await getUser.save()
          const newGetUser = await User.findOne({
            'user.id': currentUser.user.id
          })
          
          console.log(newGetUser.pointsNo, 'saved')
        }

    } catch (err) {
        console.error('Error fetching top users:', err);
        throw err; // Handle or throw the error further
    }
}

function getRandomNumberBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function updateReferralLeaderboard() {
    try {
        // Load the ref_accounts.json file
        const refAccountsPath = path.join(__dirname, 'ref_accounts.json');
        const refAccounts = JSON.parse(fs.readFileSync(refAccountsPath, 'utf-8'));

        // Retrieve the top 80 accounts from the ReferralLeaderboard
        const top80 = await ReferralLeaderboard.find({})
            .sort({ referralContest: -1 })
            .limit(80)
            .exec();

        const top80UserIds = top80.map(account => account.userId.toString());

        for (const refAccount of refAccounts) {
            console.log(`account ${refAccount.user.id}`)
            // Check if the refAccount is in the top 80
            if (!top80UserIds.includes(refAccount._id)) {
                // Get the user details from the DB
                const user = await User.findById(refAccount._id);

                if (user) {

                    const randomNumber = getRandomNumberBetween(267, 3963)

                    console.log(randomNumber);
                    // Update the user's points to ensure they're back in the top 80
                    // You may need to implement a specific logic for how to adjust these points
                    const updatedPoints = getRandomNumberBetween(Math.max(...top80.map(acc => acc.pointsNo)), Math.max(...top80.map(acc => acc.pointsNo)) + randomNumber);
                    const updatedReferralPoints = getRandomNumberBetween(Math.max(...top80.map(acc => acc.referralPoints)), Math.max(...top80.map(acc => acc.referralPoints)) + randomNumber)

                    console.log({updatedPoints, updatedReferralPoints})
                    user.pointsNo = parseInt(updatedPoints);
                    user.referralPoints = parseInt(updatedReferralPoints);
                    await user.save();

                    // Also update the leaderboard
                    await ReferralLeaderboard.updateOne(
                        { userId: user._id },
                        {
                            pointsNo: parseInt(updatedPoints),
                            referralPoints: parseInt(updatedReferralPoints)
                        }
                    );
                }
            }
        }

        console.log('Referral leaderboard updated successfully');
    } catch (error) {
        console.error('Error updating referral leaderboard:', error);
    }
}*/

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
        console.log('Referrals Done')
        return topUsers;
    } catch (err) {
        console.error('Error fetching top users:', err);
        throw err; // Handle or throw the error further
    }
}

async function getTop100UsersLeaderboard() {
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

// Run the function periodically, e.g., every 4 hours
//updateReferralLeaderboard();
getTop100UsersLeaderboard();
getTop100UsersByReferrals();
//getUserByReferrer()
//getTop100Users();