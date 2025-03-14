import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';
import { postChannelSuccessComment } from './postChannelSuccessComment';

async function run(): Promise<void> {
  const token = process.env.GITHUB_TOKEN || core.getInput("repoToken");
  const octokit = token ? github.getOctokit(token) : undefined;

  try {
    const isPullRequest = !!github.context.payload.pull_request;


    let finish = (details: Object) => console.log(details);
    if (token && isPullRequest) {
      core.setSecret("This is a secret token");
      core.setSecret(token);
      console.log('--------- postChannelSuccessComment start');
    }

    if (token && isPullRequest && !!octokit) {
      const commitId = github.context.payload.pull_request?.head.sha.substring(0, 7);

      await postChannelSuccessComment(octokit, github.context, "success", commitId);
      console.log('--------- postChannelSuccessComment complete');
      // logs 
    }
    // const token = process.env.GITHUB_TOKEN;
    // if (!token) {
    //   core.setFailed("❌ GITHUB_TOKEN is not set.");
    //   return;
    // }
    return;
  }

  catch (error: any) {
    core.setFailed(error.message);
  }
}

function convertJsonToMarkdownTable(jsonData: any): string {
  let markdownOutput = "# Conversation Logs\n\n";
  markdownOutput += `| Scenario | GPT Score | Mistral Score |\n`;
  markdownOutput += `|----|----------|---------|\n`;

  jsonData.forEach((entry: any) => {
    markdownOutput += `| ${entry["Scenario"]} | ${entry["New Conv Evaluation (GPT-4)"]} | ${entry["New Conv Evaluation (Mistral)"]} |\n`;
  });

  return markdownOutput;
}

function formatTableForConsole(jsonData: any[]): string {
  if (!jsonData || jsonData.length === 0) return "No results to display.";

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
