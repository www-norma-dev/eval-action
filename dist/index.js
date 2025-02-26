/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
// Utility function to simulate delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Utility function to print a Markdown table of results
function printMarkdownTable(results) {
    console.log("\nMarkdown Table of Results:\n");
    console.log("| Step        | Result    | Time  |");
    console.log("|-------------|-----------|-------|");
    for (const result of results) {
        console.log(`| ${result.step.padEnd(11)} | ${result.result.padEnd(9)} | ${result.time.padEnd(5)} |`);
    }
}
async function run() {
    console.log("Starting process...");
    // Array to store step results
    const results = [];
    // Step 1: Feating
    console.log("Feating...");
    await delay(2000); // Delay for 2 seconds
    results.push({ step: "Feating", result: "Completed", time: "2s" });
    // Step 2: Analysing
    console.log("Analysing...");
    await delay(3000); // Delay for 3 seconds
    results.push({ step: "Analysing", result: "Completed", time: "3s" });
    // Step 3: Evaluation from 1% to 100%
    console.log("Evaluation in progress:");
    let evaluationTime = 0;
    for (let percent = 1; percent <= 100; percent++) {
        process.stdout.write(`\r${percent}%`);
        await delay(100); // 100 ms delay per percentage point (roughly 10 seconds total)
        evaluationTime += 100;
    }
    console.log("\nEvaluation complete!");
    results.push({ step: "Evaluation", result: "Completed", time: `${Math.round(evaluationTime / 1000)}s` });
    // Step 4: Running scenarios 1, 2, and 3
    const scenarios = [1, 2, 3];
    for (const scenario of scenarios) {
        console.log(`Running scenario ${scenario}...`);
        await delay(2000); // 2 seconds delay for each scenario
        console.log(`Scenario ${scenario} completed!`);
        results.push({ step: `Scenario ${scenario}`, result: "Completed", time: "2s" });
    }
    console.log("All good!");
    // Print Markdown table of results
    printMarkdownTable(results);
}
// Execute the run function
run();

})();

module.exports = __webpack_exports__;
/******/ })()
;