import User from '../../models/users/User.js';
import FranchiseeOnboardingGoal from '../../models/franchisee/FranchiseeOnboardingGoal.js';

export const getDashboardStats = async (req, res) => {
    try {
        const managerId = req.user._id;

        // Fetch the user to get their region (state)
        const manager = await User.findById(managerId).populate('state');
        if (!manager) {
            return res.status(404).json({ message: 'Manager not found' });
        }

        // Fetch assigned goals for this state/region
        let assignedGoalsTypes = ['partner', 'project']; // Default to both for testing/demo purposes if no strict goals exist
        let partnerGoalsData = null;
        let projectGoalsData = null;

        const goals = await FranchiseeOnboardingGoal.find({ state: manager.state });
        
        // For demonstration, let's create a generic structured response based on found goals or fallback to dummy data
        const totalCompanyLeadsTarget = goals.reduce((sum, g) => sum + (g.franchiseManagerCount || 20), 0) || 20;
        
        // Fetch real onboarded franchisees by this manager
        const onboardedFranchisees = await User.find({ role: 'franchisee', createdBy: managerId });
        
        const franchiseeCount = onboardedFranchisees.length;

        // Dummy data insertion for testing if no franchisees are found
        let tableData = onboardedFranchisees.map(f => ({
            id: f._id,
            name: f.name,
            paymentReceipt: null, // Should come from order/payment details
            onboardingDate: f.createdAt,
            firstOrderDueDate: new Date(f.createdAt.getTime() + 30*24*60*60*1000), // +30 days
            status: f.status === 'active' ? 'Completed' : 'Pending',
            commission: f.commissionRate ? `₹${f.commissionRate * 500}` : 'Not Eligible' // dummy math
        }));

        if (tableData.length === 0) {
            // Provide some dummy data to ensure the frontend shows it dynamically
            tableData = [
                {
                    id: 'dummy1',
                    name: 'Sharad Savaliya (Dummy DB Record)',
                    paymentReceipt: null,
                    onboardingDate: new Date('2025-05-30'),
                    firstOrderDueDate: new Date('2025-06-30'),
                    status: 'Pending',
                    commission: 'Not Eligible'
                },
                {
                    id: 'dummy2',
                    name: 'Darshit Ranpara (Dummy DB Record)',
                    paymentReceipt: null,
                    onboardingDate: new Date('2025-05-30'),
                    firstOrderDueDate: new Date('2025-06-30'),
                    status: 'Completed',
                    commission: '₹2500'
                }
            ];
        }

        // Calculate metrics
        partnerGoalsData = {
            assignCompanyLeads: totalCompanyLeadsTarget,
            franchiseeOnboardedLeads: franchiseeCount, // Real dynamic count
            selfLeads: 10, // Assuming fixed for now or from other model
            selfOnboarded: Math.floor(franchiseeCount * 0.3), // Mock calculation based on real count
            totalTarget: 30,
            conversionPct: Math.round(((franchiseeCount) / totalCompanyLeadsTarget) * 100) || 0
        };

        // For project goals, let's count total orders created by the franchisees of this manager
        const totalFranchiseeOrders = onboardedFranchisees.reduce((sum, f) => sum + (f.totalOrders || 0), 0);
        
        projectGoalsData = {
            totalProjectsAssigned: 15,
            projectsCompleted: totalFranchiseeOrders > 0 ? totalFranchiseeOrders : 7, // Fallback to 7 if no orders exist for UI testing
            targetAchievementPct: Math.round(((totalFranchiseeOrders > 0 ? totalFranchiseeOrders : 7) / 15) * 100)
        };

        res.status(200).json({
            assignedGoals: assignedGoalsTypes,
            partnerData: partnerGoalsData,
            projectData: projectGoalsData,
            franchisees: tableData
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: error.message });
    }
};
