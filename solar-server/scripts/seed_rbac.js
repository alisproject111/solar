import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Panel from '../models/users/Panel.js';
import Module from '../models/hr/Module.js';
import PanelPermission from '../models/users/PanelPermission.js';
import UserPanel from '../models/users/UserPanel.js';
import User from '../models/users/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const defaultPanels = [
  { name: 'Admin Panel', key: 'admin', description: 'Full access to everything in Solarkits ERP' },
  { name: 'Partner Manager Panel', key: 'partner_manager', description: 'Can manage partners, commissions, and reports' },
  { name: 'Partners Panel', key: 'partners', description: 'Limited access for external partners to view leads and earnings' },
  { name: 'Accounts Panel', key: 'accounts', description: 'Finance-related operations and reports' },
  { name: 'Delivery Panel', key: 'delivery', description: 'Operations & installation team updates' },
];

// Parents (Category Panels)
const parentModules = [
  { name: 'Partner Manager Panel', key: 'parent_partner_manager', route: '/partner-manager', icon: 'Users', description: 'Main module for Partner Manager controls' },
  { name: 'Partners Panel', key: 'parent_partners', route: '/partners', icon: 'Users', description: 'Main module for External Partners dashboard' },
  { name: 'Accounts Panel', key: 'parent_accounts', route: '/accounts', icon: 'FileText', description: 'Main module for Accounts & Billing controls' },
  { name: 'Delivery Panel', key: 'parent_delivery', route: '/delivery', icon: 'Layers', description: 'Main module for Delivery & Installation team' }
];

// Submodules strictly mapped to their respective Parents
const subModulesList = [
  // Submodules under 'Partner Manager Panel'
  { parentKey: 'parent_partner_manager', name: 'Add Partner', key: 'pm_add_partner', route: '/partner-manager/add-partner', icon: 'Users', description: 'Add new partner users' },
  { parentKey: 'parent_partner_manager', name: 'Approve Partner', key: 'pm_approve_partner', route: '/partner-manager/approve-partner', icon: 'Shield', description: 'Approve registered partners' },
  { parentKey: 'parent_partner_manager', name: 'Assign Leads', key: 'pm_assign_leads', route: '/partner-manager/assign-leads', icon: 'Layers', description: 'Assign sales leads to partners' },
  { parentKey: 'parent_partner_manager', name: 'Commission Tracking', key: 'pm_commission_tracking', route: '/partner-manager/commission', icon: 'Activity', description: 'Track commission structures' },
  { parentKey: 'parent_partner_manager', name: 'Performance Reports', key: 'pm_performance_reports', route: '/partner-manager/performance-reports', icon: 'FileText', description: 'View partner performance charts' },

  // Submodules under 'Partners Panel'
  { parentKey: 'parent_partners', name: 'View Own Leads', key: 'partner_own_leads', route: '/partners/own-leads', icon: 'Users', description: 'View and track assigned leads' },
  { parentKey: 'parent_partners', name: 'Upload Documents', key: 'partner_upload_docs', route: '/partners/upload-documents', icon: 'FileText', description: 'Upload project agreement documents' },
  { parentKey: 'parent_partners', name: 'Customer Status', key: 'partner_customer_status', route: '/partners/customer-status', icon: 'Activity', description: 'Check project onboarding status' },
  { parentKey: 'parent_partners', name: 'Earnings', key: 'partner_earnings', route: '/partners/earnings', icon: 'Activity', description: 'Track total commissions earned' },
  { parentKey: 'parent_partners', name: 'Support Tickets', key: 'partner_support_tickets', route: '/partners/support-tickets', icon: 'Shield', description: 'Open and manage service tickets' },

  // Submodules under 'Accounts Panel'
  { parentKey: 'parent_accounts', name: 'Invoice', key: 'accounts_invoice', route: '/accounts/invoice', icon: 'FileText', description: 'Billing invoices operations' },
  { parentKey: 'parent_accounts', name: 'Payments', key: 'accounts_payments', route: '/accounts/payments', icon: 'Activity', description: 'Track customer payments' },
  { parentKey: 'parent_accounts', name: 'GST', key: 'accounts_gst', route: '/accounts/gst', icon: 'Layers', description: 'Financial tax and GST configuration' },
  { parentKey: 'parent_accounts', name: 'Expenses', key: 'accounts_expenses', route: '/accounts/expenses', icon: 'Activity', description: 'Corporate and project expense sheets' },
  { parentKey: 'parent_accounts', name: 'Payouts', key: 'accounts_payouts', route: '/accounts/payouts', icon: 'Activity', description: 'Manage driver and partner payouts' },
  { parentKey: 'parent_accounts', name: 'Accounts Reports', key: 'accounts_reports', route: '/accounts/reports', icon: 'Shield', description: 'Finance P&L and cashflow reports' },

  // Submodules under 'Delivery Panel'
  { parentKey: 'parent_delivery', name: 'Order Tracking', key: 'delivery_order_tracking', route: '/delivery/order-tracking', icon: 'Layers', description: 'Logistics shipment updates' },
  { parentKey: 'parent_delivery', name: 'Dispatch', key: 'delivery_dispatch', route: '/delivery/dispatch', icon: 'Layers', description: 'Vehicle loading and dispatch reports' },
  { parentKey: 'parent_delivery', name: 'Installation Status', key: 'delivery_installation_status', route: '/delivery/installation-status', icon: 'Settings', description: 'Site panels installation checkpoints' },
  { parentKey: 'parent_delivery', name: 'Delivery Updates', key: 'delivery_updates', route: '/delivery/updates', icon: 'Activity', description: 'Operational order progress updates' },
  { parentKey: 'parent_delivery', name: 'Site Photos', key: 'delivery_site_photos', route: '/delivery/site-photos', icon: 'FileText', description: 'Upload site completion photographs' },
  { parentKey: 'parent_delivery', name: 'Service Tickets', key: 'delivery_service_tickets', route: '/delivery/service-tickets', icon: 'Shield', description: 'Installation issues service tickets' },
];

