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

    const comment = `### 🚀 Automatic Evaluation Report`;
    // Post the comment to the PR
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: comment
    });

    core.info(`✅ Comment posted to PR #${prNumber}`);
  } catch (error: any) {
    core.setFailed(`❌ Action failed: ${error.message}`);
    core.setFailed(`${error.stack}`);
  }
}

run();
