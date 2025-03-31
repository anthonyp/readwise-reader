import { Document, TLDRArticle } from "../types";

/**
 * Analyzes reading history and TLDR articles to estimate appropriate recommendation numbers
 * @param tldrArticles - Articles from TLDR newsletters
 * @param wellReadDocs - Documents the user has read
 * @returns Object with analysis information
 */
function analyzeReadingPatterns(
  tldrArticles: TLDRArticle[],
  wellReadDocs: Document[]
): {
  readingCapacityPerDay: number;
  savingCapacityPerDay: number;
  recommendedArticleCount: number;
} {
  // Calculate user's reading capacity based on history and timeframe
  // Assuming the well-read docs are from the last 4 weeks (28 days)
  const readingCapacityPerDay = wellReadDocs.length / 28;

  // User saves about 3x more articles than they end up reading thoroughly
  const savingCapacityPerDay = readingCapacityPerDay * 2;

  // Recommend a number of articles that won't overwhelm the reader
  // but will provide enough content, relative to their saving habits
  let recommendedArticleCount = Math.ceil(savingCapacityPerDay * 7); // We're assuming I'm running this every week and want to load up.

  // Ensure recommendations are reasonable (not too few, not too many)
  if (recommendedArticleCount < 3) recommendedArticleCount = 3;
  if (recommendedArticleCount > 25) recommendedArticleCount = 25; // Increased max as user saves more than reads

  return {
    readingCapacityPerDay,
    savingCapacityPerDay,
    recommendedArticleCount,
  };
}

/**
 * Generates a prompt for AI recommendation of TLDR newsletter articles based on reading history
 * @param tldrArticles - Articles extracted from TLDR newsletters
 * @param wellReadDocs - Documents the user has read and enjoyed (>75% read)
 * @returns A string containing the prompt for an AI assistant
 */
export function generateRecommendationPrompt(
  tldrArticles: TLDRArticle[],
  wellReadDocs: Document[]
): string {
  // Analyze reading patterns to provide context for recommendations
  const analysis = analyzeReadingPatterns(tldrArticles, wellReadDocs);

  // Create a part of the prompt that lists the user's reading history
  const readingHistoryPrompt = wellReadDocs
    .map((doc) => {
      return `- "${doc.title}" (${doc.url})${
        doc.tags.length > 0 ? ` [Tags: ${doc.tags.join(", ")}]` : ""
      }${doc.summary ? `\n   Summary: ${doc.summary}` : ""}`;
    })
    .join("\n\n");

  // Create a part of the prompt that lists the new TLDR articles
  const tldrArticlesPrompt = tldrArticles
    .map((article, index) => {
      return `${index + 1}. "${article.title}" 
   URL: ${article.url}
   Summary: ${article.summary}`;
    })
    .join("\n\n");

  // Construct the full prompt
  return `
Please analyze the following information and recommend which articles I should save for reading this week:

===== READING PATTERNS =====
Based on my history, I read approximately ${analysis.readingCapacityPerDay.toFixed(
    1
  )} articles per day, but I typically save about ${analysis.savingCapacityPerDay.toFixed(
    1
  )} articles per day (roughly 2x more than I thoroughly read).
So I'd like you to recommend about ${
    analysis.recommendedArticleCount
  } articles that match my interests.

===== RECENTLY READ AND ENJOYED ARTICLES =====
These are articles I've read more than 75% of in the past few weeks, indicating I found them valuable:

${readingHistoryPrompt}

===== NEW TLDR NEWSLETTER ARTICLES =====
${tldrArticlesPrompt}

===== RECOMMENDATION INSTRUCTIONS =====
Based on my reading history and preferences shown above, please recommend which of the TLDR articles I should save for reading this week. Consider the following:

1. Look for patterns in my reading history - topics, technologies, or themes I seem interested in
2. Prioritize articles that align with my demonstrated interests
3. A small percentage of articles that you include should broaden my perspective, but still be related to my interests
4. Avoid recommending articles on topics I don't seem to engage with
5. Recommend approximately ${
    analysis.recommendedArticleCount
  } articles (but you can adjust if you think more or fewer would be appropriate)

Format your response as follows:
1. A brief explanation of your analysis of my reading preferences
2. A brief explanation of why you're recommending each article (grouped by theme if possible)
3. End with a structured list of ONLY the recommended article URLs, one per line, with no additional text or formatting. These should be raw URLs starting with http:// or https:// without any wrapping formatting or punctuation.

IMPORTANT - URL ACCURACY GUIDELINES:
- Ensure URLs point directly to the original content (avoid proxy, tracking or redirect links)
- If a URL contains tracking parameters or unnecessary query strings, remove them
- Double check that each URL is complete and not truncated
- Make sure all recommended URLs actually exist and are not fabricated

IMPORTANT: Make sure your final list of URLs is clearly separated from other text and formatted exactly like this:

https://example.com/article1
https://example.com/article2
https://example.com/article3

DO NOT include any additional text, numbers, bullet points, or formatting around the URLs in this final list.
`;
}

