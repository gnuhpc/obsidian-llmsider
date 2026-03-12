import { DataAdapter, Notice, Vault, normalizePath } from 'obsidian';
import { UnifiedTool } from '../tools/unified-tool-manager';
import { getBuiltInTool } from '../tools/built-in-tools';
import {
  ChatSession,
  LocalSkillManifest,
  ResolvedSkill,
  SkillLoadError,
  SkillPromptTemplate,
  SkillStateSnapshot,
} from '../types';
import { Logger } from '../utils/logger';
import { ConfigDatabase } from '../utils/config-db';
import type { BaseLLMProvider } from '../providers/base-provider';
import type { ChatMessage } from '../types';
import { i18n } from '../i18n/i18n-manager';

const DEFAULT_SKILLS_DIRECTORY = 'skills';
const RUN_LOCAL_COMMAND_TOOL = 'run_local_command';
const SKILL_ROUTING_SYNONYMS: Record<string, string[]> = {
  search: ['search', 'find', 'lookup', 'query', '搜索', '查找', '检索', '查询'],
  note: ['note', 'notes', 'markdown', '笔记', '文档', '文章', '内容'],
  obsidian: ['obsidian', 'vault', '库', '仓库'],
  web: ['web', 'page', 'website', 'url', '网页', '页面', '链接'],
  json: ['json'],
  canvas: ['canvas', '画布'],
  base: ['base', 'bases', '数据库', '表格', '库'],
  markdown: ['markdown', 'md', '正文', '文档', '笔记'],
  cli: ['cli', 'command', 'terminal', '命令', '终端'],
  extract: ['extract', 'parse', 'clean', '提取', '解析', '清洗'],
  edit: ['edit', 'update', 'modify', 'create', 'write', '编辑', '修改', '创建', '写入'],
};

const SKILL_INTENT_CLUSTERS: Record<string, string[]> = {
  note_authoring: ['note', 'notes', 'markdown', 'md', 'save', 'create', 'write', 'edit', '笔记', '保存', '创建', '写入', '编辑', '文章'],
  obsidian_vault: ['obsidian', 'vault', 'wikilinks', 'frontmatter', 'callout', '库', '仓库', '双链', '属性'],
  web_extraction: ['web', 'url', 'page', 'website', 'extract', 'clean', '网页', '链接', '页面', '提取', '清洗'],
  canvas_graph: ['canvas', 'mind map', 'flowchart', '画布', '脑图', '流程图'],
  database_view: ['base', 'bases', 'table', 'filter', 'formula', '数据库', '表格', '筛选', '公式'],
};

export class SkillManager {
  private skills = new Map<string, ResolvedSkill>();
  private loadErrors: SkillLoadError[] = [];
  private state: SkillStateSnapshot = {
    directory: DEFAULT_SKILLS_DIRECTORY,
    defaultActiveSkillId: '',
    globallyEnabled: true,
    enabledSkills: {},
  };

  constructor(
    private configDb: ConfigDatabase,
    private vault: Vault,
    private adapter: DataAdapter = vault.adapter,
  ) {}

  async initialize(): Promise<void> {
    await this.loadState();
    await this.reload();
  }

