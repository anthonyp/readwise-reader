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
10. What is the general percentage of each core topic that I read?

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
## 1. My Core Topics
I have a strong pattern of reading about **software engineering, AI, and product leadership**, alongside startup culture and personal/professional development. I've also mixed in articles about **environmental science**, **public policy**, and **health/science breakthroughs**. But overall, the technical and leadership topics dominate.

Specific examples include:

- **Software & AI:** Articles like "Operations as Code: Operational Excellence with PagerDuty," "How to use AI to increase Software Development productivity," and "Why AI reminds me of cloud computing." I prefer practical AI applications and mass market releases rather than theoretical or academic AI research.
- **Leadership & Startups:** Reads such as "A Smart Bear » 'I scratched my own itch' isn't good enough" and "7 proven mental models for engineering managers."
- **Environment/Science:** "Microplastics hinder plant photosynthesis, study finds..." and "Scientists glue two proteins together, driving cancer cells to self-destruct."

---

## 2. My Technology Preferences
I consistently show interest in:

- **DevOps and Cloud Infrastructure:** I've read about **Terraform** ("By using PagerDuty's Terraform provider..."), load balancing ("Load is not what you should balance... Introducing Prequal"), and the importance of **automation** ("Operations as Code helps organizations manage operational tasks...").  
- **Generative AI & Coding Tools:** Articles about **GitHub Copilot**, **Cursor AI**, and references to training large language models (LLMs), e.g., "Team Says They've Recreated DeepSeek's OpenAI Killer...". I'm more interested in applied AI technologies and product releases than academic or highly theoretical AI research.
- **Cybersecurity Trends:** I follow broad industry trends and strategic approaches to security, but I'm not interested in specific vulnerability reports, CVE details, or technical security bulletins.
- **Engineering Culture and Best Practices:** "How to manage flaky tests," "The Death of the Junior Developer," "Engineering maturity models," etc.

I enjoy staying updated on practical DevOps automation, AI development, and overall engineering productivity.

---

## 3. My Learning Patterns
I bounce between **practical tutorials** and **theoretical/conceptual** articles:

- **Practical:** Articles like "How to Invite Influence And Not Try Too Hard to Influence others" (tips on collaboration), "How to Manage Flaky Tests" (actionable engineering advice), and "Operations as Code..." (hands-on infrastructure automation).
- **Theoretical or Conceptual:** "Einstellung Effect," "7 proven mental models for engineering managers," or "Don't believe the hype: AGI is far from inevitable." These are more about frameworks for thinking, leadership psychology, and practical AI philosophy - not academic or highly technical theoretical content.

It's a blend: I want clear, actionable guidance but also enjoy stepping back for big-picture, conceptual insights.

---

## 4. My Content Type Preferences (Short vs. Long Form)
The articles I've read range from **shorter summaries** around 400–600 words (e.g., "OpenAI asks White House for relief..." was 436 words) up to **longer deep-dives** in the 2,000–3,000+ word range. I'm comfortable reading both quick news hits and more detailed analyses.

Overall, my reading is fairly **balanced** between mid-length (1k–2k) articles and some longer pieces. I don't shy away from bigger reads if the topic is compelling.

---

## 5. My Industry Focus
My readings touch a few major industries:

- **Tech & Software**: Dominant—covering everything from AI/ML, DevOps, cloud computing, and engineering management.
- **Startup & Venture Capital**: Repeated reads on product-led growth (PLG), founder advice, and venture funding ("Andreessen Horowitz, Benchmark and the Transformation of Venture Capital," "What's The Important Thing...").
- **Science & Environment**: Significant articles on microplastics, astrophysics (asteroid impact risk), biotech breakthroughs in cancer research, etc.

Still, the lion's share of my reading focuses on **software/tech, AI, startups, and leadership**.

---

## 6. Evolution of My Interests Over Time
- I've had a **consistent** interest in **software engineering**, **AI**, and **leadership** from the start, reading about "vibe coding" or "AI productivity" in older entries and continuing to dig into more LLM or DevOps discussions in newer ones.
- There's a **slight uptick** in articles about **generative AI controversies** and **regulations** (e.g., "Meta genai org in panic mode," "OpenAI asks White House for relief...", references to the EU's AI Act).
- I occasionally sprinkle in environment or health-related science articles, but that has been more or less stable, not a huge shift in volume.

I wouldn't call it a radical change; rather, I've been **building on my existing interests**, especially around LLMs and AI in the last few months.

---

## 7. Depth vs. Breadth
I explore a **fairly broad** set of themes (from the environment to advanced AI) but **go consistently deep** into anything related to **software development, engineering leadership, AI tools, and startup best practices**. So I'd characterize my reading as **broad overall**, but with a deeper dive into those software/AI/leadership areas.

---

## 8. My Common Content Sources
I'm pulling articles from a variety of places:

- **Blogs/Newsletters**: "A Smart Bear," "The Beautiful Mess" by John Cutler, "First Round Review," "Unknown Arts," "Hello Operator," personal Substack-type blogs.
- **Mainstream Tech Media**: "The Verge," "New York Times," occasional references to "The Atlantic."

I return frequently to **A Smart Bear** (multiple articles referenced) and **The New York Times** for broader coverage.

---

## 9. Approximate Breakdown of My Reading by Core Topic
If I group them loosely:

- **Software Engineering, Applied AI, and Product/Tech**: ~60–65%
- **Startup/Leadership/Business Strategy**: ~20–25%
- **Environment, Science, & General News** (including science and health breakthroughs, the environment, etc.): ~10–15%

These aren't exact but reflect the dominant share of articles around tech, engineering, AI, and leadership.

---

## 10. Summary of My Reading Behavior
I am drawn to topics that inform my **software engineering** and **technical leadership** knowledge, often diving into **best practices**, **new tools**, **applied AI developments**, and **workplace culture**. I prefer practical AI applications over academic research. While I'm interested in broad cybersecurity trends, I avoid detailed vulnerability reports or CVEs. I also keep myself **well-rounded** with readings on **science and the environment**. Overall, I look for both **practical how-to guidance** and **conceptual or thought-provoking** insights that can be applied to real-world scenarios.

---

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
