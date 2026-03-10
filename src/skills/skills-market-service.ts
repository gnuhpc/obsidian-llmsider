import { FileSystemAdapter, normalizePath, requestUrl } from 'obsidian';
import { promises as fs } from 'fs';
import path from 'path';
import type LLMSiderPlugin from '../main';
import { Logger } from '../utils/logger';

const SKILLS_MARKET_API_URL = 'https://skillsmp.com/api/v1/skills/search';
const DEFAULT_PAGE_SIZE = 20;

type SkillsMarketApiSkill = {
	id: string;
	name: string;
	author: string;
	authorAvatar?: string;
	description?: string;
	githubUrl: string;
	stars?: number;
	forks?: number;
	updatedAt?: string;
	path?: string;
	branch?: string;
};

type SkillsMarketPagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
	totalIsExact?: boolean;
};

export type SkillsMarketSkill = SkillsMarketApiSkill & {
	installDirName: string;
	repositoryPath: string;
	sourceRef?: string;
	installed: boolean;
};

export type SkillsMarketSearchResult = {
	skills: SkillsMarketSkill[];
	pagination: SkillsMarketPagination;
};

type ParsedGithubTree = {
	owner: string;
	repo: string;
	ref?: string;
	repositoryPath: string;
	repositorySubPath?: string;
	installDirName: string;
};

type GitHubContentEntry = {
	type: 'file' | 'dir' | string;
	name: string;
	path: string;
	download_url?: string | null;
};

export class SkillsMarketService {
	constructor(private plugin: LLMSiderPlugin) {}

