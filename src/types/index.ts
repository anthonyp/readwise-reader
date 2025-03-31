export * from "./reader";

/**
 * Represents an article from a TLDR newsletter
 */
export interface TLDRArticle {
  url: string;
  title: string;
  summary: string;
}
