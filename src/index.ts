import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';

async function run(): Promise<void> {
  try {
    
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      core.setFailed("❌ GITHUB_TOKEN is not set.");
      return;
    }

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    // Get the branch name from the push event
    const branchName = github.context.ref.replace("refs/heads/", "");
    console.log(`📌 Current branch: ${branchName}`);

    // Fetch open PRs that have this branch as the head
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${branchName}`,
      state: "open",
    });

    if (pullRequests.length === 0) {
      console.log("⚠️ No open PR found for this branch. Skipping comment.");
      return;
    }

    const prNumber = pullRequests[0].number;
    console.log(`✅ Found open PR #${prNumber}`);

    // Retrieve inputs from action.yml
    const name: string = core.getInput("who-to-greet");
    const api_host: string = core.getInput("api_host");
    const x_api_key: string = core.getInput("x_api_key");
    const type: string = core.getInput("type");
    const test_name: string = core.getInput("test_name");
    const scenarios: string = core.getInput("scenarios");

    // Try parsing `scenarios` if it's a JSON string
    let parsedScenarios;
    try {
      parsedScenarios = JSON.parse(scenarios);
    } catch (error) {
      console.error("❌ Error parsing `scenarios`: Invalid JSON format.", error);
      parsedScenarios = {}; // Set to empty object or default value
    }
    
    console.log(`🔄 Sending API request to: ${api_host}`);
    console.log("Parsed scenarios:", parsedScenarios);
    
    // Make the API POST request
    const response = await fetch("https://europe-west1-norma-dev.cloudfunctions.net/eval-norma-v-0", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        apiHost: api_host,
        x_api_key,
        type,
        test_name,
        scenarios: parsedScenarios // Ensure it's a valid JSON object or array
      })
    });
    

    console.log('---------- RESP?SE ---------');
    console.log(response.status);
    console.log(response);
    if (!response.ok) {
      const errorText = await response.text();
      core.setFailed(`❌ API request failed with status ${response.status}: ${errorText}`);
      return;
    }

    // Parse response JSON
    const apiResponse: any = await response.json();
    console.log("✅ API Response Received:", apiResponse);

    const md = convertJsonToMarkdownTable(apiResponse.results);

    // Construct the comment message
    const comment = `### 🚀 Automatic Evaluation Report
**Hello ${name},**
  
This message was generated automatically by the GitHub Action.

📌 **Test Details:**
- **API Host:** \`${api_host}\`
- **Type:** \`${type}\`
- **Test Name:** \`${test_name}\`
  
📝 **Scenarios Sent:**
\`\`\`json
${JSON.stringify(scenarios, null, 2)}
\`\`\`

🔍 **API Response:**
\`\`\`json
${JSON.stringify(apiResponse, null, 2)}
\`\`\`

${md}

---

🔍 If you need to make changes, update your branch and rerun the workflow.

🔄 _This comment was posted automatically by [Eval Action](https://github.com/www-norma-dev/eval-action)._`;

    // Post the comment to the PR
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: comment,
    });

    core.info(`✅ Comment posted to PR #${prNumber}`);
  } catch (error: any) {
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}

function convertJsonToMarkdownTable(jsonData: any): string {
    let markdownOutput = "# Conversation Logs\n\n";

    // Define table headers
    markdownOutput += `| Attempt | Conversation ID | User Message | Expected Response | New Conversation Outbound | GPT-4 Score | Mistral Score |\n`;
    markdownOutput += `|---------|----------------|--------------|-------------------|-------------------------|-------------|--------------|\n`;

    jsonData.forEach((entry: any) => {
        markdownOutput += `| ${entry["Attempt"]} | \`${entry["Conversation ID"]}\` | ${entry["User Message"]} | ${entry["Expected Response"].substring(0, 50)}... | ${entry["New Conversation Outbound"].substring(0, 50)}... | ${entry["New Conv Evaluation (GPT-4)"]} | ${entry["New Conv Evaluation (Mistral)"]} |\n`;
    });

    return markdownOutput;
}



run();
