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
        // Get the input defined in your action.yml (e.g., "who-to-greet")
        const name = core.getInput('who-to-greet');
        const api_host = core.getInput('api_host');
        const x_api_key = core.getInput('x_api_key');
        const type = core.getInput('type');
        const test_name = core.getInput('test_name');
        const scenarios = core.getInput('scenarios');
        // Log to the workflow output for debugging
        console.log(`Hello, ${name}!`);
        console.log(`api_host, ${api_host}!`);
        console.log(`x_api_key, ${x_api_key}!`);
        console.log(`type, ${type}!`);
        console.log(`test_name, ${test_name}!`);
        console.log(`scenarios, ${scenarios}!`);
        // Only attempt to post a comment if this event is a pull request
        if (github.context.payload.pull_request) {
            const prNumber = github.context.payload.pull_request.number;
            // Use the GITHUB_TOKEN passed into the action via the environment
            const token = process.env.GITHUB_TOKEN;
            if (!token) {
                core.setFailed('GITHUB_TOKEN is not set.');
                return;
            }
            const octokit = github.getOctokit(token);
            const { owner, repo } = github.context.repo;
            // Construct the comment message
            const comment = `Hello ${name}`;
            await octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: prNumber,
                body: comment
            });
            core.info(`Posted comment to PR #${prNumber}: ${comment}`);
        }
        else {
            core.info("This event is not a pull request; no comment was posted.");
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
