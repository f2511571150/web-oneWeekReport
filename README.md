# Azure DevOps 周报生成器（Web版）

一个基于 Web 的 Azure DevOps 周报生成器，使用 Vue 3（前端）和 Express.js（后端）构建。这是原 Electron 版本的 Web 实现。

## 功能特点

- Azure DevOps 任务集成
- 周报任务汇总
- 按项目筛选任务
- 任务列表截图
- 周报生成和复制
- 响应式网页界面

## 项目结构

项目包含两个主要部分：

- `frontend/`: 基于 Vue 3 + Vite 的前端应用
- `backend/`: 基于 Express.js 的后端服务器

## 环境要求

- Node.js（v14 或更高版本）
- npm 或 yarn
- Azure DevOps 账号和个人访问令牌（PAT）

## 安装和运行

1. 克隆仓库：
```bash
git clone https://github.com/f2511571150/web-oneWeekReport.git
cd web-oneWeekReport
```

2. 安装并启动后端：
```bash
cd backend
npm install
npm run dev
```

3. 安装并启动前端：
```bash
cd ../frontend
npm install
npm run dev
```

应用将在 `http://localhost:5173` 运行

## 配置说明

1. 点击应用中的设置按钮
2. 输入你的 Azure DevOps 个人访问令牌（PAT）
3. 输入你的组织名称
4. 添加要跟踪的项目

## 使用方法

1. 首次使用需要配置 Azure DevOps 设置
2. 点击刷新按钮获取最新任务
3. 查看按状态分类的任务列表：
   - 新建的任务
   - 完成的任务
   - 解决的 Bug
   - 进行中的任务
4. 生成周报并复制到剪贴板
5. 可以随时截图保存任务列表

## 开发说明

- 前端使用 Vue 3 + Vite + Element Plus
- 后端使用 Express.js
- 使用 Azure DevOps REST API 获取任务数据

## 许可证

MIT 许可证