	async searchSkills(search: string, page = 1, limit = DEFAULT_PAGE_SIZE): Promise<SkillsMarketSearchResult> {
		const token = this.plugin.settings.skillsMarketApiToken?.trim();
		if (!token) {
			throw new Error('Skills market API token is required');
		}

		const url = new URL(SKILLS_MARKET_API_URL);
		url.searchParams.set('q', search.trim());
		url.searchParams.set('page', String(page));
		url.searchParams.set('limit', String(limit));

		const response = await requestUrl({
			url: url.toString(),
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${token}`,
			},
		});

		const data = response.json as {
			success?: boolean;
			data?: {
				skills?: SkillsMarketApiSkill[];
				pagination?: SkillsMarketPagination;
			};
			skills?: SkillsMarketApiSkill[];
			pagination?: SkillsMarketPagination;
		};
		const payload = data.data || data;

		const skills = await Promise.all((payload.skills || []).map(async (skill) => {
			const parsed = this.parseGithubTreeUrl(skill.githubUrl, skill.branch);
			const installed = await this.plugin.app.vault.adapter.exists(
				normalizePath(`${this.getSkillsDirectory()}/${parsed.installDirName}`),
			);

			return {
				...skill,
				repositoryPath: parsed.repositoryPath,
				installDirName: parsed.installDirName,
				sourceRef: parsed.ref,
				installed,
			} satisfies SkillsMarketSkill;
		}));

		return {
			skills,
			pagination: payload.pagination || {
				page,
				limit,
				total: skills.length,
				totalPages: 1,
				hasNext: false,
				hasPrev: false,
			},
		};
	}

	async installSkill(skill: SkillsMarketSkill): Promise<{ installDirName: string; relativePath: string }> {
		const adapter = this.plugin.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			throw new Error('Skills market download requires desktop FileSystemAdapter support');
		}

		const relativeSkillsDir = this.getSkillsDirectory();
		const relativeTargetDir = normalizePath(`${relativeSkillsDir}/${skill.installDirName}`);
		if (await adapter.exists(relativeTargetDir)) {
			throw new Error(`Skill already installed: ${skill.installDirName}`);
		}

		if (!(await adapter.exists(relativeSkillsDir))) {
			await adapter.mkdir(relativeSkillsDir);
		}

		const basePath = adapter.getBasePath();
		const absoluteTargetDir = path.join(basePath, relativeTargetDir);
		const parsed = this.parseGithubTreeUrl(skill.githubUrl, skill.branch || skill.sourceRef);
		const sourceRef = parsed.ref || 'main';
		const sourceLabel = `${parsed.repositoryPath}${sourceRef ? `#${sourceRef}` : ''}`;

		Logger.info(`[SkillsMarket] Installing ${skill.id} from ${sourceLabel} to ${absoluteTargetDir}`);
		await this.downloadAndExtractSkill(parsed, absoluteTargetDir);

		const skillManager = this.plugin.getSkillManager();
		if (skillManager) {
			await skillManager.reload();
			this.plugin.settings.skillsSettings = skillManager.getStateSnapshot();
			await this.plugin.saveSettings();
		}

		return {
			installDirName: skill.installDirName,
			relativePath: relativeTargetDir,
		};
	}

	private getSkillsDirectory(): string {
		return normalizePath(this.plugin.settings.skillsSettings.directory || 'skills');
	}

	private parseGithubTreeUrl(githubUrl: string, branch?: string): ParsedGithubTree {
		const url = new URL(githubUrl);
		const segments = url.pathname.split('/').filter(Boolean);
		if (segments.length < 2) {
			throw new Error(`Unsupported GitHub skill URL: ${githubUrl}`);
		}

		const owner = segments[0];
		const repo = segments[1];

		if (segments[2] === 'tree') {
			const ref = branch || segments[3];
			const treePrefix = `/tree/${ref}/`;
			const markerIndex = url.pathname.indexOf(treePrefix);
			if (markerIndex === -1) {
				throw new Error(`Could not resolve branch "${ref}" from ${githubUrl}`);
			}

			const repoSubPath = url.pathname.slice(markerIndex + treePrefix.length).replace(/^\/+/, '');
			if (!repoSubPath) {
				throw new Error(`GitHub skill URL has no skill path: ${githubUrl}`);
			}

			return {
				owner,
				repo,
				ref,
				repositoryPath: `${owner}/${repo}/${repoSubPath}`,
				repositorySubPath: repoSubPath,
				installDirName: path.posix.basename(repoSubPath),
			};
		}

		return {
			owner,
			repo,
			ref: branch,
			repositoryPath: `${owner}/${repo}`,
			repositorySubPath: '',
			installDirName: repo,
		};
	}

	private async downloadAndExtractSkill(parsed: ParsedGithubTree, destination: string): Promise<void> {
		const ref = parsed.ref || 'main';
		const sourcePath = parsed.repositorySubPath || '';
		const files = await this.collectGitHubFiles(parsed.owner, parsed.repo, sourcePath, ref);
		if (files.length === 0) {
			throw new Error(`Skill path not found in repository: ${sourcePath || '(repo root)'}`);
		}

		await fs.mkdir(destination, { recursive: true });

		for (const file of files) {
			const relativeEntryPath = sourcePath ? path.posix.relative(sourcePath, file.path) : file.path;
			const outputPath = path.join(destination, relativeEntryPath);
			await fs.mkdir(path.dirname(outputPath), { recursive: true });
			const downloadUrl = file.download_url;
			if (!downloadUrl) {
				throw new Error(`Missing download URL for ${file.path}`);
			}

			const fileResponse = await requestUrl({
				url: downloadUrl,
				method: 'GET',
				headers: {
					accept: 'application/octet-stream',
					'user-agent': 'LLMSider',
				},
			});
			await fs.writeFile(outputPath, Buffer.from(fileResponse.arrayBuffer));
		}
	}

	private async collectGitHubFiles(owner: string, repo: string, subPath: string, ref: string): Promise<GitHubContentEntry[]> {
		const entries = await this.listGitHubContents(owner, repo, subPath, ref);
		const files: GitHubContentEntry[] = [];

		for (const entry of entries) {
			if (entry.type === 'file') {
				files.push(entry);
				continue;
			}

			if (entry.type === 'dir') {
				files.push(...await this.collectGitHubFiles(owner, repo, entry.path, ref));
			}
		}

		return files;
	}

	private async listGitHubContents(owner: string, repo: string, subPath: string, ref: string): Promise<GitHubContentEntry[]> {
		const encodedPath = subPath
			.split('/')
			.filter(Boolean)
			.map(segment => encodeURIComponent(segment))
			.join('/');
		const url = new URL(`https://api.github.com/repos/${owner}/${repo}/contents${encodedPath ? `/${encodedPath}` : ''}`);
		url.searchParams.set('ref', ref);

		const response = await requestUrl({
			url: url.toString(),
			method: 'GET',
			headers: {
				accept: 'application/vnd.github+json',
				'user-agent': 'LLMSider',
			},
		});

		const data = response.json as GitHubContentEntry[] | GitHubContentEntry | { message?: string };
		if (Array.isArray(data)) {
			return data;
		}

		if (data && typeof data === 'object' && 'type' in data && data.type === 'file') {
			return [data];
		}

		const message = data && typeof data === 'object' && 'message' in data ? data.message : 'Unknown GitHub contents response';
		throw new Error(`Failed to list GitHub contents: ${message}`);
	}
}
