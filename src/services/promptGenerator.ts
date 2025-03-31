import { Document, TLDRArticle } from "../types";

/**
 * Analyzes reading history and TLDR articles to estimate appropriate recommendation numbers
 * @param tldrArticles - Articles from TLDR newsletters
 * @param wellReadDocs - Documents the user has read
 * @returns Object with analysis information
 */
export function readingAnalysis(
  tldrArticles: TLDRArticle[],
  wellReadDocs: Document[]
): {
  readingCapacityPerDay: number;
  savingCapacityPerDay: number;
  recommendedArticleCount: number;
} {
  // Calculate user's reading capacity based on history and timeframe
  // Assuming the well-read docs are from the last 6 weeks
  const readingCapacityPerDay = wellReadDocs.length / (6 * 7);

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
 * Generates a prompt for AI analysis of user's reading patterns over a 6-month period
 * @param wellReadDocs - Documents the user has read and enjoyed (>75% read) over the past 6 months
 * @returns A string containing the prompt for an AI assistant to analyze reading patterns
 */
export function generateReadingPatternAnalysisPrompt(
  wellReadDocs: Document[]
): string {
  // Create a part of the prompt that lists the user's reading history
  const readingHistoryPrompt = wellReadDocs
    .map((doc) => {
      return `- "${doc.title}" (${doc.url})${
        doc.last_moved_at ? `\n   Date read: ${doc.last_moved_at}` : ""
      }${doc.word_count ? `\n   Word Count: ${doc.word_count}` : ""}${
        doc.summary ? `\n   Summary: ${doc.summary}` : ""
      }`;
    })
    .join("\n\n");

  // Construct the full prompt
  return `Please analyze my reading patterns from the past 6 months and provide insights about my interests and preferences.

===== MY READING HISTORY (PAST 6 MONTHS) =====
These are articles I've read more than 75% of in the past 6 months, indicating I found them valuable:

${readingHistoryPrompt}

===== ANALYSIS INSTRUCTIONS =====
Based on my reading history shown above, please provide a comprehensive analysis of my reading patterns and interests. Consider the following aspects:

1. Core Topics: What main subjects or fields do I consistently engage with?
2. Technology Preferences: What technologies, programming languages, or tools am I interested in?
3. Learning Patterns: Am I focused on practical tutorials, theoretical concepts, or both?
4. Content Type Preferences: Based on the word count, what is the mix of short- vs. long-form content?
5. Industry Focus: Which industries or sectors appear in my reading?
7. Evolution of Interests: How have my interests changed or evolved over the period?
8. Depth vs. Breadth: Do I tend to deep-dive into specific topics or explore broadly across different areas?
9. Content Sources: Are there specific websites/publications I frequently read?
10. Knowledge Gaps: Based on related topics I'm interested in, what areas might I benefit from exploring?

Please organize your analysis into clearly labeled sections addressing these different aspects of my reading behavior, and provide specific examples from my reading history to support your observations.

Your output will be used in a subsequent prompt that helps recommend articles to me, so please ensure your output is returned to me in the first person.`;
}

/**
 * Generates a recommendation prompt for TLDR newsletter articles
 * @param tldrArticles - Articles extracted from TLDR newsletters
 * @param recommendedArticleCount - The number of articles to recommend
 * @returns A string containing the prompt for an AI assistant
 */
export function generateRecommendationPrompt(
  tldrArticles: TLDRArticle[],
  analysis: {
    readingCapacityPerDay: number;
    savingCapacityPerDay: number;
    recommendedArticleCount: number;
  }
): string {
  // Create a part of the prompt that lists the new TLDR articles
  const tldrArticlesPrompt = tldrArticles
    .map((article, index) => {
      return `${index + 1}. "${article.title}" 
   URL: ${article.url}
   Summary: ${article.summary}`;
    })
    .join("\n\n");

  // Construct the full prompt
  return `I am going to provide you with an analysis of my reading patterns and preferences, along with new articles from the TLDR Newsletter that should be considered for reading. Your goal is to recommend a subset of the new TLDR articles that I should save for reading this week.

===== READING PATTERNS =====
Based on my history, I read approximately ${analysis.readingCapacityPerDay.toFixed(
    1
  )} articles per day, but I typically save about ${analysis.savingCapacityPerDay.toFixed(
    1
  )} articles per day (roughly 2x more than I thoroughly read).
So I'd like you to recommend about ${
    analysis.recommendedArticleCount
  } articles that match my interests.

===== MY READING PREFERENCES =====
**1. My Core Topics**  
Over the past six months, my reading has gravitated toward a few central themes. I consistently explore **AI and large language models** (e.g., articles on DeepSeek’s AI breakthroughs, OpenAI’s policy moves, and “Why AI reminds me of cloud computing”). I also find myself deep in **product management and leadership** (for instance, the "A Smart Bear" blog posts on startup strategy, multiple pieces on product-led growth, and resources on building effective teams). Additionally, I have a strong interest in **engineering best practices** (reading about chat-oriented programming, Terraform/PagerDuty integrations, load balancing, and mental models for engineering managers). Now and then, I explore **broader societal or environmental issues**—like microplastics in plants or climate change’s impact on food security.

**2. My Technology Preferences**  
I am particularly drawn to **cloud services, infrastructure as code, and AI frameworks**. PagerDuty’s Terraform provider, the shift toward “Operations as Code,” and references to GitHub Copilot or Cursor AI reflect an interest in **automation and DevOps**. I read about **load balancing** algorithms (Prequal) and follow the evolution of **LLMs** from OpenAI, Meta (Llama), and smaller open-source projects. While I’m not always diving into specific programming languages, I show a preference for **tools that streamline development**—especially AI-powered ones.

**3. My Learning Patterns**  
I engage with **both practical tutorials and strategic/theoretical discussions**. On the practical side, I read articles like “How to Manage Flaky Tests,” “How I write code using Cursor,” and topics on Terraform usage, which are more hands-on. On the strategic side, I read a lot about **startup leadership, product strategy, and management techniques** (e.g., mental models for managers, how to develop a compelling product vision, and the concept of product-led growth). This blend of content indicates that I like to balance **applicable how-tos** with **broader conceptual frameworks**.

**4. My Content Type Preferences**  
My reading includes a wide range of **word counts**, from short, 400–600 word news updates (e.g., political headlines, quick tech updates) to deep dives of 2,000–3,000 words or more on leadership frameworks and industry analyses. I consistently engage with **longer-form articles** on business and tech topics—pieces like “The 30 Best Pieces of Company Building Advice” often run several thousand words. At the same time, I’ll read shorter, **fast news bites** about certain topics, like AI regulation. So I’m comfortable **mixing quick reads with in-depth reports** depending on the subject matter.

**5. My Industry Focus**  
Most of my reading centers on the **technology industry**, with sub-focuses on **SaaS, cloud infrastructure, AI, and venture capital**. I also consume content about **ed-tech** and occasionally about **consumer products** (iPhone rumors, Apple’s approach to in-house chips). Overall, though, I’m predominantly invested in **startups, software engineering, and emerging tech**.

**6. My Evolution of Interests**  
My interest in **AI** has heightened during this six-month window. Early reads (January and February) included content about meta’s generative AI challenges, while more recent reads show me tracking **new open-source models** and **regulatory developments**. I’ve also been reading about **PLG (product-led growth)** fairly consistently, but it intensified around March (“How to Turn the PLG Dial,” “Avoid PLG Failure”). Additionally, my **management and leadership** readings have stayed constant—whether about mental models for managers or building robust product teams. Other topics show up sporadically but haven’t formed a dominant thread; they’re more like **punctual interests** that pop up.

**7. My Depth vs. Breadth**  
My reading habit is **moderately deep but quite broad**. I return to **product and engineering leadership** themes repeatedly—going deep on mental models, best practices, and real-world examples. At the same time, I also branch into **adjacent areas** like VC trends, corporate lawsuits (e.g., WP Engine/Automattic drama), or new AI developments (DeepSeek, GPT-4). I’m not strictly fixated on one single domain, but I do keep returning to **a core set of tech and leadership topics** for a deeper understanding.

**8. My Content Sources**  
I frequently read pieces from **“A Smart Bear”**, **The New York Times**, **The Verge**, **First Round Review**, and various **blog/news aggregators** (especially around AI developments). Another cluster of sources includes **company posts** (HashiCorp, Salesforce announcements) and **commentary from thought leaders** on LinkedIn or Substack. This fairly wide variety suggests I trust a blend of mainstream journalism, specialized tech blogs, and personal newsletters.

---

**Summary of My Reading Behavior**  
In short, I’m a reader who dives into **technology leadership, AI advances, and product-focused insights**, balanced by occasional coverage of big-picture social concerns like education funding, environmental risks, etc. I enjoy a **mix of short-form news** for staying current and **longer-form essays** for richer, strategic thinking. My reading tends to **circle back** to central pillars—**AI, product management, SaaS, and leadership**—yet I’m **open to exploring** a variety of adjacent topics, ensuring I stay informed about the broader context that surrounds modern tech and entrepreneurship.
===== NEW TLDR NEWSLETTER ARTICLES =====
${tldrArticlesPrompt}

===== RECOMMENDATION INSTRUCTIONS =====
Based on my reading patterns andpreferences shown above, please recommend which of the TLDR articles I should save for reading this week. Consider the following:
1. Prioritize articles that align with my preferences
2. Recommend approximately ${
    analysis.recommendedArticleCount
  } articles (but you can adjust if you think more or fewer would be appropriate)

Format your response as follows:
1. A brief explanation of why you're recommending each article (grouped by theme if possible)
2. End with a structured list of ONLY the recommended article URLs, one per line, with no additional text or formatting. These should be raw URLs starting with http:// or https:// without any wrapping formatting or punctuation.

IMPORTANT - URL ACCURACY GUIDELINES:
- Ensure URLs point directly to the original content (avoid proxy, tracking or redirect links)
- If a URL contains tracking parameters or unnecessary query strings, remove them
- Double check that each URL is complete and not truncated
- Make sure all recommended URLs actually exist and are not fabricated

IMPORTANT: Make sure your final list of URLs is clearly separated from other text and formatted exactly like this:

https://example.com/article1
https://example.com/article2
https://example.com/article3

DO NOT include any additional text, numbers, bullet points, or formatting around the URLs in this final list.`;
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
