import { endGroup, startGroup, info } from "@actions/core";
import type { GitHub } from "@actions/github/lib/utils";
import { Context } from "@actions/github/lib/context";

export async function postChannelSuccessComment(
  github: InstanceType<typeof GitHub>,
  context: Context,
  result: string,
  commit: string
) {
  startGroup("Commenting on PR");

  try {
    // Build the comment body with a hidden marker.
    const commentBody = `<!-- norma-eval-comment -->
### 🚀 Automatic Evaluation Report
**Result:** ${result}  
**Commit:** ${commit}

<sub>Posted by GitHub Actions Bot</sub>`;

    // Determine the branch name.
    const branchName = context.payload.pull_request
      ? context.payload.pull_request.head.ref
      : context.ref.replace("refs/heads/", "");
    console.log(`📌 Current branch: ${branchName}`);

    const { owner, repo } = context.repo;

    // Fetch open PRs that have this branch as the head.
    const { data: pullRequests } = await github.rest.pulls.list({
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

    // Fetch existing comments on the PR.
    const { data: existingComments } = await github.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    // Look for a comment with our hidden marker.
    const existingComment = existingComments.find((c: any) =>
      c.body && c.body.includes("<!-- norma-eval-comment -->")
    );

    if (existingComment) {
      // Update the existing comment.
      await github.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      info(`✅ Updated existing comment in PR #${prNumber}`);
    } else {
      // Create a new comment.
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
      info(`✅ Created new comment in PR #${prNumber}`);
    }
  } catch (e: any) {
    console.log(`Error posting/updating comment: ${e.message}`);
  } finally {
    endGroup();
  }
}
