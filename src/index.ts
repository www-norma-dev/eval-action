import { runGetComment } from './usecases/multiAgent/get';
import { runPostComment } from './usecases/multiAgent/post';
import * as github from '@actions/github';
import * as core from '@actions/core';

/**  
 * This is the main file to have all jobs being ran by a .yaml workflow called from a Github repository
*/

async function run(): Promise<void> {
  try {
    const isGitLab = !!process.env.GITLAB_CI;
    const token = process.env.GITHUB_TOKEN || core.getInput("repoToken");
    
    if (!token && !isGitLab) {
      core.setFailed("❌ GITHUB_TOKEN is not set.");
      return;
    }
    let user_id, project_id, batch_id;

    if (isGitLab) {
      console.log("Running from GitLab");
      let fakeContext = {} as any;

      const commit = process.env.CI_COMMIT_SHA || "N/A";

      fakeContext = { repo: {}, payload: {} };
      const fakeOctokit = {} as any;

      const res = await runPostComment(fakeOctokit, fakeContext, commit);
      batch_id = res.batch_id;
      user_id = res.user_id;
      project_id = res.project_id;

      await runGetComment(fakeOctokit, fakeContext, user_id, project_id, batch_id);

    } else {
      // GitHub mode
      console.log("Running from GitHub");
      const octokit = github.getOctokit(token);
      const { owner, repo } = github.context.repo;

      const branchName = github.context.payload.pull_request
        ? github.context.payload.pull_request.head.ref
        : github.context.ref.replace("refs/heads/", "");

      console.log(`📌 Current branch: ${branchName}`);

      const { data: pullRequests } = await octokit.rest.pulls.list({
        owner,
        repo,
        head: `${owner}:${branchName}`,
        state: "open",
      });

      if (pullRequests.length === 0) {
        console.log("⚠️ No open PR found for this branch. Skipping comment.");
      }

      const commit = process.env.GITHUB_SHA || 'N/A';

      const res = await runPostComment(octokit, github.context, commit);
      batch_id = res.batch_id;
      user_id = res.user_id;
      project_id = res.project_id;

      await runGetComment(octokit, github.context, user_id, project_id, batch_id);
    }

  } catch (error: any) {
    console.error(`❌ Error : ${error}`);
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}




run();