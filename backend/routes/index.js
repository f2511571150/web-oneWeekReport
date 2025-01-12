const express = require('express');
const router = express.Router();
const azureDevOpsService = require('../services/azureDevOpsService');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({ message: 'Welcome to the API' });
});

// 获取本周的开始和结束日期
function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDate(monday),
    endDate: formatDate(sunday),
  };
}

router.post('/api/tasks', async (req, res) => {
  const settings = req.body;
  if (!settings || !settings.token) {
    return res.status(401).json({ error: 'Settings are required' });
  }

  try {
    const { startDate, endDate } = getWeekDates();
    const [createdTasks, closedTasks, closedBugs, activeTasks] = await Promise.all([
      azureDevOpsService.getCreatedTasks(settings, startDate, endDate),
      azureDevOpsService.getClosedTasks(settings, startDate, endDate),
      azureDevOpsService.getClosedBugs(settings, startDate, endDate),
      azureDevOpsService.getActiveOrNewTasks(settings)
    ]);

    res.json({
      createdTasks,
      closedTasks,
      closedBugs,
      activeTasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.post('/api/report', async (req, res) => {
  try {
    const { settings, createdTasks, closedTasks, closedBugs, activeTasks } = req.body;
    const report = azureDevOpsService.generateWeekReport({
      createdTasks,
      closedTasks,
      closedBugs,
      activeTasks,
    });

    res.json({ success: true, message: '报告生成成功', report });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
