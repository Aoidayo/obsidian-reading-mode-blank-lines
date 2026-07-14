import {
  App,
  MarkdownView,
  MarkdownPostProcessorContext,
  Plugin,
  PluginSettingTab,
  Setting,
} from 'obsidian';
import {
  classifySectionBlankLines,
  normalizeMarkdownLines,
} from './src/blank-line-analysis';
import {
  applySectionBlankLines,
  clearRenderedBlankLines,
} from './src/reading-mode-renderer';
import {
  ReadingModeRefreshCoordinator,
} from './src/reading-mode-refresh';
import {
  BLANK_LINE_HEIGHT_STEP,
  DEFAULT_SETTINGS,
  MAX_BLANK_LINE_HEIGHT,
  MIN_BLANK_LINE_HEIGHT,
  normalizeSettings,
  ReadingModeBlankLinesSettings,
} from './src/blank-line-settings';

export default class ReadingModeBlankLinesPlugin extends Plugin {
  private refreshCoordinator!: ReadingModeRefreshCoordinator<MarkdownView>;
  settings: ReadingModeBlankLinesSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    this.refreshCoordinator = new ReadingModeRefreshCoordinator(() =>
      this.getActiveReadingView(),
    );
    this.addSettingTab(new BlankLineSettingsTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on('editor-change', (_editor, info) => {
        if (info instanceof MarkdownView) {
          this.refreshCoordinator.markViewDirty(info);
        }
      }),
    );
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        this.refreshCoordinator.refreshDirtyActiveView();
      }),
    );
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        this.refreshCoordinator.refreshDirtyActiveView();
      }),
    );

    this.registerMarkdownPostProcessor(async (el, ctx) => {
      await this.processSection(el, ctx);
    }, 100);
  }

  refreshActiveReadingView(): void {
    const view = this.getActiveReadingView();
    if (!view) return;
    this.refreshReadingView(view);
  }

  private getActiveReadingView(): MarkdownView | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.getMode() !== 'preview') return null;
    return view;
  }

  private refreshReadingView(view: MarkdownView): void {
    this.refreshCoordinator.markViewDirty(view);
    this.refreshCoordinator.refreshDirtyActiveView();
  }

  private async processSection(
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
  ): Promise<void> {
    clearRenderedBlankLines(el);

    const info = ctx.getSectionInfo(el);
    if (!info) return;

    const currentInfo = ctx.getSectionInfo(el);
    if (
      !currentInfo ||
      currentInfo.lineStart !== info.lineStart ||
      currentInfo.lineEnd !== info.lineEnd
    ) {
      return;
    }

    const lines = normalizeMarkdownLines(currentInfo.text);
    const spacing = classifySectionBlankLines(
      lines,
      currentInfo.lineStart,
      currentInfo.lineEnd,
    );

    applySectionBlankLines(el, spacing, this.settings.blankLineHeight);
  }
}

class BlankLineSettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: ReadingModeBlankLinesPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Blank line height')
      .setDesc('Height of each preserved blank line relative to the text line height.')
      .addSlider((slider) => {
        slider
          .setLimits(
            MIN_BLANK_LINE_HEIGHT,
            MAX_BLANK_LINE_HEIGHT,
            BLANK_LINE_HEIGHT_STEP,
          )
          .setValue(this.plugin.settings.blankLineHeight)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.blankLineHeight = value;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.refreshActiveReadingView();
          });
      });
  }
}
