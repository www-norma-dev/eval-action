import * as core from '@actions/core';
import * as github from '@actions/github';
import { postChannelSuccessComment } from './postChannelSuccessComment';

async function run(): Promise<void> {
  const token = process.env.GITHUB_TOKEN || core.getInput("repoToken");
  const octokit = token ? github.getOctokit(token) : undefined;

  try {
    const isPullRequest = !!github.context.payload.pull_request;


    let finish = (details: Object) => console.log(details);
    if (token && isPullRequest) {
      core.setSecret("This is a secret token");
      core.setSecret(token);
      console.log('--------- postChannelSuccessComment start');
    }

    if (token && isPullRequest && !!octokit) {
      const commitId = github.context.payload.pull_request?.head.sha.substring(0, 7);

      await postChannelSuccessComment(octokit, github.context, "success", commitId);
      console.log('--------- postChannelSuccessComment complete');
      // logs 
    }
    // const token = process.env.GITHUB_TOKEN;
    // if (!token) {
    //   core.setFailed("❌ GITHUB_TOKEN is not set.");
    //   return;
    // }
    return;
  }

  catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
