// addAccount.js (standalone seed script)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Adjust this path to where your model actually is:
const Profile = require('./db/schema/profile'); 

const MONGODB_URI = process.env.MONGODB_URI;

async function upsertUser({ username, rawPassword, email, userType }) {
  // ensure enum matches schema: 'admin' | 'moderator' | 'user'
  if (!['admin', 'moderator', 'user'].includes(userType)) {
    throw new Error(`Invalid userType: ${userType}`);
  }

  const existing = await Profile.findOne({ username });
  if (existing) {
    console.log(`ℹ️  Skipped: ${username} already exists (${existing.userType}).`);
    return;
  }

  const hashedPW = await bcrypt.hash(rawPassword, 10);
  await Profile.create({
    username,
    password: hashedPW,
    email,
    userType, // must be lowercase
  });
  console.log(`✅ Created ${userType}: ${username}`);
}

async function main() {
  try {
    await mongoose.connect(MONGODB_URI, {
      // optional but recommended
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Seed accounts
    await upsertUser({
      username: 'admin123',
      rawPassword: 'admin@123',
      email: 'admin-test@gmail.com',
      userType: 'admin',
    });

    await upsertUser({
      username: 'moderator123',
      rawPassword: 'moderator@123',
      email: 'moderator-test@gmail.com',
      userType: 'moderator',
    });
  } catch (err) {
    // common issues: bad URI, network blocked, enum case mismatch, unique index violations
    console.error('❌ Seed error:', err && err.message ? err.message : err);
    if (err && err.code === 11000) {
      console.error('   Duplicate key error (E11000): check unique email/username.');
    }
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
