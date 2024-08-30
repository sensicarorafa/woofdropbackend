const mongoose = require('mongoose');
const User = require('./models/User');
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

/*const getUsers = async () => {
    const users = await User.find({});

    console.log(users.length)

}*/

/*async function updateReferrerPoints () {
    const users = await User.find({
        referrerCode: '91c968db'
        //referralCode: '71605e28'
    })

    let totalPoints = 2500;

    users.forEach(async (user) => {
        const userPoints = user.pointsNo / 10;
        if (userPoints !== Infinity) totalPoints += userPoints;
        console.log(user.pointsNo)
    })
    
    const referrer = await User.findOne({
        referralCode: '91c968db'
    })
    console.log(totalPoints)

    referrer.pointsNo = totalPoints;
    await referrer.save();
    console.log('Total users:', {referrer: referrer.pointsNo})
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
const countTotalUsers = async () => {
  try {
    // Define a limit for how many users to fetch at a time
    const limit = 5000;
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
  });

//updateReferrerPoints()
//getUsers();
//updateReferrerCode();