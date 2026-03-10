export function humanizeSpeechText(text: string): string {
  const normalizedWhitespace = text.replace(/\s+/g, " ").trim();
  if (!normalizedWhitespace) {
    return "";
  }

  const withPauseSpacing = normalizedWhitespace
    .replace(/([,;:])(?=\S)/g, "$1 ")
    .replace(/([.!?])\s*/g, "$1 ");

  const chunks: string[] = [];
  let current = "";

  for (const sentence of withPauseSpacing.split(/(?<=[.!?])\s+/)) {
    const next = sentence.trim();
    if (!next) {
      continue;
    }

    if ((`${current} ${next}`).trim().length <= 120) {
      current = `${current} ${next}`.trim();
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    current = splitLongSegment(next, 120);
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.join("\n").trim();
}

function splitLongSegment(segment: string, maxLength: number): string {
  if (segment.length <= maxLength) {
    return segment;
  }

  const parts = segment.split(/,\s+/);
  if (parts.length === 1) {
    return segment;
  }

  const lines: string[] = [];
  let line = "";
  for (const part of parts) {
    const candidate = line ? `${line}, ${part}` : part;
    if (candidate.length <= maxLength) {
      line = candidate;
      continue;
    }

    if (line) {
      lines.push(line);
    }
    line = part;
  }

  if (line) {
    lines.push(line);
  }

  return lines.join("\n");
}
