import BulkBuyOffer from '../../models/inventory/BulkBuyOffer.js';

// @desc    Create a new bulk buy offer
// @route   POST /api/bulk-buy-offers
// @access  Private/Admin
export const createOffer = async (req, res) => {
    try {
        const { title, minOrders, discountValue, discountUnit, status } = req.body;

        const offer = new BulkBuyOffer({
            title,
            minOrders,
            discountValue,
            discountUnit,
            status
        });

        const createdOffer = await offer.save();
        res.status(201).json(createdOffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all bulk buy offers
// @route   GET /api/bulk-buy-offers
// @access  Private/Admin
export const getAllOffers = async (req, res) => {
    try {
        const offers = await BulkBuyOffer.find({}).sort({ minOrders: 1 });
        res.json(offers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get only active bulk buy offers
// @route   GET /api/bulk-buy-offers/active
// @access  Public / Franchisee
export const getActiveOffers = async (req, res) => {
    try {
        const offers = await BulkBuyOffer.find({ status: 'Active' }).sort({ minOrders: 1 });
        res.json(offers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a bulk buy offer
// @route   PUT /api/bulk-buy-offers/:id
// @access  Private/Admin
export const updateOffer = async (req, res) => {
    try {
        const { title, minOrders, discountValue, discountUnit, status } = req.body;

        const offer = await BulkBuyOffer.findById(req.params.id);

        if (offer) {
            offer.title = title || offer.title;
            offer.minOrders = minOrders !== undefined ? minOrders : offer.minOrders;
            offer.discountValue = discountValue !== undefined ? discountValue : offer.discountValue;
            offer.discountUnit = discountUnit || offer.discountUnit;
            offer.status = status || offer.status;

            const updatedOffer = await offer.save();
            res.json(updatedOffer);
        } else {
            res.status(404).json({ message: 'Offer not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a bulk buy offer
// @route   DELETE /api/bulk-buy-offers/:id
// @access  Private/Admin
export const deleteOffer = async (req, res) => {
    try {
        const offer = await BulkBuyOffer.findById(req.params.id);

        if (offer) {
            await offer.deleteOne();
            res.json({ message: 'Offer removed' });
        } else {
            res.status(404).json({ message: 'Offer not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
