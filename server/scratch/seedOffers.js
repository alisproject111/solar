import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import BulkBuyOffer from '../models/inventory/BulkBuyOffer.js';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://w3bfranceoperations_db_user:BpXlfVpX5yF9eaeA@cluster0.p7gs1gy.mongodb.net/solarkit?appName=Cluster0";

const seedData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB for seeding offers...");

        await BulkBuyOffer.deleteMany({});
        
        const offers = [
            {
                title: "Min 5 Orders",
                minOrders: 5,
                discountValue: 1000,
                discountUnit: "₹/KW",
                status: "Active"
            },
            {
                title: "Min 10 Orders",
                minOrders: 10,
                discountValue: 1200,
                discountUnit: "₹/KW",
                status: "Active"
            },
            {
                title: "Min 15 Orders",
                minOrders: 15,
                discountValue: 1500,
                discountUnit: "₹/KW",
                status: "Active"
            },
            {
                title: "Min 20 Orders",
                minOrders: 20,
                discountValue: 2000,
                discountUnit: "₹/KW",
                status: "Active"
            }
        ];

        await BulkBuyOffer.insertMany(offers);
        console.log("Successfully seeded offers.");
        process.exit(0);
    } catch (err) {
        console.error("Seed failed", err);
        process.exit(1);
    }
};

seedData();
