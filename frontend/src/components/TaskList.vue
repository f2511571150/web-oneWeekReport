<template>
  <div class="task-list">
    <div v-if="type === 'created'" class="task-header">
      Created Task Total Original Estimate = {{ totalWorkTime }} 小时
    </div>
    <div v-if="type === 'closed'" class="task-header">
      Closed Task Total Completed Work = {{ totalWorkTime }} 小时
    </div>
    <div v-if="type === 'bugs'" class="task-header">
      Closed And Resolved Bug Total Completed Work = {{ totalWorkTime }} 小时
    </div>
    <div v-if="type === 'active'" class="task-header">
      New or Active Task Total Original Estimate = {{ totalWorkTime }} 小时
    </div>

    <el-table
      :data="tasks"
      style="width: 100%"
      v-loading="loading"
      border
      align="left"
      size="small"
      :header-cell-style="{
        background: '#f5f7fa',
        color: '#000',
      }"
    >
      <el-table-column
        prop="id"
        label="Task ID"
        width="80"
        align="center"
        header-align="center"
      >
        <template #default="{ row }">
          <el-link type="primary" :href="getTaskUrl(row.id)" target="_blank">
            {{ row.id }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column
        prop="project"
        label="Project"
        width="100"
        align="center"
        header-align="center"
      />
      <el-table-column
        prop="taskName"
        label="Task Name"
        min-width="200"
        align="left"
        header-align="left"
      />
      <el-table-column
        :prop="workTimeField"
        :label="
          type === 'bugs'
            ? 'Completed Work'
            : type === 'active'
              ? 'Original Estimate'
              : workTimeLabel
        "
        width="150"
        align="center"
        header-align="center"
      />
      <el-table-column
        prop="parentUserStory"
        label="Parent User Story"
        min-width="200"
        align="left"
        header-align="left"
      >
        <template #default="{ row }">
          <span v-if="!row.parentUserStory">-</span>
          <template v-else>
            {{ row.parentUserStory }}
          </template>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  tasks: {
    type: Array,
    default: () => [],
  },
  type: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

// 根据任务类型确定工时字段
const workTimeField = computed(() => {
  switch (props.type) {
    case "created":
    case "active":
      return "originalEstimate";
    case "closed":
    case "bugs":
      return "completedWork";
    default:
      return "originalEstimate";
  }
});

const workTimeLabel = computed(() => {
  switch (props.type) {
    case "created":
      return "Original Estimate";
    case "closed":
      return "Completed Work";
    case "bugs":
      return "Completed Work";
    case "active":
      return "Original Estimate";
    default:
      return "Work Time";
  }
});

// 计算总工时
const totalWorkTime = computed(() => {
  const total = props.tasks.reduce(
    (sum, task) => sum + (task[workTimeField.value] || 0),
    0
  );
  return Math.floor(total * 10) / 10;
});

// 获取任务链接
const getTaskUrl = (taskId) => {
  const settings = JSON.parse(
    localStorage.getItem("azureDevOpsSettings") || "{}"
  );
  const { organization } = settings;
  return `https://dev.azure.com/${organization}/_workitems/edit/${taskId}`;
};
</script>

<style scoped>
.task-list {
  margin-bottom: 20px;
  width: 100%;
  overflow-x: auto;
}

:deep(.el-table) {
  width: 100%;
}

:deep(.el-table__cell) {
  padding: 8px;
}

@media screen and (max-width: 768px) {
  .task-list {
    margin: 0 -10px;
    width: calc(100% + 20px);
  }

  :deep(.el-table) {
    font-size: 14px;
  }

  :deep(.el-table__cell) {
    padding: 5px 8px;
  }

  :deep(.el-table .cell) {
    white-space: normal;
    word-break: break-word;
  }

  :deep(.el-table__body-wrapper) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  :deep(.el-table__header-wrapper) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
