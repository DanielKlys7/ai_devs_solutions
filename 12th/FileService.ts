import fs from "node:fs";
import path from "node:path";

export interface FileData {
  filename: string;
  content: string;
  date: string;
}

export class FileService {
  constructor(private readonly baseDir: string) {}

  readAllTextFiles(): FileData[] {
    const files = fs
      .readdirSync(this.baseDir)
      .filter((file) => file.endsWith(".txt"));

    return files.map((file) => {
      const filePath = path.join(this.baseDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const date = file.replace(".txt", "");

      return {
        filename: file,
        content,
        date,
      };
    });
  }
}
