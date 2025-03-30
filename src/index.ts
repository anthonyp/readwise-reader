import { ReadwiseReaderSDK } from "./services/reader";
import { config } from "./config";
import { JSDOM } from "jsdom";

// Add a utility function to parse TLDR newsletter links
function parseTLDRLinks(
  htmlContent: string
): Array<{ url: string; title: string; summary: string }> {
  const links: Array<{ url: string; title: string; summary: string }> = [];

  try {
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
  } catch (error) {
    console.error("Error parsing HTML:", error);
  }

  return links;
}

(async () => {
  const sdk = new ReadwiseReaderSDK(config.READWISE_READER_KEY);

  // // Create a document
  // const newDoc = await sdk.createDocument({
  //   url: "https://example.com/article",
  //   html: "<div><h1>Awesome Article</h1><p>Great content here!</p></div>",
  //   tags: ["tech", "news"],
  // });
  // console.log("Created Document:", newDoc);

  // List documents
  const docs = await sdk
    .listDocuments({
      location: "feed",
      category: "email",
      withHtmlContent: true,
    })
    .then((docs) =>
      docs.results.flatMap((doc) => parseTLDRLinks(doc.html_content || ""))
    );
  console.log("Document List:", docs);

  // // Update the document
  // const updatedDoc = await sdk.updateDocument(newDoc.id, {
  //   title: "Updated Article Title",
  //   location: "new",
  // });
  // console.log("Updated Document:", updatedDoc);

  // // Delete the document
  // await sdk.deleteDocument(newDoc.id);
  // console.log("Document deleted successfully");
})();
