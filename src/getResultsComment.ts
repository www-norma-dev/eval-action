import { endGroup, startGroup, info, error, setFailed } from '@actions/core';
import type { GitHub } from '@actions/github/lib/utils';
import { Context } from '@actions/github/lib/context';
import axios from 'axios';
import { convertJsonToMarkdownTable } from '.';
export async function getResultsComment(
  github: InstanceType<typeof GitHub>,
  context: Context,
  user_id: string,
  project_id: string,
  batch_id: string
): Promise<void> {
  startGroup('Fetching results and commenting on PR');

  const baseUrl = 'https://evap-app-api-service-dev-966286810479.europe-west1.run.app';
  const url = `${baseUrl}/fetch_results/${user_id}/${project_id}/${batch_id}`;

  console.log("getResultComment.ts -- params:", user_id, project_id, batch_id)

  const maxAttempts = 10;
  const delayMs = 60000; // 1 min
  let attempt = 0;
  let response;
  let markdownResults = ''

  // 🔁 Polling loop
  while (attempt < maxAttempts) {
    try {
      response = await axios.get(url, {
        headers: { 'Content-Type': 'application/json' }
      });

      const status = response.data?.status;
      console.log(`⏳ Attempt ${attempt + 1} | Batch status: ${status}`);

      if (status === 'complete') {
        const scenarios = response.data?.results?.scenarios;
        if (scenarios && scenarios.length > 0) {
          console.log('📦 Raw scenarios:', JSON.stringify(scenarios, null, 2));
          markdownResults = convertJsonToMarkdownTable(
            scenarios,
            response.data.results.globalJustification
          );
          console.log('✅ Results ready and formatted.');
          break;
        } else {
          console.log('⚠️ Status is "complete" but no scenarios found yet.');
        }
      } else if (status === 'failed') {
        setFailed('❌ Batch processing failed.');
        return;
      } else {
        console.log(`⏳ Status is "${status}". Waiting...`);
      }
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 405) {
        console.log(`⏳ Results not ready yet (attempt ${attempt + 1})...`);
      } else {
        setFailed(`❌ Unexpected error: ${err.message}`);
        return;
      }
    }

    attempt++;
    await new Promise(res => setTimeout(res, delayMs));
  }

  if (!response || response.status !== 200 || !markdownResults) {
    setFailed(`❌ Failed to fetch valid results after ${maxAttempts} attempts.`);
    return;
  }

  // ✅ Process and post the comment
  try {
    console.log("GET results content:", response.data )
    const dashboardUrl = `https://eval-norma--norma-dev.europe-west4.hosted.app/dashboard/projects/${project_id}/batch/${batch_id}/multiAgent`;

    const commentMarker = '<!-- norma-eval-get-comment -->';
    const commentBody = `${commentMarker}
  ### ✅ Fetched evaluation results
  - **User ID:** \`${user_id}\`
  - **Project ID:** \`${project_id}\`
  - **Batch ID:** \`${batch_id}\`
  **Check results in the dashboard**:[url](${dashboardUrl})
  **Results table:**\n\n${markdownResults}
  
  
  <sub>🛠️ If you need to make changes, update your branch and rerun the workflow.</sub>
  `;
  
    const { owner, repo } = context.repo;

    let prNumber: number | undefined;
    if (context.payload.pull_request?.number) {
      prNumber = context.payload.pull_request.number;
    } else {
      const branchName = context.ref.replace('refs/heads/', '');
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
    }

    if (!prNumber) {
      console.log('⚠️ No PR number determined. Exiting.');
      return;
    }

    const { data: existingComments } = await github.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    });

    const existingComment = existingComments.find((c: any) =>
      c.body && c.body.includes(commentMarker)
    );

    if (existingComment) {
      await github.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody
      });
      info(`✅ Updated comment on PR #${prNumber}`);
    } else {
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody
      });
      info(`✅ Created new comment on PR #${prNumber}`);
    }

  } catch (err: any) {
    setFailed(`❌ Error posting comment: ${err.message}`);
  } finally {
    endGroup();
  }
}
