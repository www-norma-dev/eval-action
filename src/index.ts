import * as core from '@actions/core';
import * as github from '@actions/github';

async function run(): Promise<void> {
  try {
    // Get the input defined in your action.yml (e.g., "who-to-greet")
    const name: string = core.getInput('who-to-greet');
    const api_host: string = core.getInput('api_host');
    const x_api_key: string = core.getInput('x_api_key');
    const type: string = core.getInput('type');
    const test_name: string = core.getInput('test_name');
    const scenarios: string = core.getInput('scenarios');

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
    } else {
      core.info("This event is not a pull request; no comment was posted.");
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
