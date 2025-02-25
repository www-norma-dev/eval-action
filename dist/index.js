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
        // Retrieve inputs from action.yml
        const name = core.getInput('who-to-greet');
        const api_host = core.getInput('api_host');
        const x_api_key = core.getInput('x_api_key');
        const type = core.getInput('type');
        const test_name = core.getInput('test_name');
        const scenarios = core.getInput('scenarios');
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
    }
    catch (error) {
        core.setFailed(`❌ Action failed: ${error.message}`);
    }
}
run();
