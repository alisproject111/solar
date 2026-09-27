import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import ComboKitAssignment from './models/inventory/ComboKitAssignment.js';
import mongooseState from './models/core/State.js';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://w3bfranceoperations_db_user:BpXlfVpX5yF9eaeA@cluster0.p7gs1gy.mongodb.net/solarkit?appName=Cluster0";

const seedData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB for seeding...");

        // Fetch any state
        const state = await mongooseState.findOne();
        if (!state) {
            console.log("No state found in DB! Cannot seed without a state.");
            process.exit(1);
        }

        const dummyKits = [
            {
                state: state._id,
                solarkitName: "Premium Residential 5kW On-Grid",
                panels: ["waaree"],
                inverters: ["Solis"],
                category: "Solar Panel",
                subCategory: "Residential",
                projectType: "1kw-10kw",
                subProjectType: "On Grid",
                cpTypes: ["FRANCHISEE"],
                status: "Active"
            },
            {
                state: state._id,
                solarkitName: "Commercial 20kW Hybrid",
                panels: ["tata"],
                inverters: ["Growatt"],
                category: "Solar Panel",
                subCategory: "Commercial",
                projectType: "11kw-50kw",
                subProjectType: "Hybrid",
                cpTypes: ["FRANCHISEE"],
                status: "Active"
            },
            {
                state: state._id,
                solarkitName: "Budget 3kW Off-Grid",
                panels: ["adani"],
                inverters: ["Solis"],
                category: "Solar Panel",
                subCategory: "Residential",
                projectType: "1kw-10kw",
                subProjectType: "Off Grid",
                cpTypes: ["FRANCHISEE"],
                status: "Active"
            }
        ];

        for (const kit of dummyKits) {
            const newKit = new ComboKitAssignment(kit);
            await newKit.save();
            console.log("Seeded kit:", kit.solarkitName);
        }

        console.log("Seeding complete!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed", err);
        process.exit(1);
    }
};

seedData();
