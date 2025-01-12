<template>
  <div>
    <slot :openDialog="() => dialogVisible = true"></slot>

    <el-dialog
      v-model="dialogVisible"
      title="Azure DevOps 设置"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="form"
        label-width="150px"
        :rules="rules"
        ref="formRef"
        status-icon
        :label-position="isMobile ? 'top' : 'right'"
      >
        <el-form-item
          label="Personal Token"
          prop="token"
          :rules="[
            {
              required: true,
              message: '请输入Personal Access Token',
              trigger: 'blur',
            },
          ]"
        >
          <el-input
            v-model="form.token"
            placeholder="输入你的Personal Access Token"
            clearable
          >
            <template #append>
              <el-tooltip
                content="点击跳转到Azure DevOps生成Token页面"
                placement="top"
              >
                <el-button @click="openTokenPage">
                  <el-icon><Link /></el-icon>
                </el-button>
              </el-tooltip>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item
          label="Organization"
          prop="organization"
          :rules="[
            {
              required: true,
              message: '请输入Organization名称',
              trigger: 'blur',
            },
          ]"
        >
          <el-input
            v-model="form.organization"
            placeholder="输入你的Organization名称"
            clearable
          />
        </el-form-item>

        <el-form-item
          label="项目列表"
          prop="projects"
          :rules="[
            { required: true, message: '至少添加一个项目', trigger: 'change' },
          ]"
        >
          <div class="projects-container">
            <transition-group name="project-list">
              <div
                v-for="(project, index) in form.projects"
                :key="index"
                class="project-item"
              >
                <el-input
                  v-model="form.projects[index]"
                  placeholder="输入项目名称"
                  clearable
                  style="width: 300px;"
                >
                  <template #append>
                    <el-button
                      type="danger"
                      @click="removeProject(index)"
                      :disabled="form.projects.length === 1"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </template>
                </el-input>
              </div>
            </transition-group>
            <div class="project-actions">
              <el-button
                type="primary"
                @click="addProject"
                :icon="Plus"
                plain
                class="add-project-btn"
              >
                添加项目
              </el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button type="danger" @click="clearSettings" :loading="saving">
            清除设置
          </el-button>
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" @click="handleSave" :loading="saving">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { Delete, Plus, Link } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const emit = defineEmits(['save-success']);

const dialogVisible = ref(false);
const formRef = ref(null);
const saving = ref(false);
const isMobile = ref(window.innerWidth <= 768);

// 监听窗口大小变化
window.addEventListener('resize', () => {
  isMobile.value = window.innerWidth <= 768;
});

const form = ref({
  token: "",
  organization: "",
  projects: [""],
});

const addProject = () => {
  form.value.projects.push("");
};

const removeProject = (index) => {
  form.value.projects.splice(index, 1);
  if (form.value.projects.length === 0) {
    form.value.projects.push("");
  }
};

const openTokenPage = async () => {
  const organization = form.value.organization;
  try {
    window.open(`https://dev.azure.com/${organization}/_usersSettings/tokens`, '_blank');
    ElMessage.success("正在打开Token生成页面");
  } catch (error) {
    console.error("打开链接失败:", error);
    ElMessage.error("打开链接失败，请手动访问Azure DevOps网站");
  }
};

const handleCancel = () => {
  ElMessage.info("已取消设置");
  dialogVisible.value = false;
  loadSettings(); // 重置为原始设置
};

const handleSave = async () => {
  if (!formRef.value) return;

  try {
    saving.value = true;
    await formRef.value.validate();

    // 过滤掉空的项目名
    const validProjects = form.value.projects.filter((p) => p.trim());
    if (validProjects.length === 0) {
      ElMessage.warning("请至少添加一个有效的项目名称");
      return;
    }

    const settings = {
      token: form.value.token,
      organization: form.value.organization,
      projects: validProjects,
    };

    localStorage.setItem("azureDevOpsSettings", JSON.stringify(settings));
    dialogVisible.value = false;
    ElMessage.success("设置已保存");
    emit('save-success');
  } catch (error) {
    console.error("验证失败:", error);
    ElMessage.error("验证失败，请检查输入");
  } finally {
    saving.value = false;
  }
};

const clearSettings = () => {
  ElMessage.success("设置已清除");
  localStorage.removeItem("azureDevOpsSettings");
  form.value = {
    token: "",
    organization: "",
    projects: [""],
  };
  dialogVisible.value = false;
  emit('save-success');
};

const loadSettings = () => {
  const settings = localStorage.getItem("azureDevOpsSettings");
  if (settings) {
    const parsed = JSON.parse(settings);
    form.value = {
      ...parsed,
      projects: parsed.projects.length ? parsed.projects : [""],
    };
  }
};

const isConfigured = () => {
  const settings = localStorage.getItem("azureDevOpsSettings");
  if (!settings) return false;

  const { token, organization, projects } = JSON.parse(settings);
  return !!(
    token &&
    organization &&
    projects &&
    Array.isArray(projects) &&
    projects.length > 0
  );
};

const getSettings = () => {
  const settings = localStorage.getItem("azureDevOpsSettings");
  return settings ? JSON.parse(settings) : null;
};

onMounted(() => {
  loadSettings();
});

defineExpose({
  isConfigured,
  getSettings,
});
</script>

<style scoped>
.settings-form {
  padding: 20px;
}

.form-item {
  margin-bottom: 20px;
}

.project-list {
  margin-top: 10px;
}

.project-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.project-input {
  flex: 1;
  margin-right: 10px;
}

.add-project-btn {
  margin-top: 10px;
  width: 100%;
}

@media screen and (max-width: 768px) {
  .settings-form {
    padding: 10px;
  }

  :deep(.el-dialog) {
    width: 95% !important;
    max-height: 90vh;
    margin: 5vh auto !important;
  }

  :deep(.el-dialog__body) {
    padding: 10px;
    max-height: calc(90vh - 120px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  :deep(.el-form-item) {
    margin-bottom: 20px;
  }

  :deep(.el-form-item__label) {
    padding: 0 0 8px;
    line-height: 1.5;
    color: #606266;
    font-size: 14px;
  }

  :deep(.el-form--label-top .el-form-item__label) {
    margin-bottom: 8px;
  }

  :deep(.el-input) {
    width: 100%;
  }

  .project-item {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .project-input {
    margin-right: 0;
  }

  :deep(.el-button.is-circle) {
    padding: 8px;
    min-height: 32px;
  }

  :deep(.el-dialog__footer) {
    padding: 10px 15px;
    text-align: center;
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  :deep(.el-dialog__footer .el-button) {
    margin: 0;
    flex: 1;
    padding: 8px 15px;
    height: 36px;
    font-size: 14px;
  }

  .dialog-footer {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .dialog-footer .el-button {
    flex: 1;
  }
}
</style>
