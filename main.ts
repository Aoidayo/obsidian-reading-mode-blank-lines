import { Plugin, MarkdownPostProcessorContext } from 'obsidian';

export default class PreserveBlankLinesPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerMarkdownPostProcessor(
      (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        const info = ctx.getSectionInfo(el);
        if (!info) return;

        const lines = info.text.split('\n');

        // Count consecutive blank lines immediately above this section.
        let blanks = 0;
        for (let i = info.lineStart - 1; i >= 0; i--) {
          if (lines[i].trim() === '') blanks++;
          else break;
        }

        // The renderer already produces one paragraph break for the first
        // blank line. Any additional blanks need explicit spacers.
        const extras = blanks - 1;
        if (extras <= 0) return;

        for (let i = 0; i < extras; i++) {
          const spacer = document.createElement('div');
          spacer.className = 'preserve-blank-line';
          spacer.appendChild(document.createTextNode('\u00A0'));
          el.insertBefore(spacer, el.firstChild);
        }
      },
    );
  }
}
