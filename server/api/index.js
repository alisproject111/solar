import app from '../index.js';
import connectDB from '../config/database.js';

export default async function handler(req, res) {
  // Ensure database connection is attempted
  try {
    await connectDB();
  } catch (err) {
    console.error('Database connection error in handler:', err);
  }
  
  // Forward request to Express app
  return app(req, res);
}
