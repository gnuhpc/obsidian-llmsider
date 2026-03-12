import { ChatMessage } from '../../types';
import { UnifiedTool } from '../../tools/unified-tool-manager';

export type TaskIntent = 'write' | 'read' | 'search' | 'time' | 'other';
export type TaskCompletionStatus = 'completed' | 'blocked' | 'incomplete';
export type TaskLanguage = 'en' | 'zh';

export interface TaskCompletionAssessment {
	status: TaskCompletionStatus;
	score: number;
	reason: string;
}

export interface TaskCompletionResolution {
	assessment: TaskCompletionAssessment;
	shouldContinue: boolean;
	recoveryInstruction?: string;
}

const INTENT_TERMS: Record<TaskIntent, string[]> = {
	write: ['save', 'create', 'write', 'update', 'append', 'edit', '保存', '创建', '写入', '新建', '修改', '追加', '笔记'],
	read: ['read', 'open', 'view', '读取', '打开', '查看'],
	search: ['search', 'find', 'lookup', 'list', '搜索', '查找', '检索', '列出'],
	time: ['time', 'date', 'today', 'now', '时间', '日期', '今天', '现在'],
	other: [],
};

const TOOL_CAPABILITY_PATTERNS = {
	write: /(create|write|append|insert|replace|edit|update|save|create_note|create_file|append_file|str_replace|run_local_command|笔记|写入|保存|创建)/,
	read: /(read|view|open|读取|查看|打开)/,
	search: /(search|find|lookup|list|query|搜索|查找|列出|检索)/,
	time: /(time|date|today|clock|时间|日期|今天)/,
};

const FOLLOW_UP_PATTERN = /(\?$|？$|would you like|do you want|which one|where should|文件名|保存到哪里|请选择|想要)/i;
const CLARIFICATION_PATTERN = /(please specify|need (?:to )?(?:know|clarify)|i need to (?:know|clarify)|could you|can you (?:specify|provide)|what .*?(?:prefer|style|length|audience)|请问|请提供|请确认|先了解|需要了解|确认这些细节|您希望这篇|面向什么读者|大概需要多长|重点突出哪些方面)/i;
const WRITE_COMPLETION_PATTERN = /(created|saved|written|updated|file created|write succeeded|save succeeded|已保存|已创建|已写入|已更新|创建完成|保存成功|写入成功|已生成并保存|已写入到)/i;

export class TaskCompletionGuard {
	static detectUserLanguage(messages: ChatMessage[]): TaskLanguage {
		const text = this.messagesToIntentText(messages);
		return /[\u4e00-\u9fa5]/.test(text) ? 'zh' : 'en';
	}

	static detectPrimaryIntent(messages: ChatMessage[]): TaskIntent {
		const text = this.messagesToIntentText(messages);
		if (this.matchesAny(text, INTENT_TERMS.write)) return 'write';
		if (this.matchesAny(text, INTENT_TERMS.search)) return 'search';
		if (this.matchesAny(text, INTENT_TERMS.read)) return 'read';
		if (this.matchesAny(text, INTENT_TERMS.time)) return 'time';
		return 'other';
	}

	static hasWriteCapability(tools: UnifiedTool[]): boolean {
		return tools.some(tool => TOOL_CAPABILITY_PATTERNS.write.test(this.toolText(tool)));
	}

	static buildExecutionGuardInstructions(messages: ChatMessage[], tools: UnifiedTool[], mode: 'normal' | 'guided'): string {
		const intent = this.detectPrimaryIntent(messages);
		const hasWriteCapability = this.hasWriteCapability(tools);
		const sharedRules = [
			'Completion discipline:',
			'- Do not treat an intermediate answer, draft, or partial analysis as task completion.',
			'- After each response or tool result, check whether the original user goal has actually been achieved.',
			'- If the task is only partially complete, continue working instead of stopping early.',
		];

		if (intent === 'write' && !hasWriteCapability) {
			sharedRules.push('- The current request includes a write/save/create action, but no write-capable tool is available.');
			sharedRules.push('- Do not substitute read-only tools for the missing write capability.');
			sharedRules.push('- State the concrete capability blocker clearly instead of asking avoidable follow-up questions.');
		} else if (intent === 'write' && hasWriteCapability) {
			sharedRules.push('- The request includes create/save/write intent and write-capable tools are available.');
			sharedRules.push('- Do not ask optional preference questions (style/length/audience) before taking action.');
			sharedRules.push('- Use sensible defaults and execute: same language as user, medium length, practical structure.');
			sharedRules.push('- If target path/file name is not specified, choose a reasonable default note name and proceed.');
		}

		if (mode === 'normal') {
			sharedRules.push('- In normal mode, prefer autonomous completion over follow-up questions when the required capability is already available.');
		} else {
			sharedRules.push('- In guided mode, human-in-the-loop is stronger, but only ask the user when a real decision or missing parameter is required.');
		}

		return sharedRules.join('\n');
	}

