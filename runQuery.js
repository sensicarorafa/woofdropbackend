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
    const users = await User.find({
        referralCode: '71605e28'
    })
    console.log('Total users:', users.length)
}

getUsers();