async function seed() {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGODB_URI environment variable is missing.');
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');

    // Cleanup: Delete any previously seeded panel, permission matrix, and user panel entries
    console.log('🧹 Purging previous seeds for a clean slate...');
    await Panel.deleteMany({});
    await PanelPermission.deleteMany({});
    await UserPanel.deleteMany({});
    
    // Clean delete all modules we created based on parent keys and submodule keys
    const allKeysToDelete = [
      ...parentModules.map(p => p.key),
      ...subModulesList.map(s => s.key)
    ];
    await Module.deleteMany({ key: { $in: allKeysToDelete } });
    
    console.log('✅ Clean slate successfully established.');

    // 1. Seed Panels
    console.log('🔄 Seeding Workspace Panels...');
    const panelDocs = [];
    for (const p of defaultPanels) {
      const panel = await Panel.create(p);
      console.log(`  + Created Panel: ${panel.name}`);
      panelDocs.push(panel);
    }

    // 2. Seed Parent Modules
    console.log('🔄 Seeding Parent Modules...');
    const parentDocs = {};
    const seededModules = [];

    for (const pm of parentModules) {
      const mod = await Module.create({
        ...pm,
        defaultLevel: 'country',
        status: 'active',
        isActive: true,
        parentModule: null
      });
      console.log(`  + Created Parent Module: ${mod.name}`);
      parentDocs[pm.key] = mod;
      seededModules.push(mod);
    }

    // 3. Seed Submodules linked to their respective Parent Modules
    console.log('🔄 Seeding Submodules...');
    for (const sm of subModulesList) {
      const parentDoc = parentDocs[sm.parentKey];
      if (!parentDoc) continue;

      const mod = await Module.create({
        name: sm.name,
        key: sm.key,
        route: sm.route,
        icon: sm.icon,
        description: sm.description,
        defaultLevel: 'country',
        status: 'active',
        isActive: true,
        parentModule: parentDoc._id
      });
      console.log(`  + Created Submodule: ${mod.name} ↳ (Parent: ${parentDoc.name})`);
      seededModules.push(mod);
    }

    // 4. Seed PanelPermission Matrix mapping
    console.log('🔄 Seeding default Permission Matrix limits...');
    const permsToInsert = [];

    const adminPanel = panelDocs.find(p => p.key === 'admin');
    const partnerMgrPanel = panelDocs.find(p => p.key === 'partner_manager');
    const partnersPanel = panelDocs.find(p => p.key === 'partners');
    const accountsPanel = panelDocs.find(p => p.key === 'accounts');
    const deliveryPanel = panelDocs.find(p => p.key === 'delivery');

    seededModules.forEach(mod => {
      // Admin always gets full rights
      permsToInsert.push({
        panelId: adminPanel._id,
        moduleId: mod._id,
        can_view: true,
        can_add: true,
        can_edit: true,
        can_delete: true
      });

      // Mapping for Partner Manager Panel
      if (mod.key === 'parent_partner_manager' || mod.key.startsWith('pm_')) {
        permsToInsert.push({
          panelId: partnerMgrPanel._id,
          moduleId: mod._id,
          can_view: true,
          can_add: true,
          can_edit: true,
          can_delete: false
        });
      } else {
        permsToInsert.push({
          panelId: partnerMgrPanel._id,
          moduleId: mod._id,
          can_view: false,
          can_add: false,
          can_edit: false,
          can_delete: false
        });
      }

      // Mapping for Partners Panel
      if (mod.key === 'parent_partners' || mod.key.startsWith('partner_')) {
        permsToInsert.push({
          panelId: partnersPanel._id,
          moduleId: mod._id,
          can_view: true,
          can_add: true,
          can_edit: true,
          can_delete: false
        });
      } else {
        permsToInsert.push({
          panelId: partnersPanel._id,
          moduleId: mod._id,
          can_view: false,
          can_add: false,
          can_edit: false,
          can_delete: false
        });
      }

      // Mapping for Accounts Panel
      if (mod.key === 'parent_accounts' || mod.key.startsWith('accounts_')) {
        permsToInsert.push({
          panelId: accountsPanel._id,
          moduleId: mod._id,
          can_view: true,
          can_add: true,
          can_edit: true,
          can_delete: false
        });
      } else {
        permsToInsert.push({
          panelId: accountsPanel._id,
          moduleId: mod._id,
          can_view: false,
          can_add: false,
          can_edit: false,
          can_delete: false
        });
      }

      // Mapping for Delivery Panel
      if (mod.key === 'parent_delivery' || mod.key.startsWith('delivery_')) {
        permsToInsert.push({
          panelId: deliveryPanel._id,
          moduleId: mod._id,
          can_view: true,
          can_add: true,
          can_edit: true,
          can_delete: false
        });
      } else {
        permsToInsert.push({
          panelId: deliveryPanel._id,
          moduleId: mod._id,
          can_view: false,
          can_add: false,
          can_edit: false,
          can_delete: false
        });
      }
    });

    if (permsToInsert.length > 0) {
      await PanelPermission.insertMany(permsToInsert);
      console.log(`  + Seeded ${permsToInsert.length} Permission Matrix rules.`);
    }

    // 5. Map existing users for testing
    console.log('🔄 Mapping users to workspace panels...');
    const allUsers = await User.find({});
    for (const u of allUsers) {
      let targetPanel = null;
      if (u.role === 'admin') {
        targetPanel = adminPanel;
      } else if (u.role === 'accountManager') {
        targetPanel = accountsPanel;
      } else if (u.role === 'deliveryManager') {
        targetPanel = deliveryPanel;
      } else if (u.role === 'franchiseeManager' || u.role === 'dealerManager') {
        targetPanel = partnerMgrPanel;
      }

      if (targetPanel) {
        await UserPanel.create({
          userId: u._id,
          panelId: targetPanel._id,
          branchId: 'Main Branch',
          customPermissions: []
        });
        console.log(`  + Assigned user '${u.name}' (${u.role}) to '${targetPanel.name}'`);
      }
    }

    console.log('🏁 Seeding finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
}

seed();
