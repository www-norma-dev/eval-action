import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import fs from 'fs';

async function run(): Promise<void> {
  try {

    const appId = process.env.APP_ID;
    const privateKey = process.env.PRIVATE_KEY;
    const installationId = process.env.INSTALLATION_ID;

    let testtest = `
            -----BEGIN RSA PRIVATE KEY-----
        MIIEpAIBAAKCAQEAlyQ4whHA0WxLwyUoEHqkGoanhe/S55NFXJvhI0AYAVjvXv4Y
        D14Nu4xyT7kp88MbZzQ/nVvOXikepHd33AY25wQH2COflt0O5IaXRljuRSlAtC4x
        FVDSYsUP+vvgQ+rdn+6P4AXIErK+3XrQ4SULBdGk8R8n6p3pQBpEj6dyUp8Jx1vI
        DLXs0iWIVb3o/sQJQeOXq212znNsBQNtSWPkdifzpIlgf6a6CN2B+xhV9phLz33I
        XZcEyo6xAUx1peO9hmR+dXpEaECmCeJ0KP88tLb2bMw86y1mEkm5v4izBjW/km++
        j68gAHm+Xq7Vu7ElxNAUv5cM5ozn1ie6aKQ1UwIDAQABAoIBAQCUv2ZIwVYmBdIO
        bZwfk8O8A3gN3jiQBqXF/fe2TJcThGaY87PUM/mJ8jBye8ZpDEUE7iwJf1f73bY1
        oQpKdadE9veNZYnj3Q2SJU/uQQnG8VGnwqo100QrRsxyc7+EuDqD8zKQBMCifl5P
        9VZrrpxJjskpMUOEqQLtPqzpQJ/H5RBgUUeB8vvbnC8yVaqFonJI0VqfOzbfXv6C
        oppO3+aoQjgSRvlKL4vI8YTLHi3EWR856GCvRXH1pszEFDCxvTcreg5O/4e7oxIA
        rCNcUu/SHfsMQectRo8UnLquoHkkeCa1gLLConS4vlKXgY7wZ7lolDN2fU05v5R9
        flHeJTV5AoGBAMkoDl4Nkn/8mShIVx5kh8/bpn1R9GMvmdu3/uWKxeZyS8ODtBLI
        lGpEMTjP8wFuyh/h4VBn/Ku+L9ubYpxo8fZn15zvF5CRb2xL4aETCnAE5gEVy80K
        3Dmw9XS8DOAeM7qr3qs6vkEImksBKC7L9YWmEtAEBwNf4jyenBFy9aqtAoGBAMBZ
        UD+nY3p+SNizmy/9ouht+9aJMIelQaYLd+QaQwP0xCuBnUxIGvnlVUf+wYtvsJiM
        lNFgKNsWBzH6DPa1ZMgQsIIOnK/+EWsiVhyIAX3018TC++YO3gB9XglIKuRMhN/J
        kzrLdsP9Y8D2BTk0RJUWwEz5QSxZrqQRg8u+HV//AoGBAL49H7lbZJ2eKsqp/5pC
        wR6XQNFsXJAhSIU/cdVsdNUIaxawy/CnuZT2gQaVw+ArAwU7/naooZFbAK/UOGJr
        7cl3U7abd9HFeXcWHIDVHR3rxApqrp9wEe6NqNWJszOR3KJCQQf3Ok8O77zXj0US
        p1SKR2hrJqbOW4uxBTCLZELRAoGAUcMlW4l5vc4EhSkDpIi6QPbPgEhcuqxClaR2
        WB3ZssrOwHeeN5jG7sbPU4U1HGJjvNS1RbMMauSYNmRGMnC04F5HyWEQtbbYDKRR
        2lrt127GcTs4/HgBYk/oMyXcJaNpL/9teCaY24LQbmulmMVhCcbcA1xImeOdWtyf
        G3I65l0CgYAGCERU0xDfq0xerC8OfzJ9x8qJD1mDj+DKgTUM4kHrv9m74cWxqdA3
        m5RRY269t70Hk1Fyxutg9kC+9w6QIO/7phAcJmUTudQXYWerw7ejnsMFcX8gwsp5
        MVMRAkMAtRFVyxVOOSdD4uXlsdT/jEaRU0ht4pMdK6khdmhAGOWykg==
        -----END RSA PRIVATE KEY-----
        `;


    // if (!appId || !privateKey || !installationId) {
    //   core.setFailed("❌ GitHub App credentials (APP_ID, PRIVATE_KEY, INSTALLATION_ID) are not set.");
    //   return;
    // }

    // Create an authentication strategy using your GitHub App
    const auth = createAppAuth({
      appId: 1158043,
      privateKey: testtest.replace(/\\n/g, "\n"),
      installationId: "61665610"
    });

    const { token } = await auth({ type: "installation" });

    const octokit = new Octokit({ auth: token });
    const { owner, repo } = github.context.repo;



    // Get the branch name from the push event
    const branchName = github.context.ref.replace("refs/heads/", "");
    console.log(`📌 Current branch: ${branchName}`);

    // Fetch open PRs that have this branch as the head
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${branchName}`,
      state: "open",
    });

    if (pullRequests.length === 0) {
      console.log("⚠️ No open PR found for this branch. Skipping comment.");
      return;
    }

    const prNumber = pullRequests[0].number;
    console.log(`✅ Found open PR #${prNumber}`);

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: "👋 Hello from GitHub Actions!",
    });



    // Retrieve inputs from action.yml
    const name: string = core.getInput("who-to-greet");
    const api_host: string = core.getInput("api_host");
    const x_api_key: string = core.getInput("x_api_key");
    const type: string = core.getInput("type");
    const test_name: string = core.getInput("test_name");
    const scenarios: string = core.getInput("scenarios");

    console.log(`🔄 Sending API request to: ${api_host}`);

    console.log(scenarios);


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
        scenarios
      }),
    });

    console.log('---------- RESP?SE ---------');
    console.log(response.status);
    console.log(response);
    if (!response.ok) {
      const errorText = await response.text();
      core.setFailed(`❌ API request failed with status ${response.status}: ${errorText}`);
      return;
    }

    // Parse response JSON
    const apiResponse = await response.json();
    console.log("✅ API Response Received:", apiResponse);

    // Construct the comment message
    const comment = `### 🚀 Automatic Evaluation Report
**Hello ${name},**
  
This message was generated automatically by the GitHub Action.

📌 **Test Details:**
- **API Host:** \`${api_host}\`
- **Type:** \`${type}\`
- **Test Name:** \`${test_name}\`
  
📝 **Scenarios Sent:**
\`\`\`json
${JSON.stringify(scenarios, null, 2)}
\`\`\`

🔍 **API Response:**
\`\`\`json
${JSON.stringify(apiResponse, null, 2)}
\`\`\`

---

🔍 If you need to make changes, update your branch and rerun the workflow.

🔄 _This comment was posted automatically by [Eval Action](https://github.com/www-norma-dev/eval-action)._`;

    // Post the comment to the PR
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: comment,
    });

    core.info(`✅ Comment posted to PR #${prNumber}`);
  } catch (error: any) {
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}

run();
