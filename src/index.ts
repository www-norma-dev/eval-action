// Utility: Delay function
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Utility: Spinner animation (for data retrieval and checking)
  async function spinner(duration: number, message: string, color = "\x1b[36m") {
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
  
  // Utility: Progress Bar with 10% increments
  async function progressBar(totalDuration: number, message: string, totalSteps = 10, color = "\x1b[33m") {
    const stepDuration = totalDuration / totalSteps;
    process.stdout.write(color + message);
    for (let i = 0; i <= totalSteps; i++) {
      const percent = i * 10;
      const filled = "=".repeat(i);
      const empty = " ".repeat(totalSteps - i);
      process.stdout.write(`\r${color}${message} [${filled}${empty}] ${percent}%\x1b[0m`);
      await delay(stepDuration);
    }
    process.stdout.write("\n");
  }
  
  // Utility: Print an ASCII banner
  function printBanner(text: string) {
    const border = "========================================";
    console.log("\x1b[35m" + border);
    console.log(text.toUpperCase().padStart((border.length + text.length) / 2).padEnd(border.length));
    console.log(border + "\x1b[0m\n");
  }
  
  // Utility: Print a Markdown table with full result details
  function printResultsTableFull(data: any[]) {
    // Define headers for every field from the provided data
    const headers = [
      "Attempt", 
      "Conversation ID", 
      "Expected Response", 
      "Metadata Extraction score", 
      "New Conv Evaluation (GPT-4)", 
      "New Conv Evaluation (Mistral)", 
      "New Conv Handoff Metadata", 
      "New Conv Outbound Metadata", 
      "New Conversation Outbound", 
      "Scenario", 
      "User Message"
    ];
    
    // Build header row and separator
    const headerRow = "| " + headers.join(" | ") + " |";
    const separatorRow = "| " + headers.map(() => "---").join(" | ") + " |";
    
    console.log("\n### Final Results Table\n");
    console.log(headerRow);
    console.log(separatorRow);
    
    // Build each row of data (stringify objects)
    data.forEach(item => {
      const row = "| " + headers.map(key => {
        let value = item[key];
        if (typeof value === "object" && value !== null) {
          return JSON.stringify(value);
        } else if (value === null) {
          return "null";
        } else {
          return value.toString();
        }
      }).join(" | ") + " |";
      console.log(row);
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
  
    // Step 3: Running 3 Scenarios with progress bars in 10% increments
    const scenarios = [1, 2, 3];
    for (const scenario of scenarios) {
      console.log(`\n\x1b[34mScenario ${scenario}: Starting...\x1b[0m`);
      const startScenario = Date.now();
  
      // Simulate evaluation/testing progress for this scenario (3 seconds total)
      await progressBar(3000, `Scenario ${scenario} Progress: `, 10, "\x1b[33m");
  
      const scenarioTime = ((Date.now() - startScenario) / 1000).toFixed(1) + "s";
      console.log(`\x1b[32mScenario ${scenario} completed in ${scenarioTime}!\x1b[0m`);
      console.log("-----------------------------------------------------");
    }
  
    console.log("\n\x1b[32mAll scenarios executed successfully. Process complete!\x1b[0m");
  
    // Print the full results table with all details
    printResultsTableFull(resultData);
  }
  
  // Execute the process
  run();
  