  async reload(): Promise<void> {
    this.skills.clear();
    this.loadErrors = [];

    const skillsDirectory = normalizePath(this.state.directory || DEFAULT_SKILLS_DIRECTORY);
    this.state.directory = skillsDirectory;

    if (!(await this.adapter.exists(skillsDirectory))) {
      Logger.debug(`[SkillManager] Skills directory does not exist: ${skillsDirectory}`);
      await this.persistState();
      return;
    }

    try {
      const listing = await this.adapter.list(skillsDirectory);
      for (const folderPath of listing.folders) {
        await this.loadSkillFromDirectory(folderPath);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.loadErrors.push({ path: skillsDirectory, message });
      Logger.error('[SkillManager] Failed to scan skills directory:', error);
    }

    this.reconcileState();
    await this.persistState();
  }

  listSkills(): ResolvedSkill[] {
    return Array.from(this.skills.values()).sort((left, right) => left.name.localeCompare(right.name));
  }

  getEnabledSkills(): ResolvedSkill[] {
    return this.listSkills().filter(skill => this.isSkillEnabled(skill.id));
  }

  getSkill(skillId: string): ResolvedSkill | null {
    return this.skills.get(skillId) || null;
  }

  getLoadErrors(): SkillLoadError[] {
    return [...this.loadErrors];
  }

  getStateSnapshot(): SkillStateSnapshot {
    return {
      directory: this.state.directory,
      defaultActiveSkillId: this.state.defaultActiveSkillId,
      globallyEnabled: this.state.globallyEnabled,
      enabledSkills: { ...this.state.enabledSkills },
    };
  }

  getSkillsDirectory(): string {
    return this.state.directory;
  }

  async setSkillsDirectory(directory: string): Promise<void> {
    this.state.directory = normalizePath(directory || DEFAULT_SKILLS_DIRECTORY);
    await this.persistState();
    await this.reload();
  }

  getDefaultActiveSkillId(): string {
    return this.state.defaultActiveSkillId;
  }

  async setDefaultActiveSkillId(skillId: string): Promise<void> {
    if (skillId && !this.skills.has(skillId)) {
      throw new Error(`Unknown skill: ${skillId}`);
    }

    this.state.defaultActiveSkillId = skillId || '';
    await this.persistState();
  }

  isSkillEnabled(skillId: string): boolean {
    const configured = this.state.enabledSkills[skillId];
    if (typeof configured === 'boolean') {
      return configured;
    }

    const skill = this.skills.get(skillId);
    return skill?.enabledByDefault !== false;
  }

  async setSkillEnabled(skillId: string, enabled: boolean): Promise<void> {
    if (!this.skills.has(skillId)) {
      throw new Error(`Unknown skill: ${skillId}`);
    }

    this.state.enabledSkills[skillId] = enabled;
    if (!enabled && this.state.defaultActiveSkillId === skillId) {
      this.state.defaultActiveSkillId = '';
    }

    await this.persistState();
  }

  async setAllSkillsEnabled(enabled: boolean): Promise<void> {
    for (const skill of this.skills.values()) {
      this.state.enabledSkills[skill.id] = enabled;
    }

    if (!enabled) {
      this.state.defaultActiveSkillId = '';
    }

    await this.persistState();
  }

  isGloballyEnabled(): boolean {
    return this.state.globallyEnabled !== false;
  }

  async setGloballyEnabled(enabled: boolean): Promise<void> {
    this.state.globallyEnabled = enabled;
    await this.persistState();
  }

  isSessionSkillUsageAllowed(session?: ChatSession | null): boolean {
    return session?.skillsEnabled !== false;
  }

  hasEnabledSkills(): boolean {
    return this.listSkills().some(skill => this.isSkillEnabled(skill.id));
  }

  isSkillUsageEnabled(session?: ChatSession | null): boolean {
    return this.isGloballyEnabled() && this.isSessionSkillUsageAllowed(session) && this.hasEnabledSkills();
  }

  getEffectiveSkill(session?: ChatSession | null): ResolvedSkill | null {
    if (!this.isSkillUsageEnabled(session)) {
      return null;
    }

    const sessionSkillId = session?.activeSkillId;
    if (sessionSkillId) {
      const sessionSkill = this.skills.get(sessionSkillId);
      if (sessionSkill && this.isSkillEnabled(sessionSkillId)) {
        return sessionSkill;
      }
    }

    const defaultSkillId = this.state.defaultActiveSkillId;
    if (!defaultSkillId) {
      return this.getAutoSelectedSkill();
    }

    const defaultSkill = this.skills.get(defaultSkillId);
    if (!defaultSkill || !this.isSkillEnabled(defaultSkillId)) {
      return this.getAutoSelectedSkill();
    }

    return defaultSkill;
  }

  getInvocableSkills(session?: ChatSession | null): ResolvedSkill[] {
    if (!this.isSkillUsageEnabled(session)) {
      return [];
    }

    return Array.from(this.skills.values()).filter(
      skill => this.isSkillEnabled(skill.id) && !skill.disableModelInvocation,
    );
  }

  routeSkillForInput(userInput: string, session?: ChatSession | null): ResolvedSkill | null {
    const effectiveSkill = this.getEffectiveSkill(session);
    if (effectiveSkill) {
      return effectiveSkill;
    }

    const trimmedInput = userInput.trim();
    if (!trimmedInput) {
      return null;
    }

    const lower = trimmedInput.toLowerCase();
    let best: ResolvedSkill | null = null;
    let bestScore = 0;

    for (const skill of this.getInvocableSkills(session)) {
      const score = this.scoreSkillForInput(skill, lower);
      if (score > bestScore) {
        bestScore = score;
        best = skill;
      }
    }

    return bestScore >= 2 ? best : null;
  }

  async routeSkillForInputWithModel(
    userInput: string,
    provider: BaseLLMProvider | null | undefined,
    session?: ChatSession | null,
  ): Promise<ResolvedSkill | null> {
    const effectiveSkill = this.getEffectiveSkill(session);
    if (effectiveSkill) {
      return effectiveSkill;
    }

    const trimmedInput = userInput.trim();
    if (!trimmedInput || !provider) {
      return this.routeSkillForInput(userInput, session);
    }

    // Fast-path: for short messages or common greetings, skip model-based routing
    // to improve responsiveness
    if (trimmedInput.length < 10 || /^(hi|hello|你好|您好|哈喽|hey|你好啊|早上好|中午好|晚上好)$/i.test(trimmedInput)) {
      Logger.debug(`[SkillManager] Using heuristic routing for short input: ${trimmedInput}`);
      return this.routeSkillForInput(userInput, session);
    }

    const invocableSkills = this.getInvocableSkills(session);
    if (invocableSkills.length === 0) {
      return null;
    }

    const explicitlyMentionedSkill = invocableSkills.find(skill => this.isExplicitSkillMention(skill, trimmedInput));
    if (explicitlyMentionedSkill) {
      Logger.debug(`[SkillManager] Using explicitly mentioned skill "${explicitlyMentionedSkill.id}" for input: ${trimmedInput}`);
      return explicitlyMentionedSkill;
    }

    let modelReturnedExplicitNoMatch = false;

    try {
      const response = await provider.sendMessage(
        [{
          id: `skill-route-${Date.now()}`,
          role: 'user',
          content: trimmedInput,
          timestamp: Date.now(),
        } as ChatMessage],
        undefined,
        this.buildSkillRoutingPrompt(invocableSkills),
      );

      const selectedSkillId = this.extractSkillIdFromRoutingResponse(response.content);
      if (!selectedSkillId) {
        modelReturnedExplicitNoMatch = true;
      }
      if (selectedSkillId) {
        const selectedSkill = invocableSkills.find(skill => skill.id === selectedSkillId);
        if (selectedSkill) {
          Logger.debug(`[SkillManager] Model-routed skill "${selectedSkill.id}" for input: ${trimmedInput}`);
          new Notice(
            i18n.t('ui.skillMatched', { skill: selectedSkill.name }) || `Skill matched: ${selectedSkill.name}`,
            2500,
          );
          return selectedSkill;
        }
      }
    } catch (error) {
      Logger.warn('[SkillManager] Model-based skill routing failed, falling back to heuristic routing:', error);
      return this.routeSkillForInput(userInput, session);
    }

    if (modelReturnedExplicitNoMatch) {
      Logger.debug(`[SkillManager] Model router returned no clear skill match for input: ${trimmedInput}`);
      return null;
    }

    return this.routeSkillForInput(userInput, session);
  }

  filterToolsForSkill(tools: UnifiedTool[], skill: ResolvedSkill | null): UnifiedTool[] {
    return this.prioritizeTools(this.filterRestrictedTools(tools, skill), skill);
  }

  private scoreSkillForInput(skill: ResolvedSkill, lowerInput: string): number {
    const searchableText = [
      skill.name,
      skill.id,
      skill.description || '',
      skill.argumentHint || '',
      skill.instructionsContent || '',
      ...skill.toolAllowlist,
    ]
      .join(' ')
      .toLowerCase();

    const scoreTerms = new Set<string>();

    const directTerms = [
      ...this.extractSearchTerms(skill.name),
      ...this.extractSearchTerms(skill.id),
      ...this.extractSearchTerms(skill.description || ''),
      ...this.extractSearchTerms(skill.argumentHint || ''),
      ...skill.toolAllowlist.map(tool => tool.toLowerCase()),
    ];

    directTerms.forEach(term => {
      if (term && lowerInput.includes(term)) {
        scoreTerms.add(term);
      }
    });

    Object.values(SKILL_ROUTING_SYNONYMS).forEach(group => {
      const inputMatched = group.some(term => lowerInput.includes(term));
      if (!inputMatched) {
        return;
      }

      const skillMatched = group.some(term => searchableText.includes(term));
      if (skillMatched) {
        scoreTerms.add(group[0]);
      }
    });

    if (skill.id && lowerInput.includes(skill.id.toLowerCase())) {
      scoreTerms.add(skill.id.toLowerCase());
    }

    if (skill.name && lowerInput.includes(skill.name.toLowerCase())) {
      scoreTerms.add(skill.name.toLowerCase());
    }

    let score = scoreTerms.size;

    Object.values(SKILL_INTENT_CLUSTERS).forEach(clusterTerms => {
      const inputMatchesCluster = clusterTerms.some(term => lowerInput.includes(term));
      if (!inputMatchesCluster) {
        return;
      }

      const clusterHits = clusterTerms.filter(term => searchableText.includes(term)).length;
      if (clusterHits > 0) {
        score += clusterHits;
      }
    });

    return score;
  }

  private buildSkillRoutingPrompt(skills: ResolvedSkill[]): string {
    const skillCatalog = skills.map(skill => {
      const capabilityHints = skill.toolAllowlist.length > 0 ? skill.toolAllowlist.join(', ') : 'none';
      const routingTags = this.inferRoutingTags(skill).join(', ') || 'none';
      return `- id: ${skill.id}\n  name: ${skill.name}\n  description: ${skill.description || '(none)'}\n  hint: ${skill.argumentHint || '(none)'}\n  capability_hints: ${capabilityHints}\n  routing_tags: ${routingTags}`;
    }).join('\n');

    return `You are the router phase for skills. Choose the single best matching skill for the user's request from the registry below.

Rules:
- Return JSON only.
- Use exactly this shape: {"skillId":"<id-or-empty>","reason":"<short reason>"}.
- If no single skill is clearly best, return {"skillId":"","reason":"no clear match"}.
- Route based on the registry description, name, and hint.
- Treat capability_hints as lightweight routing metadata only, not as callable tool names.
- Treat routing_tags as extra multilingual intent hints.
- Do not invent execution steps here. Only decide whether a skill should be loaded.
- Strong routing guidance:
  - Prefer the skill whose domain and action semantics best match the request.
  - For note-writing requests, prefer note-authoring / vault-management skills over unrelated extraction skills.
  - For web-fetching or cleaning requests, prefer web-extraction skills over note-authoring skills.

Skill Registry:
${skillCatalog}`;
  }

  private inferRoutingTags(skill: ResolvedSkill): string[] {
    const searchableText = [
      skill.id,
      skill.name,
      skill.description || '',
      skill.argumentHint || '',
    ]
      .join(' ')
      .toLowerCase();

    const tags = new Set<string>();

    if (searchableText.includes('obsidian') || searchableText.includes('vault')) {
      tags.add('obsidian');
      tags.add('笔记');
      tags.add('vault-management');
    }

    if (
      searchableText.includes('markdown')
      || searchableText.includes('wikilinks')
      || searchableText.includes('frontmatter')
    ) {
      tags.add('markdown');
      tags.add('写作');
      tags.add('note-authoring');
    }

    if (
      searchableText.includes('manage notes')
      || searchableText.includes('create')
      || searchableText.includes('read')
      || searchableText.includes('search')
    ) {
      tags.add('笔记管理');
      tags.add('note-management');
    }

    if (searchableText.includes('web') || searchableText.includes('url') || searchableText.includes('page')) {
      tags.add('网页');
      tags.add('链接');
      tags.add('web-extraction');
    }

    return Array.from(tags);
  }

  private extractSkillIdFromRoutingResponse(content: string): string {
    const trimmed = content.trim();
    if (!trimmed) {
      return '';
    }

    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return '';
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as { skillId?: string };
      return typeof parsed.skillId === 'string' ? parsed.skillId.trim() : '';
    } catch {
      return '';
    }
  }

