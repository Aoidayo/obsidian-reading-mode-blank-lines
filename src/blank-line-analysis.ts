export interface BlankLineRun {
  startLine: number;
  endLine: number;
  count: number;
}

export interface SectionBlankLines {
  leading: number;
  trailing: number;
  internal: BlankLineRun[];
}

export function normalizeMarkdownLines(source: string): string[] {
  return source.replace(/\r\n?/g, '\n').split('\n');
}

export function findEligibleBlankLineRuns(lines: string[]): BlankLineRun[] {
  const runs: BlankLineRun[] = [];
  let runStart: number | null = null;
  let inCodeFence = false;
  let codeFenceMarker = '';
  let inMathFence = false;

  const flushRun = (endLine: number): void => {
    if (runStart === null) return;
    runs.push({
      startLine: runStart,
      endLine,
      count: endLine - runStart + 1,
    });
    runStart = null;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    const codeFence = line.match(/^\s*(`{3,}|~{3,})/);
    const mathFence = trimmed === '$$';

    if (codeFence && !inMathFence) {
      flushRun(index - 1);
      const marker = codeFence[1][0];
      if (inCodeFence && marker === codeFenceMarker) {
        inCodeFence = false;
        codeFenceMarker = '';
      } else if (!inCodeFence) {
        inCodeFence = true;
        codeFenceMarker = marker;
      }
      continue;
    }

    if (mathFence && !inCodeFence) {
      flushRun(index - 1);
      inMathFence = !inMathFence;
      continue;
    }

    if (inCodeFence || inMathFence) {
      flushRun(index - 1);
      continue;
    }

    if (isEligibleBlankLine(line)) {
      if (runStart === null) runStart = index;
      continue;
    }

    flushRun(index - 1);
  }

  flushRun(lines.length - 1);
  return runs;
}

function isEligibleBlankLine(line: string): boolean {
  if (line.trim() === '') return true;
  return /^(?:\s*>\s*)+$/.test(line);
}

export function classifySectionBlankLines(
  lines: string[],
  lineStart: number,
  lineEnd: number,
): SectionBlankLines {
  const runs = findEligibleBlankLineRuns(lines);
  const internal: BlankLineRun[] = [];
  let leading = 0;
  let trailing = 0;

  for (const run of runs) {
    if (run.endLine < lineStart) {
      if (run.endLine === lineStart - 1) leading = run.count;
      continue;
    }

    if (run.startLine > lineEnd) {
      if (run.startLine === lineEnd + 1) trailing = run.count;
      continue;
    }

    const startLine = Math.max(run.startLine, lineStart);
    const endLine = Math.min(run.endLine, lineEnd);

    if (startLine === lineStart) {
      leading = endLine - startLine + 1;
      continue;
    }

    if (endLine === lineEnd) {
      trailing = endLine - startLine + 1;
      continue;
    }

    if (startLine <= endLine) {
      internal.push({
        startLine,
        endLine,
        count: endLine - startLine + 1,
      });
    }
  }

  return { leading, trailing, internal };
}
