const mongoose = require('mongoose');
const User = require('./models/User');
const Leaderboard = require('./models/Leaderboard');
const Task = require('./models/Task');
const crypto = require('crypto');
require('dotenv').config()

// MongoDB Connection
const mongooseUrl = process.env.MONGOOSE_URL;

mongoose.connect(mongooseUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 3000000,
  connectTimeoutMS: 3000000,
  socketTimeoutMS: 3000000  
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected successfully");
  //calculateAverageUsersPerDay();
});

const cache = new Map(); 

/*async function getTop100UsersAndUpdate() {
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
        username: user.user.first_name.length > 10 ? user.user.first_name.slice(0, 10) : user.user.first_name,
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
}*/


/*async function getTop100UsersAndUpdate() {
    const cacheKey = 'top100Users';
  
    // Check if the data is in cache
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    try {
        const topUsers = await User.find({}, { _id: 1, user: 1, pointsNo: 1 })
            .sort({ pointsNo: -1 })
            .limit(100); // Limit to top 100 users

        // Cache the result
        cache.set(cacheKey, topUsers);

        // Clear existing Leaderboard data
        await Leaderboard.deleteMany({});

        // Save new top users to Leaderboard
        const leaderboardEntries = topUsers.map(user => ({
          userId: user._id,
          firstName: user.user.first_name,
          lastName: user.user.last_name,
          username: user.user.first_name.length > 10 ? user.user.first_name.slice(0, 10) : user.user.first_name,
          pointsNo: user.pointsNo
      }));

        await Leaderboard.insertMany(leaderboardEntries);
        console.log('all updated')
        return topUsers;
    } catch (err) {
        console.error('Error fetching top users:', err);
        throw err; // Handle or throw the error further
    }
}*/

/*async function getTop100Users() {
    const cacheKey = 'top100Users';
  
    // Check if the data is in cache
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    try {
        const topUsers = await User.find({})
            .sort({ pointsNo: -1 })
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
}*/

/*const getUsers = async () => {
    const users = await User.find({});

    console.log(users.length)

}*/

async function updateReferrerPoints () {
    console.log('Running')
    /*const user = await User.find({
        referrerCode: 'e5293b05'
        //referralCode: '71605e28'
    })*/

    const userDocs = await User.countDocuments({
        referrerCode: 'e5293b05'
        //referralCode: '71605e28'
    })

    console.log('Total referrals', userDocs)

    /*let totalPoints = 2500;

    users.forEach(async (user) => {
        const userPoints = user.pointsNo / 10;
        if (userPoints !== Infinity) totalPoints += userPoints;
        console.log(user.pointsNo)
    })*/
    
    const referrer = await User.findOne({
        referralCode: 'd736d7df'
    })

    console.log(referrer)

    referrer.referralPoints = 42;
    await referrer.save();
    console.log('Total users:', {referrer: referrer.referralPoints})
}


/*async function updateReferrerCode() {
    try {
        // Find users with the referrerCode '71605e28' and update to '538c9f9b'
        const result = await User.updateMany(
            { referralCode: '538c9f9b' }, // Query criteria
            { $set: { referralPoints: 342 } } // Update operation
        );

        console.log(`${result.length} users updated`);
    } catch (error) {
        console.error('Error updating referrer codes:', error);
    }
}*/

/*const countTotalUsers = async () => {
  try {
    // Define a limit for how many users to fetch at a time
    console.log('starting')
    const limit = 50000;
    let totalCount = 0;
    let hasMore = true;
    let skip = 0;

    while (hasMore) {
      // Fetch users in batches
      const users = await User.find().skip(skip).limit(limit).lean();

      // Add the number of users fetched to the total count
      totalCount += users.length;
      console.log({currentTotalUsers: totalCount});

      // If the number of users fetched is less than the limit, it means we've reached the end
      if (users.length < limit) {
        hasMore = false;
      } else {
        // Move the skip to the next batch
        skip += limit;
      }
    }

    return totalCount;
  } catch (error) {
    console.error('Error counting users:', error);
    throw error;
  }
};

// Example usage
countTotalUsers()
  .then(total => {
    console.log('Total users in the database:', total);
  })
  .catch(error => {
    console.error('Failed to count users:', error);
  });*/