/**
 * Extracts URLs from the AI's response
 * @param aiResponse - The text response from the AI
 * @returns An array of URLs
 */
export function extractURLsFromResponse(aiResponse: string): string[] {
  console.log("Processing AI response for URLs...");
  console.log(`AI response length: ${aiResponse.length} characters`);

  // Match URLs in various formats - simplified regex for more reliable matching
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const matches = aiResponse.match(urlRegex) || [];
  console.log(`Initial URL matches found: ${matches.length}`);
  if (matches.length > 0) {
    console.log("Sample of first match:", matches[0]);
  }

  // Process and clean the extracted URLs
  const cleanedUrls = matches
    .map((url) => {
      // Remove any trailing punctuation or problematic characters
      let cleanUrl = url.replace(/[.,;:)"'\]}]+$/, "");

      // Check for markdown link format and extract the URL
      const markdownMatch = cleanUrl.match(/\[.*\]\((https?:\/\/[^)]+)\)/);
      if (markdownMatch && markdownMatch[1]) {
        cleanUrl = markdownMatch[1];
      }

      // Apply additional URL cleaning and validation
      cleanUrl = cleanAndValidateURL(cleanUrl);

      return cleanUrl;
    })
    // Filter out any potential false positives with a simpler validation
    .filter((url) => {
      // Basic URL validation
      const isValid = url.startsWith("http") && url.includes(".");
      return isValid;
    });

  console.log(`Cleaned URLs count: ${cleanedUrls.length}`);

  // Remove duplicate URLs
  const uniqueUrls = [...new Set(cleanedUrls)];
  console.log(`Final unique URLs count: ${uniqueUrls.length}`);

  return uniqueUrls;
}

/**
 * Clean and validate a URL to remove tracking parameters and identify issues
 * @param url - The URL to clean and validate
 * @returns The cleaned URL
 */
