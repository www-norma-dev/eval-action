import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';
import { postChannelSuccessComment } from './postChannelSuccessComment';

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
    const name: string = core.getInput("who-to-greet");
    const api_host: string = core.getInput("api_host");
    const x_api_key: string = core.getInput("x_api_key");
    const type: string = core.getInput("type");
    const test_name: string = core.getInput("test_name");
    const scenarios: string = core.getInput("scenarios");

    // Try parsing scenarios from JSON
    let parsedScenarios;
    try {
      parsedScenarios = JSON.parse(scenarios);
    } catch (error) {
      console.error("❌ Error parsing `scenarios`: Invalid JSON format.", error);
      parsedScenarios = {}; // Fallback to empty object
    }
    
    console.log(`🔄 Sending API request to: ${api_host}`);
    console.log("Parsed scenarios:", parsedScenarios);
    
    // Make the API POST request
    const response = await fetch("https://europe-west1-norma-dev.cloudfunctions.net/eval-norma-v-0", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        apiHost: api_host,
        x_api_key,
        type,
        test_name,
        scenarios: parsedScenarios
      })
    });
    
    console.log('---------- RESPONSE ---------');
    console.log(response.status);
    if (!response.ok) {
      const errorText = await response.text();
      core.setFailed(`❌ API request failed with status ${response.status}: ${errorText}`);
      return;
    }

    const apiResponse: any = await response.json();
    console.log("✅ API Response Received:", apiResponse);

    console.log("📦 Raw API response before formatting:", apiResponse);
    console.log("📋 Response.results:", apiResponse.results);

    // Convert the API response to a markdown table
    const md = convertJsonToMarkdownTable(apiResponse.results);
    console.log(formatTableForConsole(apiResponse.results));

    // Use the current commit SHA as the commit identifier
    const commit = process.env.GITHUB_SHA || 'N/A';

    // Call the function to post or update the PR comment
    await postChannelSuccessComment(
      octokit, 
      github.context, 
      md, 
      commit,
      api_host,
      type,
      test_name
    );

  } catch (error: any) {
    console.error(`❌ Error : ${error}`);
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}

function convertJsonToMarkdownTable(jsonData: any): string {
  if (!Array.isArray(jsonData)) {
    console.error("❌ convertJsonToMarkdownTable: Expected array but got:", jsonData);
    return "Invalid data format received for markdown conversion.";
  }

  let markdownOutput = "Conversation Logs\n\n";
  markdownOutput += `| Scenario | GPT Score | Mistral Score |\n`;
  markdownOutput += `|----|----------|---------|\n`;

  jsonData.forEach((entry: any) => {
    markdownOutput += `| ${entry["Scenario"]} | ${entry["New Conv Evaluation (GPT-4)"]} | ${entry["New Conv Evaluation (Mistral)"]} |\n`;
  });

  return markdownOutput;
}

function formatTableForConsole(jsonData: any[]): string {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    console.warn("⚠️ formatTableForConsole: No valid results to format:", jsonData);
    return "No results to display.";
  }

  const headers = ["Attempt", "Conversation ID", "User Message", "Expected Response", "New Conv Outbound", "GPT-4 Score", "Mistral Score"];
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
