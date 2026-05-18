# SOLARKITS ERP — Enterprise Client Documentation & Master Workflow

**Project Name:** SOLARKITS ERP System (2026 Edition)  
**Target Audience:** Client Executive Leadership, System Administrators, & Engineering Audit Teams  
**Document Classification:** Confidential Master Technical & Functional Specification  

---

## 🏛️ 1. Executive Summary & System Vision

SOLARKITS ERP is a state-of-the-art enterprise resource planning platform engineered specifically for the solar energy sector. It unifies complex operational workflows—spanning multi-level geographical territory management, tier-1 component supply chains, milestone-based customer financing, and strict multi-stage solar project construction—into a single, high-fidelity web application.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SOLARKITS ENTERPRISE ECOSYSTEM                       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  GEOGRAPHY & HR  │       │ CORE PROJECT MGT │       │  SUPPLY CHAIN &  │
│    FOUNDATION    │       │    (8 STAGES)    │       │     FINANCE      │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ • 6-Level Regions│       │ • Lead & Survey  │       │ • Warehouse & BOM│
│ • Dept Org Chart │       │ • Documentation  │       │ • Tier-1 Brands  │
│ • Roles & Access │       │ • Dispatch/Instal│       │ • Custom ComboKit│
│ • Approvals/SLA  │       │ • Net Metering   │       │ • Loan Milestones│
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

---

## 🛠️ 2. Comprehensive Technology Stack & Architecture

The platform is engineered on an optimized **MERN (MongoDB, Express.js, React, Node.js)** stack designed for sub-second UI responsiveness, secure role-based access control, and highly scalable data relationships.

### Frontend Architecture (`solar-client`)
* **Core Framework:** React 18 with Vite build engine for near-instant hot module replacement and highly optimized production bundling.
* **Styling & Design System:** Vanilla CSS paired with Tailwind CSS utility classes, utilizing modern glassmorphism, responsive CSS flex/grid layouts, and curated color palettes.
* **Iconography:** `lucide-react` for clean, professional, and consistent vector SVG icons across all sidebar menus and KPI cards.
* **State Management:** Custom React hooks (`useLocations`, `useAuth`) combined with Zustand/Context for global session and permission persistence.
* **Spreadsheet Processing:** `xlsx` library for client-side Excel parsing, enabling high-speed bulk data uploads with instant client-side validation previews before server submission.

### Backend Server Architecture (`solar-server`)
* **Server Runtime:** Node.js v20+ executing asynchronous Express.js REST API handlers.
* **Database & ORM:** MongoDB Enterprise Cloud managed via Mongoose ODM schemas, featuring strict field validation, compound geographical indexing, and cascading virtual joins.
* **Authentication & Security:** JSON Web Tokens (JWT) stored securely with bcrypt password hashing. Middleware enforces strict role-based access control (`authorize('admin', 'dealer')`) and department-level module delegation.
* **Data Aggregation:** Advanced Mongoose `$facet`, `$lookup`, and `$group` aggregation pipelines to generate high-performance financial P&L, inventory valuations, and regional counts.

---

## 📦 3. Exhaustive Breakdown of ALL 18 Core Modules

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MASTER NAVIGATION TREE                          │
├────────────────────────────────────────────────────────────────────────┤
│  1. Dashboard (Orders, Loans, Installers, Delivery, Vendors, Inventory)│
│  2. Departments (Organization Chart)                                   │
│  3. Approvals (Approval Summary & Requests)                            │
│  4. Project Management (Company, Partners, Installer Agency)           │
│  5. Operations (Warehouse, Add Stock, Inventory Mgt, Brand Supplier)   │
│  6. Settings (Locations, HR, Vendor, Sales, Marketing, Delivery, etc.) │
│  7. Reports (Financial P&L, Cashflow, Inventory, Loans, Captable, etc.)│
└────────────────────────────────────────────────────────────────────────┘
```

---

### Module 1: Location Settings & Hierarchy Management Module

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       6-LEVEL LOCATION HIERARCHY                        │
└─────────────────────────────────────────────────────────────────────────┘
  1. Global Countries ──► 2. Active States ──► 3. Assigned Districts
                                                      │
  6. Cities / Pincodes ◄── 5. Operational Zones ◄── 4. Multi-Dist Clusters
```

