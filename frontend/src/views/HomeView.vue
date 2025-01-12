<template>
  <div class="container">
    <div class="header">
      <div class="action-buttons">
        <token-settings
          ref="tokenSettingsRef"
          @save-success="handleSaveSuccess"
        >
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
            @click="refreshData"
            :loading="loading"
          />
        </el-tooltip>

        <el-tooltip content="截图" placement="bottom" effect="dark">
          <el-button
            type="primary"
            :icon="Camera"
            circle
            @click="captureScreenshot"
          />
        </el-tooltip>
      </div>
    </div>

    <div class="main-content" id="main-content">
      <div v-if="createdTasks.length > 0" class="task-section">
        <h3>
          Created Task Total Original Estimate =
          {{
            createdTasks.reduce(
              (sum, task) => sum + (task.originalEstimate || 0),
              0
            )
          }}
          小时
        </h3>
        <task-list :tasks="createdTasks" />
      </div>

      <div v-if="closedTasks.length > 0" class="task-section">
        <h3>
          Closed Task Total Original Estimate =
          {{
            closedTasks.reduce(
              (sum, task) => sum + (task.originalEstimate || 0),
              0
            )
          }}
          小时
        </h3>
        <task-list :tasks="closedTasks" />
      </div>

      <div v-if="closedBugs.length > 0" class="task-section">
        <h3>
          Closed Bug Total Original Estimate =
          {{
            closedBugs.reduce(
              (sum, task) => sum + (task.originalEstimate || 0),
              0
            )
          }}
          小时
        </h3>
        <task-list :tasks="closedBugs" />
      </div>

      <div v-if="activeTasks.length > 0" class="task-section">
        <h3>
          Active Task Total Original Estimate =
          {{
            activeTasks.reduce(
              (sum, task) => sum + (task.originalEstimate || 0),
              0
            )
          }}
          小时
        </h3>
        <task-list :tasks="activeTasks" />
      </div>
    </div>

    <loading v-if="loading" />

    <el-dialog v-model="reportDialogVisible" title="周报预览" width="800px">
      <div class="report-content" id="report-content">
        <pre>{{ reportContent }}</pre>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="copyReport">复制</el-button>
          <el-button type="primary" @click="captureScreenshot('report')"
            >截图</el-button
          >
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { Setting, Refresh, Camera } from "@element-plus/icons-vue";
import html2canvas from "html2canvas";
import TaskList from "../components/TaskList.vue";
import TokenSettings from "../components/TokenSettings.vue";
import Loading from "../components/Loading.vue";
import { getTasks, generateReport } from "../api/tasks";

const tokenSettingsRef = ref(null);
const createdTasks = ref([]);
const closedTasks = ref([]);
const closedBugs = ref([]);
const activeTasks = ref([]);
const loading = ref(false);
const reportDialogVisible = ref(false);
const reportContent = ref("");

// 检查是否配置了令牌
const checkToken = () => {
  if (!tokenSettingsRef.value?.isConfigured()) {
    ElMessage.warning("请先配置 Azure DevOps 令牌");
    return false;
  }
  return true;
};

// 获取任务数据
const fetchTasks = async () => {
  if (!checkToken()) return;

  try {
    loading.value = true;
    const settings = tokenSettingsRef.value.getSettings();
    const result = await getTasks(settings);

    createdTasks.value = filterTasksByProjects(result.createdTasks);
    closedTasks.value = filterTasksByProjects(result.closedTasks);
    closedBugs.value = filterTasksByProjects(result.closedBugs);
    activeTasks.value = filterTasksByProjects(result.activeTasks);
    ElMessage.success("数据加载成功");
  } catch (error) {
    console.error("Error fetching tasks:", error);
  } finally {
    loading.value = false;
  }
};

// 生成报告
const generateWeeklyReport = async () => {
  if (!checkToken()) return;

  try {
    loading.value = true;
    const settings = tokenSettingsRef.value.getSettings();
    const response = await generateReport({
      settings,
      createdTasks: createdTasks.value,
      closedTasks: closedTasks.value,
      closedBugs: closedBugs.value,
      activeTasks: activeTasks.value,
    });

    reportContent.value = response.report;
    reportDialogVisible.value = true;
  } catch (error) {
    console.error("Error generating report:", error);
  } finally {
    loading.value = false;
  }
};

// 过滤任务
const filterTasksByProjects = (tasks) => {
  const settings = tokenSettingsRef.value?.getSettings();
  if (!settings?.projects?.length) return tasks;

  return tasks.filter((task) =>
    settings.projects.some((project) =>
      task.project.toLowerCase().includes(project.toLowerCase())
    )
  );
};

// 刷新数据
const refreshData = () => {
  fetchTasks();
};

// 复制报告
const copyReport = async () => {
  try {
    await navigator.clipboard.writeText(reportContent.value);
    ElMessage.success("复制成功");
  } catch (error) {
    console.error("Error copying report:", error);
    ElMessage.error("复制失败");
  }
};

