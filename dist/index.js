"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
async function run() {
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
        const name = core.getInput('who-to-greet');
        const api_host = core.getInput('api_host');
        const x_api_key = core.getInput('x_api_key');
        const type = core.getInput('type');
        const test_name = core.getInput('test_name');
        const scenarios = core.getInput('scenarios');
        // Construct the comment message
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
        core.info(`✅ Comment posted to PR #${prNumber}`);
    }
    catch (error) {
        core.setFailed(`❌ Action failed: ${error.message}`);
    }
}
run();