#### A. Business Purpose
The geographical foundation of the ERP. Establishes a 6-tier cascading territory tree used to filter projects, assign regional dealer leads, apply state-specific pricing markups, and calculate logistics transport freight.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> Location Settings -> Setup Locations` (`/admin/settings/location/setup-locations`).
* **Sub-sections & Tabs:** 
  1. **Countries Tab:** Dropdown of master global countries. Button: `Activate Country`.
  2. **States Tab:** Table of active states. Form: State Name, Code, and Description.
  3. **Districts Tab:** Table linking Districts to parent States. Form: District Name.
  4. **Clusters Tab:** Multi-select grouping of several districts into a commercial cluster.
  5. **Zones Tab:** Multi-cluster zones for senior territory managers.
  6. **Cities Tab:** City management classified by Area Type (`Urban` vs `Rural`). Includes manual input and **Bulk Excel Upload** with instant table preview and internal duplicate filtering.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `Country.js`, `State.js`, `District.js`, `Cluster.js`, `Zone.js`, `City.js` (`solar-server/models/core/`).
* **GET** `/api/locations/hierarchy/states?countryId=...`: Returns cascading state tree.
* **POST** `/api/locations/cities/bulk-create`: Parses Excel JSON stream -> validates unique city names and pincodes -> executes MongoDB batch insert.

---

### Module 2: Departments Module

#### A. Business Purpose
Defines the internal organizational chart of the solar company (e.g., Solar Engineering, Field Operations, Accounting, Sales). Controls which system modules each department can access.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Departments -> Organization Chart` (`/admin/departments/organization-chart`).
* **Sub-sections:**
  1. **Department Master List:** Table of active departments showing assigned module badges. Button: `+ Add New Department`.
  2. **Organization Chart View:** Visual reporting tree illustrating parent-child department relationships.

#### C. Backend API Endpoints & Mongoose Models
* **Model:** `Department.js` (`solar-server/models/hr/Department.js`).
* **POST** `/api/departments`: Validates unique department code -> creates Mongoose document.
* **GET** `/api/departments/hierarchy`: Returns nested JSON tree for React D3/Canvas organization chart rendering.

---

### Module 3: HRMS & Role Management Module

#### A. Business Purpose
Manages employee onboarding, candidate evaluation testing, job vacancy postings, leave/resignation requests, and granular role-based permissions across the company.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> HR Settings` (Expandable menu).
* **Sub-sections:**
  1. **Role Settings** (`/admin/settings/hr/role-settings`): Create designations (e.g., "Senior Field Engineer", "Franchisee Manager") and toggle module checkmarks.
  2. **Create Department** (`/admin/settings/hr/create-department`): Direct department setup modal.
  3. **Manage Employees** (`/admin/settings/hr/manage-employees`): Table of staff. Form: Name, Email, Password, Department, Role, and Reporting Manager.
  4. **Department-wise Modules** (`/admin/settings/hr/department-wise-modules`): View and delegate module access across departments.
  5. **Temporary Incharge Setting** (`/admin/settings/hr/temporary-incharge-setting`): Assign temporary managerial roles when department heads are on leave.
  6. **Leave Approvals** (`/admin/settings/hr/leave-approvals`): Review employee leave applications. Buttons: `Approve` / `Reject`.
  7. **Resign Approvals** (`/admin/settings/hr/resign-approvals`): Review employee resignation notices and exit interview logs.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `User.js`, `Role.js`, `Permission.js`, `LeaveRequest.js` (`solar-server/models/users/` & `hr/`).
* **POST** `/api/users/register`: Hashes password with bcrypt -> commits employee record.
* **PUT** `/api/hr/leaves/:id/status`: Updates leave application state.

---

### Module 4: Approvals & Overdue Settings Module

#### A. Business Purpose
Defines automated escalation thresholds and multi-level approval chains for high-value financial transactions, timeline extensions, and sensitive project changes.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Approvals` (`/admin/approvals`) or `Sidebar -> Settings -> Overdue Setting`.
* **Sub-sections:**
  1. **Approval Dashboard** (`/admin/approvals`): KPI summary cards (Total Pending, Onboarding Approved, User Approved). Tabbed table of incoming approval tickets. Buttons: `Approve` / `Reject` with mandatory notes modal.
  2. **Approval Overdue Setting** (`/admin/settings/approval-overdue`): Configure escalation timers for unaddressed approval tickets.
  3. **Overdue Task Setting** (`/admin/settings/overdue-task`): Define **Pending Min/Max Days** (e.g., 1 to 7 days) and multi-level **Escalation Levels** (e.g., Day 3 overdue escalates to District Manager with a 2% penalty).
  4. **Overdue Status Setting** (`/admin/settings/overdue-status`): Map specific overdue rules to geographical regions and employee roles.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `Approval.js`, `OverdueTaskSetting.js`, `OverdueStatusSetting.js` (`solar-server/models/approvals/`).
