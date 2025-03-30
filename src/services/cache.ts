import fs from "fs";
import path from "path";

export class CacheService {
  private cacheDir: string;

  constructor(subdirectory: string = "") {
    this.cacheDir = path.join(process.cwd(), "tmp", "cache", subdirectory);
    this.ensureCacheDirectory();
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(id: string): string {
    return path.join(this.cacheDir, `${id}.json`);
  }

  private isCacheValid(filePath: string, maxAgeDays: number = 30): boolean {
    if (!fs.existsSync(filePath)) return false;

    const stats = fs.statSync(filePath);
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - maxAgeDays);

    return stats.mtime > expirationDate;
  }

  async get<T>(id: string, maxAgeDays: number = 30): Promise<T | null> {
    const filePath = this.getCacheFilePath(id);

    if (!this.isCacheValid(filePath, maxAgeDays)) {
      return null;
    }

    try {
      const cachedData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return cachedData as T;
    } catch (error) {
      return null;
    }
  }

  set<T>(id: string, data: T): void {
    const filePath = this.getCacheFilePath(id);
    fs.writeFileSync(filePath, JSON.stringify(data));
  }
}
