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

    // Extract branch name from the pull_request payload if available,
    // otherwise fallback to removing "refs/heads/" from the ref.
    const branchName = github.context.payload.pull_request
      ? github.context.payload.pull_request.head.ref
      : github.context.ref.replace("refs/heads/", "");
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
      parsedScenarios = {}; // Fallback to empty object
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
        scenarios: parsedScenarios
      })
    });
    
    console.log('---------- RESPONSE ---------');
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

    // Construct the comment message with a hidden marker to identify it later.
    const commentBody = `<!-- norma-eval-comment -->
### 🚀 Automatic Evaluation Report
**Hello ${name},**
  
📌 **Test Details:**
- **API Host:** \`${api_host}\`
- **Type:** \`${type}\`
- **Test Name:** \`${test_name}\`
  
🔍 **Results:**

${md}

---

🔍 If you need to make changes, update your branch and rerun the workflow.

🔄 _[Eval Action](https://eval.norma.dev/)._`;

    console.log(formatTableForConsole(apiResponse.results));

    // Retrieve existing comments on the PR
    const { data: existingComments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    // Look for our comment using the unique hidden marker
    const existingComment = existingComments.find((c: any) =>
      c.body && c.body.includes("<!-- norma-eval-comment -->")
    );

    if (existingComment) {
      // Update the existing comment
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      core.info(`✅ Updated existing comment in PR #${prNumber}`);
    } else {
      // Create a new comment
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
      core.info(`✅ Created new comment in PR #${prNumber}`);
    }
  } catch (error: any) {
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}

function convertJsonToMarkdownTable(jsonData: any): string {
  let markdownOutput = "# Conversation Logs\n\n";
  markdownOutput += `| Scenario | GPT Score | Mistral Score |\n`;
  markdownOutput += `|----|----------|---------|\n`;

  jsonData.forEach((entry: any) => {
    markdownOutput += `| ${entry["Scenario"]} | ${entry["New Conv Evaluation (GPT-4)"]} | ${entry["New Conv Evaluation (Mistral)"]} |\n`;
  });

  return markdownOutput;
}

function formatTableForConsole(jsonData: any[]): string {
  if (!jsonData || jsonData.length === 0) return "No results to display.";

  const headers = ["Attempt", "Conversation ID", "User Message", "Expected Response", "New Conv Outbound", "GPT-4 Score", "Mistral Score"];
  const columnWidths = headers.map((header, i) =>
    Math.max(header.length, ...jsonData.map(row => (row[headers[i]] ? row[headers[i]].toString().length : 0)))
  );

  let table = headers.map((header, i) => header.padEnd(columnWidths[i])).join(" | ") + "\n";
  table += columnWidths.map(width => "-".repeat(width)).join("-|-") + "\n";

  jsonData.forEach(row => {
    table += headers.map((header, i) => (row[header] ? row[header].toString().padEnd(columnWidths[i]) : "-".padEnd(columnWidths[i]))).join(" | ") + "\n";
  });

  return table;
}

run();
