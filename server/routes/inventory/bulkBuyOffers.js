import express from 'express';
import {
    createOffer,
    getAllOffers,
    getActiveOffers,
    updateOffer,
    deleteOffer
} from '../../controllers/inventory/bulkBuyOfferController.js';
import { protect } from '../../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(getAllOffers) // we can restrict to protect, admin later if needed, but keeping it simple for now
    .post(protect, createOffer);

router.route('/active')
    .get(getActiveOffers);

router.route('/:id')
    .put(protect, updateOffer)
    .delete(protect, deleteOffer);

export default router;