* **POST** `/api/approvals/request`: Creates an approval ticket -> flags target entity status as `Under Approval`.
* **GET** `/api/approvals/pending`: Retrieves active tickets filtered by the logged-in administrator's permission level.

---

### Module 5: Project Management Module (Core)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      8 STRICT PROJECT STAGES FLOW                       │
└─────────────────────────────────────────────────────────────────────────┘
  1. Lead Signup ──► 2. Site Survey ──► 3. Documentation ──► 4. Dispatch
                                                                  │
  8. Completion ◄── 7. Net Metering ◄── 6. Installation ◄─────────┘
```

#### A. Business Purpose
The operational heart of SOLARKITS. Enforces a strict, unskippable 8-stage construction lifecycle for Residential, Commercial, and Agricultural solar installations.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Project Management -> Company` / `Partners` / `Installer Agency`.
* **Sub-sections (replicated across Company, Partner, and Installer views):**
  1. **Management Projects** (`.../management`): Kanban and grid views of active projects. Clicking a project card opens the stage inspection modal. Form: Document uploads (Electricity bill, roof photos), customer sign-offs, and `Move to Next Stage` button.
  2. **Install Projects** (`.../install`): Dedicated view for field engineers showing Stage 6 (Installation) active projects with mounting structure and wiring schematics.
  3. **Service Projects** (`.../service`): Warranty and maintenance project tracking.
  4. **Track Service Projects** (`.../track-service`): Live SLA countdown timers for urgent customer maintenance requests.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `Project.js`, `StageHistory.js`, `ProjectChecklist.js` (`solar-server/models/projects/`).
* **GET** `/api/projects`: Fetches active projects. Includes query parameters for stage, location, and overdue status.
* **PUT** `/api/projects/:id/stage`: Verifies mandatory stage completion checklist -> updates `project.currentStage` -> records timestamp in `StageHistory` -> recalculates overdue SLA timers.

---

### Module 6: Operations & Warehouse Module

