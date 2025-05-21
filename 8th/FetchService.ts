import JSZip from "jszip";

interface AudioFile {
  name: string;
  data: ArrayBuffer;
}

class FetchService {
  private isAudioFile(header: Uint8Array): boolean {
    // Common audio file signatures
    const m4aSignature = [0x66, 0x74, 0x79, 0x70]; // 'ftyp'
    const mp4Signature = [0x66, 0x74, 0x79, 0x70]; // 'ftyp'

    // Check for M4A/MP4 signature (starts at offset 4)
    if (header.length >= 8) {
      const signatureBytes = Array.from(header.slice(4, 8));
      return (
        m4aSignature.every((byte, i) => byte === signatureBytes[i]) ||
        mp4Signature.every((byte, i) => byte === signatureBytes[i])
      );
    }
    return false;
  }

  async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  }

  async fetchAndExtractAudioFiles(zipUrl: string): Promise<AudioFile[]> {
    const response = await fetch(zipUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const zipBuffer = await response.arrayBuffer();
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(zipBuffer);
    const audioFiles: AudioFile[] = [];

    for (const [filename, file] of Object.entries(loadedZip.files)) {
      console.log(`Processing file: ${filename}`);
      console.log("File type: ", file.dir ? "directory" : "file");

      if (!file.dir) {
        // Get the first few bytes to check the file signature
        const data = await file.async("arraybuffer");
        const header = new Uint8Array(data.slice(0, 8));
        console.log(
          `File ${filename} header bytes:`,
          [...header].map((b) => b.toString(16).padStart(2, "0")).join(" ")
        );

        // Check if it's actually an audio file regardless of extension
        if (filename.endsWith(".m4a") || this.isAudioFile(header)) {
          audioFiles.push({
            name: filename,
            data,
          });
        }
      }
    }

    return audioFiles;
  }
}

export default FetchService;
