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

const getUsers = async () => {
    const users = await User.findOne({
        'user.username': ('ExoProKiKi')
        //referralCode: '71605e28'
    })

    users.pointsNo = 2650
    await users.save()
    console.log(users.referralPoints, users.pointsNo, users.socialRewardDeets)
}

async function updateReferrerPoints () {
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

//updateReferrerPoints()
getUsers();
//updateReferrerCode();