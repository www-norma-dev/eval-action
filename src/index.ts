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

    const branchName = github.context.payload.pull_request
      ? github.context.payload.pull_request.head.ref
      : github.context.ref.replace("refs/heads/", "");
    console.log(`📌 Current branch: ${branchName}`);

    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${branchName}`,
      state: "open",
    });

    if (pullRequests.length === 0) {
      console.log("⚠️ No open PR found for this branch. Skipping comment.");
    }

    // Inputs
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

    await postChannelComment(octokit, github.context, vla_endpoint, test_name, type);

    const agent = new https.Agent({ keepAlive: true });
    const url = "https://europe-west1-norma-dev.cloudfunctions.net/ingest_event";
    
    const heartbeatInterval = setInterval(() => {
      console.log("⏱️ Still waiting for API response...");
    }, 60000); // Log every 60 seconds
    const postData = {
      name: test_name,
      vla_endpoint,
      vla_credentials,
      model_id,
      model_name,
      test_name,
      scenario_id,
      test_level: "standard",
      state: {
        testName: test_name,
        apiHost: vla_endpoint,
        withAi: false
      },
      user_id,
      project_id,
      attempts
    };
    
    console.log(url);
    console.log('--------- postData --------');
    console.log(postData);
    const spinner = ora('Waiting for batch status to be "complete"...').start();
    let status = 'queued';
    let apiResponse: any = null;
    let batch_id: string | null = null;
    const maxAttempts = 20;
    const interval = 60_000; // 1 min
    let attempt = 0;
    let response;

    while (attempt < maxAttempts) {
      try {
        const response = await axios.post(url, postData, {
          headers: { "Content-Type": "application/json" },
          httpsAgent: agent
        });

        apiResponse = response.data;
        status = apiResponse.status;

        console.log(`⏱️ Attempt ${attempt + 1}: batch status = ${status}`);
        console.log("------- DATA:", apiResponse);
        console.log("----- Current status:", status);

        if (status === 'complete') {
          spinner.succeed('✅ Batch completed.');
          batch_id = apiResponse.batchTestId;
          break;
        }

      } catch (err: any) {
        console.warn(`⚠️ Error while checking status: ${err.message}`);
      }

      attempt++;
      await new Promise((r) => setTimeout(r, interval));
    }

    clearInterval(heartbeatInterval);

    if (status !== 'complete' || !batch_id) {
      spinner.fail('❌ Batch did not complete in time or no batch ID found.');
      core.setFailed('Batch status never reached "complete".');
      return;
    }

    console.log("✅ API Response Received:", apiResponse);
    const commit = process.env.GITHUB_SHA || 'N/A';

    await postChannelSuccessComment(
      octokit,
      github.context,
      commit,
      vla_endpoint,
      type,
      test_name,
      apiResponse.report_url
    );

    console.log("batchID from ingest event:", batch_id);

    await getResultsComment(
      octokit,
      github.context,
      user_id,
      project_id,
      batch_id
    );

  } catch (error: any) {
    console.error(`❌ Error : ${error}`);
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}

export function convertJsonToMarkdownTable(
  scenarios: any[],
  globalJustification: {
    openaiJustificationSummary?: string[],
    ionosJustificationSummary?: string[]
  } = {}
): string {
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

  scenarios.forEach((scenario, index) => {
    const scenarioName = scenario.scenarioName || scenario.name || 'Unnamed Scenario';
    const average = scenario.averageScores || {};

    const gptJustification = globalJustification.openaiJustificationSummary?.[index] ?? '-';
    const ionosJustification = globalJustification.ionosJustificationSummary?.[index] ?? '-';

    rows.push([
      scenarioName,
      '-', // no attempt ID
      `${average.openai ?? 'N/A'}`,
      gptJustification,
      `${average.ionos ?? 'N/A'}`,
      ionosJustification,
      `${average.metadata ?? 'N/A'}`
    ]);
  });

  const markdown = [
    '| ' + headers.join(' | ') + ' |',
    '| ' + headers.map(() => '---').join(' | ') + ' |',
    ...rows.map(row => '| ' + row.map(cell => cell.toString().replace(/\n/g, ' ')).join(' | ') + ' |')
  ].join('\n');

  return `### Conversation Logs\n${markdown}`;
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
