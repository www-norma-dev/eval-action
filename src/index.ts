import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

async function run(): Promise<void> {
  try {
    // 1. Read GitHub App secrets from environment
    const appId = process.env.GH_APP_ID;
    // Replace escaped \n with real newlines
    const privateKey = process.env.GH_APP_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!appId || !privateKey) {
      core.setFailed("❌ GH_APP_ID or GH_APP_PRIVATE_KEY is not set in secrets.");
      return;
    }

    // 2. Generate a JWT (JSON Web Token) for the GitHub App
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,        // Issued at (backdate 60s to allow clock drift)
      exp: now + (10 * 60), // Expires in 10 minutes
      iss: appId            // GitHub App's App ID
    };
    const appJwt = jwt.sign(payload, privateKey, { algorithm: "RS256" });

    // 3. Find the installation ID for this repository
    const instRes = await fetch("https://api.github.com/app/installations", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    if (!instRes.ok) {
      const errorText = await instRes.text();
      core.setFailed(`❌ Failed to list installations: ${errorText}`);
      return;
    }

    const installations = await instRes.json();
    if (!Array.isArray(installations) || installations.length === 0) {
      core.setFailed("❌ No installations found for this GitHub App.");
      return;
    }

    // If you have multiple installations, you may need custom logic
    // to find the exact installation ID that matches the current repo.
    // For simplicity, we'll just take the first installation:
    const installationId = installations[0].id;
    console.log(`🔑 Found installation ID: ${installationId}`);

    // 4. Exchange the JWT for an Installation Access Token
    const tokenRes = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: "application/vnd.github.v3+json"
        }
      }
    );

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      core.setFailed(`❌ Failed to get installation token: ${errorText}`);
      return;
    }

    const tokenData: any = await tokenRes.json();
    const installationToken = tokenData.token;
    console.log("✅ Successfully retrieved installation token.");

    // 5. Use the installation token with Octokit
    const octokit = github.getOctokit(installationToken);
    const { owner, repo } = github.context.repo;

    // 6. Identify the branch from the push event
    const branchName = github.context.ref.replace("refs/heads/", "");
    console.log(`📌 Current branch: ${branchName}`);

    // 7. Check if there's an open PR for this branch
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

    // 8. Read inputs from action.yml
    const name: string = core.getInput("who-to-greet");
    const api_host: string = core.getInput("api_host");
    const x_api_key: string = core.getInput("x_api_key");
    const type: string = core.getInput("type");
    const test_name: string = core.getInput("test_name");
    const scenarios: string = core.getInput("scenarios");

    console.log(`🔄 Sending API request to: ${api_host}`);
    console.log("Scenarios Input:", scenarios);

    // 9. Make the API POST request (example code from your snippet)
    const response = await fetch("https://europe-west1-norma-dev.cloudfunctions.net/eval-norma-v-0", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        apiHost: api_host,
        x_api_key,
        type,
        test_name,
        scenarios
      }),
    });

    console.log('---------- RESPONSE INFO ---------');
    console.log('Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      core.setFailed(`❌ API request failed with status ${response.status}: ${errorText}`);
    //   return;
    }

    const apiResponse = await response.json();
    console.log("✅ API Response Received:", apiResponse);

    // 10. Construct the comment message
    const comment = `### 🚀 Automatic Evaluation Report
**Hello ${name},**
  
This message was generated automatically by our custom GitHub App (Eval Action).

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

🔄 _Posted by [Eval Action](https://github.com/www-norma-dev/eval-action) using a GitHub App._`;

    // 11. Post the comment to the PR
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