  private extractSearchTerms(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^\p{L}\p{N}_-]+/u)
      .map(token => token.trim())
      .filter(token => token.length >= 2);
  }

  private isExplicitSkillMention(skill: ResolvedSkill, input: string): boolean {
    const lowerInput = input.toLowerCase();
    const exactCandidates = [
      skill.id,
      skill.name,
    ]
      .map(value => value.trim().toLowerCase())
      .filter(Boolean);

    return exactCandidates.some(candidate =>
      lowerInput.includes(candidate)
      || lowerInput.includes(`$${candidate}`),
    );
  }

  /**
   * In switch-only UX, if user did not explicitly choose a skill and there is
   * exactly one enabled + model-invocable skill, auto-select it.
   */
  private getAutoSelectedSkill(): ResolvedSkill | null {
    const candidates = Array.from(this.skills.values()).filter(
      skill => this.isSkillEnabled(skill.id) && !skill.disableModelInvocation,
    );

    if (candidates.length === 1) {
      return candidates[0];
    }

    return null;
  }

  filterToolsForSession(
    tools: UnifiedTool[],
    session?: ChatSession | null,
    userInput = '',
    routedSkill?: ResolvedSkill | null,
  ): UnifiedTool[] {
    const effectiveSkill = this.getEffectiveSkill(session);

    if (effectiveSkill) {
      return this.prioritizeTools(this.filterRestrictedTools(tools, effectiveSkill), effectiveSkill, userInput);
    }

    if (routedSkill !== undefined) {
      return this.prioritizeTools(this.filterRestrictedTools(tools, routedSkill), routedSkill, userInput);
    }

    const safeTools = this.filterRestrictedTools(tools, null);

    if (this.isSkillUsageEnabled(session) && userInput.trim()) {
      const heuristicallyRoutedSkill = this.routeSkillForInput(userInput, session);
      if (heuristicallyRoutedSkill) {
        Logger.debug(
          `[SkillManager] Skill "${heuristicallyRoutedSkill.id}" matched for session; keeping full tool set and applying source-first tool ordering`,
        );
        return this.prioritizeTools(safeTools, heuristicallyRoutedSkill, userInput);
      }
    }

    return this.prioritizeTools(safeTools, null, userInput);
  }

  private prioritizeTools(tools: UnifiedTool[], skill: ResolvedSkill | null, userInput = ''): UnifiedTool[] {
    const intentText = [
      userInput,
      skill?.name || '',
      skill?.description || '',
      skill?.argumentHint || '',
      skill?.instructionsContent || '',
    ]
      .join(' ')
      .toLowerCase();
    const intentTerms = new Set(this.extractSearchTerms(intentText));

    const hasIntent = (terms: string[]): boolean => terms.some(term => intentText.includes(term));
    const timeIntent = hasIntent(['time', 'date', 'today', 'now', '当前时间', '日期', '今天', '时间']);
    const noteWriteIntent = hasIntent(['note', 'notes', 'write', 'create', 'save', 'file', 'markdown', '笔记', '创建', '保存', '写入', '文件']);
    const searchIntent = hasIntent(['search', 'find', 'lookup', 'read', 'list', '搜索', '查找', '读取', '列出']);

    const getPriority = (tool: UnifiedTool): number => {
      if (tool.source === 'built-in') {
        return 0;
      }
      if (tool.source === 'mcp') {
        return 1;
      }
      return 2;
    };

    const getRelevance = (tool: UnifiedTool): number => {
      const searchable = [
        tool.name,
        tool.description,
        tool.category || '',
        tool.server || '',
      ]
        .join(' ')
        .toLowerCase();

      let score = 0;

      intentTerms.forEach(term => {
        if (searchable.includes(term)) {
          score += 2;
        }
      });

      if (noteWriteIntent && /(create|write|save|edit|append|note|file|create_file|create_note|save_note|笔记|写|保存|创建)/.test(searchable)) {
        score += 8;
      }

      if (this.skillExposesRunLocalCommand(skill) && tool.name === RUN_LOCAL_COMMAND_TOOL) {
        score += 12;
      }

      if (searchIntent && /(search|find|lookup|read|list|query|搜索|查找|读取|列出)/.test(searchable)) {
        score += 5;
      }

      if (timeIntent && /(time|date|clock|today|当前时间|日期|时间|今天)/.test(searchable)) {
        score += 8;
      }

      if (!timeIntent && tool.name === 'get_current_time') {
        score -= 12;
      }

      return score;
    };

    return [...tools].sort((left, right) => {
      const priorityDiff = getPriority(left) - getPriority(right);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const relevanceDiff = getRelevance(right) - getRelevance(left);
      if (relevanceDiff !== 0) {
        return relevanceDiff;
      }

      return left.name.localeCompare(right.name);
    });
  }

  skillExposesRunLocalCommand(skill: ResolvedSkill | null | undefined): boolean {
    // Skill is a logic container; run_local_command is the generic execution endpoint.
    // Once a skill is routed/active, always expose run_local_command to the model.
    return !!skill;
  }

  private filterRestrictedTools(tools: UnifiedTool[], skill: ResolvedSkill | null | undefined): UnifiedTool[] {
    if (skill) {
      return this.ensureSkillExecutionTools(tools, [RUN_LOCAL_COMMAND_TOOL, 'for_each']);
    }

    return tools.filter(tool => tool.name !== RUN_LOCAL_COMMAND_TOOL);
  }

  private ensureSkillExecutionTools(tools: UnifiedTool[], requiredToolNames: string[]): UnifiedTool[] {
    const hydratedTools = [...tools];
    const existingNames = new Set(hydratedTools.map(tool => tool.name));

    requiredToolNames.forEach(toolName => {
      if (existingNames.has(toolName)) {
        return;
      }

      const builtInTool = getBuiltInTool(toolName);
      if (!builtInTool) {
        return;
      }

      hydratedTools.push({
        name: builtInTool.name || toolName,
        description: builtInTool.description,
        inputSchema: {
          type: 'object',
          properties: builtInTool.inputSchema.properties,
          required: builtInTool.inputSchema.required || [],
        },
        outputSchema: builtInTool.outputSchema,
        source: 'built-in',
        category: builtInTool.category,
      });
      existingNames.add(toolName);
    });

    return hydratedTools;
  }

  private async loadState(): Promise<void> {
    const directory = await this.configDb.getSkillsDirectory();
    const defaultActiveSkillId = await this.configDb.getDefaultActiveSkillId();
    const globallyEnabled = await this.configDb.getSkillsGloballyEnabled();
    const enabledSkills = await this.configDb.getEnabledSkillsState();

    this.state = {
      directory: directory || DEFAULT_SKILLS_DIRECTORY,
      defaultActiveSkillId: defaultActiveSkillId || '',
      globallyEnabled,
      enabledSkills,
    };
  }

  private async persistState(): Promise<void> {
    await this.configDb.setSkillsDirectory(this.state.directory);
    await this.configDb.setDefaultActiveSkillId(this.state.defaultActiveSkillId);
    await this.configDb.setSkillsGloballyEnabled(this.state.globallyEnabled !== false);
    await this.configDb.setEnabledSkillsState(this.state.enabledSkills);
  }

  private reconcileState(): void {
    const knownSkillIds = new Set(this.skills.keys());

    Object.keys(this.state.enabledSkills).forEach(skillId => {
      if (!knownSkillIds.has(skillId)) {
        delete this.state.enabledSkills[skillId];
      }
    });

    this.skills.forEach(skill => {
      if (!(skill.id in this.state.enabledSkills) && skill.enabledByDefault === false) {
        this.state.enabledSkills[skill.id] = false;
      }
    });

    if (this.state.defaultActiveSkillId && !knownSkillIds.has(this.state.defaultActiveSkillId)) {
      this.state.defaultActiveSkillId = '';
    }
  }

  /**
   * Returns a formatted string listing all enabled, model-invocable skills.
   * Injected into the system prompt so the LLM knows what skills are available
   * without loading their full content (progressive discovery).
   */
  getSkillDescriptionsForContext(session?: ChatSession | null): string {
    const invocable = this.getInvocableSkills(session);
    if (invocable.length === 0) return '';
    const lines = invocable.map(skill => {
      const hint = skill.argumentHint ? ` [${skill.argumentHint}]` : '';
      const tools = skill.toolAllowlist.length > 0 ? ` | Capability hints: ${skill.toolAllowlist.join(', ')}` : '';
      return `- **${skill.name}**${hint}: ${skill.description || '(no description)'}${tools}`;
    });
    return `## Available Skills\n\nThe following skills are available as registry descriptions for the router phase. Match the user's intent against these summaries and load the most relevant skill when appropriate. Skills are a capability source parallel to built-in tools and MCP tools. Capability hints are advisory routing metadata only.\n\n${lines.join('\n')}`;
  }

  /**
   * Returns the enabled, model-invocable skill whose description best matches
   * the given text, or null if no reasonable match is found.
   * Used for programmatic auto-selection hints.
   */
  matchBestSkill(userInput: string): ResolvedSkill | null {
    return this.routeSkillForInput(userInput);
  }

  private async loadSkillFromDirectory(directoryPath: string): Promise<void> {
    // Prefer SKILL.md (Claude Code spec), fall back to skill.md, then skill.json
    const candidates = [
      { path: normalizePath(`${directoryPath}/SKILL.md`), type: 'md' as const },
      { path: normalizePath(`${directoryPath}/skill.md`), type: 'md' as const },
      { path: normalizePath(`${directoryPath}/skill.json`), type: 'json' as const },
    ];

    let found: { path: string; type: 'md' | 'json' } | null = null;
    for (const c of candidates) {
      if (await this.adapter.exists(c.path)) { found = c; break; }
    }
    if (!found) return;

    try {
      const content = await this.adapter.read(found.path);
      const manifest: LocalSkillManifest = found.type === 'md'
        ? this.parseSkillMd(content, found.path, directoryPath)
        : JSON.parse(content) as LocalSkillManifest;

      this.validateManifest(manifest, found.path);

      if (this.skills.has(manifest.id)) {
        throw new Error(`Duplicate skill id: ${manifest.id}`);
      }

      const resolvedSkill = await this.resolveManifest(manifest, directoryPath, found.path, found.type === 'md' ? content : undefined);
      this.skills.set(resolvedSkill.id, resolvedSkill);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.loadErrors.push({ path: found.path, message });
      Logger.error(`[SkillManager] Failed to load skill from ${found.path}:`, error);
    }
  }

  /**
   * Parse a SKILL.md file according to the Claude Code / agentskills.io spec.
   * Extracts YAML frontmatter and maps fields to LocalSkillManifest.
   * The markdown body (after the closing ---) becomes the instructions.
   */
  private parseSkillMd(content: string, filePath: string, directoryPath: string): LocalSkillManifest {
    const fm = this.extractFrontmatter(content);
    const body = this.extractBody(content);

    // Derive id: prefer metadata.skill-id, then sanitised directory basename
    const dirBasename = directoryPath.split('/').filter(Boolean).pop() || 'unknown';
    const id = (fm['metadata']?.['skill-id'] as string) || fm['id'] as string || dirBasename;

    // allowed-tools is space-separated per the spec
    const allowedToolsRaw = (fm['allowed-tools'] as string | undefined) || '';
    const toolAllowlist = allowedToolsRaw
      .split(/[\s,]+/)
      .map(t => t.trim())
      .filter(Boolean);

    // preferred-mode lives under metadata in our test skill
    const preferredMode =
      (fm['metadata']?.['preferred-mode'] as string) ||
      (fm['preferred-mode'] as string) ||
      (fm['preferredConversationMode'] as string);
    const preferredConversationMode =
      preferredMode === 'guided'
        ? 'normal'
        : preferredMode === 'normal' || preferredMode === 'agent'
          ? preferredMode
          : undefined;

    const version =
      String((fm['metadata']?.['version'] as string) || fm['version'] as string || '0.1.0');

    return {
      id,
      name: (fm['name'] as string) || dirBasename,
      version,
      description: fm['description'] as string | undefined,
      instructions: body || undefined,
      preferredConversationMode,
      toolAllowlist,
      enabledByDefault: fm['enabled-by-default'] !== false && fm['enabledByDefault'] !== false,
      disableModelInvocation: Boolean(fm['disable-model-invocation'] || fm['disableModelInvocation']),
      userInvocable: fm['user-invocable'] !== false && fm['userInvocable'] !== false,
      argumentHint: (fm['argument-hint'] as string) || (fm['argumentHint'] as string) || undefined,
    };
  }

  /** Extract YAML frontmatter between the first two --- markers into a nested object. */
  private extractFrontmatter(content: string): Record<string, unknown> {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    return this.parseSimpleYaml(match[1]);
  }

  /** Return everything after the closing --- marker. */
  private extractBody(content: string): string {
    const idx = content.indexOf('---', 3); // skip opening ---
    if (idx === -1) return content.trim();
    const after = content.slice(idx + 3);
    // skip the newline right after ---
    return after.replace(/^\r?\n/, '').trim();
  }

  /**
   * Minimal YAML parser that handles:
   * - top-level `key: value` pairs (quoted or unquoted)
   * - one level of indented sub-blocks (metadata:, etc.)
   * - boolean literals (true/false) and quoted strings
   */
  private parseSimpleYaml(text: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = text.split(/\r?\n/);
    let currentBlock: string | null = null;
    let currentSub: Record<string, unknown> = {};

    for (const rawLine of lines) {
      if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;

      const isIndented = /^[ \t]/.test(rawLine) && currentBlock;
      if (isIndented) {
        const subMatch = rawLine.match(/^[ \t]+([\w-]+)\s*:\s*(.*)$/);
        if (subMatch) {
          currentSub[subMatch[1]] = this.yamlValue(subMatch[2]);
        }
      } else {
        // Flush previous sub-block
        if (currentBlock) { result[currentBlock] = { ...currentSub }; }
        const topMatch = rawLine.match(/^([\w-]+)\s*:\s*(.*)$/);
        if (topMatch) {
          const val = topMatch[2].trim();
          if (val === '') {
            // Start of a sub-block
            currentBlock = topMatch[1];
            currentSub = {};
          } else {
            currentBlock = null;
            result[topMatch[1]] = this.yamlValue(val);
          }
        }
      }
    }
    if (currentBlock) result[currentBlock] = { ...currentSub };
    return result;
  }

  private yamlValue(raw: string): unknown {
    const s = raw.trim();
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (/^"(.*)"$/.test(s)) return s.slice(1, -1);
    if (/^'(.*)'$/.test(s)) return s.slice(1, -1);
    return s;
  }

  private validateManifest(manifest: LocalSkillManifest, filePath: string): void {
    if (!manifest || typeof manifest !== 'object') {
      throw new Error(`Invalid manifest object: ${filePath}`);
    }
    if (!manifest.id || !manifest.name || !manifest.version) {
      throw new Error(`Manifest must include id, name, and version: ${filePath}`);
    }
  }

  private async resolveManifest(
    manifest: LocalSkillManifest,
    directoryPath: string,
    manifestPath: string,
    /** Raw SKILL.md text — when provided, body is already in manifest.instructions */
    _rawMd?: string,
  ): Promise<ResolvedSkill> {
    const instructionsContent = await this.resolveInstructionsContent(manifest, directoryPath);
    const prompts = await this.resolvePromptTemplates(manifest.prompts || [], directoryPath);
    const toolAllowlist = Array.from(new Set((manifest.toolAllowlist || []).filter(Boolean)));

    return {
      ...manifest,
      rootPath: directoryPath,
      manifestPath,
      instructionsContent,
      prompts,
      toolAllowlist,
    };
  }

  private async resolveInstructionsContent(manifest: LocalSkillManifest, directoryPath: string): Promise<string> {
    if (manifest.instructionsFile) {
      return await this.readRelativeFile(directoryPath, manifest.instructionsFile);
    }
    return manifest.instructions || '';
  }

  private async resolvePromptTemplates(
    promptTemplates: SkillPromptTemplate[],
    directoryPath: string,
  ): Promise<Array<SkillPromptTemplate & { content: string }>> {
    const resolvedPrompts: Array<SkillPromptTemplate & { content: string }> = [];

    for (const promptTemplate of promptTemplates) {
      if (!promptTemplate.id || !promptTemplate.title) {
        throw new Error('Skill prompt entries must include id and title');
      }

      let content = promptTemplate.content || '';
      if (promptTemplate.contentFile) {
        content = await this.readRelativeFile(directoryPath, promptTemplate.contentFile);
      }

      resolvedPrompts.push({
        ...promptTemplate,
        content,
      });
    }

    return resolvedPrompts;
  }

  private async readRelativeFile(directoryPath: string, relativePath: string): Promise<string> {
    const fullPath = normalizePath(`${directoryPath}/${relativePath}`);
    if (!(await this.adapter.exists(fullPath))) {
      throw new Error(`Missing referenced file: ${fullPath}`);
    }

    return await this.adapter.read(fullPath);
  }

}