#### A. Business Purpose
Manages physical warehouse inventory, tracks real-time stock levels of solar kits, panels, inverters, and mounting structures, and processes material dispatch requests.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Operations` -> `Our Warehouse` / `Add Inventory Request` / `Inventory Management`.
* **Sub-sections:**
  1. **Our Warehouse** (`/admin/operations/warehouse`): Live inventory stock table. SKUs falling below minimum thresholds are flagged with a red **"⚠️ Low Stock Alert"**.
  2. **Add Inventory Request** (`/admin/operations/add-inventory`): Stock intake form. Input SKU, batch number, supplier vendor, unit price, and received quantity.
  3. **Inventory Management** (`/admin/operations/inventory-management`): Stock reconciliation, adjustments, and inter-warehouse transfer logs.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `Warehouse.js`, `InventoryItem.js`, `StockTransaction.js` (`solar-server/models/inventory/`).
* **POST** `/api/inventory/stock-in`: Adds received quantity to `availableStock` -> records audit log.
* **POST** `/api/inventory/dispatch`: Deducts stock upon Project Stage 4 approval -> links dispatch invoice to `Project` ID.

---

### Module 7: Brand Manufacturer & Supplier Module

#### A. Business Purpose
Maintains an exhaustive catalog of approved tier-1 solar component manufacturers (e.g., Waaree, Vikram Solar, Sungrow, Growatt) and their wholesale supplier networks.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Operations -> Brand Manufacturer` (Expandable menu).
* **Sub-sections:**
  1. **Add Brand Manufacturer** (`/admin/operations/brand/add-brand-manufacturer`): Form to onboard brand name, corporate logo, country of origin, warranty terms, and component category (Panels, Inverters, Batteries).
  2. **Brand Supplier Overview** (`/admin/operations/brand/supplier-overview`): Analytical table comparing supplier delivery times, component defect rates, and credit terms.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `Brand.js`, `SupplierOverview.js` (`solar-server/models/inventory/` & `vendors/`).
* **GET** `/api/brands/active`: Fetches active brand list to populate ComboKit customization dropdowns.

---

### Module 8: Vendor Management Module

#### A. Business Purpose
Manages third-party vendors including external installation contractors, logistics transport providers, and component distributors.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> Vendor Settings` (Expandable menu).
* **Sub-sections:**
  1. **Installer Vendors** (`/admin/settings/vendor/installer-vendors`): Onboard third-party field contractors. Form: PAN, GSTIN, bank details, and service territory allocation (States/Districts).
  2. **Supplier Type** (`/admin/settings/vendor/supplier-type`): Define vendor classifications (Hardware Distributor, EPC Contractor, Logistics Carrier).
  3. **Supplier Vendors** (`/admin/settings/vendor/supplier-vendors`): Master table of all active wholesale component suppliers.

#### C. Backend API Endpoints & Mongoose Models
* **Model:** `Vendor.js` (`solar-server/models/vendors/Vendor.js`).
* **POST** `/api/vendors`: Validates GST format -> creates vendor document -> indexes geographical coordinates.

---

### Module 9: Installer Agency & Settings Module

#### A. Business Purpose
Manages professional solar installation teams and agencies. Tracks their certification ratings, physical tool requirements (e.g., crimping tools, safety harnesses), and project allocation limits.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> Installer Settings` (Expandable menu).
* **Sub-sections:**
  1. **Solar Installer** (`/admin/settings/installer/solar-installer`): Profiles of field technicians. Displays completed project counts and average customer star ratings.
  2. **Installer Tool Requirements** (`/admin/settings/installer/tool-requirements`): Mandatory safety and electrical tool checklists. Field technicians must upload photos of these tools during annual audits.
  3. **Rating Setting** (`/admin/settings/installer/rating-setting`): Define rating thresholds. Installers falling below 3.5 stars are automatically restricted from receiving Commercial projects.
  4. **Installer Agency Plans** (`/admin/settings/installer/agency-plans`): Paid subscription tiers for third-party installation companies.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `Installer.js`, `ToolRequirement.js`, `RatingRule.js` (`solar-server/models/partner/` & `settings/`).
* **PUT** `/api/installers/:id/rating`: Updates cumulative average star rating after customer inspection sign-off.

---

### Module 10: Product Configuration Module

