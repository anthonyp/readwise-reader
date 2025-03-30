import { ReadwiseReaderSDK } from "./services/reader";
import { config } from "./config";
import { parseTLDRLinks } from "./services/tldr";

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
