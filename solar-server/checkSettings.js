import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import BuyLeadSetting from './models/marketing/BuyLeadSetting.js';

dotenv.config();

const checkSettings = async () => {
    await connectDB();
    const settings = await BuyLeadSetting.find({});
    console.log(`Found ${settings.length} BuyLeadSetting entries.`);
    settings.forEach(s => {
      console.log(`- Name: ${s.name || s.category}, Total: ${s.numLeads}, Assigned: ${s.currentLeadsCount}, Cost: ${s.perLeadRupees}`);
    });
    process.exit();
};

checkSettings();