#### A. Business Purpose
Establishes the core catalog taxonomy for SOLARKITS. Defines project types (Residential/Commercial/Agricultural), unit measurements (kW, Watt, Meters), and master price catalogs.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> Product Configuration` (Expandable menu).
* **Sub-sections:**
  1. **Add Project Type** (`/admin/settings/product/add-project-type`): Define master project classifications (Residential Rooftop, Ground Mount, Solar Pump).
  2. **Add Project Category** (`/admin/settings/product/add-project-category`): Sub-categorize projects by capacity slabs (e.g., 1kW-5kW, 5kW-10kW).
  3. **Add Product** (`/admin/settings/product/add-product`): Master inventory hardware item setup.
  4. **SKU** (`/admin/settings/product/sku`): Automated SKU code generator. Select Category, Capacity, and Brand to instantly generate standardized codes (e.g., `INV-5KW-GRO-01`).
  5. **Price Master** (`/admin/settings/product/price-master`): Set wholesale dealer base prices and retail customer MSRP per Watt/kW.
  6. **Add Unit Management** (`/admin/settings/product/add-unit-management`): Define metric units (Pieces, Rolls, Sets, kW).

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `ProductCategory.js`, `ProductItem.js`, `PriceMaster.js` (`solar-server/models/settings/`).
* **POST** `/api/products/sku-generate`: Executes deterministic SKU generation algorithm -> checks collision -> commits product master record.

---

### Module 11: ComboKit & AMC Module

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      COMBOKIT ARCHITECTURE MATRIX                       │
├────────────────────────────────┬────────────────────────────────────────┤
│ MASTER COMPONENT               │ INCLUDED HARDWARE BUNDLE               │
├────────────────────────────────┼────────────────────────────────────────┤
│ 5kW Residential Kit (Standard) │ • 10x 500W Bifacial Solar Panels       │
│ SKU: CK-5KW-RES-STD            │ • 1x 5kW String Inverter (Wi-Fi)       │
│                                │ • 50m DC Wire + AC/DC Combiner Box     │
│                                │ • GI Mounting Structure (Standard Roof)│
└────────────────────────────────┴────────────────────────────────────────┘
```

#### A. Business Purpose
Combines standalone products into ready-to-install pre-packaged Solar Kits (e.g., "5kW Premium Kit: 10x 500W Panels + 5kW Hybrid Inverter + Mounting Structure"). Manages Annual Maintenance Contract (AMC) plans.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> ComboKit` (Expandable menu).
* **Sub-sections:**
  1. **Create Solarkit** (`/admin/settings/combokit/create-solarkit`): Kit builder UI. Select capacity (10kW) and assign precise panel, inverter, and balance of system (BOS) quantities.
  2. **Create AMC Plans** (`/admin/settings/combokit/create-amc`): Define 1-year, 3-year, and 5-year maintenance contract pricing.
  3. **AMC Services** (`/admin/settings/combokit/amc-services`): List of covered maintenance activities (Panel cleaning, inverter firmware updates).
  4. **Solarkit Bundle Plans** (`/admin/settings/combokit/bundle-plans`): Multi-kit promotional bundle configurations.
  5. **Add ComboKit** (`/admin/settings/combokit/add-combokit`): Standard single kit creation modal.
  6. **Customize Combokit** (`/admin/settings/combokit/customize`): Configure swap rules. Allows dealers to upgrade inverters during project signup subject to real-time price differentials.
  7. **Combokit Overview** (`/admin/settings/combokit-overview`): Master inventory summary of all active pre-packaged kits.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `ComboKit.js`, `AmcPlan.js` (`solar-server/models/settings/`).
* **GET** `/api/combokits/calculate-price`: Sums individual component master prices -> subtracts bundled discount percentage -> returns final net pricing.

---

### Module 12: Partner Settings Module

#### A. Business Purpose
Manages external sales networks: Franchisees, Dealers, and Lead Generation Partners. Configures onboarding targets, subscription plans, and commission/reward point structures.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> Partner Settings` (Expandable menu).
* **Sub-sections:**
  1. **Partner Plans** (`/admin/settings/partner/plans`): Configure partnership subscription fee tiers (e.g., "Premium Dealer Plan - ₹25,000/yr").
  2. **Partner Points & Reward Setting** (`/admin/settings/partner/points-rewards`): Setup cashback rules: `1 kW Installed = 100 Reward Points (Value ₹1,000)`.
  3. **Partner Onboarding Goals** (`/admin/settings/partner/onboarding-goals`): Assign monthly lead generation quotas to regional Franchisee Managers.
  4. **Partner Profession Type** (`/admin/settings/partner/profession-type`): Classify partners (Architect, Electrician, Real Estate Broker).
  5. **Add Partner** (`/admin/settings/partner/add-partner`): Direct partner onboarding KYC form.
  6. **Partner Manager Setting** (`/admin/settings/partner-manager`): Configure hierarchy rules for internal managers overseeing partner networks.
  7. **Partner Buy Lead Setting** (`/admin/settings/partner-buy-lead`): Set pricing for unassigned company leads purchased by franchisees.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `PartnerPlan.js`, `PartnerPoints.js`, `OnboardingGoal.js` (`solar-server/models/partner/`).
