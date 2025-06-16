import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';
import { postChannelComment, postChannelSuccessComment } from './postChannelSuccessComment';
import { getResultsComment } from './getResultsComment';
import { endGroup, startGroup } from '@actions/core';
import ora from 'ora';
import https from 'https';
import { AbortController } from 'node-abort-controller';
import axios from 'axios';

async function run(): Promise<void> {
  try {
    const token = process.env.GITHUB_TOKEN || core.getInput("repoToken");
    if (!token) {
      core.setFailed("❌ GITHUB_TOKEN is not set.");
      return;
    }

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    // Determine branch name (from pull_request payload if available)
    const branchName = github.context.payload.pull_request
      ? github.context.payload.pull_request.head.ref
      : github.context.ref.replace("refs/heads/", "");
    console.log(`📌 Current branch: ${branchName}`);

    // Fetch open PRs with this branch as head
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${branchName}`,
      state: "open",
    });

    if (pullRequests.length === 0) {
      console.log("⚠️ No open PR found for this branch. Skipping comment.");
    }

    // Retrieve inputs from action.yml
    const vla_endpoint: string = core.getInput("vla_endpoint");
    const vla_credentials: string = core.getInput("vla_credentials");
    const test_name: string = core.getInput("test_name");
    const project_id: string = core.getInput("project_id");
    const model_id: string = core.getInput("model_id");
    const model_name: string = core.getInput("model_name");
    const scenario_id: string = core.getInput("scenario_id");
    const user_id: string = core.getInput("user_id");
    const attempts: string = core.getInput("attempts");

    console.log(`🔄 Sending API request to: ${vla_endpoint}`);
    const type = 'multiAgent';

    // Call the function to post or update the PR comment
    await postChannelComment(
      octokit,
      github.context,
      vla_endpoint,
      test_name,
      type
    );
    

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 10 * 60 * 1000); // Set timeout for 10 minutes

    const spinner = ora('Waiting for API response...').start();

    // Start a heartbeat that logs every minute
    const agent = new https.Agent({ keepAlive: true });
    const heartbeatInterval = setInterval(() => {
      console.log("⏱️ Still waiting for API response...");
    }, 60000); // Log every 60 seconds
    let response;
    try {
      const postData = {
        name: test_name,
        vla_endpoint,
        vla_credentials,
        model_id,
        model_name,
        test_name,
        scenario_id,
        test_level : "standard",
        state: {
          testName: test_name,
          apiHost: vla_endpoint,
          withAi: false
        },
        user_id: user_id,
        project_id: project_id,
        attempts
      };
      console.log('----------- THIS IS THE URL -----------');
      const url = "https://europe-west1-norma-dev.cloudfunctions.net/ingest_event";
      console.log(url);
      console.log('--------- postData --------');
      console.log(postData);

      // Make the API POST request
      response = await axios.post(url,
        postData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          httpsAgent: agent,
          timeout: 20 * 60 * 1000, // 10 minutes timeout
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      clearInterval(heartbeatInterval);

      console.log('---------- RESPONSE ---------');
      console.log(response.data);
      if (response.status < 200 || response.status >= 300) {
        core.setFailed(`❌ API request failed with status ${response.status}: ${response.statusText}`);
        spinner.fail(`API request failed with status ${response.status}`);
        return;
      }

      spinner.succeed('API response received.');

    } catch (error: any) {
      clearTimeout(timeout);
      clearInterval(heartbeatInterval);
      spinner.fail(`Action failed: ${error.message}`);
      core.setFailed(`❌ API request failed: ${error.message}`);
      return;
    }

    const apiResponse: any = response.data;
    startGroup('API Response');
    const batchId = apiResponse.batchTestId // get batchId build during the pub/sub call
    console.log("✅ API Response Received:", apiResponse);
    console.log("batchID from ingest event:", batchId);
    endGroup();

    // Use the current commit SHA as the commit identifier
    const commit = process.env.GITHUB_SHA || 'N/A';

    // Call the function to post or update the PR comment
    await postChannelSuccessComment(
      octokit,
      github.context,
      commit,
      vla_endpoint,
      type,
      test_name,
      apiResponse.report_url
    );

    const batch_id = apiResponse.batchTestId;

    await getResultsComment(
      octokit,
      github.context,
      user_id,
      project_id,
      batch_id,
    );

  } catch (error: any) {
    console.error(`❌ Error : ${error}`);
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}

export function convertJsonToMarkdownTable(scenarios: any[]): string {
  if (!Array.isArray(scenarios)) {
    return '❌ No scenario data available.';
  }

  const headers = [
    'Scenario',
    'Attempt',
    'GPT Score',
    'GPT Justification',
    'Ionos Score',
    'Ionos Justification',
    'Metadata Score',
  ];

  const rows: string[][] = [];

  for (const scenario of scenarios) {
    console.log('🔹 scenario:', JSON.stringify(scenario, null, 2));
  if (!Array.isArray(scenario.attempts)) {
    console.warn('⚠️ Missing attempts:', scenario);
  }


    const scenarioName = scenario.scenarioName || scenario.name || 'Unnamed Scenario';

    if (!Array.isArray(scenario.attempts)) continue;

    for (const attempt of scenario.attempts) {
      const gptScore = attempt.openaiReplyEvaluation?.match_level ?? 'N/A';
      const gptJustification = attempt.openaiReplyEvaluation?.justification ?? 'N/A';
      const ionosScore = attempt.ionosReplyEvaluation?.match_level ?? 'N/A';
      const ionosJustification = attempt.ionosReplyEvaluation?.justification ?? 'N/A';
      const metadataScore = attempt.extractedMetadataEvaluation ?? 'N/A';
      const attemptId = attempt.attemptId ?? 'N/A';

      rows.push([
        scenarioName,
        `${attemptId}`,
        `${gptScore}`,
        gptJustification,
        `${ionosScore}`,
        ionosJustification,
        `${metadataScore}`
      ]);
    }
  }

  const markdown = [
    '| ' + headers.join(' | ') + ' |',
    '| ' + headers.map(() => '---').join(' | ') + ' |',
    ...rows.map(row => '| ' + row.map(cell => cell.toString().replace(/\n/g, ' ')).join(' | ') + ' |')
  ].join('\n');

  return `\n${markdown}`;
}



function formatTableForConsole(jsonData: any[]): string {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    console.warn("⚠️ formatTableForConsole: No valid results to format:", jsonData);
    return "No results to display.";
  }

  const headers = ["Attempt", "Conversation ID", "User Message", "Expected Response", "New Conv Outbound Metadata", "New Conv Evaluation (GPT-4)", "New Conv Evaluation (Mistral)", "Metadata Extraction score"];
  const columnWidths = headers.map((header, i) =>
    Math.max(header.length, ...jsonData.map(row => (row[headers[i]] ? row[headers[i]].toString().length : 0)))
  );

  let table = headers.map((header, i) => header.padEnd(columnWidths[i])).join(" | ") + "\n";
  table += columnWidths.map(width => "-".repeat(width)).join("-|-") + "\n";

  jsonData.forEach(row => {
    table += headers.map((header, i) => (row[header] ? row[header].toString().padEnd(columnWidths[i]) : "-".padEnd(columnWidths[i]))).join(" | ") + "\n";
  });

  return table;
}

run();
