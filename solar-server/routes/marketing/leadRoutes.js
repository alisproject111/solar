import express from 'express';
import { createLead, getAllLeads, getLeadById, updateLead, deleteLead, assignLead } from '../../controllers/marketing/leadController.js';
import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect); // All routes require authentication
router.use(authorize('dealer', 'franchisee', 'admin', 'franchise_manager', 'dealer_manager')); // Allow relevant roles

router.route('/')
    .post(createLead)
    .get(getAllLeads);

router.route('/:id')
    .get(getLeadById)
    .put(updateLead)
    .delete(deleteLead);

router.put('/:id/assign', assignLead);

export default router;
