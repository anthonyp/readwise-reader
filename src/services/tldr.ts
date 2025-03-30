import { JSDOM } from "jsdom";

export function parseTLDRLinks(
  htmlContent: string
): Array<{ url: string; title: string; summary: string }> {
  const links: Array<{ url: string; title: string; summary: string }> = [];

  // Create a DOM from the HTML content using JSDOM
  const dom = new JSDOM(htmlContent);
  const doc = dom.window.document;

  // Find all paragraphs that contain links
  const paragraphs = doc.querySelectorAll("p");

  for (let i = 0; i < paragraphs.length; i++) {
    const linkPara = paragraphs[i];
    const linkElement = linkPara.querySelector("a");

    // Check if this paragraph contains a link with a title
    if (linkElement && linkElement.querySelector("strong")) {
      const url = linkElement.getAttribute("href") || "";
      const title =
        linkElement.querySelector("strong")?.textContent?.trim() || "";

      // Check if the next element is a paragraph (summary)
      const nextPara = paragraphs[i + 1];
      if (nextPara && !nextPara.querySelector("a")) {
        const summary = nextPara.textContent?.trim() || "";

        links.push({ url, title, summary });
        i++; // Skip the summary paragraph in the next iteration
      }
    }
  }

  return links;
}