function cleanAndValidateURL(url: string): string {
  try {
    // Parse the URL
    const parsedUrl = new URL(url);

    // List of common tracking parameter prefixes to remove
    const trackingParams = [
      "utm_",
      "ref",
      "fbclid",
      "gclid",
      "ocid",
      "mc_cid",
      "mc_eid",
      "yclid",
      "zanpid",
      "_hsenc",
      "_hsmi",
      "igshid",
      "mkt_tok",
    ];

    // Remove tracking parameters
    if (parsedUrl.search) {
      const searchParams = new URLSearchParams(parsedUrl.search);
      let modified = false;

      trackingParams.forEach((param) => {
        // Remove exact matches and parameters that start with the tracking prefix
        [...searchParams.keys()].forEach((key) => {
          if (key === param || key.startsWith(param)) {
            searchParams.delete(key);
            modified = true;
          }
        });
      });

      // Update the URL with cleaned parameters
      if (modified) {
        const newSearch = searchParams.toString();
        parsedUrl.search = newSearch ? `?${newSearch}` : "";
      }
    }

    // Decode unnecessary encoded components
    let cleanedUrl = parsedUrl.toString();

    // Handle common URL shorteners and redirects (just log these as potentially problematic)
    const shortenerDomains = [
      "bit.ly",
      "tinyurl.com",
      "goo.gl",
      "ow.ly",
      "is.gd",
      "t.co",
      "lnkd.in",
      "dlvr.it",
      "buff.ly",
    ];

    if (
      shortenerDomains.some((domain) => parsedUrl.hostname.includes(domain))
    ) {
      console.log(`Warning: Potentially problematic shortened URL: ${url}`);
    }

    return cleanedUrl;
  } catch (error) {
    // If URL parsing fails, return the original URL
    console.log(`Warning: Could not parse URL "${url}": ${error}`);
    return url;
  }
}

/**
 * Test function for URL extraction
 * This can be called directly for debugging
 */
export function testURLExtraction(): void {
  const testCases = [
    {
      name: "Simple URLs list",
      input: `Here's my analysis...
      
And here are the URLs:
https://example.com/article1
https://example.com/article2
https://example.com/article3`,
    },
    {
      name: "Markdown-formatted URLs",
      input: `Analysis... 

Recommendations:
[Article 1](https://example.com/article1)
[Article 2](https://example.com/article2)`,
    },
    {
      name: "URLs with numbering",
      input: `Analysis...

URLs:
1. https://example.com/article1
2. https://example.com/article2`,
    },
    {
      name: "URLs with line breaks and additional text",
      input: `Here are my recommendations:

First URL: https://example.com/article1 - This article discusses...
Second URL: https://example.com/article2 - Another great read...`,
    },
    {
      name: "URLs with tracking parameters",
      input: `URLs with tracking parameters:
https://example.com/article?utm_source=newsletter&utm_medium=email
https://example.com/page?fbclid=123456789&ref=social`,
    },
    {
      name: "URLs with URL shorteners",
      input: `Shortened URLs:
https://bit.ly/3abcdef
https://t.co/xyz12345
https://tinyurl.com/abc-123-def`,
    },
    {
      name: "Problematic URLs (from actual AI responses)",
      input: `Here's a mix of problematic URLs:
https://css-tricks.com/getting-started-with-css-grid/
https://dev.to/alexeagleson/how-to-build-scalable-architecture-for-your-nextjs-project-2pb7?utm_source=newsletter
https://bit.ly/3KqVstY 
https://example.com/article?source=tldrnewsletter`,
    },
  ];

  console.log("=== URL EXTRACTION TEST ===");
  testCases.forEach((testCase) => {
    console.log(`\nTest: ${testCase.name}`);
    const urls = extractURLsFromResponse(testCase.input);
    console.log(`Extracted URLs (${urls.length}):`);
    urls.forEach((url) => console.log(` - ${url}`));
  });

  // Test the URL cleaning separately
  console.log("\n=== URL CLEANING TEST ===");
  const urlsToClean = [
    "https://example.com/article?utm_source=newsletter&utm_medium=email&id=123",
    "https://dev.to/article?fbclid=123456789&important=true",
    "https://bit.ly/3abcdef",
    "https://t.co/xyz12345",
    "https://example.com/path%20with%20spaces",
    "https://example.com/path(with)parentheses",
    "https://example.com/article[with]brackets",
  ];

  urlsToClean.forEach((url) => {
    const cleaned = cleanAndValidateURL(url);
    console.log(`Original: ${url}`);
    console.log(`Cleaned:  ${cleaned}`);
    if (url !== cleaned) {
      console.log(`Changed:  ${url !== cleaned ? "Yes" : "No"}`);
    }
    console.log("---------");
  });

  console.log("\n=== TEST COMPLETE ===");
}