* **POST** `/api/partners/credit-points`: Triggered automatically when Project Stage 8 (Completion) is signed off -> adds reward points to dealer wallet.

---

### Module 13: Quotes & BOM (Bill of Materials) Module

#### A. Business Purpose
Automates customized commercial and residential solar quotation generation. Calculates shadow-free roof terrace area, structural wind load requirements, and local Discom net-metering charges.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> Quote` (Expandable menu).
* **Sub-sections:**
  1. **Quote Setting** (`/admin/settings/quote/quote-setting`): Define quotation PDF terms and conditions, validity periods (30 days), and tax headings.
  2. **Survey BOM Setting** (`/admin/settings/quote/survey-bom-setting`): Configure rules linking survey measurements to component quantities.
  3. **Terrace Setting** (`/admin/settings/quote/terrace-setting`): Set shadow clearance coefficients (e.g., 100 sq ft shadow-free area required per 1kW).
  4. **Structure Setting** (`/admin/settings/quote/structure-setting`): Configure mounting structure parameters (Standard RCC roof vs Tin shed vs High-rise wind loads).
  5. **Building Setting** (`/admin/settings/quote/building-setting`): Floor height wiring length estimators.
  6. **Discom Master** (`/admin/settings/quote/discom-master`): Table of state electricity board net-metering application fees (e.g., DGVCL Gujarat = ₹3,500).

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `Quotation.js`, `DiscomMaster.js`, `StructureConfig.js` (`solar-server/models/finance/` & `settings/`).
* **POST** `/api/quotations/generate`: Receives survey dimensions -> evaluates structural load -> calculates Discom fee -> returns formatted PDF data stream.

---

### Module 14: Delivery & Logistics Module

#### A. Business Purpose
Manages the transportation of heavy solar equipment from warehouses to customer installation sites. Configures delivery vehicle capacities, transport routes, and freight charges.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> Settings Operations -> Delivery Settings` (Expandable menu).
* **Sub-sections:**
  1. **Delivery Type** (`/admin/settings/delivery/delivery-type`): Define transport modes (Standard Trucking, Express Courier, Self-Pickup).
  2. **Vehicle Selection** (`/admin/settings/delivery/vehicle-selection`): Table of transport trucks (Tata Ace, Eicher 14ft). Form: Weight limit (Tons) and volumetric space. The system prevents vehicle dispatch if project ComboKit weight exceeds truck limits.
  3. **Vendor Delivery Plan** (`/admin/settings/delivery/vendor-delivery-plan`): Configure distance-based freight contracts (e.g., ₹50/km for distances > 50km).

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `DeliveryVehicle.js`, `DeliveryPlan.js` (`solar-server/models/vendors/` & `settings/`).
* **POST** `/api/delivery/calculate-freight`: Evaluates delivery GPS distance and total kit weight -> matches against `DeliveryPlan` slabs -> calculates transport cost.

---

### Module 15: Loan & Finance Configuration Module