/*async function updateReferralContestField() {
    try {
        // Update all users with the new referralContest field
        const result = await User.updateMany(
            { referralContest: { $exists: false } }, // Only update users without this field
            { $set: { referralContest: 0 } }
        );

        console.log(`${result.nModified} users were updated with the referralContest field.`);
    } catch (err) {
        console.error('Error updating users:', err);
    }
}*/

async function updateUsers() {
    try {
        console.log('Running update')
        // Find users who match the condition
        const usersToUpdate = await User.find({
            pointsNo: { $gt: 10000000 },
            referralPoints: { $lt: 200 }
        });

        if (usersToUpdate.length === 0) {
            console.log('No users found that match the criteria.');
            return;
        }

        // Update the necessary fields for each user
        const updatePromises = usersToUpdate.map(user => {
            user.referralPoints = 0; // Example update, you can adjust this as needed
            user.pointsNo = 0; // Add more updates if needed
            user.referralContest = 0;

            return user.save();
        });

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        console.log(`${usersToUpdate.length} users updated successfully.`);
    } catch (error) {
        console.error('Error updating users:', error);
    }
}

/*async function deleteUserByUserId(userId) {
    try {
        // Find and delete the user using the user.id field
        const deletedUser = await User.findOneAndDelete({ 'user.id': userId });

        if (deletedUser) {
            console.log(`User with user.id ${userId} was deleted.`);
            return deletedUser;
        } else {
            console.log(`No user found with user.id ${userId}.`);
            return null;
        }
    } catch (error) {
        console.error(`Error deleting user with user.id ${userId}:`, error);
        throw error;
    }
}*/

/*async function updateUserPointsToday(userId, newPointsToday) {
    try {
        // Find the user based on user.id
        const user = await User.findOne({ 'user.id': userId });

        if (!user) {
            console.log(`No user found with user.id ${userId}`);
            return null;
        }

        // Update the pointsToday field with the new value
        user.pointsToday = newPointsToday;

        // Save the updated user document
        await user.save();

        console.log(`User with user.id ${userId} updated successfully with pointsToday: ${newPointsToday}`);
        return user;
    } catch (error) {
        console.error('Error updating pointsToday field:', error);
        throw error;
    }
}*/

async function resetReferralRewards(userId) {
    try {
        // Find the user based on user.id
        const user = await User.findOne({ 'user.id': userId });

        if (!user) {
            console.log(`No user found with user.id ${userId}`);
            return null;
        }

        // Loop through referralRewardDeets and set rewardClaimed to false
        user.referralRewardDeets = user.referralRewardDeets.map(reward => ({
            ...reward,
            rewardClaimed: false
        }));
        //user.lastLogin = '2024-09-09T14:39:52.043Z'

        // Save the updated user document
        await user.save();

        console.log(`All referralRewardDeets set to false for user with user.id ${userId}`);
        return user;
    } catch (error) {
        console.error('Error resetting referral rewards:', error);
        throw error;
    }
}

async function resetSocialRewards(userId) {
    try {
        // Find the user based on user.id
        const user = await User.findOne({ 'user.id': userId });

        if (!user) {
            console.log(`No user found with user.id ${userId}`);
            return null;
        }

        // Loop through referralRewardDeets and set rewardClaimed to false
        user.socialRewardDeets = user.socialRewardDeets.map(reward => ({
            //...reward,
            //rewardClaimed: false
        }));

        // Save the updated user document
        await user.save();

        console.log(`All socialRewardDeets set to false for user with user.id ${userId}`);
        return user;
    } catch (error) {
        console.error('Error resetting referral rewards:', error);
        throw error;
    }
}

async function updateReferralPoints(batchSize = 10) {
    try {
        console.log('Starting referral jobs');

        let skip = 0;
        let hasMoreUsers = true;

        while (hasMoreUsers) {
            // Fetch users in batches
            const users = await User.find({ referralPoints: { $gt: 0 } }).skip(skip).limit(batchSize);

            if (users.length === 0) {
                hasMoreUsers = false;
                break;
            }

            // Perform aggregation in parallel for all users in the current batch
            const updatePromises = users.map(async (user) => {
                const userReferralCode = user.referralCode;
                const referredUsersCount = await User.countDocuments({ referrerCode: userReferralCode });

                if (referredUsersCount !== user.referralPoints) {
                    user.referralPoints = referredUsersCount;
                    await user.save();
                    console.log(`Updated referralPoints for user with id: ${user.user.id}`);
                }
            });

            // Run all the update operations in parallel
            await Promise.all(updatePromises);

            // Move to the next batch
            skip += batchSize;
        }

        console.log('Referral points update completed for all users.');
    } catch (error) {
        console.error('Error updating referral points:', error);
        throw error;
    }
}


