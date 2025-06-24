import { endGroup, startGroup, info, setFailed } from '@actions/core';
import type { GitHub } from '@actions/github/lib/utils';
import { Context } from '@actions/github/lib/context';
import * as core from '@actions/core';
import https from 'https';
import axios from 'axios';
import ora from 'ora';

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
 * @param api_host - This is corresponding to "vla_endpoint".
 * @param type - The use case: either "multiAgent" (Vitual leasing agent) or "extractor" (for PDFs).
 * @param test_name - The batch name to be displayed.
 * @returns data to call runGetComment function in index.ts (batchTestId, user_id, etc.).
 */
export async function runPostComment(
  github: InstanceType<typeof GitHub>,
  context: Context,
  commit: string,
): Promise<{
  batch_id: string;
  user_id: string;
  project_id: string;
}> {
  startGroup('Launching evaluation request...');

  // Retrieve inputs from the user's workflow file
  const vla_endpoint: string = core.getInput("vla_endpoint");
  const vla_credentials: string = core.getInput("vla_credentials");
  const test_name: string = core.getInput("test_name");
  const project_id: string = core.getInput("project_id");
  const model_name: string = core.getInput("model_name");
  const scenario_id: string = core.getInput("scenario_id");
  const user_id: string = core.getInput("user_id");
  const type: string = core.getInput("type");
  const attempts = 1;

  const postData = {
    test_name,
    vla_endpoint,
    vla_credentials,
    model_id: "0b6c4a15-bb8d-4092-82b0-f357b77c59fd",
    model_name,
    scenario_id,
    user_id,
    project_id,
    attempts,
    type
  };

  const spinner = ora('Waiting for API response...').start();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);
  const agent = new https.Agent({ keepAlive: true });
  const heartbeat = setInterval(() => {
    console.log("⏱️ Still waiting for API response...");
  }, 60000);

  let batch_id: string = "";

  try {
    const url = "https://europe-west1-norma-dev.cloudfunctions.net/ingest_event";
    const response = await axios.post(url, postData, {
      headers: { "Content-Type": "application/json" },
      httpsAgent: agent,
      timeout: 20 * 60 * 1000,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    clearInterval(heartbeat);
    spinner.succeed('✅ API response received.');

    batch_id = response.data.batchTestId;

    if (!batch_id) {
      throw new Error("No batchTestId returned in the response.");
    }

    startGroup('✅ API Response');
    console.log(response.data);
    endGroup();

  } catch (error: any) {
    clearTimeout(timeout);
    clearInterval(heartbeat);
    spinner.fail(`❌ API failed: ${error.message}`);
    setFailed(`❌ API request failed: ${error.message}`);
    throw error;
  }

  // PR Comment
  startGroup('Posting comment to PR');
  try {
    const commentMarker = '<!-- norma-eval-post-comment -->';
    const commentBody = `${commentMarker}
### 🚀 Evaluation ongoing
- **Test Name:** \`${test_name}\`
- **API Endpoint:** \`${vla_endpoint}\`
- **Type:** \`${type}\`

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
      prNumber = pullRequests[0]?.number;
    }

    if (!prNumber) {
      console.log('⚠️ No PR found. Skipping comment.');
      return {
        batch_id,
        user_id,
        project_id
      };
    }

    const { data: comments } = await github.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    });

    const existing = comments.find(c => c.body?.includes(commentMarker));

    if (existing) {
      await github.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
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
  } catch (e: any) {
    setFailed(`❌ Failed to post comment: ${e.message}`);
  } finally {
    endGroup();
  }

  return {
    batch_id,
    user_id,
    project_id
  };
}
