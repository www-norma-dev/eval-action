import * as core from '@actions/core';

function run(): void {
  try {
    // Get the input provided by the user (or the default value)
    const code: string = core.getInput('code-to-eval');
    console.log(`Hello, ${code}!`);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