// 保存成功回调
const handleSaveSuccess = () => {
  fetchTasks();
};

// 截图
const captureScreenshot = async (source = 'main') => {
  try {
    let element;
    if (source === 'report') {
      element = document.getElementById("report-content");
    } else {
      element = document.getElementById("main-content");
    }

    if (!element) {
      ElMessage.error("未找到要截图的内容");
      return;
    }

    // 保存原始状态
    const originalStyles = new Map();
    const originalScrollTop = window.scrollY;

    // 处理所有 Element Plus 表格
    const tables = element.querySelectorAll('.el-table');
    tables.forEach(table => {
      // 保存原始样式
      const tableState = {
        style: {},
        rowStyles: new Map(),
        cellStyles: new Map()
      };

      // 保存表格样式
      Array.from(table.style).forEach(prop => {
        tableState.style[prop] = table.style[prop];
      });

      // 保存行和单元格样式
      table.querySelectorAll('.el-table__body tr').forEach((row, index) => {
        const rowStyle = {};
        Array.from(row.style).forEach(prop => {
          rowStyle[prop] = row.style[prop];
        });
        tableState.rowStyles.set(index, rowStyle);

        row.querySelectorAll('td').forEach((cell, cellIndex) => {
          const cellStyle = {};
          Array.from(cell.style).forEach(prop => {
            cellStyle[prop] = cell.style[prop];
          });
          tableState.cellStyles.set(`${index}-${cellIndex}`, cellStyle);
        });
      });

      originalStyles.set(table, tableState);

      // 设置表格基础样式
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.borderSpacing = '0';

      // 处理表格行
      const rows = table.querySelectorAll('.el-table__body tr');
      rows.forEach((row, index) => {
        // 设置行样式
        row.style.backgroundColor = index % 2 === 0 ? '#FFFFFF' : '#FAFAFA';

        // 处理单元格
        row.querySelectorAll('td').forEach((cell, cellIndex) => {
          // 重置并设置单元格样式
          const computedStyle = window.getComputedStyle(cell);
          const paddingLeft = computedStyle.getPropertyValue('padding-left');
          const paddingRight = computedStyle.getPropertyValue('padding-right');

          cell.style.cssText = '';
          cell.style.backgroundColor = 'inherit';
          cell.style.border = '1px solid #EBEEF5';
          cell.style.padding = `12px ${paddingRight} 12px ${paddingLeft}`;
          cell.style.position = 'relative';
          cell.style.boxSizing = 'border-box';

          // 处理单元格内容
          const cellDiv = cell.querySelector('.cell');
          if (cellDiv) {
            cellDiv.style.boxSizing = 'border-box';
            cellDiv.style.overflow = 'hidden';
            cellDiv.style.textOverflow = 'ellipsis';
          }
        });
      });

      // 处理表头
      table.querySelectorAll('.el-table__header th').forEach(th => {
        th.style.backgroundColor = '#F5F7FA';
        th.style.border = '1px solid #EBEEF5';
        th.style.padding = '12px';
        th.style.fontWeight = '600';
        th.style.color = '#606266';
      });

      // 确保最后一行的边框显示正确
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        lastRow.querySelectorAll('td').forEach(cell => {
          cell.style.borderBottom = '1px solid #EBEEF5';
        });
      }
    });

    // 创建 canvas
    const canvas = await html2canvas(element, {
      useCORS: true,
      scale: window.devicePixelRatio || 1,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: -window.scrollY,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(element.id);
        if (clonedElement) {
          clonedElement.querySelectorAll('.el-table').forEach(clonedTable => {
            // 设置克隆表格的基础样式
            clonedTable.style.width = '100%';
            clonedTable.style.borderCollapse = 'collapse';
            clonedTable.style.borderSpacing = '0';

            // 处理克隆表格的行
            const rows = clonedTable.querySelectorAll('.el-table__body tr');
            rows.forEach((row, index) => {
              row.style.backgroundColor = index % 2 === 0 ? '#FFFFFF' : '#FAFAFA';

              row.querySelectorAll('td').forEach(cell => {
                const computedStyle = window.getComputedStyle(cell);
                const paddingLeft = computedStyle.getPropertyValue('padding-left');
                const paddingRight = computedStyle.getPropertyValue('padding-right');

                cell.style.cssText = '';
                cell.style.backgroundColor = 'inherit';
                cell.style.border = '1px solid #EBEEF5';
                cell.style.padding = `12px ${paddingRight} 12px ${paddingLeft}`;
                cell.style.position = 'relative';
                cell.style.boxSizing = 'border-box';

                const cellDiv = cell.querySelector('.cell');
                if (cellDiv) {
                  cellDiv.style.boxSizing = 'border-box';
                  cellDiv.style.overflow = 'hidden';
                  cellDiv.style.textOverflow = 'ellipsis';
                }
              });
            });

            // 处理克隆表格的表头
            clonedTable.querySelectorAll('.el-table__header th').forEach(th => {
              th.style.backgroundColor = '#F5F7FA';
              th.style.border = '1px solid #EBEEF5';
              th.style.padding = '12px';
              th.style.fontWeight = '600';
              th.style.color = '#606266';
            });

            // 确保克隆表格最后一行的边框显示正确
            if (rows.length > 0) {
              const lastRow = rows[rows.length - 1];
              lastRow.querySelectorAll('td').forEach(cell => {
                cell.style.borderBottom = '1px solid #EBEEF5';
              });
            }
          });
        }
      }
    });

    // 恢复原始样式
    tables.forEach(table => {
      const state = originalStyles.get(table);
      if (state) {
        // 恢复表格样式
        Object.keys(state.style).forEach(prop => {
          table.style[prop] = state.style[prop];
        });

        // 恢复行样式
        table.querySelectorAll('.el-table__body tr').forEach((row, index) => {
          const rowStyle = state.rowStyles.get(index);
          if (rowStyle) {
            Object.keys(rowStyle).forEach(prop => {
              row.style[prop] = rowStyle[prop];
            });
          }

          // 恢复单元格样式
          row.querySelectorAll('td').forEach((cell, cellIndex) => {
            const cellStyle = state.cellStyles.get(`${index}-${cellIndex}`);
            if (cellStyle) {
              Object.keys(cellStyle).forEach(prop => {
                cell.style[prop] = cellStyle[prop];
              });
            }
          });
        });
      }
    });

    // 恢复滚动位置
    window.scrollTo(0, originalScrollTop);

    // 转换为图片
    const imgData = canvas.toDataURL('image/png');

    if (/mobile|android|iphone/i.test(navigator.userAgent)) {
      // 移动端预览
      const previewContainer = document.createElement('div');
      previewContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 9998;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      `;

      const imgContainer = document.createElement('div');
      imgContainer.style.cssText = `
        padding: 20px;
        width: 100%;
        box-sizing: border-box;
      `;

      const img = document.createElement('img');
      img.src = imgData;
      img.style.cssText = `
        width: 100%;
        height: auto;
        display: block;
      `;

      const hint = document.createElement('div');
      hint.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        text-align: center;
        z-index: 9999;
      `;
      hint.textContent = '长按图片可保存';

      imgContainer.appendChild(img);
      previewContainer.appendChild(imgContainer);
      document.body.appendChild(previewContainer);
      document.body.appendChild(hint);

      previewContainer.onclick = () => {
        document.body.removeChild(previewContainer);
        document.body.removeChild(hint);
      };

      setTimeout(() => {
        if (document.body.contains(hint)) {
          document.body.removeChild(hint);
        }
      }, 3000);
    } else {
      // 桌面端下载
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = source === 'report' ? `周报_${timestamp}.png` : `任务列表_${timestamp}.png`;
      link.href = imgData;
      link.click();
    }

    ElMessage.success("截图已生成");
  } catch (error) {
    console.error("截图失败:", error);
    ElMessage.error("截图失败：" + error.message);
  }
};

