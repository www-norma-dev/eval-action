import { endGroup, startGroup, info, setFailed } from '@actions/core';
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
  startGroup('⏳ Waiting for batch to complete...');

  const baseUrl = 'https://evap-app-api-service-dev-966286810479.europe-west1.run.app';
  const url = `${baseUrl}/fetch_results/${user_id}/${project_id}/${batch_id}`;

  const delayMs = 60_000;
  const maxAttempts = 30;
  let attempt = 0;
  let response;
  let status = '';
  let markdownResults = '';

  // 🕐 Petite pause initiale avant le premier appel
  await new Promise(res => setTimeout(res, delayMs));

  // 🔁 Tant que le batch n'est pas terminé
  while (attempt < maxAttempts) {
    try {
      response = await axios.get(url, {
        headers: { 'Content-Type': 'application/json' }
      });

      status = response.data?.results?.status || '';
      console.log(`🔍 Attempt ${attempt + 1}: batch status = "${status}"`);

      if (status === 'complete') {
        console.log('✅ Batch complete. Processing results...');
        break;
      }
    } catch (err: any) {
      console.log(`⏳ Attempt ${attempt + 1}: batch not ready (${err.response?.status || err.message})`);
    }

    attempt++;
    await new Promise(res => setTimeout(res, delayMs));
  }

  if (status !== 'complete') {
    setFailed(`❌ Batch did not complete after ${maxAttempts} attempts.`);
    return;
  }

  // ✅ Traitement des résultats
  try {
    if (!response || !response.data?.results?.scenarios) {
      setFailed('❌ No scenarios found in the results.');
      return;
    }
    const scenarios = response.data?.results?.scenarios;
    if (!scenarios || scenarios.length === 0) {
      setFailed('❌ No scenarios found in the results.');
      return;
    }

    markdownResults = convertJsonToMarkdownTable(
      scenarios,
      response.data.results.globalJustification
    );
  } catch (err: any) {
    setFailed(`❌ Error processing results: ${err.message}`);
    return;
  }

  // 📝 Poster le commentaire sur la PR
  try {
    const dashboardUrl = `https://eval-norma--norma-dev.europe-west4.hosted.app/dashboard/projects/${project_id}/batch/${batch_id}/multiAgent`;
    const commentMarker = '<!-- norma-eval-get-comment -->';
    const commentBody = `${commentMarker}
### ✅ Fetched evaluation results
- **User ID:** \`${user_id}\`
- **Project ID:** \`${project_id}\`
- **Batch ID:** \`${batch_id}\`

🔗 [View results in dashboard](${dashboardUrl})

**Results Table:**

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
