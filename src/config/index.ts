import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config = {
  READWISE_READER_KEY: process.env.READWISE_READER_KEY!,
} as const;