#### A. Business Purpose
Integrates solar financing rules. Connects customer loan approvals with project construction milestones (e.g., 20% disbursement on Stage 3, 60% on Stage 5, 20% on Stage 8).

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> Loan Setting` (`/admin/settings/loan`).
* **Sub-sections:**
  1. **Loan Rule Builder:** Multi-select form to select eligible **Product Categories** (ComboKits > 5kW) and **Partner Types** (Franchisees).
  2. **Financial Parameters:** Set minimum down-payment percentage (15%) and minimum CIBIL score (650).
  3. **Disbursement Schedule:** Define milestone disbursement percentages.
* **Related Dashboard:** `Sidebar -> Dashboard -> Orders by Loan` (`/admin/dashboard/orders-by-loan`). Tracks live loan applications across partner banks.

#### C. Backend API Endpoints & Mongoose Models
* **Model:** `LoanRule.js` (`solar-server/models/finance/LoanRule.js`).
* **PUT** `/api/loans/update-disbursement`: Listens for project stage progression webhooks -> updates bank disbursement status in MongoDB.

---

### Module 16: Sales & Marketing Module

#### A. Business Purpose
Manages pricing markups, promotional discount coupons, AMC contract renewals, and lead generation ad campaigns across Google/Meta ad networks.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> Sales Settings` / `Marketing Settings`.
* **Sub-sections:**
  1. **Set Price** (`/admin/settings/sales/set-price`): Define state-wise pricing markups. Escalated special price requests are flagged with an active red notification badge.
  2. **Set Price For AMC** (`/admin/settings/sales/set-price-amc`): AMC contract pricing slabs.
  3. **Offers** (`/admin/settings/sales/offers`): Promotional discount coupon codes (e.g., `SUMMER15` for ₹15,000 off). Form: Discount value, expiry date, and minimum kW eligibility.
  4. **Solar Panel Bundle Setting** (`/admin/settings/sales/solar-panel-bundle-setting`): Multi-panel wholesale bundle markups.
  5. **Campaign Management** (`/admin/settings/marketing/campaign-management`): Track Google/Meta advertising budgets, UTM parameters, and generated lead conversion counts.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `Campaign.js`, `Offer.js`, `PriceMarkup.js` (`solar-server/models/marketing/` & `settings/`).
* **POST** `/api/marketing/leads/webhook`: Captures incoming lead from Facebook/Google ads -> matches UTM code to `Campaign` -> assigns lead to regional Franchisee.

---

### Module 17: Checklist & Standard Operating Procedures (SOP) Module

#### A. Business Purpose
Enforces strict quality control by establishing mandatory verification checklists for every project stage. Prevents sloppy work or safety violations by field installers.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Settings -> Checklist Setting` (`/admin/settings/checklist`).
* **Sub-sections:**
  1. **SOP Template Builder:** Select Project Stage (e.g., Stage 6 - Installation). Add verification items (e.g., "Check earthing pit resistance < 5 Ohms"). Check the **"Photo Mandatory"** box for critical items like Inverter Wiring.
  2. **Field Execution:** When installers update progress from their mobile app, they cannot advance the project stage until all checklist items are ticked and photos uploaded.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** `ChecklistTemplate.js`, `ProjectChecklist.js` (`solar-server/models/settings/` & `projects/`).
* **GET** `/api/checklists/stage/:stageKey`: Returns required checklist items for mobile UI rendering.

---

### Module 18: Analytics & Reports Module

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FINANCIAL ANALYTICS DASHBOARD                      │
├───────────────────────────────┬─────────────────────────────────────────┤
│ REPORT CATEGORY               │ KEY PERFORMANCE INDICATORS (KPIs)       │
├───────────────────────────────┼─────────────────────────────────────────┤
│ Financial & P&L               │ Gross Revenue, EBITDA, Net Margin %     │
│ Cashflow Statement            │ Inflow (Collections), Outflow (Vendor)  │
│ Inventory Valuation           │ Total Stock Value (FIFO/LIFO basis)     │
│ Regional Revenue Breakdown    │ Revenue by State, District, & Cluster   │
└───────────────────────────────┴─────────────────────────────────────────┘
```

