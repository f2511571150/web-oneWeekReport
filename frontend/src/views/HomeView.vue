<template>
  <div class="container">
    <div
      style="
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 8px 20px;
      "
    >
      <token-settings ref="tokenSettingsRef" @save-success="handleSaveSuccess">
        <template #default="{ openDialog }">
          <el-tooltip
            content="Azure DevOps 设置"
            placement="bottom"
            effect="dark"
          >
            <el-button
              type="primary"
              :icon="Setting"
              circle
              size="small"
              style="margin-left: 0px"
              @click="openDialog"
            />
          </el-tooltip>
        </template>
      </token-settings>

      <el-tooltip content="刷新数据" placement="bottom" effect="dark">
        <el-button
          type="success"
          :icon="Refresh"
          circle
          size="small"
          @click="refreshData"
          :loading="loading"
          style="margin-left: 0px"
        />
      </el-tooltip>

      <el-tooltip content="截图" placement="bottom" effect="dark">
        <el-button
          type="primary"
          :icon="Camera"
          circle
          size="small"
          style="margin-left: 0px"
          @click="captureScreenshot"
        />
      </el-tooltip>
    </div>

    <div
      class="main-content"
      style="flex-grow: 1; overflow: auto; padding: 8px 20px; background: #fff; position: relative"
    >
      <Loading :show="loading" text="正在获取最新数据..." />
      <task-list :tasks="createdTasks" type="created" style="margin-top: 0" />
      <task-list :tasks="closedTasks" type="closed" />
      <task-list :tasks="closedBugs" type="bugs" />
      <task-list :tasks="activeTasks" type="active" />
    </div>

    <el-dialog v-model="reportDialogVisible" title="周报预览" width="800px">
      <div class="report-content">
        <pre>{{ reportContent }}</pre>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reportDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="copyReport">复制到剪贴板</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { Setting, Refresh, Camera } from "@element-plus/icons-vue";
import html2canvas from "html2canvas";
import axios from "axios";
import TaskList from "../components/TaskList.vue";
import TokenSettings from "../components/TokenSettings.vue";
import Loading from "../components/Loading.vue";

const API_BASE_URL = "http://localhost:3000";

const tokenSettingsRef = ref(null);
const createdTasks = ref([]);
const closedTasks = ref([]);
const closedBugs = ref([]);
const activeTasks = ref([]);
const loading = ref(false);
const reportDialogVisible = ref(false);
const reportContent = ref("");

const filterTasksByProjects = (tasks) => {
  const settings = tokenSettingsRef.value?.getSettings();
  if (!settings?.projects || !Array.isArray(settings.projects)) {
    return tasks;
  }
  return tasks.filter((task) => settings.projects.includes(task.project));
};

const checkToken = () => {
  if (!tokenSettingsRef.value?.isConfigured()) {
    ElMessage.warning("请先完成Azure DevOps设置");
    return false;
  }
  return true;
};

const fetchTasks = async () => {
  if (!checkToken()) return;

  try {
    loading.value = true;
    const settings = tokenSettingsRef.value.getSettings();
    const response = await axios.post(`${API_BASE_URL}/api/tasks`, settings);
    const result = response.data;

    createdTasks.value = filterTasksByProjects(result.createdTasks);
    closedTasks.value = filterTasksByProjects(result.closedTasks);
    closedBugs.value = filterTasksByProjects(result.closedBugs);
    activeTasks.value = filterTasksByProjects(result.activeTasks);
    ElMessage.success("数据加载成功");
  } catch (error) {
    ElMessage.error("获取任务失败：" + (error.response?.data?.error || "未知错误"));
    console.error("Error fetching tasks:", error);
  } finally {
    loading.value = false;
  }
};

const generateReport = async () => {
  if (!checkToken()) return;

  try {
    loading.value = true;
    const settings = tokenSettingsRef.value.getSettings();
    const response = await axios.post(`${API_BASE_URL}/api/report`, {
      settings,
      createdTasks: createdTasks.value,
      closedTasks: closedTasks.value,
      closedBugs: closedBugs.value,
      activeTasks: activeTasks.value,
    });

    reportContent.value = response.data.report;
    reportDialogVisible.value = true;
  } catch (error) {
    ElMessage.error("生成报告失败：" + (error.response?.data?.error || "未知错误"));
    console.error("Error generating report:", error);
  } finally {
    loading.value = false;
  }
};

const copyReport = async () => {
  try {
    await navigator.clipboard.writeText(reportContent.value);
    ElMessage.success("已复制到剪贴板");
    reportDialogVisible.value = false;
  } catch (error) {
    ElMessage.error("复制失败");
  }
};

const captureScreenshot = async () => {
  try {
    const mainContent = document.querySelector(".main-content");
    if (!mainContent) {
      throw new Error("Cannot find main content element");
    }

    const canvas = await html2canvas(mainContent, {
      backgroundColor: "#ffffff",
      scale: 2,
    });

    // 创建一个链接并触发下载
    const link = document.createElement("a");
    link.download = `周报截图_${new Date().toISOString().split("T")[0]}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    ElMessage.success("截图已保存");
  } catch (error) {
    console.error("Screenshot error:", error);
    ElMessage.error("截图失败");
  }
};

const handleSaveSuccess = () => {
  fetchTasks();
};

const refreshData = () => {
  fetchTasks();
};

onMounted(() => {
  if (tokenSettingsRef.value?.isConfigured()) {
    fetchTasks();
  }
});
</script>

<style scoped>
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.report-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.report-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: "Courier New", Courier, monospace;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
