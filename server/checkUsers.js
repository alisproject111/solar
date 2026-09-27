import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import User from './models/users/User.js';

dotenv.config();

const checkUsers = async () => {
    await connectDB();
    const users = await User.find({}).sort({ createdAt: -1 }).limit(10).populate('district');
    console.log('Recent Users:');
    users.forEach(u => {
      console.log(`- ${u.name} | Role: ${u.role} | PartnerType: ${u.partnerType} | District: ${u.district?.name}`);
    });
    process.exit();
};

checkUsers();