async function calculateAverageUsersPerDay() {
    try {
      // Get the total number of users
      console.log('Counting users...');
      const totalUsers = await User.countDocuments();
      console.log({ totalUsers });
  
      if (totalUsers === 0) {
        console.log("No users in the database.");
        return 0;
      }
  
      // Get the first and last user based on the _id timestamp
      const firstUser = await User.findOne().sort({ _id: 1 });  // Oldest user by _id
      const lastUser = await User.findOne().sort({ _id: -1 });  // Newest user by _id
  
      // Extract the timestamps from the _id field of both users
      const firstUserIdTimestamp = new Date(parseInt(firstUser._id.toString().substring(0, 8), 16) * 1000);
      const lastUserIdTimestamp = new Date(parseInt(lastUser._id.toString().substring(0, 8), 16) * 1000);
  
      // Calculate the time difference in milliseconds and convert to days
      const timeDiff = lastUserIdTimestamp - firstUserIdTimestamp;
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);  // Convert from milliseconds to days
  
      // Prevent division by zero if all users were created on the same day
      const daysCount = daysDiff === 0 ? 1 : daysDiff;
  
      // Calculate the average users per day
      const averageUsersPerDay = totalUsers / daysCount;
  
      console.log(`Average users created per day: ${averageUsersPerDay.toFixed(2)}`);
      return averageUsersPerDay.toFixed(2);
      
    } catch (error) {
      console.error('Error calculating average users per day:', error);
      throw error;
    }
}

