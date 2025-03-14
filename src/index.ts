import * as core from '@actions/core';
import * as github from '@actions/github';
import { postChannelSuccessComment } from './postChannelSuccessComment';

async function run(): Promise<void> {
  try {
    core.info('--------- START ');
    // Retrieve token from environment or input
    const token = process.env.GITHUB_TOKEN || core.getInput("repoToken");
    if (!token) {
      core.setFailed("❌ GITHUB_TOKEN is not set.");
      return;
    }
    core.info('--------- START GITHUB_TOKEN', token);

    const octokit = github.getOctokit(token);
    
    // Check if this event is a pull request
    const isPullRequest = !!github.context.payload.pull_request;
    core.info(`Is this a pull request event? ${isPullRequest}`);
    
    if (!isPullRequest) {
      core.info("This action only runs on pull_request events. Exiting.");
      return;
    }

    // Optionally, hide token from logs
    core.setSecret(token);

    core.info('--------- postChannelSuccessComment start');
    const commitId = github.context.payload.pull_request?.head.sha.substring(0, 7) || "unknown";

    // Call the function to post or update the comment
    await postChannelSuccessComment(octokit, github.context, "success", commitId);
    core.info('--------- postChannelSuccessComment complete');
    
  } catch (error: any) {
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}

run();
