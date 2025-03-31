import { ReadwiseReaderSDK } from "./services/reader";
import { config } from "./config";
import { parseTLDRLinks } from "./services/tldr";
import {
  generateRecommendationPrompt,
  extractURLsFromResponse,
  testURLExtraction,
} from "./services/promptGenerator";
import { createDocumentsFromRecommendations } from "./services/aiRecommender";
import { TLDRArticle } from "./types";
import * as readline from "readline";
import { promises as fs } from "fs";
import { exec } from "child_process";
import * as os from "os";
import * as path from "path";

// Helper function for user input
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function savePromptToFile(prompt: string): Promise<string> {
  // Save to the user's downloads for easier access
  const downloadsPath = path.join(os.homedir(), "Downloads");
  const filename = `ai-recommendation-prompt-${Date.now()}.txt`;
  const filePath = path.join(downloadsPath, filename);

  try {
    await fs.writeFile(filePath, prompt, "utf-8");
    return filePath;
  } catch (error) {
    // If can't save to downloads, fallback to current directory
    console.error(
      "Could not save to downloads, saving to current directory instead."
    );
    await fs.writeFile(filename, prompt, "utf-8");
    return filename;
  }
}

// Helper function to try opening a file
function openFile(filePath: string): Promise<void> {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command = "";

    if (platform === "darwin") {
      command = `open "${filePath}"`;
    } else if (platform === "win32") {
      command = `start "" "${filePath}"`;
    } else if (platform === "linux") {
      command = `xdg-open "${filePath}"`;
    }

    if (command) {
      exec(command, (error) => {
        if (error) {
          console.log(
            `Could not open file automatically. The file is saved at: ${filePath}`
          );
        }
        resolve();
      });
    } else {
      console.log(`The file is saved at: ${filePath}`);
      resolve();
    }
  });
}