async function resetSocialRewardDeets(userId) {
    try {
      // Define the default socialRewardDeets fields
      const defaultSocialRewardDeets = [
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
        {
          claimTreshold: 'whatsapp-status',
          rewardClaimed: false,
          taskPoints: 1725738671029,
        },
        {
          claimTreshold: 'whatsapp-group',
          rewardClaimed: false,
          taskPoints: 1725738671029,
        },
        {
          claimTreshold: 'instagram-reels',
          rewardClaimed: false,
          taskPoints: 1725738671029,
        },
        {
          claimTreshold: 'facebook',
          rewardClaimed: false,
          taskPoints: 1725738671029,
        },
        {
          claimTreshold: 'tiktok',
          rewardClaimed: false,
          taskPoints: 1725738671029,
        },
        {
          claimTreshold: 'snapchat',
          rewardClaimed: false,
          taskPoints: 1725738671029,
        },
        {
          claimTreshold: 'telegram-group',
          rewardClaimed: false,
          taskPoints: 1725738671029,
        },
        {
          claimTreshold: 'facebook-post',
          rewardClaimed: false,
          taskPoints: 1725738671029,
        },
      ];
  
      // Find the user by user.id and reset the socialRewardDeets field
      const user = await User.findOne({ 'user.id': userId });
  
      if (user) {
        // Reset socialRewardDeets to the default values
        user.socialRewardDeets = defaultSocialRewardDeets;
        await user.save();
  
        console.log(`Reset socialRewardDeets for user with id: ${userId}`);
      } else {
        console.log(`User with id: ${userId} not found`);
      }
    } catch (error) {
      console.error('Error resetting socialRewardDeets:', error);
    }
}

  
const allTasks = [
    {
        btnText: 'Start',
        taskText: 'Follow On X',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://x.com/aidogscomm',
        taskStatus: 'active',
        claimTreshold: 'follow',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Share On X',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'repost',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join AIDOGS Tg Channel',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://t.me/aidogs_community',
        taskStatus: 'active',
        claimTreshold: 'telegram',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Invite 2 frens',
        taskPoints: 2000,
        taskCategory: 'AIDOGS',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'two-frens',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Subscribe to Youtube',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://www.youtube.com/@aidogscomm',
        taskStatus: 'active',
        claimTreshold: 'youtube',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Follow On Insta',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://www.instagram.com/aidogscomm?igsh=MjhqdTh1bWptbmE5&utm_source=qr',
        taskStatus: 'active',
        claimTreshold: 'instagram',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Invite 5 frens',
        taskPoints: 5000,
        taskCategory: 'AIDOGS',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'five-frens',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Invite 10 frens',
        taskPoints: 5000,
        taskCategory: 'AIDOGS',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'ten-frens',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Watch YouTube Video',
        taskPoints: 1000,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://youtu.be/z_VeGCOwNG4?si=1HwQJhxTVVeMDXRq',
        taskStatus: 'active',
        claimTreshold: 'yt-vid-one',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'RT and Tag 3 frens',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'rt-tag-three-frens',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Invite 20 frens',
        taskPoints: 20000,
        taskCategory: 'AIDOGS',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'twenty-frens',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Invite 30 frens',
        taskPoints: 30000,
        taskCategory: 'AIDOGS',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'thirty-frens',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Celebrate Gift For Tomarket Users',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: '',
        taskStatus: 'pending',
        claimTreshold: 'gift-for-tomarket',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Send your invite URL to Tomarket',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://x.com/TomarketFarmer/status/1830637993847378211?s=19',
        taskStatus: 'active',
        claimTreshold: 'invite-url-tomarket',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'RT and Tag 3 frens',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'rt-tag-three-frens-two',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join GOATS',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/realgoats_bot/run?startapp=15a53980-df21-4471-94b5-8adb00f41c54',
        taskStatus: 'active',
        claimTreshold: 'join-goats',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Watch YouTube Video',
        taskPoints: 1000,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://youtu.be/ssZfO6PAyDs?si=3QWEeILtunO8qOKs',
        taskStatus: 'active',
        claimTreshold: 'yt-vid-two',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'RT and Tag 3 frens',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'rt-tag-three-frens-three',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Play BIRDS',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/birdx2_bot/birdx?startapp=1920150983',
        taskStatus: 'active',
        claimTreshold: 'play-birds',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join Birds Telegram',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+PLeoc54Kw5oxN2M9',
        taskStatus: 'active',
        claimTreshold: 'sub-birds-yt',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Follow Birds on X',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://x.com/TheBirdsDogs',
        taskStatus: 'active',
        claimTreshold: 'follow-birds-x',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'RT and Tag 3 frens',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'rt-tag-three-frens-four',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join TonAi',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/PeaAIBot/App?startapp=sid-66d828e3841369003ba7e67b',
        taskStatus: 'paused',
        claimTreshold: 'ton-ai',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Play HoldCoin',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/theHoldCoinBot/app?startapp=ref_yoiyTgVL',
        taskStatus: 'active',
        claimTreshold: 'hold-coin-bot',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join HoldCoin Channel',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+hp2cVksOOh9lN2Q1',
        taskStatus: 'active',
        claimTreshold: 'hold-coin-channel',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Watch YouTube Video',
        taskPoints: 1000,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://youtu.be/J56VoQdUmV8?si=BrUfCoaphy-6HwOC',
        taskStatus: 'active',
        claimTreshold: 'yt-vid-three',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'RT and Tag 3 frens',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://x.com/aidogscomm/status/1832376968999747746?s=19',
        taskStatus: 'active',
        claimTreshold: 'rt-tag-three-frens-five',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join Pigs',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/PigshouseBot?start=6374484959',
        taskStatus: 'paused',
        claimTreshold: 'pigs-bot',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join Pigs Tg Channel',
        taskPoints: 150,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+O-k5HRrBaMI1NjZk',
        taskStatus: 'paused',
        claimTreshold: 'pigs-channel',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join TonParty',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/tonparty_bot/party?startapp=ref_Ub5gbwDL',
        taskStatus: 'pending',
        claimTreshold: 'ton-party-bot',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join TonParty Tg Channel',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+5ITZoOxz9io1NWVk',
        taskStatus: 'paused',
        claimTreshold: 'ton-party-channel',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Watch YouTube Video',
        taskPoints: 1000,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://youtu.be/oQUgnloOS6Q?si=EBSqlYaq1HfYz7p4',
        taskStatus: 'active',
        claimTreshold: 'yt-vid-four',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Watch YouTube Video',
        taskPoints: 1000,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://youtu.be/MSIXr5UwoX4?si=Xrt-piY5jxdesb3V',
        taskStatus: 'active',
        claimTreshold: 'yt-vid-five',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join Fish',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/fishing_bowl_bot/fish?startapp=EQC0IERgAcF43DTAj-vJe58ARq1sd7B-lOagI-c3HAIo-y6W',
        taskStatus: 'paused',
        claimTreshold: 'fish-coin-bot',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join Fish Channel',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+xIPbexMUSB1lZDBk',
        taskStatus: 'paused',
        claimTreshold: 'fish-coin-channel',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'These Crypto Scams Could Drain Your Wallet',
        taskPoints: 1000,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://youtu.be/nc6p__Opot4?si=H2DoVygvl-65fujH',
        taskStatus: 'active',
        claimTreshold: 'yt-vid-six',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Follow on TikTok',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://www.tiktok.com/@aidogscomm',
        taskStatus: 'active',
        claimTreshold: 'tiktok-aidogs',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join AiDogs Ugc Channel',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://t.me/aidogsugc',
        taskStatus: 'active',
        claimTreshold: 'aidogs-ugc',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Send your AiDogs invite URL to Binance',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://x.com/binance/status/1834250575027851466?s=19',
        taskStatus: 'active',
        claimTreshold: 'send-to-binance',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Send your AiDogs invite URL to Hamster',
        taskPoints: 500,
        taskCategory: 'AIDOGS',
        taskUrl: 'https://x.com/hamster_kombat/status/1834251006193836164?s=19',
        taskStatus: 'active',
        claimTreshold: 'send-to-hamster',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Play PiggyPiggy',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/PiggyPiggyofficialbot/game?startapp=share_6106532625',
        taskStatus: 'active',
        claimTreshold: 'piggy-bot',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Play DLCoin',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/DLCoinBot/app?startapp=i_13628839653',
        taskStatus: 'active',
        claimTreshold: 'dl-coin-bot',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join DlCoin Channel',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+DztFJQr8dPMyMTQ0',
        taskStatus: 'active',
        claimTreshold: 'dl-coin-channel',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Play Ghost Drive',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/ghostdrive_bot?start=QCL7Yrigko',
        taskStatus: 'active',
        claimTreshold: 'ghost-drive-bot',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join Ghost Drive Channel',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'http://t.me/ghostdrive_web3',
        taskStatus: 'active',
        claimTreshold: 'ghost-drive-channel',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Play Pokemon Ball',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'http://t.me/PokemonBall_bot?start=6106532625',
        taskStatus: 'paused',
        claimTreshold: 'pokemon-ball-bot',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Join Pokemon Ball Channel',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+6dMVsdwxF0JiZmIy',
        taskStatus: 'paused',
        claimTreshold: 'pokemon-bot-channel',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: '',
        taskPoints: 1725738671029,
        taskCategory: '',
        taskUrl: '',
        taskStatus: 'pending',
        claimTreshold: 'whatsapp-status',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Share To Whatsapp Status',
        taskPoints: 1725738671029,
        taskCategory: 'Special',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'whatsapp-group',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Share To Instagram Reels',
        taskPoints: 1725738671029,
        taskCategory: 'Special',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'instagram-reels',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Share To Facebook Status',
        taskPoints: 1725738671029,
        taskCategory: 'Special',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'facebook',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Share To TikTok',
        taskPoints: 1725738671029,
        taskCategory: 'Special',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'tiktok',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Share To Snapchat',
        taskPoints: 1725738671029,
        taskCategory: 'Special',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'snapchat',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Share To Telegram Group',
        taskPoints: 1725738671029,
        taskCategory: 'Special',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'telegram-group',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'Share To Facebook Post',
        taskPoints: 1725738671029,
        taskCategory: 'Special',
        taskUrl: '',
        taskStatus: 'active',
        claimTreshold: 'facebook-post',
        rewardClaimed: false
    },
    {
        btnText: 'Start',
        taskText: 'DejenDog Bot',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/DejenDogBot/djdog?startapp=c14b8b84',
        taskStatus: 'active',
        claimTreshold: 'unique-id-1',
        rewardClaimed: false
      },
      {
        btnText: 'Start',
        taskText: 'DejenDog Channel',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+jo6lyvMWawM3M2Q1',
        taskStatus: 'active',
        claimTreshold: 'unique-id-2',
        rewardClaimed: false
      },
      {
        btnText: 'Start',
        taskText: 'Pigs Bot',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/PigshouseBot?start=773354626',
        taskStatus: 'active',
        claimTreshold: 'unique-id-3',
        rewardClaimed: false
      },
      {
        btnText: 'Start',
        taskText: 'Pigs Channel',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+5fewubcxSHViZWM0',
        taskStatus: 'active',
        claimTreshold: 'unique-id-4',
        rewardClaimed: false
      },
      {
        btnText: 'Start',
        taskText: 'GemsWall Bot',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/GleamRewardsBot/app?startapp=cmM9cF9haWRvZ3M',
        taskStatus: 'active',
        claimTreshold: 'unique-id-5',
        rewardClaimed: false
      },
      {
        btnText: 'Start',
        taskText: 'GemsWall Channel',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+zevh1InyRf4wYjAy',
        taskStatus: 'active',
        claimTreshold: 'unique-id-6',
        rewardClaimed: false
      },
      {
        btnText: 'Start',
        taskText: 'BFDCoin Bot',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/BFDCoin_bot/BFDCoin?startapp=1035892983',
        taskStatus: 'active',
        claimTreshold: 'unique-id-7',
        rewardClaimed: false
      },
      {
        btnText: 'Start',
        taskText: 'BFDCoin Channel',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+VoudIa8h4ek1YjRl',
        taskStatus: 'active',
        claimTreshold: 'unique-id-8',
        rewardClaimed: false
      },
      {
        btnText: 'Start',
        taskText: 'Obix Bot',
        taskPoints: 2000,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/obix_bot?start=6426024318',
        taskStatus: 'active',
        claimTreshold: 'unique-id-9',
        rewardClaimed: false
      },
      {
        btnText: 'Start',
        taskText: 'Obix Channel',
        taskPoints: 500,
        taskCategory: 'Partners',
        taskUrl: 'https://t.me/+XJPJKXSTpONlZGJk',
        taskStatus: 'active',
        claimTreshold: 'unique-id-10',
        rewardClaimed: false
      },
      {
          btnText: 'Start',
          taskText: 'Tonnchi Bot',
          taskPoints: 2000,
          taskCategory: 'Partners',
          taskUrl: 'https://t.me/Tonnchi_Bot/launch?startapp=wibLf8nL',
          taskStatus: 'active',
          claimTreshold: 'tonnchi-bot',
          rewardClaimed: false
      }
]

