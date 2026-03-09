import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export class AudioPlaybackService {
  private isPlaying = false;
  private lastAudioFilePath: string | null = null;

  getStatus(): { isPlaying: boolean; lastAudioFilePath: string | null } {
    return {
      isPlaying: this.isPlaying,
      lastAudioFilePath: this.lastAudioFilePath
    };
  }

  async playBuffer(audioBuffer: Buffer, extension: "wav" | "mp3"): Promise<string> {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "vtuber-tts-"));
    const audioPath = path.join(tempDir, `line-${Date.now()}.${extension}`);
    await writeFile(audioPath, audioBuffer);
    this.lastAudioFilePath = audioPath;

    this.isPlaying = true;
    try {
      await this.playFile(audioPath);
      return audioPath;
    } finally {
      this.isPlaying = false;
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async playFile(audioPath: string): Promise<void> {
    if (process.platform === "win32") {
      await this.playWindows(audioPath);
      return;
    }

    if (process.platform === "darwin") {
      await this.runCommand("afplay", [audioPath]);
      return;
    }

    await this.runCommand("aplay", [audioPath]);
  }

  private async playWindows(audioPath: string): Promise<void> {
    const escapedPath = audioPath.replace(/\\/g, "\\\\").replace(/'/g, "''");
    const script = [
      "Add-Type -AssemblyName System",
      "$player = New-Object System.Media.SoundPlayer",
      `$player.SoundLocation = '${escapedPath}'`,
      "$player.Load()",
      "$player.PlaySync()"
    ].join("; ");

    await this.runCommand("powershell.exe", ["-NoProfile", "-STA", "-Command", script]);
  }

  private runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: "ignore" });

      child.on("error", (error) => {
        reject(new Error(`Failed to start audio playback command '${command}': ${error.message}`));
      });

      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`Audio playback command '${command}' exited with code ${code}`));
      });
    });
  }
}
