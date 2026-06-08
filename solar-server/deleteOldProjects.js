import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './models/projects/Project.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await Project.deleteMany({ projectId: { $regex: '^PRJ-' } });
        console.log('Deleted ' + result.deletedCount + ' dummy projects');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB();
