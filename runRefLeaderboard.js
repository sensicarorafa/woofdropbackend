const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const ReferralLeaderboard = require('./models/ReferralLeaderboard');
const mongoose= require('mongoose')
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

const refAccountsFilePath = path.join(__dirname, 'ref_accounts.json');

async function updateLeaderboardBatch(batch) {
    const leaderboard = await ReferralLeaderboard.find({}).sort({ pointsNo: -1 }).limit(80);
    const leaderboardIds = leaderboard.map(user => user.userId.toString());
    
    // Update each account in the batch
    for (const account of batch) {
        const userId = account._id.toString();
        if (!leaderboardIds.includes(userId)) {
            // Fetch the current points of the user
            const user = await User.findById(userId);
            if (user) {
                // Update points to ensure they are in the top 80
                user.pointsNo += 1000 * Math.random(0, 9); // Add enough points to ensure they are in the top 80
                user.referralPoints += 1000;
                user.referralContest += 1000;
                
                await user.save();
            }
        }
    }
}



let currentIndex = 0;

cron.schedule('0 */4 * * *', async () => {
    try {
        // Read ref_accounts file
        const data = fs.readFileSync(refAccountsFilePath);
        const refAccounts = JSON.parse(data);

        // Get the batch of 20 accounts
        const batch = refAccounts.slice(currentIndex, currentIndex + 20);
        if (batch.length === 0) return; // No more accounts to process

        // Update leaderboard
        await updateLeaderboardBatch(batch);

        // Increment index
        currentIndex += 20;

        // If all accounts processed, reset index
        if (currentIndex >= refAccounts.length) {
            currentIndex = 0;
        }

        console.log('Leaderboard updated successfully.');
    } catch (err) {
        console.error('Error updating leaderboard:', err);
    }
});
