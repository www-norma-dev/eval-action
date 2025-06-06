# GitHub Action – API Evaluation Reporter

This GitHub Action triggers on pull requests, sends an evaluation request to a specified API, and posts the results as a comment on the PR.

It helps teams automatically test API endpoints and visualize evaluation results directly in GitHub.

## How It Works

1. Triggered by a `pull_request` event.
2. Sends a POST request to an evaluation API with provided test metadata.
3. Formats the response into a markdown table.
4. Posts or updates a comment in the pull request with the results.

## Build

Before committing, build the action using:

```bash
npx ncc build src/index.ts -o dist