#### A. Business Purpose
Provides real-time business intelligence and financial reporting. Generates board-ready financial statements, inventory valuations, captable summaries, and regional revenue maps.

#### B. UI Navigation & Sub-sections
* **Path:** `Sidebar -> Report` (Expandable menu).
* **Sub-sections:**
  1. **Financial & P&L** (`/admin/reports/financial-pl`): Gross revenue, direct component costs, dealer commissions, and net profit margins. Filters by Date range and Region.
  2. **Cashflow** (`/admin/reports/cashflow`): Inflows (Customer milestones) vs Outflows (Vendor payouts, logistics freight).
  3. **Inventory** (`/admin/reports/inventory`): Total warehouse stock valuation calculated on FIFO/LIFO basis.
  4. **Loans** (`/admin/reports/loans-summary`): Bank-wise financed order totals and pending disbursement totals.
  5. **Captable** (`/admin/reports/captable`): Shareholding and equity distribution records.
  6. **Revenue By CP Types** (`/admin/reports/revenue-by-cp-types`): Channel partner sales contribution comparison (Franchisees vs Dealers vs Direct Sales).
  7. **Cluster, District, & City Reports** (`.../cluster`, `.../district`, `.../city`): Granular geographical revenue maps. All report views include an **Export to Excel / PDF** button for external accounting audits.

#### C. Backend API Endpoints & Mongoose Models
* **Models:** Aggregates data dynamically across `Project`, `Quotation`, `InventoryItem`, and `Vendor` collections.
* **GET** `/api/reports/financial-summary`: Executes complex Mongoose aggregation pipelines `$group`, `$match`, and `$lookup` across multiple financial tables -> returns formatted analytical datasets.

---

## 🔒 4. Enterprise Security, Authentication & Access Control

SOLARKITS ERP implements strict security protocols to safeguard sensitive customer KYC, financial transactions, and operational data.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ROLE-BASED ACCESS DELEGATION                       │
├───────────────────┬─────────────────────────────────────────────────────┤
│ USER ROLE         │ SYSTEM PERMISSION SCOPE                             │
├───────────────────┼─────────────────────────────────────────────────────┤
│ Super Admin       │ Full read/write access across all 18 Master Modules.│
│ HR Manager        │ Access limited to Departments, HRMS, & User Roles.  │
│ Warehouse Incharge│ Access limited to Operations, Inventory, & Dispatch.│
│ Dealer/Franchisee │ Access limited to assigned regional project leads.  │
└───────────────────┴─────────────────────────────────────────────────────┘
```

### Technical Implementation
* **JWT Authentication:** Handled via custom Express middleware (`protect`). Validates Bearer token headers against active user sessions.
* **Role Authorization:** Handled via `authorize('admin', 'dealer')`. Restricts API execution based on user role designations.
* **Department Delegation:** In `AdminSidebar.jsx`, the UI dynamically evaluates `user.department.assignedModules` and `user.delegatedDepartments` to hide or show specific sidebar menu links.

---

## ✅ 5. Production Readiness & Client Verification Summary

The SOLARKITS ERP Admin Panel is fully built, professionally styled, and successfully deployed in the staging environment. 

### Current System Status
* **Frontend UI/UX:** All 18 modules and their nested sub-sections are fully wired with high-fidelity React components, responsive tables, modal forms, and clean vector iconography.
* **Core Data Engine:** Standard CRUD controllers, geographical models, and hierarchical queries are fully operational.
* **Final Audit Checklist Wiring (In Progress):** To complete the final client checklist and achieve 100% green-tick compliance prior to the production GitHub push, the backend database audit logging layer (`ActivityLog` and `DeleteLog` Mongoose middleware) is now being attached to the controllers of these 18 modules.
