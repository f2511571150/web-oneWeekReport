# Azure DevOps Week Report Web

A web version of the Azure DevOps weekly report generator, built with Vue 3 (frontend) and Express.js (backend).

## Features

- Azure DevOps integration
- Weekly task summary
- Task filtering by project
- Screenshot capture
- Report generation and copying
- Responsive web interface

## Project Structure

The project consists of two main parts:

- `frontend/`: Vue 3 + Vite frontend application
- `backend/`: Express.js backend server

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Azure DevOps account and Personal Access Token

## Setup and Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/oneWeekReportWeb.git
cd oneWeekReportWeb
```

2. Install and start the backend:
```bash
cd backend
npm install
npm run dev
```

3. Install and start the frontend:
```bash
cd ../frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

## Configuration

1. Click the settings button in the application
2. Enter your Azure DevOps Personal Access Token
3. Enter your organization name
4. Add the projects you want to track

## License

MIT License
