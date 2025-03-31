import { ReadwiseReaderSDK } from "./services/reader";
import { config } from "./config";
import { parseTLDRLinks } from "./services/tldr";
import {
  readingAnalysis,
  generateReadingPatternAnalysisPrompt,
  generateRecommendationPrompt,
  extractTitlesAndMatchURLs,
} from "./services/promptGenerator";
import { createDocumentsFromRecommendations } from "./services/aiRecommender";
import { saveTextToFile, openFile } from "./services/fileService";
import { TLDRArticle } from "./types";
import * as readline from "readline";

// Helper function for user input
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Function to analyze reading patterns from the past 6 months
async function analyzeReadingPatterns() {
  const sdk = new ReadwiseReaderSDK(config.READWISE_READER_KEY);

  console.log("Readwise Reader - Reading Pattern Analysis");
  console.log("=========================================");

  try {
    console.log("Fetching your reading history from the past 6 months...");
    // Get well-read documents from the past 6 months
    const wellReadDocs = await sdk.getWellReadDocuments(6, "months");
    console.log(
      `Found ${wellReadDocs.length} well-read documents from the past 6 months for analysis.`
    );

    console.log("\nGenerating AI analysis prompt...");
    // Generate the prompt for reading pattern analysis
    const prompt = generateReadingPatternAnalysisPrompt(wellReadDocs);

    // Save prompt to file
    const promptFilename = await saveTextToFile(prompt, {
      filenamePrefix: "reading-pattern-analysis",
    });
    console.log(`Prompt saved to file: ${promptFilename}`);
    console.log(`Attempting to open the file automatically...`);

    // Try to open the file
    await openFile(promptFilename);

    console.log(
      `\nPlease copy this prompt into ChatGPT or similar AI assistant to get an analysis of your reading patterns.`
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }

  console.log("\nProcess complete!");
}

// Function to recommend articles from TLDR newsletters
async function recommendArticles() {
  const sdk = new ReadwiseReaderSDK(config.READWISE_READER_KEY);
  const rl = createReadlineInterface();

  console.log("Readwise Reader - Article Recommendations");
  console.log("========================================");

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

    const wellReadDocs = await sdk.getWellReadDocuments(6, "weeks");
    const analysis = readingAnalysis(allTLDRArticles, wellReadDocs);

    console.log("\nStep 2: Generating AI recommendation prompt...");
    // Generate the prompt for recommendations without reading analysis
    const prompt = generateRecommendationPrompt(allTLDRArticles, analysis);

    // Save prompt to file
    const promptFilename = await saveTextToFile(prompt, {
      filenamePrefix: "article-recommendation-prompt",
    });
    console.log(`Prompt saved to file: ${promptFilename}`);
    console.log(`Attempting to open the file automatically...`);

    // Try to open the file
    await openFile(promptFilename);

    console.log(
      `Please copy this prompt into ChatGPT or similar AI assistant.`
    );

    // Ask user for the AI response
    console.log("\nStep 3: Processing AI recommendations");
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

    // Parse titles from the AI response and match them to URLs
    console.log(
      "\nAttempting to extract article titles from the AI response and match them to URLs..."
    );
    const recommendedUrls = extractTitlesAndMatchURLs(
      aiResponse,
      allTLDRArticles
    );
    console.log(
      `\nExtracted and matched ${recommendedUrls.length} recommended articles from the AI response.`
    );

    if (recommendedUrls.length === 0) {
      console.log(
        "No article matches were found. Please check your input and try again."
      );

      // Save the problematic response to a file for debugging
      const debugFilename = await saveTextToFile(aiResponse, {
        filenamePrefix: "debug-ai-response",
      });
      console.log(
        `Saved problematic AI response to ${debugFilename} for debugging purposes.`
      );

      return;
    }

    // Display the URLs and ask for confirmation
    console.log("\nURLs to be saved:");
    recommendedUrls.forEach((url, index) => {
      // Find the article title for this URL
      const article = allTLDRArticles.find((a) => a.url === url);
      const title = article ? article.title : "Unknown title";
      console.log(`${index + 1}. ${title}\n   ${url}`);
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
      console.log("\nStep 4: Creating documents from recommended URLs...");
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

// Main function that parses command line arguments and runs the appropriate command
async function main() {
  const command = process.argv[2] || "recommend";

  // Show help if requested
  if (command === "--help" || command === "-h") {
    console.log("Readwise Reader CLI Usage");
    console.log("=======================");
    console.log("Available commands:");
    console.log(
      "  analyze-reading   - Analyze reading patterns from the past 6 months"
    );
    console.log(
      "  recommend         - Get article recommendations from TLDR newsletter"
    );
    console.log("  --help, -h       - Show this help message");
    return;
  }

  // Run the appropriate command
  switch (command) {
    case "analyze-reading":
      await analyzeReadingPatterns();
      break;
    case "recommend":
      await recommendArticles();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log("Use --help to see available commands");
  }
}

// Run the main function
main().catch(console.error);
