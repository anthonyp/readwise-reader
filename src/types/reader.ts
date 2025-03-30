export interface DocumentCreateParams {
  url: string;
  html?: string;
  should_clean_html?: boolean;
  title?: string;
  author?: string;
  summary?: string;
  published_date?: string; // ISO 8601 format
  image_url?: string;
  location?: "new" | "later" | "archive" | "feed";
  category?:
    | "article"
    | "email"
    | "rss"
    | "highlight"
    | "note"
    | "pdf"
    | "epub"
    | "tweet"
    | "video";
  saved_using?: string;
  tags?: string[];
  notes?: string;
}

export interface Document {
  id: string;
  url: string;
  html_content?: string;
  // Additional fields may be returned by the API.
}

export interface DocumentListResponse {
  count: number;
  nextPageCursor?: string;
  results: Document[];
}

export interface DocumentUpdateParams {
  title?: string;
  author?: string;
  summary?: string;
  published_date?: string; // ISO 8601 format
  image_url?: string;
  location?: "new" | "later" | "archive" | "feed";
  category?:
    | "article"
    | "email"
    | "rss"
    | "highlight"
    | "note"
    | "pdf"
    | "epub"
    | "tweet"
    | "video";
}

export interface DocumentListQuery {
  id?: string;
  updatedAfter?: string;
  location?: string;
  category?: string;
  pageCursor?: string;
  withHtmlContent?: boolean;
}
