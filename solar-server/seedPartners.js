import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import User from './models/users/User.js';
import District from './models/core/District.js';

dotenv.config();

const seed = async () => {
    await connectDB();
    
    // Find Ahmedabad district
    const district = await District.findOne({ name: /Ahmedabad/i });
    if (!district) {
        console.log("Ahmedabad district not found");
        process.exit(1);
    }

    // Check if franchisee already exists
    let existing = await User.find({ role: 'franchisee', district: district._id });
    if (existing.length > 0) {
        console.log("Franchisees already exist in Ahmedabad:", existing.length);
        process.exit(0);
    }

    const newPartner1 = new User({
        name: 'Partner 1 (Ahmedabad)',
        email: 'partner1_ahmd@example.com',
        password: 'password123',
        phone: '9876543210',
        role: 'franchisee',
        district: district._id,
        status: 'active'
    });

    const newPartner2 = new User({
        name: 'Partner 2 (Ahmedabad)',
        email: 'partner2_ahmd@example.com',
        password: 'password123',
        phone: '9876543211',
        role: 'franchisee',
        district: district._id,
        status: 'active'
    });

    await newPartner1.save();
    await newPartner2.save();

    console.log("Successfully seeded 2 partners in Ahmedabad!");
    process.exit(0);
};

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
