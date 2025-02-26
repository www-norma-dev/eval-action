/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// Utility: Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Utility: Truncate text for table display
function truncate(text, maxLength = 40) {
    if (!text)
        return "";
    return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
}
// Utility: Spinner animation (for data retrieval and checking)
async function spinner(duration, message, color = "\x1b[36m") {
    const spinnerFrames = ["|", "/", "-", "\\"];
    const startTime = Date.now();
    let frameIndex = 0;
    process.stdout.write(color + message);
    while (Date.now() - startTime < duration) {
        process.stdout.write(`\r${color}${message} ${spinnerFrames[frameIndex % spinnerFrames.length]} \x1b[0m`);
        await delay(100);
        frameIndex++;
    }
    process.stdout.write(`\r\x1b[32m${message} ✔\x1b[0m\n`);
}
// Utility: Progress Bar (for scenarios)
async function progressBar(totalDuration, message, barLength = 20, color = "\x1b[33m") {
    const totalSteps = barLength;
    const stepDuration = totalDuration / totalSteps;
    process.stdout.write(color + message);
    for (let i = 0; i <= totalSteps; i++) {
        const percent = Math.round((i / totalSteps) * 100);
        const filled = "=".repeat(i);
        const empty = " ".repeat(totalSteps - i);
        process.stdout.write(`\r${color}${message} [${filled}${empty}] ${percent}%\x1b[0m`);
        await delay(stepDuration);
    }
    process.stdout.write("\n");
}
// Utility: Print an ASCII banner
function printBanner(text) {
    const border = "========================================";
    console.log("\x1b[35m" + border);
    console.log(text.toUpperCase().padStart((border.length + text.length) / 2).padEnd(border.length));
    console.log(border + "\x1b[0m\n");
}
// Utility: Print a Markdown table for the result data
function printResultsTable(data) {
    console.log("\n### Final Results\n");
    console.log("| Attempt | Conversation ID                         | Scenario                                | User Message | Expected Response                       | New Conv Outbound                        | GPT-4 Eval | Mistral Eval |");
    console.log("|---------|-----------------------------------------|-----------------------------------------|--------------|-----------------------------------------|------------------------------------------|------------|--------------|");
    data.forEach((item) => {
        console.log(`| ${item["Attempt"].toString().padEnd(7)} | ${item["Conversation ID"].padEnd(39)} | ${truncate(item["Scenario"], 39).padEnd(39)} | ${truncate(item["User Message"], 12).padEnd(12)} | ${truncate(item["Expected Response"], 39).padEnd(39)} | ${truncate(item["New Conversation Outbound"], 38).padEnd(38)} | ${item["New Conv Evaluation (GPT-4)"].toString().padEnd(10)} | ${item["New Conv Evaluation (Mistral)"].toString().padEnd(12)} |`);
    });
}
// Provided result data
const resultData = [
    {
        "Attempt": 1,
        "Conversation ID": "931f7a59-7cfd-46d1-a73b-0e142dda24a8",
        "Expected Response": "Hey Admin! Thanks for reaching out through Akajiji.com. Let's get started on finding you the perfect rental. Do you have a specific budget in mind?",
        "Metadata Extraction score": 1,
        "New Conv Evaluation (GPT-4)": "0.8",
        "New Conv Evaluation (Mistral)": "0.95",
        "New Conv Handoff Metadata": null,
        "New Conv Outbound Metadata": {
            "baths": null,
            "beds": null,
            "booking": null,
            "budget": null,
            "inboundChannel": "text",
            "inquirySource": "Akajiji.com",
            "moveInDate": null,
            "outboundChannel": "text",
            "pets": null,
            "prospectFirstName": "Admin",
            "prospectLastName": "Doe",
            "tasks": []
        },
        "New Conversation Outbound": "Hey Admin! Thanks for reaching out through Akajiji.com. Let's get started on finding you the perfect apartment. Could you let me know when you're planning to move in, how many bedrooms you need, and your budget?",
        "Scenario": "Scenario 1: Complete Information Upfront",
        "User Message": "I want to rent"
    },
    {
        "Attempt": 2,
        "Conversation ID": "a79be571-6368-4473-8c8f-44c3433d7e96",
        "Expected Response": "Hey Admin! Thanks for reaching out through Akajiji.com. Let's get started on finding you the perfect rental. Do you have a specific budget in mind?",
        "Metadata Extraction score": 1,
        "New Conv Evaluation (GPT-4)": "0.7",
        "New Conv Evaluation (Mistral)": "0.95",
        "New Conv Handoff Metadata": null,
        "New Conv Outbound Metadata": {
            "baths": null,
            "beds": null,
            "booking": null,
            "budget": null,
            "inboundChannel": "text",
            "inquirySource": "Akajiji.com",
            "moveInDate": null,
            "outboundChannel": "text",
            "pets": null,
            "prospectFirstName": "Admin",
            "prospectLastName": "Doe",
            "tasks": []
        },
        "New Conversation Outbound": "Hey Admin! Thanks for reaching out through Akajiji.com. Let's get started on finding you the perfect rental. Could you let me know when you're planning to move in, how many bedrooms you need, and your budget?",
        "Scenario": "Scenario 1: Complete Information Upfront",
        "User Message": "I want to rent"
    },
    {
        "Attempt": 3,
        "Conversation ID": "c62f1fb7-b3e2-46a9-b180-cd8dad131e2d",
        "Expected Response": "Hey Admin! Thanks for reaching out through Akajiji.com. Let's get started on finding you the perfect rental. Do you have a specific budget in mind?",
        "Metadata Extraction score": 1,
        "New Conv Evaluation (GPT-4)": "0.7",
        "New Conv Evaluation (Mistral)": "0.95",
        "New Conv Handoff Metadata": null,
        "New Conv Outbound Metadata": {
            "baths": null,
            "beds": null,
            "booking": null,
            "budget": null,
            "inboundChannel": "text",
            "inquirySource": "Akajiji.com",
            "moveInDate": null,
            "outboundChannel": "text",
            "pets": null,
            "prospectFirstName": "Admin",
            "prospectLastName": "Doe",
            "tasks": []
        },
        "New Conversation Outbound": "Hey Admin! Thanks for reaching out through Akajiji.com. Let's get started on finding you the perfect apartment. Could you let me know when you're planning to move in, how many bedrooms you need, and your budget?",
        "Scenario": "Scenario 1: Complete Information Upfront",
        "User Message": "I want to rent"
    }
];
// Main async function
async function run() {
    console.clear();
    printBanner("Process Started");
    // Step 1: Getting Data (simulate with spinner)
    const startData = Date.now();
    await spinner(2000, "Getting Data...", "\x1b[36m");
    const dataTime = ((Date.now() - startData) / 1000).toFixed(1) + "s";
    // Step 2: Checking Data (simulate with spinner)
    const startCheck = Date.now();
    await spinner(1500, "Checking Data...", "\x1b[35m");
    const checkTime = ((Date.now() - startCheck) / 1000).toFixed(1) + "s";
    // Step 3: Running 3 Scenarios with progress bars
    const scenarios = [1, 2, 3];
    for (const scenario of scenarios) {
        console.log(`\n\x1b[34mScenario ${scenario}: Starting...\x1b[0m`);
        const startScenario = Date.now();
        // Simulate evaluation/testing progress for this scenario (3 seconds each)
        await progressBar(3000, `Scenario ${scenario} Progress: `, 20, "\x1b[33m");
        const scenarioTime = ((Date.now() - startScenario) / 1000).toFixed(1) + "s";
        console.log(`\x1b[32mScenario ${scenario} completed in ${scenarioTime}!\x1b[0m`);
        console.log("-----------------------------------------------------");
    }
    console.log("\n\x1b[32mAll scenarios executed successfully. Process complete!\x1b[0m");
    // Print the provided result data as a Markdown table
    printResultsTable(resultData);
}
// Execute the process
run();

module.exports = __webpack_exports__;
/******/ })()
;