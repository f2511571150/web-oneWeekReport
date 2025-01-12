const axios = require('axios');
const https = require('https');

class AzureDevOpsService {
  constructor() {
    this.baseUrl = "https://dev.azure.com";
    this.apiVersion = "7.0";
  }

  createAxiosInstance(token) {
    return axios.create({
      headers: {
        Authorization: `Basic ${Buffer.from(`:${token}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      httpsAgent: new https.Agent({  
        rejectUnauthorized: true,
        secureOptions: require('constants').SSL_OP_NO_TLSv1 | require('constants').SSL_OP_NO_TLSv1_1,
        ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3'
      }),
      timeout: 10000 // 10 seconds timeout
    });
  }

  async makeRequest(api, url, data) {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const response = await api.post(url, data);
        return response;
      } catch (error) {
        retryCount++;
        console.log(`Attempt ${retryCount} failed:`, error.message);
        
        if (retryCount === maxRetries) {
          throw error;
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  async getWorkItemsDetails(settings, ids) {
    if (!ids || ids.length === 0) return [];
    const { token, organization } = settings;
    const api = this.createAxiosInstance(token);
    
    try {
      // 获取工作项详情
      const response = await this.makeRequest(
        api,
        `${this.baseUrl}/${organization}/_apis/wit/workitemsbatch?api-version=${this.apiVersion}`,
        {
          ids,
          fields: [
            "System.Id",
            "System.Title",
            "System.State",
            "System.TeamProject",
            "System.Parent",
            "Microsoft.VSTS.Scheduling.OriginalEstimate",
            "Microsoft.VSTS.Scheduling.CompletedWork",
          ],
        }
      );

      const workItems = response.data.value || [];

      // 收集所有父工作项的ID
      const parentIds = workItems
        .map((item) => item.fields["System.Parent"])
        .filter((id) => id);

      // 如果有父工作项，获取它们的详情
      let parentItems = [];
      if (parentIds.length > 0) {
        const parentResponse = await this.makeRequest(
          api,
          `${this.baseUrl}/${organization}/_apis/wit/workitemsbatch?api-version=${this.apiVersion}`,
          {
            ids: parentIds,
            fields: ["System.Id", "System.Title"],
          }
        );
        parentItems = parentResponse.data.value || [];
      }

      // 创建父工作项ID到标题的映射
      const parentMap = new Map(
        parentItems.map((item) => [
          item.id,
          item.fields["System.Title"],
        ])
      );

      // 返回带有父工作项标题的工作项
      return workItems.map((item) => ({
        id: item.id,
        project: item.fields["System.TeamProject"],
        taskName: item.fields["System.Title"],
        parentUserStory: item.fields["System.Parent"]
          ? parentMap.get(item.fields["System.Parent"]) || `#${item.fields["System.Parent"]}`
          : "",
        originalEstimate: parseFloat(item.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"]) || 0,
        completedWork: parseFloat(item.fields["Microsoft.VSTS.Scheduling.CompletedWork"]) || 0,
      }));
    } catch (error) {
      console.error("Error fetching work items details:", error);
      throw error;
    }
  }

  async getCreatedTasks(settings, startDate, endDate) {
    const { token, organization } = settings;
    const api = this.createAxiosInstance(token);

    const query = `Select [System.Id], [System.Title], [System.State], [System.AssignedTo], [Microsoft.VSTS.Scheduling.OriginalEstimate], [System.TeamProject]
                  From WorkItems
                  Where [System.CreatedDate] >= '${startDate}'
                  AND [System.CreatedDate] < '${endDate}'
                  AND [System.WorkItemType] = 'Task'
                  AND [System.AssignedTo] = @Me
                  ORDER BY [System.CreatedDate] DESC`;

    try {
      const response = await this.makeRequest(
        api,
        `${this.baseUrl}/${organization}/_apis/wit/wiql?api-version=${this.apiVersion}`,
        { query }
      );

      if (response.data.workItems && response.data.workItems.length > 0) {
        const workItems = await this.getWorkItemsDetails(
          settings,
          response.data.workItems.map((item) => item.id)
        );
        return workItems;
      }
      return [];
    } catch (error) {
      console.error("Error fetching created tasks:", error);
      throw error;
    }
  }

  async getClosedTasks(settings, startDate, endDate) {
    const { token, organization } = settings;
    const api = this.createAxiosInstance(token);

    const query = `Select [System.Id], [System.Title], [System.State], [System.AssignedTo], [Microsoft.VSTS.Scheduling.CompletedWork], [System.TeamProject]
                  From WorkItems
                  Where [Microsoft.VSTS.Common.ClosedDate] >= '${startDate}'
                  AND [Microsoft.VSTS.Common.ClosedDate] < '${endDate}'
                  AND [System.WorkItemType] = 'Task'
                  AND [System.State] = 'Closed'
                  AND [System.AssignedTo] = @Me
                  ORDER BY [Microsoft.VSTS.Common.ClosedDate] DESC`;

    try {
      const response = await this.makeRequest(
        api,
        `${this.baseUrl}/${organization}/_apis/wit/wiql?api-version=${this.apiVersion}`,
        { query }
      );

      if (response.data.workItems && response.data.workItems.length > 0) {
        const workItems = await this.getWorkItemsDetails(
          settings,
          response.data.workItems.map((item) => item.id)
        );
        return workItems;
      }
      return [];
    } catch (error) {
      console.error("Error fetching closed tasks:", error);
      throw error;
    }
  }

  async getClosedBugs(settings, startDate, endDate) {
    const { token, organization } = settings;
    const api = this.createAxiosInstance(token);

    const query = `Select [System.Id], [System.Title], [System.State], [System.AssignedTo], [Microsoft.VSTS.Scheduling.CompletedWork], [System.TeamProject]
                  From WorkItems
                  Where [Microsoft.VSTS.Common.ResolvedDate] >= '${startDate}'
                  AND [Microsoft.VSTS.Common.ResolvedDate] < '${endDate}'
                  AND [System.WorkItemType] = 'Bug'
                  AND [System.State] IN ('Resolved', 'Closed')
                  AND [System.AssignedTo] = @Me
                  ORDER BY [Microsoft.VSTS.Common.ResolvedDate] DESC`;

    try {
      const response = await this.makeRequest(
        api,
        `${this.baseUrl}/${organization}/_apis/wit/wiql?api-version=${this.apiVersion}`,
        { query }
      );

      if (response.data.workItems && response.data.workItems.length > 0) {
        const workItems = await this.getWorkItemsDetails(
          settings,
          response.data.workItems.map((item) => item.id)
        );
        return workItems;
      }
      return [];
    } catch (error) {
      console.error("Error fetching closed bugs:", error);
      throw error;
    }
  }

  async getActiveOrNewTasks(settings) {
    const { token, organization } = settings;
    const api = this.createAxiosInstance(token);

    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const startDateStr = startDate.toISOString().split("T")[0];

    const query = `Select [System.Id], [System.Title], [System.State], [System.AssignedTo], [Microsoft.VSTS.Scheduling.OriginalEstimate], [System.TeamProject]
                  From WorkItems
                  Where [System.WorkItemType] = 'Task'
                  AND ([System.State] = 'New' OR [System.State] = 'Active')
                  AND [System.AssignedTo] = @Me
                  AND [System.ChangedDate] >= '${startDateStr}'
                  AND [System.ChangedDate] <= '${endDate}'
                  ORDER BY [System.ChangedDate] DESC`;

    try {
      const response = await this.makeRequest(
        api,
        `${this.baseUrl}/${organization}/_apis/wit/wiql?api-version=${this.apiVersion}`,
        { query }
      );

      if (response.data.workItems && response.data.workItems.length > 0) {
        const workItems = await this.getWorkItemsDetails(
          settings,
          response.data.workItems.map((item) => item.id)
        );
        return workItems;
      }
      return [];
    } catch (error) {
      console.error("Error fetching active tasks:", error);
      throw error;
    }
  }

  generateWeekReport(data) {
    const { createdTasks, closedTasks, closedBugs, activeTasks } = data;
    
    let report = "本周工作内容：\n\n";

    if (closedTasks.length > 0) {
      report += "1. 完成的任务：\n";
      closedTasks.forEach((task) => {
        report += `   - ${task.taskName} (${task.project})\n`;
      });
      report += "\n";
    }

    if (closedBugs.length > 0) {
      report += "2. 修复的Bug：\n";
      closedBugs.forEach((bug) => {
        report += `   - ${bug.taskName} (${bug.project})\n`;
      });
      report += "\n";
    }

    if (createdTasks.length > 0) {
      report += "3. 新建的任务：\n";
      createdTasks.forEach((task) => {
        report += `   - ${task.taskName} (${task.project})\n`;
      });
      report += "\n";
    }

    if (activeTasks.length > 0) {
      report += "4. 进行中的任务：\n";
      activeTasks.forEach((task) => {
        report += `   - ${task.taskName} (${task.project})\n`;
      });
      report += "\n";
    }

    return report;
  }
}

module.exports = new AzureDevOpsService();
