import { ReadwiseReaderSDK } from "./reader";
import { Document } from "../types/reader";

/**
 * Helper function to create a delay
 * @param ms Time to delay in milliseconds
 * @returns Promise that resolves after the specified time
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Creates new documents in Readwise Reader from AI-recommended URLs
 * @param sdk - The ReadwiseReaderSDK instance
 * @param recommendedUrls - Array of URLs recommended by the AI
 * @param options - Optional configuration options
 * @param options.rateLimitMs - Rate limit delay in milliseconds (default: 1500ms, set to 0 to disable)
 * @returns Promise resolving to an object containing counts of successful and failed document creations
 */
export async function createDocumentsFromRecommendations(
  sdk: ReadwiseReaderSDK,
  recommendedUrls: string[],
  options: { rateLimitMs?: number } = {}
): Promise<{
  successCount: number;
  failCount: number;
  createdDocuments: Document[];
}> {
  const createdDocuments: Document[] = [];
  let successCount = 0;
  let failCount = 0;
  const totalCount = recommendedUrls.length;
  const rateLimitMs =
    options.rateLimitMs !== undefined ? options.rateLimitMs : 1500; // Default to 1.5 seconds

  // Process each URL
  for (const [index, url] of recommendedUrls.entries()) {
    try {
      // Create a new document with the recommended URL
      const newDoc = await sdk.createDocument({
        url: url,
        saved_using: "AI Recommender", // As specified in the requirements
        location: "new", // Set the location to "new"
      });

      createdDocuments.push(newDoc);
      successCount++;
      console.log(
        `[${successCount + failCount}/${totalCount}] Created document: ${url}`
      );
    } catch (error) {
      failCount++;
      console.error(
        `[${
          successCount + failCount
        }/${totalCount}] Failed to create document: ${url}`,
        error
      );
    }

    // Add delay before next request if rate limiting is enabled and not the last request
    if (rateLimitMs > 0 && index < recommendedUrls.length - 1) {
      console.log(
        `Rate limiting: Waiting ${rateLimitMs}ms before next request...`
      );
      await delay(rateLimitMs);
    }
  }

  return {
    successCount,
    failCount,
    createdDocuments,
  };
}
