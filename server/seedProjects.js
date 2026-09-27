import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './models/projects/Project.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected to', process.env.MONGODB_URI.split('@')[1]);
        
        // Find a state
        const State = mongoose.model('State', new mongoose.Schema({ name: String }, { strict: false }));
        const state = await State.findOne();
        if (!state) {
            console.log('No state found, skipping seed');
            process.exit(1);
        }

        // Get journey stages to use as statuses
        const JourneyStage = mongoose.model('JourneyStage', new mongoose.Schema({ name: String }, { strict: false }));
        const stages = await JourneyStage.find();
        
        // Clear existing
        await Project.deleteMany({});
        console.log('Cleared existing projects');

        const projects = [];
        const names = ['Ramesh Patel', 'Priya Sharma', 'Vijay Mehta', 'Anjali Desai', 'Sanjay Gupta'];
        const cps = ['SolarTech Solutions', 'Green Energy', 'SunPower'];
        const categories = ['Residential', 'Commercial'];
        const projectTypes = ['On-Grid', 'Off-Grid', 'Hybrid'];

        for(let i=1; i<=15; i++) {
            const randomStage = stages.length > 0 ? stages[Math.floor(Math.random() * stages.length)].name : 'Consumer Registration';
            const p = new Project({
                projectId: 'PRJ-10' + (i < 10 ? '0' + i : i),
                projectName: names[i%names.length],
                entityType: 'company',
                category: categories[i%categories.length],
                projectType: projectTypes[i%projectTypes.length],
                totalKW: Math.floor(Math.random() * 50) + 5,
                status: randomStage,
                statusStage: randomStage.replace(/\s+/g, '').toLowerCase(),
                dueDate: new Date(Date.now() + 86400000 * 10),
                state: state._id,
                cp: cps[i%cps.length],
                mobile: '987654321' + i,
            });
            projects.push(p);
        }
        
        await Project.insertMany(projects);
        console.log('Inserted ' + projects.length + ' dummy projects');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB();
