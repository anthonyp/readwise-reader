/**
 * Readwise Reader SDK
 *
 * This is a simple Node.js/TypeScript SDK to interact with the Readwise Reader API.
 * It supports:
 *   - Creating a document (POST to /save/)
 *   - Listing documents (GET from /list/)
 *   - Updating a document (PATCH to /update/<document_id>/)
 *   - Deleting a document (DELETE to /delete/<document_id>/)
 *
 * Authentication:
 *   Set your Readwise access token in the constructor. Every request will include the header:
 *     Authorization: Token YOUR_TOKEN
 *
 * Usage:
 *   const sdk = new ReadwiseReaderSDK('YOUR_TOKEN');
 *   await sdk.createDocument({ url: 'https://example.com/article', tags: ['tag1'] });
 *
 * Note: This example uses the global fetch API (available in Node.js v18+). If you are using an older Node version,
 * you may need to install and import a fetch polyfill like "node-fetch".
 */

import {
  Document,
  DocumentCreateParams,
  DocumentListQuery,
  DocumentListResponse,
  DocumentUpdateParams,
} from "../types/reader";

export class ReadwiseReaderSDK {
  private token: string;
  private baseUrl = "https://readwise.io/api/v3";

  /**
   * Initialize the SDK with your Readwise access token.
   * @param token - Your Readwise API token.
   */
  constructor(token: string) {
    if (!token) {
      throw new Error("API token is required");
    }
    this.token = token;
  }

  /**
   * Helper to get request headers.
   */
  private getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Token ${this.token}`,
    };
  }

  /**
   * Create a new document in Reader.
   * @param params - The document details.
   * @returns The created document.
   */
  async createDocument(params: DocumentCreateParams): Promise<Document> {
    const response = await fetch(`${this.baseUrl}/save/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(
        `Error creating document: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  }

  /**
   * List documents from Reader.
   * @param queryParams - Optional query parameters to filter the list.
   * @returns An object containing the document count, nextPageCursor (if any), and results.
   */
  async listDocuments(
    queryParams?: DocumentListQuery
  ): Promise<DocumentListResponse> {
    const query = new URLSearchParams();
    if (queryParams) {
      if (queryParams.id) query.append("id", queryParams.id);
      if (queryParams.updatedAfter)
        query.append("updatedAfter", queryParams.updatedAfter);
      if (queryParams.location) query.append("location", queryParams.location);
      if (queryParams.category) query.append("category", queryParams.category);
      if (queryParams.pageCursor)
        query.append("pageCursor", queryParams.pageCursor);
      if (typeof queryParams.withHtmlContent === "boolean")
        query.append("withHtmlContent", queryParams.withHtmlContent.toString());
    }

    const url = `${this.baseUrl}/list/?${query.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Error listing documents: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  }

  /**
   * Update an existing document.
   * @param documentId - The ID of the document to update.
   * @param params - The fields to update.
   * @returns The updated document.
   */
  async updateDocument(
    documentId: string,
    params: DocumentUpdateParams
  ): Promise<Document> {
    if (!documentId) {
      throw new Error("Document ID is required for update");
    }
    const url = `${this.baseUrl}/update/${documentId}/`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(
        `Error updating document: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  }

  /**
   * Delete a document.
   * @param documentId - The ID of the document to delete.
   */
  async deleteDocument(documentId: string): Promise<void> {
    if (!documentId) {
      throw new Error("Document ID is required for deletion");
    }
    const url = `${this.baseUrl}/delete/${documentId}/`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Error deleting document: ${response.status} ${response.statusText}`
      );
    }
    // For DELETE, we expect a 204 No Content response.
  }

  /**
   * Retrieve documents that have been read to a significant extent.
   * Gets documents from the archive with reading progress > 75% from the past few weeks or months.
   * @param timeFrame - Number of weeks or months to look back (defaults to 4 weeks)
   * @param timeUnit - The unit of time to use ('weeks' or 'months', defaults to 'weeks')
   * @returns Promise resolving to an array of well-read documents.
   */
  async getWellReadDocuments(
    timeFrame: number = 4,
    timeUnit: "weeks" | "months" = "weeks"
  ): Promise<Document[]> {
    // Calculate date from the specified time ago
    const pastDate = new Date();
    if (timeUnit === "weeks") {
      pastDate.setDate(pastDate.getDate() - timeFrame * 7);
    } else {
      pastDate.setMonth(pastDate.getMonth() - timeFrame);
    }

    // Format date as ISO string for the API
    const pastDateString = pastDate.toISOString();

    // Array to store all documents
    let allDocuments: Document[] = [];
    let nextPageCursor: string | undefined = undefined;

    // Loop to handle pagination
    do {
      // Get documents from the archive from the past specified timeframe
      const response = await this.listDocuments({
        location: "archive",
        updatedAfter: pastDateString,
        withHtmlContent: false, // We don't need the HTML content for this query
        pageCursor: nextPageCursor,
      });

      // Add results to our collection
      allDocuments = [...allDocuments, ...response.results];

      // Update cursor for next page
      nextPageCursor = response.nextPageCursor;
    } while (nextPageCursor);

    // Filter documents with reading progress > 75%
    const wellReadDocs = allDocuments.filter(
      (doc) => doc.reading_progress > 0.75
    );

    return wellReadDocs;
  }
}
