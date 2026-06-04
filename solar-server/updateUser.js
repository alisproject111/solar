import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/solarkits')
  .then(async () => {
    const res = await mongoose.connection.collection('users').updateOne(
      { email: 'franchisemanager@example.com' },
      { $set: { email: 'partnermanager@example.com' } }
    );
    console.log(res);
    process.exit(0);
  });
