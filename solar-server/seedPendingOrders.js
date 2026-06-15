import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/orders/Order.js';
import User from './models/users/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/solarkits';

async function seedPendingOrders() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find any user to act as the CP/Partner
    const user = await User.findOne({}) || await User.create({
      name: 'Dummy CP Partner',
      email: 'cp@dummy.com',
      password: 'password123',
      role: 'franchisee'
    });

    const dummyOrders = [
      {
        orderNumber: 'ORD-2023-001',
        user: user._id,
        customer: { name: 'Green Energy Setup' },
        subTotal: 85000,
        totalAmount: 85000,
        status: 'pending',
        paymentStatus: 'pending',
        orderType: 'Combo',
        kwCapacity: 5,
        location: { lat: 23.0225, lng: 72.5714 } // This might be dropped if strict schema is true, but that's okay
      },
      {
        orderNumber: 'ORD-2023-005',
        user: user._id,
        customer: { name: 'SolarTech Commercial' },
        subTotal: 125000,
        totalAmount: 125000,
        status: 'pending',
        paymentStatus: 'pending',
        orderType: 'Custom',
        kwCapacity: 10
      },
      {
        orderNumber: 'ORD-2023-008',
        user: user._id,
        customer: { name: 'EcoPower Industrial' },
        subTotal: 250000,
        totalAmount: 250000,
        status: 'pending',
        paymentStatus: 'pending',
        orderType: 'Combo',
        kwCapacity: 20
      }
    ];

    // Delete existing dummy orders just in case
    await Order.deleteMany({ orderNumber: { $in: ['ORD-2023-001', 'ORD-2023-005', 'ORD-2023-008'] } });

    // Insert dummy orders
    await Order.insertMany(dummyOrders);
    console.log('Successfully seeded 3 pending orders for testing.');

  } catch (error) {
    console.error('Error seeding orders:', error);
  } finally {
    mongoose.disconnect();
    process.exit();
  }
}

seedPendingOrders();
