const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ref_accounts.json');

const firstNames = {
  asia: ["Aisha", "Wei", "Ravi", "Yuki", "Hina", "Sanjay", "Mei", "Tariq", "Jia", "Kavita"],
  middleEast: ["Yousef", "Leila", "Hussein", "Amina", "Omar", "Fatima", "Sami", "Noor", "Ahmed", "Nadia"],
  africa: ["Nia", "Kwame", "Adewale", "Zola", "Amara", "Tshabalala", "Kofi", "Mandisa", "Adebayo", "Imani"],
  easternEurope: ["Mikhail", "Anastasia", "Boris", "Ivana", "Dmitry", "Zara", "Vladimir", "Olga", "Nikolai", "Katarina"]
};

const lastNames = {
  asia: ["Chen", "Patel", "Tanaka", "Gupta", "Hussain", "Kim", "Li", "Nguyen", "Singh", "Sharma"],
  middleEast: ["Al-Farsi", "Haddad", "Nasr", "Khan", "Abdul", "Ibrahim", "Bakir", "Malik", "Salman", "Sharif"],
  africa: ["Adebayo", "Mandela", "Tshabalala", "Jalloh", "Nkosi", "Kagiso", "Obi", "Okeke", "Bassey", "Karanja"],
  easternEurope: ["Petrov", "Romanov", "Ivanov", "Popov", "Kuznetsov", "Sokolov", "Morozov", "Orlov", "Kozlov", "Smirnov"]
};

const languages = {
  asia: ["zh", "hi", "jp", "kr"],
  middleEast: ["ar", "fr"],
  africa: ["en", "fr", "sw"],
  easternEurope: ["ru", "pl", "bg"]
};

// Helper function to generate random number in a range
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateUser = (region, id) => {
  const firstName = firstNames[region][randomInt(0, firstNames[region].length - 1)];
  const lastName = lastNames[region][randomInt(0, lastNames[region].length - 1)];
  const languageCode = languages[region][randomInt(0, languages[region].length - 1)];

  return {
    pointsNo: randomInt(100, 1000),
    referralPoints: randomInt(50, 300),
    referralContest: randomInt(50, 300),
    referrerCode: Math.random().toString(36).substring(2, 10), // Random code
    userLevel: randomInt(1, 7),
    totalSteps: randomInt(10000, 100000),
    pointsToday: randomInt(100, 500),
    totalStepsToday: randomInt(100, 1000),
    gender: randomInt(0, 1) ? "Male" : "Female",
    earlyAdopterBonusClaimed: randomInt(0, 1) ? true : false,
    isTracking: randomInt(0, 1) ? true : false,
    user: {
      id,
      first_name: firstName,
      last_name: lastName,
      username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${id}`,
      language_code: languageCode,
      allows_write_to_pm: randomInt(0, 1) ? true : false
    },
    referralCode: `${firstName}${lastName}${id}`,
    referredBy: randomInt(0, 1) ? false : true,
    referralRewardDeets: Array.from({ length: 10 }, (_, i) => ({
      claimTreshold: (i + 1) * 5,
      rewardClaimed: randomInt(0, 1) ? true : false
    })),
    socialRewardDeets: [
      { claimTreshold: "follow", rewardClaimed: randomInt(0, 1) ? true : false },
      { claimTreshold: "repost", rewardClaimed: randomInt(0, 1) ? true : false },
      { claimTreshold: "telegram", rewardClaimed: randomInt(0, 1) ? true : false },
      { claimTreshold: "youtube", rewardClaimed: randomInt(0, 1) ? true : false },
      { claimTreshold: "instagram", rewardClaimed: randomInt(0, 1) ? true : false }
    ]
  };
};

const generateAccounts = (count, existingLength) => {
  const regions = ["asia", "middleEast", "africa", "easternEurope"];
  const accounts = [];

  for (let i = 0; i < count; i++) {
    const region = regions[i % regions.length]; // Cycle through regions
    accounts.push(generateUser(region, existingLength + i + 1)); // Unique IDs continuing from existing length
  }

  return accounts;
};

const updateAccountsFile = (filePath, newAccounts) => {
  // Read the existing ref_accounts.json file
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return;
    }

    // Parse the existing data
    let accounts = [];
    try {
      accounts = JSON.parse(data);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }

    // Append new accounts to the existing array
    accounts.push(...newAccounts);

    // Write the updated accounts back to the file
    fs.writeFile(filePath, JSON.stringify(accounts, null, 2), (err) => {
      if (err) {
        console.error("Error writing file:", err);
      } else {
        console.log("Accounts successfully updated!");
      }
    });
  });
};

// Read existing file to get the number of existing accounts
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error("Error reading file:", err);
    return;
  }

  // Parse the existing data
  let existingAccounts = [];
  try {
    existingAccounts = JSON.parse(data);
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }

  // Generate 20 new accounts
  const newAccounts = generateAccounts(20, existingAccounts.length);

  // Update the ref_accounts.json file with the new accounts
  updateAccountsFile(filePath, newAccounts);
});
