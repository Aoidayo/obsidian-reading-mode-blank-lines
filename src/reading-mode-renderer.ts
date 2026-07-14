import { SectionBlankLines } from './blank-line-analysis';

export const SPACER_CLASS = 'reading-blank-line-spacer';
export const BLOCK_CLASS = 'reading-blank-lines-block';
export const OWNED_ATTRIBUTE = 'data-reading-blank-lines';
export const BEFORE_PROPERTY = '--reading-blank-lines-before';
export const AFTER_PROPERTY = '--reading-blank-lines-after';

export function clearRenderedBlankLines(el: HTMLElement): void {
  el.querySelectorAll<HTMLElement>(`[${OWNED_ATTRIBUTE}]`).forEach((node) => {
    node.remove();
  });

  const block = findRenderedBlock(el);
  block.style.removeProperty(BEFORE_PROPERTY);
  block.style.removeProperty(AFTER_PROPERTY);
  block.classList.remove(BLOCK_CLASS);
}

export function applySectionBlankLines(
  el: HTMLElement,
  spacing: SectionBlankLines,
  blankLineHeight = 1,
): void {
  const block = findRenderedBlock(el);
  const lineHeight = getComputedStyle(block).lineHeight;
  setBlockSpacing(
    block,
    BEFORE_PROPERTY,
    spacing.leading,
    lineHeight,
    blankLineHeight,
  );
  setBlockSpacing(
    block,
    AFTER_PROPERTY,
    spacing.trailing,
    lineHeight,
    blankLineHeight,
  );
  insertInternalSpacers(
    el,
    spacing.internal.map((run) => run.count),
    lineHeight,
    blankLineHeight,
  );
}

function insertInternalSpacers(
  el: HTMLElement,
  counts: number[],
  lineHeight: string,
  blankLineHeight: number,
): void {
  if (counts.length === 0) return;

  const children = Array.from(el.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && !child.hasAttribute(OWNED_ATTRIBUTE),
  );

  for (let index = 0; index < counts.length && index + 1 < children.length; index++) {
    const before = children[index + 1];
    for (let spacerIndex = 0; spacerIndex < counts[index]; spacerIndex++) {
      el.insertBefore(
        createSpacer('internal', lineHeight, blankLineHeight),
        before,
      );
    }
  }
}

function findRenderedBlock(el: HTMLElement): HTMLElement {
  const section = el.closest<HTMLElement>('.markdown-preview-section');
  if (!section) return el;

  let block = el;
  while (block.parentElement && block.parentElement !== section) {
    block = block.parentElement;
  }
  return block;
}

function setBlockSpacing(
  el: HTMLElement,
  property: string,
  count: number,
  lineHeight: string,
  blankLineHeight: number,
): void {
  if (count <= 0) return;
  el.classList.add(BLOCK_CLASS);
  el.style.setProperty(
    property,
    formatBlankLineLength(count, lineHeight, blankLineHeight),
  );
}

function createSpacer(
  kind: string,
  lineHeight: string,
  blankLineHeight: number,
): HTMLDivElement {
  const spacer = document.createElement('div');
  spacer.className = SPACER_CLASS;
  spacer.setAttribute(OWNED_ATTRIBUTE, kind);
  spacer.setAttribute('aria-hidden', 'true');
  spacer.style.height = formatBlankLineLength(1, lineHeight, blankLineHeight);
  spacer.textContent = '\u00A0';
  return spacer;
}

export function formatBlankLineLength(
  count: number,
  lineHeight: string,
  blankLineHeight = 1,
): string {
  const pixels = Number.parseFloat(lineHeight);
  if (Number.isFinite(pixels) && lineHeight.trim().endsWith('px')) {
    return `${pixels * count * blankLineHeight}px`;
  }
  return `${count * 1.5 * blankLineHeight}em`;
}