const newTasks = [
    
] 
  

const runTasksUpdate = async () => {
    const insertMany = await Task.insertMany(newTasks);
    const getTasks = await Task.find({
        claimTreshold: 'tonnchi-bot'
    })
    console.log(getTasks)
}

const updateTaskByClaimTreshold = async (claimTreshold, updateData) => {
    try {
      // Find the task by claimTreshold and update with the new data
      const updatedTask = await Task.findOneAndUpdate(
        { claimTreshold }, // Match the task by claimTreshold
        { $set: updateData }, // Update fields with updateData
        { new: true } // Return the updated task
      );
  
      if (!updatedTask) {
        return { message: "Task not found" };
      }
  
      console.log(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Task update failed');
    }
};

const resetReferralRewardsOp = async (userId) => {
    const user = await User.findOne({ 'user.id': userId });
  
    if (!user) {
      throw new Error('User not found');
    }
  
    // Reset all rewardClaimed fields to false
    user.referralRewardDeets.forEach(reward => reward.rewardClaimed = false);
  
    // Save the updated user data
    await user.save();
  };
  
  // Usage
  //resetReferralRewardsOp(1354055384)
    //.then(() => console.log('All referral rewards reset successfully'))
    //.catch(err => console.error('Error resetting referral rewards:', err));
  

//updateTaskByClaimTreshold('dl-coin-channel', {taskStatus: 'paused'})
  
//runTasksUpdate();

//calculateAverageUsersPerDay()
// Call the function to update referral points
//updateReferralPoints();

//resetSocialRewardDeets(1354055384)
//resetSocialRewards(1354055384)
resetReferralRewards(1354055384)
//updateUserPointsToday(1354055384, 0)

//deleteUserByUserId(1354055384)

// Call the function
//updateUsers();


// Call the function
//updateReferralContestField();

//updateReferrerPoints()
//getUsers();
//updateReferrerCode();
//getTop100Users();
//getTop100UsersAndUpdate();