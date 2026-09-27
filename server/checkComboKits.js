import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import ComboKitAssignment from './models/inventory/ComboKitAssignment.js';

dotenv.config();

const checkData = async () => {
    await connectDB();
    const data = await ComboKitAssignment.find({})
            .populate('state', 'name')
            .populate('clusters', 'name')
            .populate('districts', 'name')
            .populate('combokitId', 'name');
            
    console.log(JSON.stringify(data, null, 2));
    process.exit();
};

checkData();