onMounted(() => {
  if (tokenSettingsRef.value?.isConfigured()) {
    fetchTasks();
  }
});
</script>

<style scoped>
.container {
  padding: 20px;
  max-width: 100%;
  box-sizing: border-box;
  background-color: #ffffff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-buttons :deep(.el-button) {
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-buttons :deep(.el-button.is-circle) {
  width: 32px;
  height: 32px;
  padding: 8px;
  min-height: unset;
}

.action-buttons :deep(.el-icon) {
  width: 16px;
  height: 16px;
}

.main-content {
  flex: 1;
  background: #ffffff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.task-section {
  margin-bottom: 30px;
}

.task-section:last-child {
  margin-bottom: 0;
}

.task-section h3 {
  margin: 0 0 15px;
  font-size: 16px;
  color: #333;
}

.report-content {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  line-height: 1.5;
  font-size: 14px;
  margin: 0;
}

.report-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
}

:deep(.el-dialog) {
  max-width: 95%;
  margin: 5vh auto !important;
}

:deep(.el-dialog__body) {
  padding: 0;
  background-color: #ffffff;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background-color: #ffffff;
}

.dialog-footer .el-button {
  min-width: 100px;
}

@media screen and (max-width: 768px) {
  .container {
    padding: 10px;
  }

  .main-content {
    padding: 15px;
  }

  .action-buttons {
    gap: 6px;
  }

  .task-section h3 {
    font-size: 14px;
  }

  .report-content {
    padding: 15px;
    font-size: 13px;
  }

  .dialog-footer {
    padding: 12px;
    gap: 8px;
  }

  .dialog-footer .el-button {
    flex: 1;
    min-width: 0;
  }
}
</style>
