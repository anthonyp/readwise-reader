export type DocumentCategory =
  | "article"
  | "email"
  | "rss"
  | "highlight"
  | "note"
  | "pdf"
  | "epub"
  | "tweet"
  | "video";

export type DocumentLocation = "new" | "later" | "archive" | "feed";

// ISO 8601 format date string
export type ISODateString = string;

export interface DocumentCreateParams {
  url: string;
  html?: string;
  should_clean_html?: boolean;
  title?: string;
  author?: string;
  summary?: string;
  published_date?: ISODateString;
  image_url?: string;
  location?: DocumentLocation;
  category?: DocumentCategory;
  saved_using?: string;
  tags?: string[];
  notes?: string;
}

export interface Document {
  id: string;
  url: string;
  html_content?: string;
  source_url: string;
  title: string;
  author: string;
  source: string;
  category: DocumentCategory;
  location: DocumentLocation;
  tags: string[];
  site_name: string;
  word_count: number;
  created_at: ISODateString;
  updated_at: ISODateString;
  notes: string;
  published_date: ISODateString;
  summary: string;
  image_url: string;
  parent_id: string | null;
  reading_progress: number;
  first_opened_at: ISODateString | null;
  last_opened_at: ISODateString | null;
  saved_at: ISODateString;
  last_moved_at: ISODateString;
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
  published_date?: ISODateString;
  image_url?: string;
  location?: DocumentLocation;
  category?: DocumentCategory;
}

export interface DocumentListQuery {
  id?: string;
  updatedAfter?: string;
  location?: string;
  category?: string;
  pageCursor?: string;
  withHtmlContent?: boolean;
}
