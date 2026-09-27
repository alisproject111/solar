import Approval from '../../models/approvals/Approval.js';
import ProcurementOrder from '../../models/orders/ProcurementOrder.js';
import User from '../../models/users/User.js';

// Get Approvals with filters
export const getApprovals = async (req, res) => {
    try {
        const { type, status, state, cluster, district } = req.query;

        let query = {};

        if (type) query.type = type;
        if (status) query.status = status;

        // Location filters - allow filtering by state, cluster, district
        // Note: Assuming the frontend sends these as query params
        if (state && state !== 'All') query['location.state'] = state;
        if (cluster && cluster !== 'All') query['location.cluster'] = cluster;
        if (district && district !== 'All') {
            query['location.district'] = district;
            // District is specific enough. Remove cluster filter to ensure we match 
            // documents that might not have saved the location.cluster field.
            delete query['location.cluster'];
        }

        const approvals = await Approval.find(query).sort({ createdAt: -1 });

        // approvals fetched successfully

        res.status(200).json(approvals);
    } catch (error) {
        console.error('Error fetching approvals:', error);
        res.status(500).json({ message: 'Error fetching approvals', error: error.message });
    }
};

// Create a new approval request (for seeding or manual creation)
export const createApproval = async (req, res) => {
    try {
        const newApproval = new Approval(req.body);
        const savedApproval = await newApproval.save();
        res.status(201).json(savedApproval);
    } catch (error) {
        console.error('Error creating approval:', error);
        res.status(500).json({ message: 'Error creating approval', error: error.message });
    }
};

// Update approval status (Approve/Reject)
export const updateApprovalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks, approvedBy, rejectedBy } = req.body;

        const updateData = { status };

        if (status === 'Approved') {
            updateData.approvedBy = approvedBy || 'Admin';
            updateData.approvedDate = new Date();
        } else if (status === 'Rejected') {
            updateData.rejectedBy = rejectedBy || 'Admin';
            updateData.rejectedDate = new Date();
            updateData.rejectionReason = remarks;
        }

        const updatedApproval = await Approval.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedApproval) {
            return res.status(404).json({ message: 'Approval not found' });
        }
        
        // SYNC EFFECT FOR INVENTORY TRACKING
        if (status === 'Approved' && updatedApproval.type === 'inventory') {
            const orderId = updatedApproval.data?.orderId;
            if (orderId) {
                try {
                    await ProcurementOrder.findByIdAndUpdate(orderId, { status: 'Approval by Admin' });
                    console.log(`✅ Procurement Order ${orderId} status updated via Admin Approval`);
                } catch (syncErr) {
                    console.error("Failed to sync status with ProcurementOrder", syncErr);
                }
            }
        }

        // CREATE USER FOR DISTRICT MANAGER APPROVAL
        if (status === 'Approved' && updatedApproval.type === 'districtManager') {
            try {
                const formData = updatedApproval.data;
                const user = new User({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    role: formData.role || 'franchiseeManager', // or whatever role corresponds to district manager
                    status: 'active', // Since it's approved by admin
                    district: formData.districtId || formData.district, // Prefer ObjectId if string name was passed in district
                    state: formData.state,
                    password: formData.password || 'defaultPassword123'
                });
                await user.save();
                console.log(`✅ District Manager User created successfully for approval ${updatedApproval._id}`);
            } catch (userErr) {
                console.error("Failed to create User from districtManager approval", userErr);
                // Optionally handle rollback or notification if user creation fails
            }
        }

        // CREATE USER FOR DEALER MANAGER APPROVAL
        if (status === 'Approved' && updatedApproval.type === 'dealerManager') {
            try {
                const formData = updatedApproval.data;
                const user = new User({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    role: formData.role || 'dealerManager',
                    status: 'active',
                    district: formData.districtId || formData.district,
                    state: formData.state,
                    password: formData.password || 'defaultPassword123'
                });
                await user.save();
                console.log(`✅ Dealer Manager User created successfully for approval ${updatedApproval._id}`);
            } catch (userErr) {
                console.error("Failed to create User from dealerManager approval", userErr);
            }
        }

        res.status(200).json(updatedApproval);
    } catch (error) {
        console.error('Error updating approval status:', error);
        res.status(500).json({ message: 'Error updating approval status', error: error.message });
    }
};

// Delete approval (optional, but good for cleanup)
export const deleteApproval = async (req, res) => {
    try {
        const { id } = req.params;
        await Approval.findByIdAndDelete(id);
        res.status(200).json({ message: 'Approval deleted successfully' });
    } catch (error) {
        console.error('Error deleting approval:', error);
        res.status(500).json({ message: 'Error deleting approval', error: error.message });
    }
};
