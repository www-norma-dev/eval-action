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
      const url = "https://evap-app-api-service-dev-966286810479.europe-west1.run.app";
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
    console.log("✅ API Response Received:", apiResponse);
    endGroup();

    // Convert the API response to a markdown table
    const md = convertJsonToMarkdownTable(apiResponse.rawResults);
    console.log(formatTableForConsole(apiResponse.rawResults));

    // Use the current commit SHA as the commit identifier
    const commit = process.env.GITHUB_SHA || 'N/A';

    // Call the function to post or update the PR comment
    await postChannelSuccessComment(
      octokit,
      github.context,
      md,
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

function convertJsonToMarkdownTable(jsonData: any): string {
  if (!Array.isArray(jsonData)) {
    console.log("JSON data received:", jsonData)
    console.error("❌ convertJsonToMarkdownTable: Expected array but got:", jsonData);
    return "Invalid data format received for markdown conversion.";
  }

  let markdownOutput = "Conversation Logs\n\n";
  markdownOutput += `| Scenario | Attempt | GPT Score | GPT justification | Ionos eval score | Ionos eval justification | Metadata score|\n`;
  markdownOutput += `|----|----------|--------|---------|---------|---------|---------------|\n`;
  
  
  jsonData.sort((a, b) => {
    const scenarioA = a["Scenario"];
    const scenarioB = b["Scenario"];
    const attemptA = a["Attempt"];
    const attemptB = b["Attempt"];

    if (scenarioA < scenarioB) return -1;
    if (scenarioA > scenarioB) return 1;

    // If Scenario is the same, sort by Attempt
    return attemptA - attemptB;
  }). forEach((entry: any) => {
    // VALIDE
    const scneario = entry["Scenario"];
    const attempt = entry["Attempt"];
    // VALIDE   
    const gpt_score = (entry["New Conv Evaluation (GPT-4)"]["match_level"] * 20) + '%';
    const gpt_justification = entry["New Conv Evaluation (GPT-4)"]["justification"];
    const metadata_score = (entry["Metadata Extraction score"] * 100) + '%';

    // STILL TO BE CHECK
    const mistral = entry["New Conv Evaluation (Mistral)"];
    let ionos_score  = '--';
    let ionos_justification = '--';
    if (mistral && mistral !== "No" && typeof mistral === "object") {
      ionos_score = (mistral["match_level"] * 20) + '%' || '--';
      ionos_justification = mistral["justification"] || '--';
    }

    markdownOutput += `| ${scneario} | ${attempt} | ${gpt_score} | ${gpt_justification} | ${ionos_score} | ${ionos_justification} | ${metadata_score} |\n`;
  });

  return markdownOutput;
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
