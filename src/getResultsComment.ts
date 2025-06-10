import { endGroup, startGroup, info, error, setFailed } from '@actions/core';
import type { GitHub } from '@actions/github/lib/utils';
import { Context } from '@actions/github/lib/context';
import axios from 'axios';

export async function getResultsComment(
  github: InstanceType<typeof GitHub>,
  context: Context,
  user_id: string,
  project_id: string,
  batch_id: string
): Promise<void> {
  startGroup('Fetching results and commenting on PR');

  try {
    const baseUrl = 'https://evap-app-api-service-dev-966286810479.europe-west1.run.app';
    const url = `${baseUrl}/fetch_results/${user_id}/${project_id}/${batch_id}`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.status !== 200) {
      setFailed(`Failed to fetch results: ${response.statusText}`);
      return;
    }

    const resultData = response.data;
    const dashboardUrl = resultData.url;
    const scenarios = resultData?.results?.scenarios || [];

    // Format scenario list as markdown
    const scenarioList = scenarios.map((s: any, index: number) => `- Scenario ${index + 1}: ${s.name || 'Unnamed'}`).join('\n');

    const commentMarker = '<!-- norma-eval-comment -->';
    const commentBody = `${commentMarker}
### ✅ Fetched Evaluation Results
- **User ID:** \`${user_id}\`
- **Project ID:** \`${project_id}\`
- **Batch ID:** \`${batch_id}\`
- **Dashboard:** [View Results](${dashboardUrl})

**Scenarios:**
${scenarioList || '_No scenarios returned_'}
    
<sub>🛠️ If you need to make changes, update your branch and rerun the workflow.</sub>
`;

    const { owner, repo } = context.repo;

    let prNumber: number | undefined;
    if (context.payload.pull_request && context.payload.pull_request.number) {
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
    setFailed(`Error posting comment: ${err.message}`);
  } finally {
    endGroup();
  }
}
