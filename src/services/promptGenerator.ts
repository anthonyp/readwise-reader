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
      return `- "${doc.title}"${doc.url ? `\n   URL: ${doc.url}` : ""}${
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
Over the past six months, my reading has gravitated toward a few central themes. I consistently explore **AI and large language models** (e.g., articles on DeepSeek's AI breakthroughs, OpenAI's policy moves, and "Why AI reminds me of cloud computing"). I also find myself deep in **product management and leadership** (for instance, the "A Smart Bear" blog posts on startup strategy, multiple pieces on product-led growth, and resources on building effective teams). Additionally, I have a strong interest in **engineering best practices** (reading about chat-oriented programming, Terraform/PagerDuty integrations, load balancing, and mental models for engineering managers). Now and then, I explore **broader societal or environmental issues**—like microplastics in plants or climate change's impact on food security.

**2. My Technology Preferences**  
I am particularly drawn to **cloud services, infrastructure as code, and AI frameworks**. PagerDuty's Terraform provider, the shift toward "Operations as Code," and references to GitHub Copilot or Cursor AI reflect an interest in **automation and DevOps**. I read about **load balancing** algorithms (Prequal) and follow the evolution of **LLMs** from OpenAI, Meta (Llama), and smaller open-source projects. While I'm not always diving into specific programming languages, I show a preference for **tools that streamline development**—especially AI-powered ones.

**3. My Learning Patterns**  
I engage with **both practical tutorials and strategic/theoretical discussions**. On the practical side, I read articles like "How to Manage Flaky Tests," "How I write code using Cursor," and topics on Terraform usage, which are more hands-on. On the strategic side, I read a lot about **startup leadership, product strategy, and management techniques** (e.g., mental models for managers, how to develop a compelling product vision, and the concept of product-led growth). This blend of content indicates that I like to balance **applicable how-tos** with **broader conceptual frameworks**.

**4. My Content Type Preferences**  
My reading includes a wide range of **word counts**, from short, 400–600 word news updates (e.g., political headlines, quick tech updates) to deep dives of 2,000–3,000 words or more on leadership frameworks and industry analyses. I consistently engage with **longer-form articles** on business and tech topics—pieces like "The 30 Best Pieces of Company Building Advice" often run several thousand words. At the same time, I'll read shorter, **fast news bites** about certain topics, like AI regulation. So I'm comfortable **mixing quick reads with in-depth reports** depending on the subject matter.

**5. My Industry Focus**  
Most of my reading centers on the **technology industry**, with sub-focuses on **SaaS, cloud infrastructure, AI, and venture capital**. I also consume content about **ed-tech** and occasionally about **consumer products** (iPhone rumors, Apple's approach to in-house chips). Overall, though, I'm predominantly invested in **startups, software engineering, and emerging tech**.

**6. My Evolution of Interests**  
My interest in **AI** has heightened during this six-month window. Early reads (January and February) included content about meta's generative AI challenges, while more recent reads show me tracking **new open-source models** and **regulatory developments**. I've also been reading about **PLG (product-led growth)** fairly consistently, but it intensified around March ("How to Turn the PLG Dial," "Avoid PLG Failure"). Additionally, my **management and leadership** readings have stayed constant—whether about mental models for managers or building robust product teams. Other topics show up sporadically but haven't formed a dominant thread; they're more like **punctual interests** that pop up.

**7. My Depth vs. Breadth**  
My reading habit is **moderately deep but quite broad**. I return to **product and engineering leadership** themes repeatedly—going deep on mental models, best practices, and real-world examples. At the same time, I also branch into **adjacent areas** like VC trends, corporate lawsuits (e.g., WP Engine/Automattic drama), or new AI developments (DeepSeek, GPT-4). I'm not strictly fixated on one single domain, but I do keep returning to **a core set of tech and leadership topics** for a deeper understanding.

**8. My Content Sources**  
I frequently read pieces from **"A Smart Bear"**, **The New York Times**, **The Verge**, **First Round Review**, and various **blog/news aggregators** (especially around AI developments). Another cluster of sources includes **company posts** (HashiCorp, Salesforce announcements) and **commentary from thought leaders** on LinkedIn or Substack. This fairly wide variety suggests I trust a blend of mainstream journalism, specialized tech blogs, and personal newsletters.

---

**Summary of My Reading Behavior**  
In short, I'm a reader who dives into **technology leadership, AI advances, and product-focused insights**, balanced by occasional coverage of big-picture social concerns like education funding, environmental risks, etc. I enjoy a **mix of short-form news** for staying current and **longer-form essays** for richer, strategic thinking. My reading tends to **circle back** to central pillars—**AI, product management, SaaS, and leadership**—yet I'm **open to exploring** a variety of adjacent topics, ensuring I stay informed about the broader context that surrounds modern tech and entrepreneurship.
===== NEW TLDR NEWSLETTER ARTICLES =====
${tldrArticlesPrompt}

===== RECOMMENDATION INSTRUCTIONS =====
Based on my reading patterns and preferences shown above, please recommend which of the TLDR articles I should save for reading this week. Consider the following:
1. Prioritize articles that align with my preferences
2. Recommend approximately ${
    analysis.recommendedArticleCount
  } articles (but you can adjust if you think more or fewer would be appropriate)

Format your response as follows:
1. A brief explanation of why you're recommending each article (grouped by theme if possible)
2. End with a structured list of ONLY the recommended article TITLES, one per line, with no additional text or formatting. Each title should be EXACTLY as written in the TLDR list above, enclosed in double quotes.

IMPORTANT - TITLE ACCURACY GUIDELINES:
- Include ONLY the exact titles as they appear in the TLDR list above
- Do not modify, abbreviate, or paraphrase the titles
- Ensure each title is complete and matches exactly one article from the provided list
- Enclose each title in double quotes

IMPORTANT: Make sure your final list of titles is clearly separated from other text and formatted exactly like this:

"Title of Article 1"
"Title of Article 2"
"Title of Article 3"

DO NOT include any additional text, numbers, bullet points, or formatting around the titles in this final list.`;
}

