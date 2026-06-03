import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HRMSSettings from './models/hr/HRMSSettings.js';
import User from './models/users/User.js';

dotenv.config();

const seedHRSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB.');

        // Find the user to get their department
        const user = await User.findOne({ email: 'franchisemanager@example.com' });
        
        let deptId = null;
        if (user && user.department) {
            deptId = user.department;
        }

        // Check if setting already exists
        const existing = await HRMSSettings.findOne({ position: 'franchiseeManager' });
        
        if (existing) {
            console.log('Settings already exist, updating with dummy data...');
            existing.payroll = {
                salary: '$5,000 / month',
                perks: 'Health Insurance, Gym Membership',
                benefits: 'Paid Time Off, 401k Match',
                esops: 'Eligible for 500 options after 1 year',
                payrollType: 'Monthly',
                salaryIncrement: '10% Annual',
                commissionTypeSelection: 'Per kW Commission'
            };
            await existing.save();
            console.log('Updated existing settings.');
        } else {
            console.log('Creating new dummy settings for franchiseeManager...');
            const newSetting = new HRMSSettings({
                department: deptId,
                position: 'franchiseeManager',
                settingType: 'unified',
                payroll: {
                    salary: '$5,000 / month',
                    perks: 'Health Insurance, Gym Membership',
                    benefits: 'Paid Time Off, 401k Match',
                    esops: 'Eligible for 500 options after 1 year',
                    payrollType: 'Monthly',
                    salaryIncrement: '10% Annual',
                    commissionTypeSelection: 'Per kW Commission'
                }
            });
            // If department is required but null, this will throw an error. 
            // We'll catch it. If it throws, we'll try to find any department.
            try {
                await newSetting.save();
                console.log('Successfully created new dummy settings.');
            } catch (err) {
                if (err.name === 'ValidationError') {
                    console.log('Validation Error (maybe department is required). Creating dummy department first or finding one...');
                    const Department = mongoose.model('Department');
                    const anyDept = await Department.findOne();
                    if (anyDept) {
                        newSetting.department = anyDept._id;
                        await newSetting.save();
                        console.log('Saved with existing department.');
                    } else {
                        console.log('Could not save because Department is strictly required and none exist.');
                    }
                } else {
                    console.error('Error saving:', err);
                }
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedHRSettings();
