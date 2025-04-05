import { extractTitlesAndMatchURLs } from "../src/services/promptGenerator";
import { TLDRArticle } from "../src/types";

describe("URL Extraction Tests", () => {
  it("should extract URLs correctly for valid matches", async () => {
    const testCases = [
      {
        name: "Simple titles list",
        input: `How to Build a Scalable Architecture for Your NextJS Project
Getting Started with CSS Grid`,
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
        name: "Titles with slight variations",
        input: `How to build a scalable architecture for your NextJS project
Getting started with CSS Grid`,
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
        name: "Titles with quotes",
        input: `How to "Properly" Build a Scalable Architecture for Your NextJS Project
Getting Started with CSS Grid`,
        sampleTitles: [
          'How to "Properly" Build a Scalable Architecture for Your NextJS Project',
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
      expect(matchedUrls).toEqual(testCase.sampleUrls);
      matchedUrls.forEach((url, i) => {
        const article = sampleArticles.find((a) => a.url === url);
        expect(article).toBeDefined();
        expect(article?.title).toBe(testCase.sampleTitles[i]);
      });
    });
  });

  it("should throw an error when titles do not match URLs", async () => {
    const input = `How to Build a Scalable Architecture for Your NextJS Project
Getting Started with CSS Grid
The Future of AI in Software Development`;

    const sampleTitles = [
      "How to Build a Scalable Architecture for Your NextJS Project",
      "Getting Started with CSS Grid",
      // Missing "The Future of AI in Software Development" causes an error
    ];

    const sampleUrls = [
      "https://dev.to/alexeagleson/how-to-build-scalable-architecture-for-your-nextjs-project-2pb7",
      "https://css-tricks.com/getting-started-with-css-grid/",
    ];

    // Create sample TLDR articles for testing
    const sampleArticles: TLDRArticle[] = sampleTitles.map((title, index) => ({
      title,
      url: sampleUrls[index],
      summary: `Summary for ${title}`,
    }));

    // Test that an error is thrown when not all titles can be matched
    expect(() => {
      extractTitlesAndMatchURLs(input, sampleArticles);
    }).toThrow(/Failed to match all titles to URLs/);
  });
});
