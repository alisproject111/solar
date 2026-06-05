import User from '../../models/users/User.js';
import Lead from '../../models/marketing/Lead.js';
import BuyLeadSetting from '../../models/marketing/BuyLeadSetting.js';

export const getFranchiseeManagerDashboardStats = async (req, res) => {
    try {
        const managerId = req.user.id;
        const manager = await User.findById(managerId).populate('state');

        if (!manager) {
            return res.status(404).json({ message: 'Manager not found' });
        }

        const stateId = manager.state ? manager.state._id : null;
        let districtFilter = {};
        if (stateId) {
            districtFilter.state = stateId;
        }

        // Aggregate District Leads
        const districtLeads = await Lead.aggregate([
            { $match: districtFilter },
            { $group: { _id: '$district', leads: { $sum: 1 } } }
        ]);

        // Aggregate District Partners (Fetch both 'franchisee' and 'dealer' roles as partners are managed there)
        const districtPartners = await User.aggregate([
            { $match: { role: { $in: ['franchisee', 'dealer'] }, ...districtFilter } },
            { $group: { _id: '$district', partners: { $sum: 1 } } }
        ]);

        // Aggregate revenue and assignments
        // Assignments = count of leads where dealer is a franchisee?
        // Let's get total leads and assignments (for simplicity, assigned means dealer is populated)
        const totalLeads = await Lead.countDocuments(districtFilter);
        const totalAssignments = await Lead.countDocuments({ ...districtFilter, dealer: { $exists: true, $ne: null } });
        
        // Mock revenue based on assignments (e.g. 500 per assignment)
        // You can change this logic to use actual financial transactions if available
        const totalRevenue = totalAssignments * 500;

        // Get count of districts that have either leads or partners
        const activeDistrictsSet = new Set();
        districtLeads.forEach(d => { if (d._id) activeDistrictsSet.add(d._id.toString()); });
        districtPartners.forEach(d => { if (d._id) activeDistrictsSet.add(d._id.toString()); });

        res.status(200).json({
            success: true,
            dashboard: {
                totalActiveDistricts: activeDistrictsSet.size,
                totalLeads,
                totalAssignments,
                totalRevenue,
                districtStats: {
                    leads: districtLeads,
                    partners: districtPartners
                }
            }
        });

    } catch (error) {
        console.error("Franchisee Manager Dashboard Error:", error);
        res.status(500).json({ message: error.message });
    }
};
