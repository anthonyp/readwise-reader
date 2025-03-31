import { promises as fs } from "fs";
import { exec } from "child_process";
import * as os from "os";
import * as path from "path";

/**
 * Saves text content to a file in the user's downloads folder.
 * Falls back to current directory if unable to write to downloads.
 *
 * @param content - The text content to save to the file
 * @param options - Optional configuration
 * @param options.filenamePrefix - Prefix for the filename (default: 'file')
 * @param options.extension - File extension (default: 'txt')
 * @returns Promise that resolves to the path of the saved file
 */
export async function saveTextToFile(
  content: string,
  options: { filenamePrefix?: string; extension?: string } = {}
): Promise<string> {
  // Set default options
  const filenamePrefix = options.filenamePrefix || "file";
  const extension = options.extension || "txt";

  // Save to the user's downloads for easier access
  const downloadsPath = path.join(os.homedir(), "Downloads");
  const filename = `${filenamePrefix}-${Date.now()}.${extension}`;
  const filePath = path.join(downloadsPath, filename);

  try {
    await fs.writeFile(filePath, content, "utf-8");
    return filePath;
  } catch (error) {
    // If can't save to downloads, fallback to current directory
    console.error(
      "Could not save to downloads, saving to current directory instead."
    );
    await fs.writeFile(filename, content, "utf-8");
    return filename;
  }
}

/**
 * Attempts to open a file using the operating system's default application.
 *
 * @param filePath - The path to the file to open
 * @returns Promise that resolves when the operation completes
 */
export function openFile(filePath: string): Promise<void> {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command = "";

    if (platform === "darwin") {
      command = `open "${filePath}"`;
    } else if (platform === "win32") {
      command = `start "" "${filePath}"`;
    } else if (platform === "linux") {
      command = `xdg-open "${filePath}"`;
    }

    if (command) {
      exec(command, (error) => {
        if (error) {
          console.log(
            `Could not open file automatically. The file is saved at: ${filePath}`
          );
        }
        resolve();
      });
    } else {
      console.log(`The file is saved at: ${filePath}`);
      resolve();
    }
  });
}
