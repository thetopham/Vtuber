import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export type PlaybackResult = {
  filePath: string;
};

export class AudioPlaybackService {
  private isPlaying = false;
  private lastAudioFilePath: string | null = null;

  public getStatus(): { isPlaying: boolean; lastAudioFilePath: string | null } {
    return {
      isPlaying: this.isPlaying,
      lastAudioFilePath: this.lastAudioFilePath
    };
  }

  public async playWavBuffer(audioBuffer: Buffer): Promise<PlaybackResult> {
    const tempFilePath = path.join(os.tmpdir(), `vtuber-tts-${randomUUID()}.wav`);
    await fs.writeFile(tempFilePath, audioBuffer);
    this.lastAudioFilePath = tempFilePath;
    this.isPlaying = true;

    try {
      await this.playOnCurrentPlatform(tempFilePath);
      return { filePath: tempFilePath };
    } finally {
      this.isPlaying = false;
      setTimeout(() => {
        void fs.unlink(tempFilePath).catch(() => undefined);
      }, 2_000);
    }
  }

  private async playOnCurrentPlatform(filePath: string): Promise<void> {
    if (process.platform === "win32") {
      await this.playOnWindows(filePath);
      return;
    }

    throw new Error(`Audio playback is only implemented for Windows in this PR. Current platform: ${process.platform}`);
  }

  private async playOnWindows(filePath: string): Promise<void> {
    const escapedPath = filePath.replace(/'/g, "''");
    const script = [
      `Add-Type -AssemblyName presentationCore`,
      `$player = New-Object System.Media.SoundPlayer('${escapedPath}')`,
      `$player.Load()`,
      `$player.PlaySync()`
    ].join("; ");

    await new Promise<void>((resolve, reject) => {
      const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
        stdio: ["ignore", "pipe", "pipe"]
      });

      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`PowerShell playback failed with code ${code}: ${stderr}`));
      });

      child.on("error", reject);
    });
  }
}
