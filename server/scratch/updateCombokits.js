import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import ComboKitAssignment from '../models/inventory/ComboKitAssignment.js';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://w3bfranceoperations_db_user:BpXlfVpX5yF9eaeA@cluster0.p7gs1gy.mongodb.net/solarkit?appName=Cluster0";

const updateData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB for updating seeds...");

        // Update the seeded category "Solar Panel" to "Solar Rooftop"
        const result = await ComboKitAssignment.updateMany(
            { category: "Solar Panel" },
            { $set: { category: "Solar Rooftop" } }
        );

        console.log(`Updated ${result.modifiedCount} kits to use 'Solar Rooftop' category.`);
        process.exit(0);
    } catch (err) {
        console.error("Update failed", err);
        process.exit(1);
    }
};

updateData();
