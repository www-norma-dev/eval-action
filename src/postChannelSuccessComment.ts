import { endGroup, startGroup } from "@actions/core";
import type { GitHub } from "@actions/github/lib/utils";
import { Context } from "@actions/github/lib/context";

export async function postChannelSuccessComment(
  github: InstanceType<typeof GitHub>,
  context: Context,
  result: string,
  commit: string
) {
  // Build the comment body with a hidden marker.
  const commentBody = `<!-- norma-eval-comment -->
### 🚀 Automatic Evaluation Report
**Result:** ${result}  
**Commit:** ${commit}

<sub>Posted by GitHub Actions Bot</sub>`;


// Use the pull request number if available, otherwise fall back to context.issue.number.
const issueNumber = context.payload.pull_request
? context.payload.pull_request.number
: context.issue.number;

const createResponse = await github.rest.issues.createComment({
    ...context.repo,
    issue_number: issueNumber,
    body: commentBody,
  });
  
  const commentInfo = {
    ...context.repo,
    issue_number: issueNumber,
  };

  startGroup("Commenting on PR");
  console.log("Comment info:", commentInfo);

  let commentId: number | undefined;
  try {
    // List existing comments on the PR/issue.
    const { data: comments } = await github.rest.issues.listComments(commentInfo);
    console.log("Existing comments:", comments);
    // Look for a comment containing our hidden marker.
    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      if (c.body && c.body.includes("<!-- norma-eval-comment -->")) {
        commentId = c.id;
        break;
      }
    }
  } catch (e: any) {
    console.log("Error checking for previous comments:", e.message);
  }

  try {
    if (commentId) {
      // Update the existing comment.
      const updateResponse = await github.rest.issues.updateComment({
        ...context.repo,
        comment_id: commentId,
        body: commentBody,
      });
      console.log(`✅ Updated existing comment (ID: ${commentId}). Response:`, updateResponse.data);
    } else {
      // Create a new comment if one doesn't exist.
      const createResponse = await github.rest.issues.createComment({
        ...context.repo,
        issue_number: issueNumber,
        body: commentBody,
      });
      console.log(`✅ Created new comment (ID: ${createResponse.data.id}). Response:`, createResponse.data);
    }
  } catch (e: any) {
    console.log(`Error posting/updating comment: ${e.message}`);
  }
  endGroup();
}
