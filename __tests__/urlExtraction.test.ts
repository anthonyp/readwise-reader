import { extractTitlesAndMatchURLs } from "../src/services/promptGenerator";
import { TLDRArticle } from "../src/types";

describe("URL Extraction Tests", () => {
  it("should extract URLs correctly", async () => {
    const testCases = [
      {
        result: "fail",
        name: "Simple titles list",
        input: `Here's my analysis...
          
    And here are the recommended titles:
    "How to Build a Scalable Architecture for Your NextJS Project"
    "Getting Started with CSS Grid"
    "The Future of AI in Software Development"`,
        sampleTitles: [
          "How to Build a Scalable Architecture for Your NextJS Project",
          "Getting Started with CSS Grid",
          "The Future of AI in Software Development",
          "Unmatched Title That Shouldn't Be Found",
        ],
        sampleUrls: [
          "https://dev.to/alexeagleson/how-to-build-scalable-architecture-for-your-nextjs-project-2pb7",
          "https://css-tricks.com/getting-started-with-css-grid/",
          "https://example.com/ai-in-software-dev",
          "https://example.com/unmatched-article",
        ],
      },
      {
        result: "pass",
        name: "Titles with slight variations",
        input: `Analysis... 
    
    Recommendations:
    "How to build a scalable architecture for your NextJS project"
    "Getting started with CSS Grid"`,
        sampleTitles: [
          "How to Build a Scalable Architecture for Your NextJS Project",
          "Getting Started with CSS Grid",
        ],
        sampleUrls: [
          "https://dev.to/alexeagleson/how-to-build-scalable-architecture-for-your-nextjs-project-2pb7",
          "https://css-tricks.com/getting-started-with-css-grid/",
        ],
      },
      {
        result: "pass",
        name: "Titles with explanation",
        input: `Here are my recommendations:
    
    1. "How to Build a Scalable Architecture for Your NextJS Project" - This article discusses best practices for structuring NextJS applications.
    2. "Getting Started with CSS Grid" - A comprehensive introduction to CSS Grid layouts.`,
        sampleTitles: [
          "How to Build a Scalable Architecture for Your NextJS Project",
          "Getting Started with CSS Grid",
        ],
        sampleUrls: [
          "https://dev.to/alexeagleson/how-to-build-scalable-architecture-for-your-nextjs-project-2pb7",
          "https://css-tricks.com/getting-started-with-css-grid/",
        ],
      },
    ];

    testCases.forEach((testCase) => {
      // Create sample TLDR articles for testing
      const sampleArticles: TLDRArticle[] = testCase.sampleTitles.map(
        (title, index) => ({
          title,
          url: testCase.sampleUrls[index],
          summary: `Summary for ${title}`,
        })
      );

      // Test the new title extraction and URL matching
      const matchedUrls = extractTitlesAndMatchURLs(
        testCase.input,
        sampleArticles
      );

      // Assert: Check that the matched URLs are as expected
      if (testCase.result === "pass") {
        expect(matchedUrls).toEqual(testCase.sampleUrls);
        matchedUrls.forEach((url, i) => {
          const article = sampleArticles.find((a) => a.url === url);
          expect(article).toBeDefined();
          expect(article?.title).toBe(testCase.sampleTitles[i]);
        });
      } else {
        expect(matchedUrls).not.toEqual(testCase.sampleUrls);
      }
    });
  });
});
