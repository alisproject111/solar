import Attendance from '../../models/hr/Attendance.js';
import User from '../../models/users/User.js';
import HRMSSettings from '../../models/hr/HRMSSettings.js';
import LeaveRequest from '../../models/hr/LeaveRequest.js';

export const toggleBreak = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let attendance = await Attendance.findOne({
      user: userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!attendance) {
      return res.status(400).json({ success: false, message: 'No active session found for today. Please login first.' });
    }

    if (attendance.logoutTime) {
      return res.status(400).json({ success: false, message: 'You are already logged out for today.' });
    }

    const breaks = attendance.breaks || [];
    let isOnBreak = false;

    // Check if the user is currently on break
    if (breaks.length > 0) {
      const lastBreak = breaks[breaks.length - 1];
      if (!lastBreak.endTime) {
        // End the break
        lastBreak.endTime = now;
        lastBreak.durationMinutes = Math.floor((now - new Date(lastBreak.startTime)) / 60000);
        attendance.totalBreakMinutes = (attendance.totalBreakMinutes || 0) + lastBreak.durationMinutes;
      } else {
        // Start a new break
        breaks.push({ startTime: now });
        isOnBreak = true;
      }
    } else {
      // Start first break
      breaks.push({ startTime: now });
      isOnBreak = true;
    }

    attendance.breaks = breaks;
    await attendance.save();

    res.status(200).json({ 
      success: true, 
      message: isOnBreak ? 'Break started' : 'Break ended',
      isOnBreak,
      attendance 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfileStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Get today's attendance
    const todayAttendance = await Attendance.findOne({
      user: userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    // 2. Get this month's attendance records
    const monthAttendances = await Attendance.find({
      user: userId,
      date: { $gte: startOfMonth, $lte: endOfDay }
    });

    // Calculate Arrival Time
    let arrivalTime = 'N/A';
    if (todayAttendance && todayAttendance.loginTime) {
      arrivalTime = new Date(todayAttendance.loginTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    // Calculate Total Work Days this month
    const totalWorkDays = monthAttendances.length;

    // Calculate Monthly Break Time (hours)
    let monthlyBreakMinutes = 0;
    monthAttendances.forEach(a => {
      monthlyBreakMinutes += (a.totalBreakMinutes || 0);
    });
    const monthlyBreakHours = (monthlyBreakMinutes / 60).toFixed(1);

    // Calculate Today's Break Time (Average or total today)
    let todayBreakMinutes = todayAttendance ? (todayAttendance.totalBreakMinutes || 0) : 0;
    const todayBreakHours = (todayBreakMinutes / 60).toFixed(1);

    // Calculate Time at work today
    let timeAtWork = '0m';
    if (todayAttendance && todayAttendance.loginTime) {
      if (todayAttendance.logoutTime) {
        // Work time already calculated
        timeAtWork = `${todayAttendance.totalWorkMinutes}m`;
      } else {
        // Still working
        const loginTime = new Date(todayAttendance.loginTime);
        let totalMillis = now - loginTime;
        let activeWorkMinutes = Math.floor(totalMillis / 60000) - todayBreakMinutes;
        
        // Subtract current active break time if any
        if (todayAttendance.breaks && todayAttendance.breaks.length > 0) {
            const lastBreak = todayAttendance.breaks[todayAttendance.breaks.length - 1];
            if (!lastBreak.endTime) {
                activeWorkMinutes -= Math.floor((now - new Date(lastBreak.startTime)) / 60000);
            }
        }
        
        if (activeWorkMinutes < 0) activeWorkMinutes = 0;
        
        if (activeWorkMinutes >= 60) {
          const hours = Math.floor(activeWorkMinutes / 60);
          const mins = activeWorkMinutes % 60;
          timeAtWork = `${hours}h ${mins}m`;
        } else {
          timeAtWork = `${activeWorkMinutes}m`;
        }
      }
    }

    // Get User for Overdue Tasks
    const user = await User.findById(userId);
    const overdueTasks = user ? (user.overdueTasks || 0) : 0;

    // Get dynamic leaves (Approved ones)
    let totalLeaves = 0;
    try {
        const approvedLeaves = await LeaveRequest.find({ employee: userId, status: 'Approved' });
        totalLeaves = approvedLeaves.reduce((acc, curr) => acc + (curr.totalDays || 0), 0);
    } catch(err) {
        console.error("Error fetching leaves", err);
    }
    const leaves = totalLeaves; 

    const rank = '1st'; // Complex logic needed for actual rank, keeping dummy for now
    
    // Simple Productivity Formula: Active Work Minutes / Standard 8 hours (480 mins)
    let productivityScore = 0;
    let productivity = '0%';
    if (todayAttendance && todayAttendance.loginTime) {
        const totalMinutes = todayAttendance.totalWorkMinutes > 0 ? todayAttendance.totalWorkMinutes : (Math.floor((now - new Date(todayAttendance.loginTime)) / 60000) - todayBreakMinutes);
        productivityScore = (totalMinutes / 480) * 100;
        if (productivityScore > 100) productivityScore = 100;
        productivity = `${productivityScore.toFixed(2)}%`;
    }

    // Dynamic Efficiency Score (based on productivity and leaves/breaks ratio)
    let effScore = productivityScore > 0 ? productivityScore * 0.95 : 0; // Slightly lower than productivity due to breaks
    const efficiencyScore = effScore > 0 ? `${effScore.toFixed(2)}%` : '0%';

    // Check if currently on break
    let isOnBreak = false;
    if (todayAttendance && todayAttendance.breaks && todayAttendance.breaks.length > 0) {
        const lastBreak = todayAttendance.breaks[todayAttendance.breaks.length - 1];
        if (!lastBreak.endTime) {
            isOnBreak = true;
        }
    }

    // Fetch Payroll Settings from HRMSSettings
    let payrollSettings = null;
    if (user && user.department) {
        // Find HRMSSettings for this user's department and role/position
        const settings = await HRMSSettings.findOne({
            department: user.department,
            position: user.role
        });
        if (settings && settings.payroll) {
            payrollSettings = settings.payroll;
        }
    }

    // Fallback dummy data for testing the UI if no settings are found
    if (!payrollSettings) {
        payrollSettings = {
            salary: '₹50,000 / month',
            payrollType: 'Monthly',
            perks: 'Health Insurance, Free Cab',
            benefits: 'PF, Gratuity',
            commissionTypeSelection: 'Per kW Commission',
            salaryIncrement: '10% Annually',
            esops: 'Eligible after 1 year (100 shares)'
        };
    }

    res.status(200).json({
      success: true,
      stats: {
        arrivalTime,
        leaves: `Total:${leaves}`,
        overdueTask: `Total:${overdueTasks}`,
        totalWorkDays: `Total:${totalWorkDays}`,
        timeAtWork,
        rankInTeam: rank,
        efficiencyScore,
        productivity,
        totalBreakTime: `Average\n${todayBreakHours} hours`,
        monthlyBreakTime: `Monthly\n${monthlyBreakHours} Hours`,
        isOnBreak,
        payrollSettings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
