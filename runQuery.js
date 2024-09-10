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
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected successfully");
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

/*async function updateReferrerPoints () {
    console.log('Running')
    const user = await User.findOne({
        //referrerCode: 'c668bca1'
        referralCode: '71605e28'
    })

    let totalPoints = 2500;

    users.forEach(async (user) => {
        const userPoints = user.pointsNo / 10;
        if (userPoints !== Infinity) totalPoints += userPoints;
        console.log(user.pointsNo)
    })
    
    const referrer = await User.findOne({
        referralCode: 'ddd7eecc'
    })

    console.log(referrer)

    //referrer.pointsNo = totalPoints;
    //await referrer.save();
    //console.log('Total users:', {referrer: referrer.pointsNo})
}*/


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

/*async function updateUsers() {
    try {
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
}*/

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

/*async function resetReferralRewards(userId) {
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

        // Save the updated user document
        await user.save();

        console.log(`All referralRewardDeets set to false for user with user.id ${userId}`);
        return user;
    } catch (error) {
        console.error('Error resetting referral rewards:', error);
        throw error;
    }
}*/

/*async function resetSocialRewards(userId) {
    try {
        // Find the user based on user.id
        const user = await User.findOne({ 'user.id': userId });

        if (!user) {
            console.log(`No user found with user.id ${userId}`);
            return null;
        }

        // Loop through referralRewardDeets and set rewardClaimed to false
        user.socialRewardDeets = user.socialRewardDeets.map(reward => ({
            ...reward,
            rewardClaimed: false
        }));

        // Save the updated user document
        await user.save();

        console.log(`All socialRewardDeets set to false for user with user.id ${userId}`);
        return user;
    } catch (error) {
        console.error('Error resetting referral rewards:', error);
        throw error;
    }
}*/

async function updateReferralPoints() {
    try {
        console.log('Starting referral jobs')
        // Fetch all users from the database
        const users = await User.find();

        for (let index = 0; index < users.length; index++) {
            const user = users[index];

            // Log the index of the user
            console.log(`Processing user at index: ${index}`);

            // Check if the user has referralPoints greater than 0
            if (user.referralPoints > 0) {
                const userReferralCode = user.referralCode;

                // Find all users whose referrerCode matches the current user's referralCode
                const referredUsers = await User.find({ referrerCode: userReferralCode });

                // Compare the length of referredUsers array with the current user's referralPoints
                if (referredUsers.length !== user.referralPoints) {
                    // Update referralPoints to the length of referredUsers array
                    user.referralPoints = referredUsers.length;

                    // Save the updated user in the database
                    await user.save();
                    console.log(`Updated referralPoints for user with id: ${user.user.id} at index: ${index}`);
                }
            }
        }
        console.log('Referral points update completed for all users.');
    } catch (error) {
        console.error('Error updating referral points:', error);
        throw error;
    }
}

// Call the function to update referral points
updateReferralPoints();

//resetSocialRewards(1354055384)
//resetReferralRewards(1354055384)
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