/**
 * Extracts article titles from the AI's response and matches them to URLs
 * @param aiResponse - The text response from the AI
 * @param tldrArticles - The original TLDR articles with titles and URLs
 * @returns An array of matched URLs
 * @throws Error if not all extracted titles can be matched to URLs
 */
export function extractTitlesAndMatchURLs(
  aiResponse: string,
  tldrArticles: TLDRArticle[]
): string[] {
  console.log("Processing AI response for article titles...");
  console.log(`AI response length: ${aiResponse.length} characters`);

  // Match titles enclosed in double quotes
  const titleRegex = /"([^"]+)"/g;
  const matches: string[] = [];
  let match;

  while ((match = titleRegex.exec(aiResponse)) !== null) {
    matches.push(match[1]); // match[1] contains the title without quotes
  }

  console.log(`Extracted ${matches.length} titles from AI response`);

  // Create a map of titles to URLs for efficient lookup
  const titleToUrlMap = new Map<string, string>();
  tldrArticles.forEach((article) => {
    titleToUrlMap.set(article.title, article.url);
  });

  // Match titles to URLs
  const matchedUrls = matches
    .map((title) => {
      // Try exact match first
      if (titleToUrlMap.has(title)) {
        console.log(`Found exact match for: "${title}"`);
        return titleToUrlMap.get(title);
      }

      // If no exact match, try case-insensitive match
      const lowerTitle = title.toLowerCase();
      for (const [articleTitle, url] of titleToUrlMap.entries()) {
        if (articleTitle.toLowerCase() === lowerTitle) {
          console.log(
            `Found case-insensitive match for: "${title}" → "${articleTitle}"`
          );
          return url;
        }
      }

      // If still no match, try fuzzy matching (e.g., for minor differences in punctuation or whitespace)
      for (const [articleTitle, url] of titleToUrlMap.entries()) {
        // Simple similarity check - removing spaces, punctuation, and comparing lowercase
        const normalize = (str: string) =>
          str.toLowerCase().replace(/[^\w]/g, "");
        if (normalize(articleTitle) === normalize(title)) {
          console.log(`Found fuzzy match for: "${title}" → "${articleTitle}"`);
          return url;
        }
      }

      console.log(`No match found for title: "${title}"`);
      return null;
    })
    .filter((url): url is string => url !== null);

  console.log(
    `Successfully matched ${matchedUrls.length} out of ${matches.length} titles to URLs`
  );

  // Throw an error if not all titles were matched to URLs
  if (matchedUrls.length !== matches.length) {
    const unmatchedTitles = matches.filter((title) => {
      // Find the titles that didn't get matched properly
      return (
        !titleToUrlMap.has(title) &&
        !Array.from(titleToUrlMap.keys()).some(
          (articleTitle) =>
            articleTitle.toLowerCase() === title.toLowerCase() ||
            articleTitle.toLowerCase().replace(/[^\w]/g, "") ===
              title.toLowerCase().replace(/[^\w]/g, "")
        )
      );
    });

    throw new Error(
      `Failed to match all titles to URLs. Found ${matches.length} titles but only matched ${matchedUrls.length} URLs. ` +
        `Unmatched titles: ${unmatchedTitles.join(", ")}`
    );
  }

  return matchedUrls;
}
