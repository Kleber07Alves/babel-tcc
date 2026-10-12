import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import { commands, workspace, window, languages, Uri } from './__mocks__/vscode';

vi.mock('fs');

import { activate, deactivate, buildScopeItems } from '../src/extension';
import { SUPPORTED_LANGUAGES, buildFileWatcherPattern } from '../src/config/languages';
import { CoreBridge } from '../src/services/coreBridge';
import { KeywordMapService } from '../src/providers/keywordMap';

function makeContext(): { extensionPath: string; subscriptions: { dispose(): void }[] } {
  return {
    extensionPath: '/ext',
    subscriptions: [] as { dispose(): void }[],
  };
}

describe('extension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    workspace.__configChangeCallbacks = [];

    workspace.workspaceFolders = undefined;
    vi.mocked(workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, def?: unknown) => def),
      update: vi.fn(),
    } as any);
    vi.mocked(window.onDidChangeActiveTextEditor).mockReturnValue({ dispose: vi.fn() });
    // activate() warms the keyword cache, which asks the Core for the maps. Left alone that spawns a
    // real `dotnet` process from a unit test; its exit then surfaces as an unhandled EPIPE.
    vi.spyOn(KeywordMapService.prototype, 'warmCache').mockResolvedValue(undefined);
  });

  describe('activate', () => {
    it('should register 5 commands', () => {
      const context = makeContext();
      activate(context as any);
      expect(commands.registerCommand).toHaveBeenCalledTimes(5);
    });

    it('should register expected command names', () => {
      const context = makeContext();
      activate(context as any);
      const registeredCommands = vi.mocked(commands.registerCommand).mock.calls.map(c => c[0]);
      expect(registeredCommands).toContain('babel-tcc.toggle');
      expect(registeredCommands).toContain('babel-tcc.selectLanguage');
      expect(registeredCommands).toContain('babel-tcc.openTranslatedEditable');
      expect(registeredCommands).toContain('babel-tcc.openTranslatedReadonly');
      expect(registeredCommands).toContain('babel-tcc.showOriginal');
    });

    it('should register 2 file system providers', () => {
      const context = makeContext();
      activate(context as any);
      expect(workspace.registerFileSystemProvider).toHaveBeenCalledTimes(2);
    });

    it('should register completion and hover providers', () => {
      const context = makeContext();
      activate(context as any);
      expect(languages.registerCompletionItemProvider).toHaveBeenCalledTimes(2);
      expect(languages.registerHoverProvider).toHaveBeenCalledTimes(2);
    });

    it('should push exactly 20 subscriptions to context', () => {
      const context = makeContext();
      activate(context as any);
      expect(context.subscriptions.length).toBe(20);
    });

    it('should create file watcher covering all supported extensions', () => {
      const context = makeContext();
      activate(context as any);
      expect(workspace.createFileSystemWatcher).toHaveBeenCalledWith(buildFileWatcherPattern());
    });
  });

  describe('command handlers', () => {
    it('toggle command should flip enabled state', async () => {
      const context = makeContext();
      const updateMock = vi.fn();
      vi.mocked(workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string, def?: unknown) => {
          if (key === 'enabled') return true;
          return def;
        }),
        update: updateMock,
      } as any);

      activate(context as any);

      const toggleCall = vi.mocked(commands.registerCommand).mock.calls.find(c => c[0] === 'babel-tcc.toggle');
      expect(toggleCall).toBeDefined();
      await toggleCall![1]();

      expect(updateMock).toHaveBeenCalledWith('enabled', false, expect.anything());
    });

    it('toggle command should announce the new state when enabling', async () => {
      const context = makeContext();
      const updateMock = vi.fn();
      vi.mocked(workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string, def?: unknown) => {
          if (key === 'enabled') return false;
          return def;
        }),
        update: updateMock,
      } as any);

      activate(context as any);
      const toggleCall = vi.mocked(commands.registerCommand).mock.calls.find(c => c[0] === 'babel-tcc.toggle');
      await toggleCall![1]();

      expect(updateMock).toHaveBeenCalledWith('enabled', true, expect.anything());
      expect(window.showInformationMessage).toHaveBeenCalledTimes(1);
      expect(window.showInformationMessage).toHaveBeenCalledWith('Babel TCC: Translation enabled.');
      const outputChannel = vi.mocked(window.createOutputChannel).mock.results[0].value;
      expect(outputChannel.appendLine).toHaveBeenCalledWith('Translation enabled.');
    });

    it('toggle command should announce the new state when disabling', async () => {
      const context = makeContext();
      vi.mocked(workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string, def?: unknown) => {
          if (key === 'enabled') return true;
          return def;
        }),
        update: vi.fn(),
      } as any);

      activate(context as any);
      const toggleCall = vi.mocked(commands.registerCommand).mock.calls.find(c => c[0] === 'babel-tcc.toggle');
      await toggleCall![1]();

      expect(window.showInformationMessage).toHaveBeenCalledTimes(1);
      expect(window.showInformationMessage).toHaveBeenCalledWith('Babel TCC: Translation disabled.');
      const outputChannel = vi.mocked(window.createOutputChannel).mock.results[0].value;
      expect(outputChannel.appendLine).toHaveBeenCalledWith('Translation disabled.');
    });

    it('selectLanguage should offer the active file language and set a per-language override', async () => {
      const context = makeContext();
      const updateMock = vi.fn();
      vi.mocked(workspace.getConfiguration).mockReturnValue({
        get: vi.fn((_key: string, def?: unknown) => def),
        update: updateMock,
      } as any);
      workspace.textDocuments = [];
      // No Core process in unit tests: the command falls back to the configured language list.
      vi.spyOn(CoreBridge.prototype, 'getSupportedLanguages').mockRejectedValue(new Error('core unavailable'));
      window.activeTextEditor = { document: { uri: Uri.file('/project/Program.cs') } } as any;
      vi.mocked(window.showQuickPick)
        .mockImplementationOnce(async (items: any) =>
          items.find((scopeItem: any) => scopeItem.scope === 'language' && scopeItem.language === 'CSharp'))
        .mockImplementationOnce(async () => 'es-es' as any);

      activate(context as any);
      const selectCall = vi.mocked(commands.registerCommand).mock.calls.find(c => c[0] === 'babel-tcc.selectLanguage');
      await selectCall![1]();

      const offeredScopes = vi.mocked(window.showQuickPick).mock.calls[0][0] as any[];
      const activeLabels: string[] = offeredScopes
        .filter((scopeItem: any) => String(scopeItem.label).includes('(active)'))
        .map((scopeItem: any) => scopeItem.language);
      expect(activeLabels).toEqual(['CSharp']);
      expect(updateMock).toHaveBeenCalledWith('languageOverrides', { CSharp: 'es-es' }, expect.anything());
      expect(window.showInformationMessage).toHaveBeenCalledWith('Babel TCC: Language for CSharp set to es-es.');
      window.activeTextEditor = undefined;
    });

    it('selectLanguage should mark no language as active and set the global language without an editor', async () => {
      const context = makeContext();
      const updateMock = vi.fn();
      vi.mocked(workspace.getConfiguration).mockReturnValue({
        get: vi.fn((_key: string, def?: unknown) => def),
        update: updateMock,
      } as any);
      workspace.textDocuments = [];
      // No Core process in unit tests: the command falls back to the configured language list.
      vi.spyOn(CoreBridge.prototype, 'getSupportedLanguages').mockRejectedValue(new Error('core unavailable'));
      window.activeTextEditor = undefined;
      vi.mocked(window.showQuickPick)
        .mockImplementationOnce(async (items: any) => items.find((scopeItem: any) => scopeItem.scope === 'global'))
        .mockImplementationOnce(async () => 'es-es' as any);

      activate(context as any);
      const selectCall = vi.mocked(commands.registerCommand).mock.calls.find(c => c[0] === 'babel-tcc.selectLanguage');
      await selectCall![1]();

      const offeredScopes = vi.mocked(window.showQuickPick).mock.calls[0][0] as any[];
      expect(offeredScopes.some((scopeItem: any) => String(scopeItem.label).includes('(active)'))).toBe(false);
      expect(updateMock).toHaveBeenCalledWith('language', 'es-es', expect.anything());
      expect(window.showInformationMessage).toHaveBeenCalledWith('Babel TCC: Language set to es-es.');
    });

    it('showOriginal command should warn when no active editor', async () => {
      const context = makeContext();
      activate(context as any);
      window.activeTextEditor = undefined;

      const showOriginalCall = vi.mocked(commands.registerCommand).mock.calls.find(c => c[0] === 'babel-tcc.showOriginal');
      await showOriginalCall![1]();

      expect(window.showWarningMessage).toHaveBeenCalledWith('Babel TCC: No active editor.');
    });

    it('openTranslatedEditable should warn for unsupported file', async () => {
      const context = makeContext();
      activate(context as any);
      window.activeTextEditor = {
        document: { uri: Uri.file('/test/file.txt') },
      } as any;

      const editableCall = vi.mocked(commands.registerCommand).mock.calls.find(c => c[0] === 'babel-tcc.openTranslatedEditable');
      await editableCall![1]();

      expect(window.showWarningMessage).toHaveBeenCalledWith('Babel TCC: File type not supported for translation.');
    });

    it('openTranslatedReadonly should warn for unsupported file', async () => {
      const context = makeContext();
      activate(context as any);
      window.activeTextEditor = {
        document: { uri: Uri.file('/test/file.txt') },
      } as any;

      const readonlyCall = vi.mocked(commands.registerCommand).mock.calls.find(c => c[0] === 'babel-tcc.openTranslatedReadonly');
      await readonlyCall![1]();

      expect(window.showWarningMessage).toHaveBeenCalledWith('Babel TCC: File type not supported for translation.');
    });
  });

  describe('buildScopeItems', () => {
    it('should list all languages with active file open', () => {
      const items = buildScopeItems('CSharp');
      const labels: string[] = items.map((i) => i.label);
      expect(labels[0]).toContain('All languages');
      expect(labels).toEqual(expect.arrayContaining([
        expect.stringContaining('CSharp'),
        expect.stringContaining('Python'),
      ]));
      const csharpItem = items.find((i) => i.language === 'CSharp');
      expect(csharpItem?.label).toContain('(active)');
      const pythonItem = items.find((i) => i.language === 'Python');
      expect(pythonItem?.label).not.toContain('(active)');
    });

    it('should list all languages without active file', () => {
      const items = buildScopeItems(undefined);
      // global scope + one item per supported language
      expect(items.length).toBe(1 + SUPPORTED_LANGUAGES.length);
      for (const item of items) {
        expect(item.label).not.toContain('(active)');
      }
    });

    it('should set correct language field for per-language items', () => {
      const items = buildScopeItems('CSharp');
      const pythonItem = items.find((i) => i.language === 'Python');
      expect(pythonItem).toBeDefined();
      expect(pythonItem?.scope).toBe('language');
    });
  });

  describe('deactivate', () => {
    it('should not throw when called after activate', () => {
      const context = makeContext();
      activate(context as any);
      expect(() => deactivate()).not.toThrow();
    });

    it('should not throw when called without activate', () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});