	static assessCompletionState(params: {
		messages: ChatMessage[];
		tools: UnifiedTool[];
		responseText: string;
		pendingToolCalls?: number;
	}): TaskCompletionAssessment {
		const { messages, tools, responseText, pendingToolCalls = 0 } = params;
		const intent = this.detectPrimaryIntent(messages);
		const normalizedResponse = responseText.trim().toLowerCase();
		let score = 100;
		let primaryReason = 'no pending actions detected';

		if (pendingToolCalls > 0) {
			score -= 45;
			primaryReason = 'pending tool calls remain';
			return {
				status: 'incomplete',
				score: Math.max(0, score),
				reason: primaryReason,
			};
		}

		if (intent === 'write' && !this.hasWriteCapability(tools)) {
			score = 5;
			return {
				status: 'blocked',
				score,
				reason: 'missing write-capable tool',
			};
		}

		if (intent === 'write' && this.hasWriteCapability(tools) && CLARIFICATION_PATTERN.test(normalizedResponse)) {
			score -= 30;
			primaryReason = 'response asks for optional clarification before executing write task';
		}

		const hasWriteCompletionSignal = WRITE_COMPLETION_PATTERN.test(normalizedResponse);
		if (intent === 'write' && this.hasWriteCapability(tools) && !hasWriteCompletionSignal) {
			score -= 35;
			primaryReason = 'write task has not been explicitly executed yet';
		}

		if (FOLLOW_UP_PATTERN.test(normalizedResponse) && intent !== 'other') {
			score -= 20;
			if (primaryReason === 'no pending actions detected') {
				primaryReason = 'response ends in a follow-up question for an actionable task';
			}
		}

		if (intent === 'write' && hasWriteCompletionSignal) {
			score += 5;
		}

		if (!normalizedResponse) {
			score -= 30;
			if (primaryReason === 'no pending actions detected') {
				primaryReason = 'empty response content';
			}
		}

		score = Math.max(0, Math.min(100, score));
		const completedThreshold = intent === 'write' ? 75 : 70;
		const isCompleted = score >= completedThreshold && (intent !== 'write' || hasWriteCompletionSignal);

		if (!isCompleted) {
			return {
				status: 'incomplete',
				score,
				reason: primaryReason,
			};
		}

		return {
			status: 'completed',
			score,
			reason: 'no pending actions detected',
		};
	}

	static resolveNextStep(params: {
		messages: ChatMessage[];
		tools: UnifiedTool[];
		responseText: string;
		mode: 'normal' | 'guided';
		pendingToolCalls?: number;
	}): TaskCompletionResolution {
		const assessment = this.assessCompletionState(params);
		if (assessment.status === 'completed') {
			return {
				assessment,
				shouldContinue: false,
			};
		}

		return {
			assessment,
			shouldContinue: true,
			recoveryInstruction: this.buildRecoveryInstruction({
				messages: params.messages,
				tools: params.tools,
				mode: params.mode,
				assessment,
			}),
		};
	}

	static buildRecoveryInstruction(params: {
		messages: ChatMessage[];
		tools: UnifiedTool[];
		mode: 'normal' | 'guided';
		assessment: TaskCompletionAssessment;
	}): string {
		const { mode, assessment } = params;
		const language = this.detectUserLanguage(params.messages);
		const intent = this.detectPrimaryIntent(params.messages);
		const modeHint = mode === 'guided'
			? language === 'zh'
				? '只有在确实缺少关键决策或不可推断参数时，才允许继续向用户提问。'
				: 'Only ask the user if a real decision or an uninferrable required parameter is missing.'
			: language === 'zh'
				? '优先自主完成，不要把可自行推进的步骤再次抛回给用户。'
				: 'Prefer autonomous completion. Do not hand back steps that you can finish yourself.';

		if (assessment.status === 'blocked') {
			if (language === 'zh') {
				return `停止当前收束。原始任务尚未完成，并且当前会话缺少完成该任务所需的关键能力：${assessment.reason}（完成度评分：${assessment.score}/100）。请直接向用户明确说明具体阻塞点、哪一部分无法完成，以及当前已经完成了什么。不要再调用不相关工具，也不要再提出可避免的追问。${modeHint}`;
			}

			return `Stop and correct course. The original task is still incomplete, and this conversation is blocked by a missing required capability: ${assessment.reason} (completion score: ${assessment.score}/100). Explain the exact blocker, what part could not be completed, and what was completed already. Do not call unrelated tools or ask avoidable follow-up questions. ${modeHint}`;
		}

		if (language === 'zh') {
			const intentHint = intent === 'write'
				? '原始请求包含创建、写入、保存或更新动作，只有实际写入成功后才算完成。若参数不完整但可合理推断，请使用默认值直接执行，不要追问风格/长度/受众偏好。请直接调用可用工具完成写入，并在结果中明确写入成功信息（如“已创建/已保存”）。'
				: '原始请求仍有未完成部分。';
			return `你的上一轮回复还没有真正完成原始任务：${assessment.reason}（完成度评分：${assessment.score}/100）。${intentHint} 请继续推进原始目标；如果需要且当前有可用工具，就立即调用合适的工具。不要重复泛泛总结，不要提出可避免的追问。${modeHint}`;
		}

		const intentHint = intent === 'write'
			? 'The original request includes a create, write, save, or update action, and it is not complete until that action actually succeeds. If details are inferable, apply sensible defaults and execute instead of asking optional style/length/audience questions. Call an available tool now and report an explicit write-success signal in your final answer.'
			: 'The original request still has unfinished work.';
		return `Your previous reply did not actually complete the original task: ${assessment.reason} (completion score: ${assessment.score}/100). ${intentHint} Continue toward the original goal now. If an available tool is needed, call it immediately. Do not repeat generic summaries or ask avoidable follow-up questions. ${modeHint}`;
	}

	private static messagesToIntentText(messages: ChatMessage[]): string {
		return messages
			.filter(message => message.role === 'user')
			.map(message => typeof message.content === 'string' ? message.content : '')
			.join(' ')
			.toLowerCase();
	}

	private static matchesAny(text: string, terms: string[]): boolean {
		return terms.some(term => text.includes(term));
	}

	private static toolText(tool: UnifiedTool): string {
		return `${tool.name} ${tool.description || ''}`.toLowerCase();
	}
}
