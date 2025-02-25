import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import fs from 'fs';

async function run(): Promise<void> {
  try {

    const appId = process.env.APP_ID;
    const privateKey = process.env.PRIVATE_KEY;
    const installationId = process.env.INSTALLATION_ID;

    const filePath = './GH_APP_PRIVATE_KEY.txt'; // assuming your file is named qqq.txt
    const fileContent = fs.readFileSync(filePath, 'utf8');

    console.log(fileContent);

    // if (!appId || !privateKey || !installationId) {
    //   core.setFailed("❌ GitHub App credentials (APP_ID, PRIVATE_KEY, INSTALLATION_ID) are not set.");
    //   return;
    // }

    // Create an authentication strategy using your GitHub App
    const auth = createAppAuth({
      appId: 1158043,
      privateKey: fileContent.replace(/\\n/g, "\n"),
      installationId: "61665610"
    });

    const { token } = await auth({ type: "installation" });

    const octokit = new Octokit({ auth: token });
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

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: "👋 Hello from GitHub Actions!",
    });



    // Retrieve inputs from action.yml
    const name: string = core.getInput("who-to-greet");
    const api_host: string = core.getInput("api_host");
    const x_api_key: string = core.getInput("x_api_key");
    const type: string = core.getInput("type");
    const test_name: string = core.getInput("test_name");
    const scenarios: string = core.getInput("scenarios");

    console.log(`🔄 Sending API request to: ${api_host}`);

    console.log(scenarios);


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
        scenarios
      }),
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
    const apiResponse = await response.json();
    console.log("✅ API Response Received:", apiResponse);

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

run();
