import express from 'express';
import { toggleBreak, getProfileStats } from '../../controllers/hr/attendanceController.js';
import { protect } from '../../middleware/auth.js';

const router = express.Router();

router.post('/break', protect, toggleBreak);
router.get('/profile-stats', protect, getProfileStats);

export default router;
