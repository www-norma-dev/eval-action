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

  // Use the repository and issue info from context.
  const commentInfo = {
    ...context.repo,
    issue_number: context.issue.number,
  };

  startGroup("Commenting on PR");

  let commentId: number | undefined;
  try {
    // List existing comments
    const { data: comments } = await github.rest.issues.listComments(commentInfo);
    // Look for a comment containing our hidden marker
    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      if (c.body && c.body.includes("<!-- norma-eval-comment -->")) {
        commentId = c.id;
        break;
      }
    }
  } catch (e: any) {
    console.log("Error checking for previous comments: " + e.message);
  }

  try {
    if (commentId) {
      // Update the existing comment
      await github.rest.issues.updateComment({
        ...context.repo,
        comment_id: commentId,
        body: commentBody,
      });
      console.log(`✅ Updated existing comment (ID: ${commentId}).`);
    } else {
      // Create a new comment if one doesn't exist
      const newComment = await github.rest.issues.createComment({
        ...context.repo,
        issue_number: context.issue.number,
        body: commentBody,
      });
      console.log(`✅ Created new comment (ID: ${newComment.data.id}).`);
    }
  } catch (e: any) {
    console.log(`Error posting/updating comment: ${e.message}`);
  }
  endGroup();
}
