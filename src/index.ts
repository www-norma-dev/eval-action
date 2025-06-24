import { runGetComment } from './usecases/multiAgent/get';
import { runPostComment } from './usecases/multiAgent/post';
import * as github from '@actions/github';
import * as core from '@actions/core';

/**  
 * This is the main file to have all jobs being ran by a .yaml workflow called from a Github repository
*/

async function run(): Promise<void> {
  try {
    const token = process.env.GITHUB_TOKEN || core.getInput("repoToken");
    if (!token) {
      core.setFailed("❌ GITHUB_TOKEN is not set.");
      return;
    }
    // Github configuration
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    // Determine branch name (from pull_request payload if available)
    const branchName = github.context.payload.pull_request
      ? github.context.payload.pull_request.head.ref
      : github.context.ref.replace("refs/heads/", "");
    console.log(`📌 Current branch: ${branchName}`);

    // Fetch open PRs with this branch as head
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${branchName}`,
      state: "open",
    });

    if (pullRequests.length === 0) {
      console.log("⚠️ No open PR found for this branch. Skipping comment.");
    }

    // Use the current commit SHA as the commit identifier
    const commit = process.env.GITHUB_SHA || 'N/A';

    // Call the function to run a batch and comment on the PR
  //  const {
    //  batch_id,
      //user_id,
     // project_id
   // } = await runPostComment(octokit, github.context, commit);

   let batch_id = "batch-386d668c-fac9-4919-bb84-92d1b440124f";
   let user_id = "0lE3okNgmKaPUQXbCikgsazgTNi1";
   let project_id = "f5ee240b-da4d-4bb1-8599-f175939eaa3f"


    // Call the function to fetch results and comment on the PR
    await runGetComment(
      octokit,
      github.context,
      user_id,
      project_id,
      batch_id,
    );
  } catch (error: any) {
    console.error(`❌ Error : ${error}`);
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}

run();