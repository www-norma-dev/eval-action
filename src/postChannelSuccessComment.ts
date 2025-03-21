import { endGroup, startGroup, info, error } from '@actions/core';
import type { GitHub } from '@actions/github/lib/utils';
import { Context } from '@actions/github/lib/context';

/**
 * Posts or updates a comment on a pull request with the evaluation report.
 * Make sure your workflow YAML grants the GITHUB_TOKEN proper permissions:
 * 
 * permissions:
 *   contents: read
 *   pull-requests: write
 *   issues: write
 *
 * @param github - An instance of Octokit authenticated with GITHUB_TOKEN.
 * @param context - The GitHub Actions context.
 * @param result - The evaluation result string.
 * @param commit - The commit SHA or identifier.
 */
export async function postChannelSuccessComment(
  github: InstanceType<typeof GitHub>,
  context: Context,
  result: string,
  commit: string,
  api_host: string,
  type: string,
  test_name: string
): Promise<void> {
  startGroup('Commenting on PR');

  try {
    const commentMarker = '<!-- norma-eval-comment -->';
    const commentBody = `${commentMarker}
    ### 🚀 Automatic Evaluation Report
    
    - **API Host:** \`${api_host}\`
    - **Type:** \`${type}\`
    - **Test Name:** \`${test_name}\`
    - **Result:** ${result}  
    
    <sub>
    🔍 If you need to make changes, update your branch and rerun the workflow.  
    🔄 _This comment was posted automatically by [Eval Action](https://github.com/www-norma-dev/eval-action)._  
    Posted by GitHub Actions Bot
    </sub>`;
    

    const { owner, repo } = context.repo;
    let prNumber: number | undefined;

    // Use the PR number from the payload if available
    if (context.payload.pull_request && context.payload.pull_request.number) {
      prNumber = context.payload.pull_request.number;
      console.log(`Pull request found in payload: #${prNumber}`);
    } else {
      // For push events, derive branch name from context.ref
      const branchName = context.ref.replace('refs/heads/', '');

      // Find open PRs with the current branch as head
      const { data: pullRequests } = await github.rest.pulls.list({
        owner,
        repo,
        head: `${owner}:${branchName}`,
        state: 'open'
      });

      if (pullRequests.length === 0) {
        console.log('⚠️ No open PR found for this branch. Skipping comment.');
        return;
      }
      prNumber = pullRequests[0].number;
      console.log(`Found open PR #${prNumber} for branch ${branchName}`);
    }

    if (!prNumber) {
      console.log('⚠️ No PR number determined. Exiting.');
      return;
    }

    // Retrieve existing comments on the PR
    const { data: existingComments } = await github.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    });

    // Look for an existing comment with the marker
    const existingComment = existingComments.find((c: any) =>
      c.body && c.body.includes(commentMarker)
    );

    if (existingComment) {
      // Update the existing comment
      await github.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody
      });
      info(`✅ Updated existing comment in PR #${prNumber}`);
    } else {
      // Create a new comment if no matching comment was found
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody
      });
      info(`✅ Created new comment in PR #${prNumber}`);
    }
  } catch (e: any) {
    error(`Error posting/updating comment: ${e.message}`);
  } finally {
    endGroup();
  }
}
