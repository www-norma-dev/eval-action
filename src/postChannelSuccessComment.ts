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

    // Get the pull request number from the payload (or context.issue.number as fallback).
    const prNumber = context.payload.pull_request
      ? context.payload.pull_request.number
      : context.issue.number;

    if (!prNumber) {
      console.log("⚠️ No pull request number available in the context.");
      return;
    }
    console.log(`📌 PR Number: ${prNumber}`);

    // Log the current branch.
    const branchName = context.payload.pull_request
      ? context.payload.pull_request.head.ref
      : context.ref.replace("refs/heads/", "");
    console.log(`📌 Current branch: ${branchName}`);

    const { owner, repo } = context.repo;

    // Fetch existing comments on the PR.
    const { data: existingComments } = await github.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });
    console.log("Existing comments:", existingComments);

    // Look for a comment with our hidden marker.
    const existingComment = existingComments.find((c: any) =>
      c.body && c.body.includes("<!-- norma-eval-comment -->")
    );

    if (existingComment) {
      // Update the existing comment.
      const updateResponse = await github.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      info(`✅ Updated existing comment in PR #${prNumber}`);
      console.log("Update response:", updateResponse.data);
    } else {
      // Create a new comment.
      const createResponse = await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
      info(`✅ Created new comment in PR #${prNumber}`);
      console.log("Create response:", createResponse.data);
    }
  } catch (e: any) {
    console.log(`Error posting/updating comment: ${e.message}`);
  } finally {
    endGroup();
  }
}
