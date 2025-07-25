import { endGroup, startGroup, info, setFailed } from '@actions/core';
import convertJsonToMarkdownTable from '../../utils/markdown';
import type { GitHub } from '@actions/github/lib/utils';
import { Context } from '@actions/github/lib/context';
import axios from 'axios';

/**
 * Code that runs after the POST request that starts a model evaluation.
 * It does the following:
 *   1. Waits for the evaluation batch to finish (by polling a GET endpoint),
 *   2. Retrieves the evaluation results from the backend,
 *   3. Converts the results to a Markdown table,
 *   4. Creates or updates a comment with the results on the related Pull Request.
 *
 * It uses the user ID, project ID, and batch ID from the POST response.
 * @param github 
 * @param context 
 * @param user_id - Corresponds to the user identifier
 * @param project_id - Corresponds to the project identifier
 * @param batch_id - Batch id retrieved during the previous POST call
 * @returns 
 */

export async function runGetComment(
  github: InstanceType<typeof GitHub>,
  context: Context,
  user_id: string,
  project_id: string,
  batch_id: string
): Promise<void> {
  startGroup('⏳ Waiting for batch to complete...');

  console.log("Received payload used to fetch results (user_id, project_id, batch_id):", user_id, project_id, batch_id)
  const baseUrl = 'https://evap-app-api-service-dev-966286810479.europe-west1.run.app';
  const url = `${baseUrl}/fetch_results/${user_id}/${project_id}/${batch_id}`;

  const delayMs = 120_000; // 2 minutes
  const maxAttempts = 30;
  let attempt = 0;
  let response;
  let status = '';
  let markdownResults = '';
  let results: any;

  while (attempt < maxAttempts) {
    try {
      response = await axios.get(url, {
        headers: { 'Content-Type': 'application/json' }
      });

      status = response.data?.status || '';
      console.log(`🔍 Attempt ${attempt + 1}: batch status = "${status}"`);

      if (status === 'Complete') {
        console.log('✅ Batch complete. Processing results...');
        break;
      }
    } catch (err: any) {
      console.log(`⏳ Attempt ${attempt + 1}: batch not ready (${err.response?.status || err.message})`);
    }

    attempt++;
    await new Promise(res => setTimeout(res, delayMs)); // Retry if batch is not finished
  }

  if (status !== 'Complete') {
    setFailed(`❌ Batch did not complete after ${maxAttempts} attempts.`);
    return;
  }

  try {
    // Retrieve results for each scenario
    if (!response || !response.data?.results?.scenarios) {
      setFailed('No scenarios found in the results.');
      return;
    }
    const scenarios = response.data?.results?.scenarios;
    if (!scenarios || scenarios.length === 0) {
      setFailed('No scenarios found in the results.');
      return;
    }

    // Retrieve batch global result
    if (!response || !response.data?.results) {
      setFailed('No average scores found in the results.');
      return;
    }

    results = response.data?.results;
    if (!results || results.length === 0) {
      setFailed('No average scores found in the results.');
      return;
    }

    markdownResults = convertJsonToMarkdownTable(
      scenarios
    );

  } catch (err: any) {
    setFailed(`❌ Error processing results: ${err.message}`);
    return;
  }

  // PR comment
  try {
    let globalAverageScore: any;
    globalAverageScore = results.averageScores || {};
    console.log("Global average scores:", globalAverageScore)
    const dashboardUrl = response.data.url;
    console.log("--- Dashboard url:", dashboardUrl);
    const commentMarker = '<!-- norma-eval-get-comment -->';
    const commentBody = `${commentMarker}

### ✅ Fetched evaluation results
- **User ID:** \`${user_id}\`
- **Project ID:** \`${project_id}\`
- **Batch ID:** \`${batch_id}\`

- **GPT global average score:** ${globalAverageScore.openai != null
  ? `${Math.round((globalAverageScore.openai / 3) * 100)}%`
  : 'N/A'}
- **Ionos global average score:** ${globalAverageScore.ionos != null
    ? `${Math.round((globalAverageScore.ionos / 3) * 100)}%`
    : 'N/A'}
- **Metadata global average score:** ${globalAverageScore.metadata != null
    ? `${(globalAverageScore.metadata * 33.333).toFixed(0)}%`
    : 'N/A'}


🔗 [View results in dashboard](${dashboardUrl})

${markdownResults}

<sub>🛠️ If you need to make changes, update your branch and rerun the workflow.</sub>
`;

    const { owner, repo } = context.repo;
    let prNumber = context.payload.pull_request?.number;

    if (!prNumber) {
      const branchName = context.ref.replace('refs/heads/', '');
      const { data: pullRequests } = await github.rest.pulls.list({
        owner,
        repo,
        head: `${owner}:${branchName}`,
        state: 'open'
      });
      prNumber = pullRequests[0]?.number;
    }

    if (!prNumber) {
      console.log('⚠️ No PR found. Exiting.');
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
