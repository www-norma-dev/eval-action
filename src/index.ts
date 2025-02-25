import * as core from '@actions/core';
import * as github from '@actions/github';

async function run(): Promise<void> {
  try {
    // Retrieve inputs from action.yml
    const name: string = core.getInput('who-to-greet');
    const api_host: string = core.getInput('api_host');
    const x_api_key: string = core.getInput('x_api_key');
    const type: string = core.getInput('type');
    const test_name: string = core.getInput('test_name');
    const scenarios: string = core.getInput('scenarios');

    // Debug: Log inputs
    console.log(`Received Inputs:`);
    console.log(`  - who-to-greet: ${name}`);
    console.log(`  - api_host: ${api_host}`);
    console.log(`  - x_api_key: ${x_api_key}`);
    console.log(`  - type: ${type}`);
    console.log(`  - test_name: ${test_name}`);
    console.log(`  - scenarios: ${scenarios}`);

    // Check if event is triggered by a pull request
    console.log('================== github.context.payload =============');
    console.log(github.context.payload);
    if (!github.context.payload.pull_request) {
      core.info("This event is not a pull request; no comment will be posted.");
      return;
    }

    const prNumber = github.context.payload.pull_request.number;
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      core.setFailed("GITHUB_TOKEN is not set.");
      return;
    }

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    // Construct a well-formatted comment
    const comment = `### 🚀 Automatic Evaluation Report
**Hello ${name},**
  
This message was generated automatically by the GitHub Action.

📌 **Test Details:**
- **API Host:** \`${api_host}\`
- **Type:** \`${type}\`
- **Test Name:** \`${test_name}\`
  
📝 **Scenarios:**
\`\`\`json
${scenarios}
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

    core.info(`✅ Posted comment to PR #${prNumber}`);
  } catch (error: any) {
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}

run();
