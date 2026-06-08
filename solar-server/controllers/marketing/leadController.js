import Lead from '../../models/marketing/Lead.js';

export const createLead = async (req, res, next) => {
    try {
        const { name, mobile, whatsapp, email, district, city, cluster, solarType, subType, kw, billAmount } = req.body;
        console.log('User in createLead:', req.user);


        const lead = await Lead.create({
            name,
            mobile,
            whatsapp,
            email,
            district,
            city,
            cluster,
            solarType,
            subType,
            kw,
            billAmount,
            dealer: req.user.id,
            history: [{ action: 'Created', by: req.user.id }]
        });

        res.status(201).json({ success: true, data: lead });
    } catch (err) {
        next(err);
    }
};

export const getAllLeads = async (req, res, next) => {
    try {
        const { status, search, district, city, cluster } = req.query;
        const query = { isActive: true };
        
        // Only restrict if user is a dealer
        if (req.user.role === 'dealer' || req.user.role === 'dealerManager') {
            query.dealer = req.user.id;
        }

        if (status && status !== 'All') query.status = status;
        if (district && district !== 'All') query.district = district;
        if (city && city !== 'All') query.city = city;
        if (cluster && cluster !== 'All') query.cluster = cluster;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } }
            ];
        }

        const leads = await Lead.find(query)
            .populate('district', 'name')
            .populate('city', 'name')
            .populate('cluster', 'name')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: leads.length, data: leads });
    } catch (err) {
        next(err);
    }
};

export const getLeadById = async (req, res, next) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, dealer: req.user.id })
            .populate('district', 'name')
            .populate('city', 'name')
            .populate('cluster', 'name');

        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        res.json({ success: true, data: lead });
    } catch (err) {
        next(err);
    }
};

export const updateLead = async (req, res, next) => {
    try {
        const { status, ...updateData } = req.body;
        let lead = await Lead.findOne({ _id: req.params.id, dealer: req.user.id });

        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        Object.assign(lead, updateData);

        if (status && status !== lead.status) {
            lead.status = status;
            lead.history.push({ action: `Status updated to ${status}`, by: req.user.id });
        }

        await lead.save();
        res.json({ success: true, data: lead });
    } catch (err) {
        next(err);
    }
};

export const assignLead = async (req, res, next) => {
    try {
        const { assignedTo, assignedToType } = req.body;
        let lead = await Lead.findById(req.params.id);

        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        lead.assignedTo = assignedTo;
        lead.assignedToType = assignedToType;
        lead.status = 'Assigned';
        lead.history.push({ action: `Assigned to ${assignedToType}`, by: req.user.id });

        await lead.save();
        
        // Populate for return
        await lead.populate('assignedTo', 'name');
        
        res.json({ success: true, data: lead });
    } catch (err) {
        next(err);
    }
};

export const deleteLead = async (req, res, next) => {
    try {
        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, dealer: req.user.id },
            { isActive: false },
            { new: true }
        );

        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (err) {
        next(err);
    }
};
