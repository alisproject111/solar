import mongoose from 'mongoose';

const bulkBuyOfferSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true
    },
    minOrders: {
        type: Number,
        required: true,
        min: 1
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    discountUnit: {
        type: String,
        enum: ['₹/KW', '%', 'Fixed'],
        default: '₹/KW'
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, { timestamps: true });

const BulkBuyOffer = mongoose.model('BulkBuyOffer', bulkBuyOfferSchema);

export default BulkBuyOffer;