// Main function with the application flow
async function main() {
  // Check for test mode
  if (process.argv.includes("--test-url-extraction")) {
    console.log("Running URL extraction test mode...");
    testURLExtraction();
    return;
  }

  const sdk = new ReadwiseReaderSDK(config.READWISE_READER_KEY);
  const rl = createReadlineInterface();

  console.log("Readwise Reader AI Recommender");
  console.log("=============================");

  try {
    console.log("Step 1: Fetching TLDR newsletter articles...");
    // Get TLDR articles
    let allTLDRArticles: TLDRArticle[] = [];
    let nextPageCursor: string | undefined = undefined;

    do {
      const docsResponse = await sdk.listDocuments({
        location: "feed",
        category: "email",
        withHtmlContent: true,
        pageCursor: nextPageCursor,
      });

      // Extract links from the current page of results
      const pageArticles = docsResponse.results.flatMap((doc) =>
        parseTLDRLinks(doc.html_content || "")
      );

      // Add to our collection
      allTLDRArticles = [...allTLDRArticles, ...pageArticles];

      // Update cursor for next page
      nextPageCursor = docsResponse.nextPageCursor;

      // Log progress if multiple pages
      if (nextPageCursor) {
        console.log(`  Fetched ${allTLDRArticles.length} articles so far...`);
      }
    } while (nextPageCursor);

    console.log(
      `Found ${allTLDRArticles.length} articles from TLDR newsletters.`
    );

    console.log("\nStep 2: Fetching your reading history...");
    // Get well-read documents
    const weeksBack = 4; // Define how many weeks to look back
    const wellReadDocs = await sdk.getWellReadDocuments(weeksBack);
    console.log(
      `Found ${wellReadDocs.length} well-read documents from the past ${weeksBack} weeks for analysis.`
    );

    console.log("\nStep 3: Generating AI recommendation prompt...");
    // Generate the prompt
    const prompt = generateRecommendationPrompt(allTLDRArticles, wellReadDocs);

    // Save prompt to file
    const promptFilename = await savePromptToFile(prompt);
    console.log(`Prompt saved to file: ${promptFilename}`);
    console.log(`Attempting to open the file automatically...`);

    // Try to open the file
    await openFile(promptFilename);

    console.log(
      `Please copy this prompt into ChatGPT or similar AI assistant.`
    );

    // Ask user for the AI response
    console.log("\nStep 4: Processing AI recommendations");
    console.log(
      "After you get recommendations from the AI assistant, paste the entire response below."
    );
    console.log(
      "Press Enter, then Ctrl+D (Unix) or Ctrl+Z (Windows) when done:"
    );

    let aiResponse = "";

    // Collect multiline input
    for await (const line of rl) {
      aiResponse += line + "\n";
    }

    // Parse URLs from the AI response
    console.log("\nAttempting to extract URLs from the AI response...");
    const recommendedUrls = extractURLsFromResponse(aiResponse);
    console.log(
      `\nExtracted ${recommendedUrls.length} recommended URLs from the AI response.`
    );

    if (recommendedUrls.length === 0) {
      console.log(
        "No URLs were found in the AI response. Please check your input and try again."
      );
      console.log(
        "You can debug URL extraction by running: node dist/index.js --test-url-extraction"
      );

      // Save the problematic response to a file for debugging
      const debugFilename = `debug-ai-response-${Date.now()}.txt`;
      await fs.writeFile(debugFilename, aiResponse, "utf-8");
      console.log(
        `Saved problematic AI response to ${debugFilename} for debugging purposes.`
      );

      return;
    }

    // Display the URLs and ask for confirmation
    console.log("\nURLs to be saved:");
    recommendedUrls.forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });

    console.log("\nPlease review the URLs above for accuracy.");
    console.log(
      "If you need to edit or remove any URLs, you can do so in the next step."
    );

    const rl2 = createReadlineInterface(); // Create a new readline interface

    // Allow users to edit the URLs before saving
    const editUrlsConfirmation = await new Promise<string>((resolve) => {
      rl2.question(
        "\nDo you want to edit the URL list before saving? (y/n): ",
        resolve
      );
    });

    let finalUrls = [...recommendedUrls];

    if (
      editUrlsConfirmation.toLowerCase() === "y" ||
      editUrlsConfirmation.toLowerCase() === "yes"
    ) {
      console.log(
        "\nEnter the numbers of URLs to remove (comma-separated, e.g., '1,3,5'), or press Enter to keep all:"
      );
      const removeIndexes = await new Promise<string>((resolve) => {
        rl2.question("> ", resolve);
      });

      if (removeIndexes.trim()) {
        const indexesToRemove = removeIndexes
          .split(",")
          .map((idx) => parseInt(idx.trim(), 10) - 1) // Convert to 0-based index
          .filter(
            (idx) => !isNaN(idx) && idx >= 0 && idx < recommendedUrls.length
          );

        finalUrls = recommendedUrls.filter(
          (_, idx) => !indexesToRemove.includes(idx)
        );

        console.log("\nUpdated URL list:");
        finalUrls.forEach((url, index) => {
          console.log(`${index + 1}. ${url}`);
        });
      }

      console.log(
        "\nFor each URL you'd like to modify, enter the number followed by the new URL"
      );
      console.log(
        "Format: [number]:[new URL], e.g., '2:https://correct-url.com'"
      );
      console.log(
        "Enter one modification per line. Press Enter when done (or just Enter to skip):"
      );

      let editing = true;
      while (editing) {
        const edit = await new Promise<string>((resolve) => {
          rl2.question("> ", resolve);
        });

        if (!edit.trim()) {
          editing = false;
          continue;
        }

        const match = edit.match(/^(\d+):(.+)$/);
        if (match) {
          const index = parseInt(match[1], 10) - 1;
          const newUrl = match[2].trim();

          if (
            index >= 0 &&
            index < finalUrls.length &&
            newUrl.startsWith("http")
          ) {
            finalUrls[index] = newUrl;
            console.log(`Updated URL at position ${index + 1}`);
          } else {
            console.log("Invalid index or URL format. Please try again.");
          }
        } else {
          console.log("Invalid format. Use [number]:[new URL]");
        }
      }

      console.log("\nFinal URL list:");
      finalUrls.forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
      });
    }

    // Make this a promise so we can await the response
    const saveConfirmation = await new Promise<string>((resolve) => {
      rl2.question(
        "\nDo you want to save these URLs to Readwise Reader? (y/n): ",
        resolve
      );
    });

    rl2.close();

    if (
      saveConfirmation.toLowerCase() === "y" ||
      saveConfirmation.toLowerCase() === "yes"
    ) {
      console.log("\nStep 5: Creating documents from recommended URLs...");
      console.log(
        "Using rate limiting: 1 article every 1.5 seconds to avoid overwhelming the API."
      );

      // Create documents from recommended URLs with rate limiting
      const result = await createDocumentsFromRecommendations(
        sdk,
        finalUrls,
        { rateLimitMs: 1500 } // Set rate limit to 1.5 seconds
      );

      console.log(
        `\nProcess complete! Created ${result.successCount} new documents in Readwise Reader.`
      );
      if (result.failCount > 0) {
        console.log(`Failed to create ${result.failCount} documents.`);
      }
    } else {
      console.log("\nDocument creation cancelled.");
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }

  console.log("\nProcess complete!");
}

// Run the main function
main().catch(console.error);
