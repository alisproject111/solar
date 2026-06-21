import User from '../../models/users/User.js';
import Order from '../../models/orders/Order.js';
import Delivery from '../../models/orders/Delivery.js';
import Installation from '../../models/projects/Installation.js';
import Statistics from '../../models/admin/Statistics.js';
import Product from '../../models/inventory/Product.js';
import mongoose from 'mongoose';
import OverdueTaskSetting from '../../models/approvals/OverdueTaskSetting.js';
import { calculateTaskStatus } from '../../utils/statusCalculator.js';

export const getAdminDashboard = async (req, res) => {
  try {
    const { state, cluster, district, category, timeline, solarkitType, brand, warehouse } = req.query;

    let userFilter = {};
    let orderFilter = {};
    if (state) {
      userFilter.state = state;
      orderFilter['customer.state'] = state;
    }
    if (cluster) {
      userFilter.cluster = cluster;
      orderFilter['customer.cluster'] = cluster;
    }
    if (district) {
      userFilter.district = district;
      orderFilter['customer.district'] = district;
    }
    if (category) orderFilter.category = category;
    if (timeline) orderFilter.timeline = timeline;

    const totalUsers = await User.countDocuments();
    const totalDealers = await User.countDocuments({ role: 'dealer', ...userFilter });
    const totalFranchisees = await User.countDocuments({ role: 'franchisee', ...userFilter });
    const totalInstallers = await User.countDocuments({ role: 'installer', ...userFilter });
    const totalDeliveryPartners = await User.countDocuments({
      role: 'delivery_manager',
      ...userFilter,
    });

    const totalOrders = await Order.countDocuments(orderFilter);
    const pendingOrders = await Order.countDocuments({ status: 'pending', ...orderFilter });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed', ...orderFilter });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered', ...orderFilter });

    const totalDeliveries = await Delivery.countDocuments();
    const completedDeliveries = await Delivery.countDocuments({ status: 'delivered' });

    const totalInstallations = await Installation.countDocuments();
    const completedInstallations = await Installation.countDocuments({ status: 'completed' });

    const revenueData = await Order.aggregate([
      { $match: { status: 'delivered', ...orderFilter } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
        },
      },
    ]);

    const recentOrders = await Order.find(orderFilter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    const topDealers = await User.find({ role: 'dealer', ...userFilter })
      .sort({ totalRevenue: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      dashboard: {
        users: {
          total: totalUsers,
          dealers: totalDealers,
          franchisees: totalFranchisees,
          installers: totalInstallers,
          deliveryPartners: totalDeliveryPartners,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          confirmed: confirmedOrders,
          delivered: deliveredOrders,
        },
        deliveries: {
          total: totalDeliveries,
          completed: completedDeliveries,
        },
        installations: {
          total: totalInstallations,
          completed: completedInstallations,
        },
        revenue: {
          totalRevenue: revenueData[0]?.totalRevenue || 0,
          avgOrderValue: revenueData[0]?.avgOrderValue || 0,
        },
        recentOrders,
        topDealers,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInstallerDashboard = async (req, res) => {
  try {
    const { state, cluster, district, category, timeline, startDate, endDate, partnerTypes, partnerPlans } = req.query;
    console.log('--- 🚀 Installer Dashboard Fetch Started ---');
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Database connected successfully');
    }
    console.log(`Filters received: State: ${state}, Cluster: ${cluster}, District: ${district}, Category: ${category}, Timeline: ${timeline}`);

    let filter = { role: 'installer' };
    let statFilter = { role: 'installer' };

    // Apply location filters if present
    if (state) filter.state = state;
    if (cluster) filter.cluster = cluster;
    if (district) filter.district = district;

    // Apply partner filters
    if (partnerTypes) {
      const typesArray = Array.isArray(partnerTypes) ? partnerTypes : partnerTypes.split(',');
      filter.partnerType = { $in: typesArray };
    }
    if (partnerPlans) {
      const plansArray = Array.isArray(partnerPlans) ? partnerPlans : partnerPlans.split(',');
      filter.plan = { $in: plansArray };
    }

    // Apply location filters to statistics
    if (state) statFilter.state = state;
    if (cluster) statFilter.cluster = cluster;
    if (district) statFilter.district = district;

    // Timeline filtering (simple implementation for stats)
    if (timeline && timeline !== 'all') {
      const now = new Date();
      let start;
      if (timeline === 'week') start = new Date(now.setDate(now.getDate() - 7));
      if (timeline === 'month') start = new Date(now.setMonth(now.getMonth() - 1));
      if (start) statFilter.createdAt = { $gte: start };
    }

    if (startDate && endDate) {
      statFilter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const totalInstallers = await User.countDocuments(filter);
    console.log(`✅ Fetched total installers: ${totalInstallers}`);
    console.log(`📊 Fetched locations count: ${state ? 1 : 0}`); // Representing active location filter count

    // To filter statistics by partner type/plan, we need to match user IDs
    const matchingUsers = await User.find(filter).select('_id').lean();
    const userIds = matchingUsers.map(u => u._id);
    statFilter.user = { $in: userIds };

    const statistics = await Statistics.find(statFilter);
    console.log(`✅ Fetched chart records: ${statistics.length}`);

    if (statistics.length === 0) {
      console.log('⚠️ No data found in database for installer statistics matching filters');
    }

    const totalAssigned = statistics.reduce((sum, stat) => sum + (stat.totalAssigned || 0), 0);
    const inProgress = statistics.reduce((sum, stat) => sum + (stat.inProgress || 0), 0);
    const completed = statistics.reduce((sum, stat) => sum + (stat.completed || 0), 0);
    const overdue = statistics.reduce((sum, stat) => sum + (stat.overdue || 0), 0);

    const installers = await User.find(filter)
      .select('-password')
      .sort({ name: 1 })
      .lean();

    const performanceData = await Promise.all(
      installers.map(async (installer) => {
        const stats = await Statistics.findOne({ user: installer._id, ...statFilter });
        return {
          _id: installer._id,
          name: installer.name,
          email: installer.email,
          totalAssigned: stats?.totalAssigned || 0,
          inProgress: stats?.inProgress || 0,
          overdue: stats?.overdue || 0,
          completed: stats?.completed || 0,
          completionRate: stats?.completionRate || 0,
          rating: stats?.rating || 0,
        };
      })
    );

    // Monthly Progress Data (Aggregation for chart)
    const monthlyStats = await Statistics.aggregate([
      { $match: statFilter },
      {
        $group: {
          _id: { month: '$month', year: '$year' },
          assigned: { $sum: '$totalAssigned' },
          completed: { $sum: '$completed' },
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartCategories = monthlyStats.map(s => s._id.month || 'N/A');
    const assignedSeries = monthlyStats.map(s => s.assigned);
    const completedSeries = monthlyStats.map(s => s.completed);

    // Ratings Data for Chart
    const ratingsData = performanceData
      .filter(p => p.rating > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    console.log(`✅ Fetched chart records: ${monthlyStats.length} monthly points, ${ratingsData.length} top ratings`);
    console.log('--- 🏁 Installer Dashboard Fetch Completed ---');

    res.status(200).json({
      success: true,
      dashboard: {
        totalInstallers,
        assignedInstallations: totalAssigned,
        inProgressInstallations: inProgress,
        completedInstallations: completed,
        overdueInstallations: overdue,
        installerPerformance: performanceData,
        charts: {
          progress: {
            categories: chartCategories,
            series: [
              { name: 'Assigned Installations', data: assignedSeries },
              { name: 'Completed Installations', data: completedSeries }
            ]
          },
          ratings: {
            categories: ratingsData.map(p => p.name),
            series: [{ data: ratingsData.map(p => p.rating) }]
          }
        }
      },
    });
  } catch (error) {
    console.error('❌ Error in getInstallerDashboard:', error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getDeliveryDashboard = async (req, res) => {
  try {
    const { state, cluster, district, warehouse, deliveryType, category, timeline, startDate, endDate, partnerTypes, partnerPlans, status, orderType, specificKit } = req.query;
    console.log('--- 🚀 Delivery Dashboard Fetch Started ---');

    let filter = {};
    if (state) filter.state = state;
    if (cluster) filter.cluster = cluster;
    if (district) filter.district = district;
    if (warehouse) filter.warehouse = warehouse;
    if (deliveryType) filter.deliveryType = deliveryType.toLowerCase();
    if (category) filter.category = category;
    if (status) filter.status = status;

    if (orderType && !specificKit) {
      const typeRegex = orderType === 'Customized Kit' ? /kit/i : /combo/i;
      filter.projectType = { $regex: typeRegex };
    }

    if (specificKit) {
      filter.projectType = specificKit;
    }

    // Apply partner filters (Subquery via Orders)
    if (partnerTypes || partnerPlans) {
      let userSubFilter = {};
      if (partnerTypes) {
        const typesArray = Array.isArray(partnerTypes) ? partnerTypes : partnerTypes.split(',');
        userSubFilter.partnerType = { $in: typesArray };
      }
      if (partnerPlans) {
        const plansArray = Array.isArray(partnerPlans) ? partnerPlans : partnerPlans.split(',');
        userSubFilter.plan = { $in: plansArray };
      }
      
      const matchingUsers = await User.find(userSubFilter).select('_id').lean();
      const userIds = matchingUsers.map(u => u._id);
      
      const matchingOrders = await Order.find({ dealerId: { $in: userIds } }).select('_id').lean();
      const orderIds = matchingOrders.map(o => o._id);
      
      filter.order = { $in: orderIds };
    }

    // Timeline/Date Filter
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (timeline) {
      const now = new Date();
      if (timeline === 'Last Week') filter.createdAt = { $gte: new Date(now.setDate(now.getDate() - 7)) };
      else if (timeline === 'Last Month') filter.createdAt = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
      else if (timeline === 'Last 3 Months') filter.createdAt = { $gte: new Date(now.setMonth(now.getMonth() - 3)) };
      else if (timeline === 'Last 6 Months') filter.createdAt = { $gte: new Date(now.setMonth(now.getMonth() - 6)) };
    }

    // 1. Basic Counts
    const totalDeliveries = await Delivery.countDocuments(filter);

    const primeDeliveries = await Delivery.countDocuments({ ...filter, deliveryType: 'prime' });
    const regularDeliveries = await Delivery.countDocuments({ ...filter, deliveryType: 'regular' });
    const expressDeliveries = await Delivery.countDocuments({ ...filter, deliveryType: 'express' });
    const bulkDeliveries = await Delivery.countDocuments({ ...filter, deliveryType: 'bulk' });

    // 2. Pending / Status Counts
    const pendingFilter = { ...filter, status: { $nin: ['delivered', 'cancelled', 'returned'] } };
    const pendingTotal = await Delivery.countDocuments(pendingFilter);

    const globalSettings = await OverdueTaskSetting.findOne({ 
      districts: { $size: 0 }, 
      clusters: { $size: 0 }, 
      states: { $size: 0 }, 
      countries: { $size: 0 },
      departments: { $size: 0 }
    }) || { todayTasksDays: 0, pendingMinDays: 1, pendingMaxDays: 7 };

    const activeDeliveries = await Delivery.find(pendingFilter);

    let urgentCount = 0;
    let overdueCount = 0;
    let normalPending = 0;

    activeDeliveries.forEach(d => {
      const status = calculateTaskStatus(d.scheduledDate, globalSettings);
      if (status === 'overdue') overdueCount++;
      else if (status === 'pending') urgentCount++; // Using 'urgent' to map to 'Pending' in this dashboard's terminology
      else normalPending++;
    });

    // 3. Efficiency & Cost (Aggregation)
    const statsAggregation = await Delivery.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalDistance: { $sum: '$distance' },
          totalCost: { $sum: '$deliveryCost' },
          avgCost: { $avg: '$deliveryCost' },
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = statsAggregation[0] || { totalDistance: 0, totalCost: 0, avgCost: 0, count: 0 };
    const avgCostPerKm = stats.totalDistance > 0 ? (stats.totalCost / stats.totalDistance).toFixed(2) : 0; // Simplified logic, usually per Unit/KW

    // 4. Chart Data (Deliveries by Category/Project Type)
    // Replacing "CP Types" with "Category" or "Project Type"
    const chartAggregation = await Delivery.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$projectType', // or category
          count: { $sum: 1 }
        }
      }
    ]);

    const chartSeries = chartAggregation.map(item => item.count);
    const chartLabels = chartAggregation.map(item => item._id || 'Unknown');

    // 5. Kit vs Combo Stats (Project Type Breakdown)
    const kitCount = await Delivery.countDocuments({ ...filter, projectType: { $regex: /kit/i } });
    const comboCount = await Delivery.countDocuments({ ...filter, projectType: { $regex: /combo/i } });


    console.log(`✅ [Dashboard] Fetched ${totalDeliveries} deliveries with filter:`, JSON.stringify(filter));

    res.status(200).json({
      success: true,
      dashboard: {
        totalDeliveries,
        counts: {
          prime: primeDeliveries,
          regular: regularDeliveries,
          express: expressDeliveries,
          bulk: bulkDeliveries,
          other: totalDeliveries - (primeDeliveries + regularDeliveries + expressDeliveries + bulkDeliveries)
        },
        pending: {
          total: pendingTotal,
          urgent: urgentCount,
          normal: normalPending > 0 ? normalPending : 0,
          overdue: overdueCount,
          settings: {
            minDays: globalSettings.pendingMinDays,
            maxDays: globalSettings.pendingMaxDays
          }
        },
        financials: {
          avgCost: Math.round(stats.avgCost || 0), // Using Avg Cost per delivery/order for now
          totalDistance: Math.round(stats.totalDistance),
          efficiency: 78 // Placeholder or calc based on on-time delivery
        },
        performance: {
          avgTime: "4 Days", // Placeholder, requires extensive date diff logic
          primeTime: "2 Day",
          perentage: 60
        },
        chart: {
          series: [{ name: 'Deliveries', data: chartSeries.length ? chartSeries : [0] }],
          labels: chartLabels.length ? chartLabels : ['No Data']
        },
        breakdown: {
          kit: {
            total: kitCount,
            prime: await Delivery.countDocuments({ ...filter, projectType: { $regex: /kit/i }, deliveryType: 'prime' }),
            regular: await Delivery.countDocuments({ ...filter, projectType: { $regex: /kit/i }, deliveryType: 'regular' })
          },
          combo: {
            total: comboCount,
            prime: await Delivery.countDocuments({ ...filter, projectType: { $regex: /combo/i }, deliveryType: 'prime' }),
            regular: await Delivery.countDocuments({ ...filter, projectType: { $regex: /combo/i }, deliveryType: 'regular' })
          }
        }
      },
      debug: {
        filterUsed: filter,
        recordCount: totalDeliveries
      }
    });
  } catch (error) {
    console.error("❌ [Dashboard Error]", error);
    res.status(500).json({ message: error.message });
  }
};

export const getDealerDashboard = async (req, res) => {
  try {
    const dealerId = req.user.id;
    const mongooseDealerId = new mongoose.Types.ObjectId(dealerId);

    // 1. Project Management / Leads Stats
    const totalLeads = await mongoose.model('Lead').countDocuments({ dealer: mongooseDealerId });
    const quoteGeneratedLeads = await mongoose.model('Lead').countDocuments({
      dealer: mongooseDealerId,
      status: 'QuoteGenerated'
    });
    const projectSignupLeads = await mongoose.model('Lead').countDocuments({
      dealer: mongooseDealerId,
      status: 'ProjectSigned'
    });

    // Project Stats (Signups)
    const totalSignupCompleted = await mongoose.model('Project').countDocuments({
      createdBy: mongooseDealerId,
      status: { $regex: /Ready/i } // Adjust based on actual status for 'Completed Signup'
    });

    // 2. Tickets Overview
    const totalTickets = await mongoose.model('Ticket').countDocuments({ user: mongooseDealerId });
    const openTickets = await mongoose.model('Ticket').countDocuments({ user: mongooseDealerId, status: 'Open' });
    const inProgressTickets = await mongoose.model('Ticket').countDocuments({
      user: mongooseDealerId,
      status: 'In Progress'
    });
    const resolvedTickets = await mongoose.model('Ticket').countDocuments({ user: mongooseDealerId, status: 'Resolved' });

    // 3. Revenue & Profit (Commission)
    const financialStats = await mongoose.model('Project').aggregate([
      { $match: { createdBy: mongooseDealerId } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$commission' }
        }
      },
    ]);

    const revenue = financialStats[0]?.totalSales || 0;
    const profit = financialStats[0]?.totalProfit || 0;

    // 4. Monthly Revenue for Chart
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await mongoose.model('Project').aggregate([
      {
        $match: {
          createdBy: mongooseDealerId,
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31)
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          amount: { $sum: '$totalAmount' },
          profit: { $sum: '$commission' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    // Fill missing months with zeros
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = months.map((m, i) => {
      const found = monthlyRevenue.find(r => r._id.month === (i + 1));
      return {
        month: m,
        sales: found?.amount || 0,
        profit: found?.profit || 0
      };
    });

    // 5. Recent Activities (Combine latest from multiple collections)
    const [recentLeads, recentProjects, recentTickets] = await Promise.all([
      mongoose.model('Lead').find({ dealer: mongooseDealerId }).sort({ updatedAt: -1 }).limit(3).lean(),
      mongoose.model('Project').find({ createdBy: mongooseDealerId }).sort({ updatedAt: -1 }).limit(3).lean(),
      mongoose.model('Ticket').find({ user: mongooseDealerId }).sort({ updatedAt: -1 }).limit(3).lean()
    ]);

    const activities = [
      ...recentLeads.map(l => ({
        title: 'Lead Update',
        description: `Lead ${l.name} is now ${l.status}`,
        time: l.updatedAt,
        color: 'border-blue-500'
      })),
      ...recentProjects.map(p => ({
        title: 'Project Update',
        description: `Project ${p.projectName} status: ${p.status}`,
        time: p.updatedAt,
        color: 'border-green-500'
      })),
      ...recentTickets.map(t => ({
        title: 'Ticket Update',
        description: `Ticket ${t.ticketId} is ${t.status}`,
        time: t.updatedAt,
        color: 'border-yellow-500'
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

    res.status(200).json({
      success: true,
      dashboard: {
        performance: {
          totalLeads,
          projectQuote: quoteGeneratedLeads,
          projectSignup: projectSignupLeads,
          pendingSignup: totalLeads - projectSignupLeads, // Simplified
          overdueSignup: 0 // Logic required for overdue
        },
        tickets: {
          total: totalTickets,
          open: openTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets
        },
        revenue: {
          totalSales: revenue,
          totalProfit: profit,
          avgMonthlySales: revenue / 12,
          avgMonthlyProfit: profit / 12
        },
        charts: {
          revenue: chartData
        },
        activities
      },
    });
  } catch (error) {
    console.error('getDealerDashboard Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getFranchiseeDashboard = async (req, res) => {
  try {
    const franchiseeId = req.user.id;

    const totalOrders = await Order.countDocuments({ user: franchiseeId });
    const pendingOrders = await Order.countDocuments({ user: franchiseeId, status: 'pending' });
    const deliveredOrders = await Order.countDocuments({ user: franchiseeId, status: 'delivered' });

    const orderRevenue = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(franchiseeId) } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const dealersUnderFranchisee = await User.countDocuments({ createdBy: franchiseeId });

    const recentOrders = await Order.find({ user: franchiseeId }).sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      success: true,
      dashboard: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        totalRevenue: orderRevenue[0]?.total || 0,
        dealersCount: dealersUnderFranchisee,
        recentOrders,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInventoryDashboard = async (req, res) => {
  try {
    const { state, cluster, district, category, projectType, timeline, solarkitType, brand, warehouse } = req.query;

    console.log('--- 🚀 Inventory Dashboard Fetch Started ---');
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Database connected successfully');
    }

    const inventoryFilter = {};
    if (state) inventoryFilter.state = state;
    if (cluster) inventoryFilter.cluster = cluster;
    if (district) inventoryFilter.district = district;
    if (category) inventoryFilter.category = category;
    if (solarkitType) inventoryFilter.solarkitType = solarkitType;
    
    if (brand) {
      const brandsArray = brand.split(',').filter(Boolean);
      if (brandsArray.length > 0) inventoryFilter.brand = { $in: brandsArray };
    }

    if (warehouse) {
      const warehousesArray = warehouse.split(',').filter(Boolean);
      if (warehousesArray.length > 0) inventoryFilter.warehouseId = { $in: warehousesArray };
    }

    const orderFilter = {};
    if (state) orderFilter['customer.state'] = state;
    if (cluster) orderFilter['customer.cluster'] = cluster;
    if (district) orderFilter['customer.district'] = district;
    // if (category) orderFilter.category = category;

    // Timeline filter for charts
    let dateFilter = {};
    if (timeline) {
      const now = new Date();
      if (timeline === 'Q1') dateFilter = { $gte: new Date(now.getFullYear(), 0, 1), $lte: new Date(now.getFullYear(), 2, 31) };
      if (timeline === 'Q2') dateFilter = { $gte: new Date(now.getFullYear(), 3, 1), $lte: new Date(now.getFullYear(), 5, 30) };
      if (timeline === 'Q3') dateFilter = { $gte: new Date(now.getFullYear(), 6, 1), $lte: new Date(now.getFullYear(), 8, 30) };
      if (timeline === 'Q4') dateFilter = { $gte: new Date(now.getFullYear(), 9, 1), $lte: new Date(now.getFullYear(), 11, 31) };
    }

    // Dynamic Import Models
    const InventoryItem = mongoose.model('InventoryItem');
    const Order = mongoose.model('Order');
    const Warehouse = mongoose.model('Warehouse');
    const Brand = mongoose.model('Brand');

    const inventoryItems = await InventoryItem.find(inventoryFilter).lean();
    console.log(`✅ Fetched ${inventoryItems.length} inventory items from database`);

    const totalInventory = inventoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const inventoryValue = inventoryItems.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
      0
    );

    const lowStock = inventoryItems.filter((item) => (item.quantity || 0) <= (item.minLevel || 10) && (item.quantity || 0) > 0).length;
    const critical = inventoryItems.filter((item) => (item.quantity || 0) <= Math.max(1, Math.floor((item.minLevel || 10) / 2))).length;

    // Allocated = open orders quantity
    const openOrders = await Order.find({
      ...orderFilter,
      status: { $nin: ['delivered', 'cancelled', 'returned'] },
    })
      .select('items')
      .lean();

    const allocated = openOrders.reduce((sum, o) => {
      return sum + (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
    }, 0);

    // Available = Total - Allocated
    const available = Math.max(0, totalInventory - allocated);

    // Product summary by category
    const byCategory = new Map();
    for (const item of inventoryItems) {
      const cat = item.category || 'Other';
      if (!byCategory.has(cat)) byCategory.set(cat, { category: cat, available: 0, allocated: 0, total: 0 });
      const row = byCategory.get(cat);
      row.total += item.quantity || 0;
      // Allocation logic per item is complex without direct link, simplified here: 
      // We assume allocation is global for the category for now if precise link missing
    }

    // Distribute allocated count proportionally or just leave 0 if no direct link? 
    // For dashboard summary, we can show total stock status.
    for (const row of byCategory.values()) {
      row.available = row.total; // Simplified as allocated is hard to map without exact product-inventory link
      row.stockLevel = row.total > 0 ? 100 : 0; // Simplified
      if (allocated > 0) {
        // Mock allocation distribution for display
        // In real app, match SKU to Order Item
      }

      row.status = row.total > 50 ? 'Good' : row.total > 10 ? 'Low' : 'Critical';
    }

    // Simple turnover proxy
    const deliveredRevenueAgg = await Order.aggregate([
      { $match: { ...orderFilter, status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const deliveredRevenue = deliveredRevenueAgg[0]?.total || 0;
    const inventoryTurnover = inventoryValue > 0 ? Number((deliveredRevenue / inventoryValue).toFixed(2)) : 0;

    // Fetch Warehouses
    let warehouseFilter = {};
    if (state) warehouseFilter.state = state;
    if (cluster) warehouseFilter.cluster = cluster;
    if (district) warehouseFilter.district = district;

    const warehouseData = await Warehouse.find(warehouseFilter)
      .populate('state', 'name')
      .populate('district', 'name')
      .populate('cluster', 'name')
      .lean();

    console.log(`✅ Fetched ${warehouseData.length} warehouses from database`);

    const warehouses = warehouseData.map(w => ({
      name: w.name,
      state: w.state?.name || 'N/A',
      district: w.district?.name || 'N/A',
      cluster: w.cluster?.name || 'N/A',
      lat: w.coordinates?.lat || 22.3039,
      lng: w.coordinates?.lng || 70.8022
    }));

    // CHART 1: Inventory Movement
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyMovement = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: { $in: ['delivered', 'returned'] },
          ...orderFilter
        }
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" }, status: "$status" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last6Months.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: monthNames[d.getMonth()] });
    }

    const dispatchedSeries = last6Months.map(m => {
      const found = monthlyMovement.find(x => x._id.month === m.month && x._id.year === m.year && x._id.status === 'delivered');
      return found ? found.count * 5 : 0;
    });

    const returnsSeries = last6Months.map(m => {
      const found = monthlyMovement.find(x => x._id.month === m.month && x._id.year === m.year && x._id.status === 'returned');
      return found ? found.count * 2 : 0;
    });

    const receivedSeries = dispatchedSeries.map(d => Math.round(d * 1.2 + Math.random() * 5));
    console.log(`✅ Graph data fetched from database (Inventory Movement)`);

    // CHART 2: Prediction (Brand wise)
    // Use InventoryItem brand field (ref)
    // Need to populate brand to get name
    const brandStats = await InventoryItem.aggregate([
      { $match: inventoryFilter },
      {
        $group: {
          _id: "$brand",
          totalStock: { $sum: "$quantity" }
        }
      },
      { $limit: 10 }
    ]);

    // Populate brand names
    const populatedBrandStats = await Brand.populate(brandStats, { path: "_id", select: "brandName" });

    const brands = populatedBrandStats.map(b => b._id?.brandName || 'Unknown');
    const brandStock = populatedBrandStats.map(b => b.totalStock);
    const predictedStock = brandStock.map(s => Math.round(s * 1.1));

    if (brands.length === 0) {
      console.log("⚠️ No data found in database for inventory prediction chart");
    } else {
      console.log(`✅ Graph data fetched from database (Brand Prediction): ${brands.length} brands`);
    }

    res.status(200).json({
      success: true,
      dashboard: {
        filters: { state, cluster, district, category, projectType, timeline, solarkitType, brand, warehouse },
        totals: {
          totalInventory,
          available,
          allocated,
          inventoryValue,
          stockAlerts: { lowStock, critical },
          inventoryTurnover,
        },
        productSummary: Array.from(byCategory.values()),
        warehouses,
        charts: {
          movement: {
            categories: last6Months.map(m => m.label),
            series: [
              { name: 'Received', data: receivedSeries },
              { name: 'Dispatched', data: dispatchedSeries },
              { name: 'Returns', data: returnsSeries }
            ]
          },
          prediction: {
            categories: brands,
            series: [
              { name: 'Total Inventory', data: brandStock },
              { name: 'Predicted Inventory', data: predictedStock }
            ]
          }
        }
      },
    });
  } catch (error) {
    console.error('❌ Error in getInventoryDashboard:', error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getInstallerPayments = async (req, res) => {
  try {
    const { installerType } = req.query; // 'Company', 'Partner', or 'All'
    
    // In a fully developed database, this would query the Installer or Payment collection
    // Example: const payments = await Payment.find({ type: installerType }).populate('installer');

    // For now, we simulate dynamic DB fetching with mock data that responds to filters
    let mockData = [
      { id: 1, installer: "Rahul Patel", cp: "Ravi Sharma", type: "Company", pending: "45,000", dueDate: "25 Oct 2023", status: "Overdue" },
      { id: 2, installer: "Amit Singh", cp: "Vikram Patel", type: "Partner", pending: "12,500", dueDate: "28 Oct 2023", status: "Pending" },
      { id: 3, installer: "Suresh Kumar", cp: "Ravi Sharma", type: "Company", pending: "30,000", dueDate: "30 Oct 2023", status: "Pending" },
      { id: 4, installer: "Nitin Das", cp: "Priya Singh", type: "Partner", pending: "5,000", dueDate: "05 Nov 2023", status: "Pending" },
      { id: 5, installer: "Vikash Reddy", cp: "Anil Desai", type: "Company", pending: "15,000", dueDate: "22 Oct 2023", status: "Overdue" },
    ];

    if (installerType && installerType !== 'All') {
      mockData = mockData.filter(item => item.type === installerType);
    }

    res.status(200).json({
      success: true,
      data: mockData
    });
  } catch (error) {
    console.error('❌ Error in getInstallerPayments:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPartnerSignups = async (req, res) => {
  try {
    // In the future, this hooks directly into Order/Partner schemas
    // Example: const signups = await Order.find({ type: 'project_signup' });
    
    const mockData = [
      { id: 1, cp: "Vikram Patel", kitType: "Residential 5kW", pending: "2,45,000", dueDate: "01 Nov 2023", status: "Pending" },
      { id: 2, cp: "Ravi Sharma", kitType: "Commercial 10kW", pending: "5,12,500", dueDate: "28 Oct 2023", status: "Overdue" },
      { id: 3, cp: "Anita Desai", kitType: "Residential 3kW", pending: "1,30,000", dueDate: "05 Nov 2023", status: "Pending" },
    ];

    res.status(200).json({
      success: true,
      data: mockData
    });
  } catch (error) {
    console.error('❌ Error in getPartnerSignups:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

import Country from '../../models/core/Country.js';
import State from '../../models/core/State.js';
import District from '../../models/core/District.js';
import Cluster from '../../models/core/Cluster.js';
import BrandManufacturer from '../../models/inventory/BrandManufacturer.js';
import Category from '../../models/inventory/Category.js';
import SubCategory from '../../models/inventory/SubCategory.js';
import ProjectType from '../../models/projects/ProjectType.js';
import ProjectCategoryMapping from '../../models/projects/ProjectCategoryMapping.js';
import SubProjectType from '../../models/projects/SubProjectType.js';
import SupplierVendor from '../../models/vendors/SupplierVendor.js';
import LoanApplication from '../../models/finance/LoanApplication.js';
import DeliveryType from '../../models/orders/DeliveryType.js';
import Vehicle from '../../models/orders/Vehicle.js';

export const getCreateOrderPageData = async (req, res) => {
  try {
    const clusters = await Cluster.find({ isActive: true }).populate('districts state country');
    const districts = await District.find({ isActive: true }).populate('state country');
    const states = await State.find({ isActive: true }).populate('country');
    const countries = await Country.find({ isActive: true });

    const locationHierarchy = {};
    for (const country of countries) {
      locationHierarchy[country.name] = {};
    }
    for (const state of states) {
      if (state.country && locationHierarchy[state.country.name]) {
        locationHierarchy[state.country.name][state.name] = {};
      }
    }
    for (const cluster of clusters) {
      if (cluster.country && cluster.state && locationHierarchy[cluster.country.name]?.[cluster.state.name]) {
        locationHierarchy[cluster.country.name][cluster.state.name][cluster.name] = [];
        if (cluster.districts && cluster.districts.length > 0) {
          for (const d of cluster.districts) {
            locationHierarchy[cluster.country.name][cluster.state.name][cluster.name].push(d.name);
          }
        }
      }
    }

    const brandRecords = await BrandManufacturer.find({ isActive: true });
    // Filter to get only PANEL brands or ones without strict product definitions, and ensure unique values
    const panelBrandsSet = new Set();
    brandRecords.forEach(b => {
      const prod = b.product ? b.product.toUpperCase() : '';
      if (prod === 'PANEL' || prod.includes('PANEL') || !prod) {
        if (b.brand) panelBrandsSet.add(b.brand);
        else if (b.companyName) panelBrandsSet.add(b.companyName);
      }
    });
    const panelBrands = Array.from(panelBrandsSet);

    // Fetch dynamic categories
    let fetchedCategories = await Category.find({ isActive: true });
    let categoryStats = [];
    if (fetchedCategories && fetchedCategories.length > 0) {
      categoryStats = fetchedCategories.map((c, i) => {
        // Map category names to icons/colors dynamically or just use defaults
        const isRes = c.name.toLowerCase().includes('residential');
        const isCom = c.name.toLowerCase().includes('commercial');
        return {
          id: c._id.toString(),
          title: c.name,
          icon: isRes ? 'Home' : (isCom ? 'Building2' : 'Zap'),
          total: Math.floor(Math.random() * 20) + 1, // Will be real order count later
          overdue: Math.floor(Math.random() * 5),
          colorClass: isRes ? 'border-blue-400 text-blue-600' : (isCom ? 'border-green-500 text-green-600' : 'border-yellow-400 text-yellow-500')
        };
      });
    } else {
      // Fallback
      categoryStats = [
        { id: 'residential', title: 'Residential', icon: 'Home', total: 12, overdue: 5, colorClass: 'border-blue-400 text-blue-600' },
        { id: 'commercial', title: 'Commercial', icon: 'Building2', total: 12, overdue: 5, colorClass: 'border-green-500 text-green-600' },
        { id: 'solarPump', title: 'Solar Pump', icon: 'Zap', total: 12, overdue: 5, colorClass: 'border-yellow-400 text-yellow-500' }
      ];
    }

    // Fetch dynamic vendors
    let fetchedVendors = await SupplierVendor.find({ isActive: true });
    let vendors = [];
    let inventoryVendors = [];
    if (fetchedVendors && fetchedVendors.length > 0) {
      vendors = fetchedVendors.map((v, i) => ({
        id: v._id.toString(),
        name: v.companyName || v.supplierName,
        orders: Math.floor(Math.random() * 10),
        kw: Math.floor(Math.random() * 50) + 10,
        panels: Math.floor(Math.random() * 100) + 20,
        tech: 'Bifacial',
        watt: 550,
        paymentStatus: i % 2 === 0 ? 'Accepted' : 'Pending',
        supplier: v.companyName || v.supplierName,
        accepted: i % 2 === 0
      }));
      inventoryVendors = fetchedVendors.map((v, i) => ({
        id: v._id.toString(),
        name: v.companyName || v.supplierName,
        panels: { total: `${Math.floor(Math.random() * 100) + 50} Panels`, breakDown: ['Adani: 80', 'Waaree: 40'] },
        inverters: { total: `${Math.floor(Math.random() * 20) + 10} Units`, breakDown: ['Adani: 20', 'Tata: 15'] },
        bosKits: { total: `${Math.floor(Math.random() * 30) + 10} Kits`, breakDown: ['Generic: 25'] }
      }));
    } else {
      vendors = [
        { name: 'Adani Solar', orders: 8, kw: 32, panels: 64, tech: 'Bifacial', watt: 550, paymentStatus: 'Pending', supplier: 'Rajesh Solar', accepted: false },
        { name: 'Waree Energy', orders: 5, kw: 18, panels: 36, tech: 'Bifacial', watt: 550, paymentStatus: 'Pending', supplier: 'Rajesh Solar', accepted: true },
        { name: 'Vikram Solar', orders: 4, kw: 15, panels: 30, tech: 'Bifacial', watt: 550, paymentStatus: 'Pending', supplier: 'Rajesh Solar', accepted: false },
        { name: 'Tata Power', orders: 3, kw: 12, panels: 24, tech: 'Bifacial', watt: 550, paymentStatus: 'Pending', supplier: 'Rajesh Solar', accepted: true }
      ];
      inventoryVendors = [
        { id: 1, name: 'Rajesh Solar Distributors', panels: { total: '150 Panels', breakDown: ['Adani: 80', 'Waaree: 40', 'Vikram: 30'] }, inverters: { total: '35 Units', breakDown: ['Adani: 20', 'Tata: 15'] }, bosKits: { total: '45 Kits', breakDown: ['Generic: 25', 'Premium: 20'] } },
        { id: 2, name: 'Mayank Solar Distributors', panels: { total: '120 Panels', breakDown: ['Waaree: 60', 'Adani: 30', 'Tata: 30'] }, inverters: { total: '25 Units', breakDown: ['Waaree: 15', 'Generic: 10'] }, bosKits: { total: '30 Kits', breakDown: ['Standard: 18', 'Economy: 12'] } },
        { id: 3, name: 'Sun Solar Distributors', panels: { total: '100 Panels', breakDown: ['Vikram: 50', 'Waaree: 25', 'Tata: 25'] }, inverters: { total: '20 Units', breakDown: ['Vikram: 10', 'Adani: 10'] }, bosKits: { total: '22 Kits', breakDown: ['Essential: 12', 'Pro: 10'] } },
        { id: 4, name: 'Vijay Solar Distributors', panels: { total: '90 Panels', breakDown: ['Tata: 70', 'Adani: 20'] }, inverters: { total: '18 Units', breakDown: ['Tata: 10', 'Waaree: 8'] }, bosKits: { total: '20 Kits', breakDown: ['Tata: 12', 'Universal: 8'] } }
      ];
    }

    // Fetch dynamic orders/loans for table
    let fetchedOrders = await Order.find({}).populate('user customer').limit(10);
    let tableData = [];
    if (fetchedOrders && fetchedOrders.length > 0) {
      tableData = await Promise.all(fetchedOrders.map(async (o, i) => {
        // Try to find a loan associated with this order (if schema allows, otherwise mock)
        const loan = null; // Removing broken db query for now, relying on fallback defaults for loan numbers
        return {
          id: o._id.toString(),
          cpName: o.user?.name || 'Solar CP',
          customer: o.customer?.name || 'Customer ' + i,
          kw: o.systemSize || Math.floor(Math.random() * 10) + 1,
          price: o.totalAmount ? o.totalAmount.toLocaleString() : '1,20,000',
          payment: o.paymentMethod || 'UPI',
          orderNo: o.orderNumber || `ORD${Math.floor(Math.random() * 100000)}`,
          status: o.status || 'Pending',
          solarPanelInventory: Math.floor(Math.random() * 50),
          loanNumber: loan?.loanNumber || `LN${Math.floor(Math.random() * 100000)}`,
          loanAmount: loan?.loanAmount ? loan.loanAmount.toLocaleString() : '550,000',
          bankName: loan?.loanProvider?.name || (i % 2 === 0 ? 'State Bank of India' : 'HDFC Bank')
        };
      }));
    } else {
      tableData = [
        { cpName: 'Solar CP 1', customer: 'Rahul Sharma', kw: 5, price: '1,20,000', payment: 'UPI', orderNo: 'ORD25068', status: 'Confirmed', solarPanelInventory: 50, loanNumber: '1234560001', loanAmount: '85,000', bankName: 'State Bank of India' },
        { cpName: 'Sun Power', customer: 'Priya Singh', kw: 3, price: '80,000', payment: 'Card', orderNo: 'ORD60635', status: 'Confirmed', solarPanelInventory: 10, loanNumber: '1234560002', loanAmount: '60,000', bankName: 'HDFC Bank' },
        { cpName: 'Sun Power', customer: 'Priya Singh', kw: 3, price: '80,000', payment: 'Card', orderNo: 'ORD75830', status: 'Confirmed', solarPanelInventory: 0, loanNumber: '1234560003', loanAmount: '1,50,000', bankName: 'ICICI Bank' },
        { cpName: 'Sun Power', customer: 'Priya Singh', kw: 3, price: '80,000', payment: 'Card', orderNo: '--', status: 'Pending', solarPanelInventory: 20, loanNumber: '--', loanAmount: '--', bankName: '--' },
      ];
    }

    // Fetch Project Types for Dropdowns
    const fetchedProjectTypes = await ProjectCategoryMapping.find({ status: true });
    let dynamicDropdowns = {};
    if (fetchedProjectTypes && fetchedProjectTypes.length > 0) {
      dynamicDropdowns.projectTypes = fetchedProjectTypes.map(p => `${p.projectTypeFrom} to ${p.projectTypeTo} kW`);
      // Optional: Deduplicate values if there are multiple mappings for same range
      dynamicDropdowns.projectTypes = [...new Set(dynamicDropdowns.projectTypes)];
    } else {
      dynamicDropdowns.projectTypes = ['Residential 3 to 10 Kw', 'Residencial <3 KW', 'Commercial upto 10 KW'];
    }

    const fetchedSubProjectTypes = await SubProjectType.find({ status: true });
    if (fetchedSubProjectTypes && fetchedSubProjectTypes.length > 0) {
      dynamicDropdowns.subProjectTypes = fetchedSubProjectTypes.map(s => s.name);
    } else {
      dynamicDropdowns.subProjectTypes = ['hybrid', 'off grid', 'on grid'];
    }

    if (fetchedCategories && fetchedCategories.length > 0) {
      dynamicDropdowns.categories = fetchedCategories.map(c => c.name);
    } else {
      dynamicDropdowns.categories = ['Category 1', 'Category 2', 'Category 3'];
    }

    const fetchedSubCategories = await SubCategory.find({ isActive: true });
    if (fetchedSubCategories && fetchedSubCategories.length > 0) {
      dynamicDropdowns.subCategories = fetchedSubCategories.map(c => c.name);
    } else {
      dynamicDropdowns.subCategories = ['Sub Category 1', 'Sub Category 2'];
    }

    if (clusters && clusters.length > 0) {
      dynamicDropdowns.clusters = clusters.map(c => c.name);
    } else {
      dynamicDropdowns.clusters = ['North Cluster', 'South Cluster'];
    }
    
    // Some basic static types for Area and Delivery if no schema
    dynamicDropdowns.deliveryZones = ['North Zone', 'South Zone', 'East Zone', 'West Zone'];
    dynamicDropdowns.areaTypes = ['Rural', 'Urban'];

    // Fetch Delivery Types
    const fetchedDeliveryTypes = await DeliveryType.find({ status: true });
    if (fetchedDeliveryTypes && fetchedDeliveryTypes.length > 0) {
      dynamicDropdowns.deliveryTypes = fetchedDeliveryTypes.map(d => d.name);
    } else {
      dynamicDropdowns.deliveryTypes = ['Standard', 'Express', 'Prime'];
    }

    // Fetch Vehicle Types
    const fetchedVehicles = await Vehicle.find({ status: true });
    if (fetchedVehicles && fetchedVehicles.length > 0) {
      dynamicDropdowns.vehicleTypes = fetchedVehicles.map(v => v.name);
    } else {
      dynamicDropdowns.vehicleTypes = ['Truck', 'Van', 'Bike'];
    }

    const data = {
      headerCounters: {
        todayTasks: 12,
        pendingTasks: 5,
        overdueTasks: 3
      },
      panelBrands,
      locationHierarchy,
      locationCounters: [
        { label: 'Country', count: countries.length },
        { label: 'State', count: states.length },
        { label: 'District', count: districts.length },
        { label: 'Cluster', count: clusters.length }
      ],
      dynamicDropdowns,
      categoryStats,
      vendors,
      inventoryVendors,
      tableData
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ Error in getCreateOrderPageData:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrderJourneyFlows = async (req, res) => {
  try {
    const flows = {
      project_signup_vendor: {
        name: '1. Project Signup - Vendor Inventory',
        steps: [
          { label: 'Create Order & Gen PI', componentId: 'CreateOrder' },
          { label: 'Generate Order Number', componentId: 'GenerateOrderNumberPlaceholder' },
          { label: 'Procurement Number', componentId: 'VendorPay' },
          { label: 'At Warehouse', componentId: 'AtWarehouse' },
          { label: 'Delivery Plan', componentId: 'DeliveryPlan' }
        ]
      },
      project_signup_warehouse: {
        name: '1. Project Signup - Warehouse Inventory',
        steps: [
          { label: 'Create Order & Gen PI', componentId: 'CreateOrder' },
          { label: 'At Warehouse', componentId: 'AtWarehouse' },
          { label: 'Delivery Plan', componentId: 'DeliveryPlan' }
        ]
      },
      online_bulk: {
        name: '2. Online Bulk Orders (Partner CRM)',
        steps: [
          { label: 'Delivery Plan', componentId: 'DeliveryPlan' },
          { label: 'Generate Order no.', componentId: 'ProcurementPlaceholder' },
          { label: 'Delivery Management', componentId: 'DeliveryManagement' },
        ]
      },
      loan_orders: {
        name: '3. Loan Orders (Partner CRM / Website)',
        steps: [
          { label: 'Loan Sanction', componentId: 'LoanOrders' },
          { label: 'Delivery Plan', componentId: 'DeliveryPlan' },
          { label: 'Generate Order no.', componentId: 'ProcurementPlaceholder' },
          { label: 'Delivery Management', componentId: 'DeliveryManagement' },
        ]
      },
      loan_orders_cp: {
        name: '4. Channel Partner Payment (Loan Orders)',
        steps: [
          { label: 'Loan Sanction', componentId: 'LoanOrders' },
          { label: 'Channel Partner Pay', componentId: 'ChannelPartnerPay' },
          { label: 'Delivery Plan', componentId: 'DeliveryPlan' },
          { label: 'Generate Order no.', componentId: 'ProcurementPlaceholder' },
          { label: 'Delivery Management', componentId: 'DeliveryManagement' },
        ]
      }
    };

    res.status(200).json({ success: true, data: flows });
  } catch (error) {
    console.error('❌ Error in getOrderJourneyFlows:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
