import * as core from '@actions/core';
import * as github from '@actions/github';

async function run(): Promise<void> {
  try {
    // Get the input defined in your action.yml (e.g., "who-to-greet")
    const name: string = core.getInput('who-to-greet');

    // Log to the workflow output for debugging
    console.log(`Hello, ${name}!`);

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
    } else {
      core.info("This event is not a pull request; no comment was posted.");
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
