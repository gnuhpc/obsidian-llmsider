import { PromptTemplate } from '../types';
import { i18n } from '../i18n/i18n-manager';

/**
 * Get built-in prompts with i18n support
 * This function should be called after i18n is initialized
 */
export function getBuiltInPrompts(): PromptTemplate[] {
    return [
        {
            id: "builtin-continue-writing",
            title: i18n.t('builtInPrompts.continueWriting.title'),
            content: i18n.t('builtInPrompts.continueWriting.content'),
            description: i18n.t('builtInPrompts.continueWriting.description'),
            isBuiltIn: true,
            order: 999,
            searchKeywords: ['Continue writing', '继续写', 'continue', '继续', 'writing', '写']
        },
        {
            id: "builtin-fix-grammar-and-spelling",
            title: i18n.t('builtInPrompts.fixGrammarAndSpelling.title'),
            content: i18n.t('builtInPrompts.fixGrammarAndSpelling.content'),
            description: i18n.t('builtInPrompts.fixGrammarAndSpelling.description'),
            isBuiltIn: true,
            order: 1000,
            searchKeywords: ['Fix grammar and spelling', '修正语法和拼写', 'fix', '修正', 'grammar', '语法', 'spelling', '拼写']
        },
        {
            id: "builtin-translate-to-chinese",
            title: i18n.t('builtInPrompts.translateToChinese.title'),
            content: i18n.t('builtInPrompts.translateToChinese.content'),
            description: i18n.t('builtInPrompts.translateToChinese.description'),
            isBuiltIn: true,
            order: 1010,
            searchKeywords: ['Translate to Chinese', '翻译成中文', 'translate', '翻译', 'chinese', '中文']
        },
        {
            id: "builtin-translate-to-english",
            title: i18n.t('builtInPrompts.translateToEnglish.title'),
            content: i18n.t('builtInPrompts.translateToEnglish.content'),
            description: i18n.t('builtInPrompts.translateToEnglish.description'),
            isBuiltIn: true,
            order: 1015,
            searchKeywords: ['Translate to English', '翻译成英文', 'translate', '翻译', 'english', '英文']
        },
        {
            id: "builtin-summarize",
            title: i18n.t('builtInPrompts.summarize.title'),
            content: i18n.t('builtInPrompts.summarize.content'),
            description: i18n.t('builtInPrompts.summarize.description'),
            isBuiltIn: true,
            order: 1020,
            searchKeywords: ['Summarize', '总结', 'summary', '概括']
        },
        {
            id: "builtin-simplify",
            title: i18n.t('builtInPrompts.simplify.title'),
            content: i18n.t('builtInPrompts.simplify.content'),
            description: i18n.t('builtInPrompts.simplify.description'),
            isBuiltIn: true,
            order: 1030,
            searchKeywords: ['Simplify', '简化', 'simple', '简单']
        },
        {
            id: "builtin-explain-like-i-am-5",
            title: i18n.t('builtInPrompts.explainLikeIAm5.title'),
            content: i18n.t('builtInPrompts.explainLikeIAm5.content'),
            description: i18n.t('builtInPrompts.explainLikeIAm5.description'),
            isBuiltIn: true,
            order: 1040,
            searchKeywords: ['Explain like I am 5', '像我5岁一样解释', 'explain', '解释', 'eli5']
        },
        {
            id: "builtin-emojify",
            title: i18n.t('builtInPrompts.emojify.title'),
            content: i18n.t('builtInPrompts.emojify.content'),
            description: i18n.t('builtInPrompts.emojify.description'),
            isBuiltIn: true,
            order: 1050,
            searchKeywords: ['Emojify', '添加表情符号', 'emoji', '表情']
        },
        {
            id: "builtin-make-shorter",
            title: i18n.t('builtInPrompts.makeShorter.title'),
            content: i18n.t('builtInPrompts.makeShorter.content'),
            description: i18n.t('builtInPrompts.makeShorter.description'),
            isBuiltIn: true,
            order: 1060,
            searchKeywords: ['Make shorter', '缩短', 'shorter', '短', 'reduce', '减少']
        },
        {
            id: "builtin-make-longer",
            title: i18n.t('builtInPrompts.makeLonger.title'),
            content: i18n.t('builtInPrompts.makeLonger.content'),
            description: i18n.t('builtInPrompts.makeLonger.description'),
            isBuiltIn: true,
            order: 1070,
            searchKeywords: ['Make longer', '扩展', 'longer', '长', 'expand', '扩充']
        },
        {
            id: "builtin-generate-table-of-contents",
            title: i18n.t('builtInPrompts.generateTableOfContents.title'),
            content: i18n.t('builtInPrompts.generateTableOfContents.content'),
            description: i18n.t('builtInPrompts.generateTableOfContents.description'),
            isBuiltIn: true,
            order: 1080,
            searchKeywords: ['Generate table of contents', '生成目录', 'toc', '目录', 'contents']
        },
        {
            id: "builtin-generate-outline",
            title: i18n.t('builtInPrompts.generateOutline.title'),
            content: i18n.t('builtInPrompts.generateOutline.content'),
            description: i18n.t('builtInPrompts.generateOutline.description'),
            isBuiltIn: true,
            order: 1085,
            searchKeywords: ['Generate outline', '生成大纲', 'outline', '大纲', 'structure', '结构']
        },
        {
            id: "builtin-generate-glossary",
            title: i18n.t('builtInPrompts.generateGlossary.title'),
            content: i18n.t('builtInPrompts.generateGlossary.content'),
            description: i18n.t('builtInPrompts.generateGlossary.description'),
            isBuiltIn: true,
            order: 1090,
            searchKeywords: ['Generate glossary', '生成术语表', 'glossary', '术语']
        },
        {
            id: "builtin-remove-urls",
            title: i18n.t('builtInPrompts.removeUrls.title'),
            content: i18n.t('builtInPrompts.removeUrls.content'),
            description: i18n.t('builtInPrompts.removeUrls.description'),
            isBuiltIn: true,
            order: 1100,
            searchKeywords: ['Remove URLs', '移除URL', 'remove', '移除', 'url', '链接']
        },
        {
            id: "builtin-rewrite-as-tweet",
            title: i18n.t('builtInPrompts.rewriteAsTweet.title'),
            content: i18n.t('builtInPrompts.rewriteAsTweet.content'),
            description: i18n.t('builtInPrompts.rewriteAsTweet.description'),
            isBuiltIn: true,
            order: 1110,
            searchKeywords: ['Rewrite as tweet', '改写为推文', 'tweet', '推文', 'twitter']
        },
        {
            id: "builtin-rewrite-as-tweet-thread",
            title: i18n.t('builtInPrompts.rewriteAsTweetThread.title'),
            content: i18n.t('builtInPrompts.rewriteAsTweetThread.content'),
            description: i18n.t('builtInPrompts.rewriteAsTweetThread.description'),
            isBuiltIn: true,
            order: 1120,
            searchKeywords: ['Rewrite as tweet thread', '改写为推文串', 'thread', '串', 'twitter']
        },
        {
            id: "builtin-prioritize-tasks",
            title: i18n.t('builtInPrompts.prioritizeTasks.title'),
            content: i18n.t('builtInPrompts.prioritizeTasks.content'),
            description: i18n.t('builtInPrompts.prioritizeTasks.description'),
            isBuiltIn: true,
            order: 1130,
            searchKeywords: ['Prioritize tasks', '任务优先级排序', 'priority', '优先级', 'tasks', '任务']
        },
        {
            id: "builtin-daily-planner",
            title: i18n.t('builtInPrompts.dailyPlanner.title'),
            content: i18n.t('builtInPrompts.dailyPlanner.content'),
            description: i18n.t('builtInPrompts.dailyPlanner.description'),
            isBuiltIn: true,
            order: 1140,
            searchKeywords: ['Daily planner', '日计划', 'daily', '日', 'planner', '计划']
        },
        {
            id: "builtin-meeting-summary",
            title: i18n.t('builtInPrompts.meetingSummary.title'),
            content: i18n.t('builtInPrompts.meetingSummary.content'),
            description: i18n.t('builtInPrompts.meetingSummary.description'),
            isBuiltIn: true,
            order: 1150,
            searchKeywords: ['Meeting summary', '会议总结', 'meeting', '会议']
        },
        {
            id: "builtin-pm-user-story",
            title: i18n.t('builtInPrompts.pmUserStory.title'),
            content: i18n.t('builtInPrompts.pmUserStory.content'),
            description: i18n.t('builtInPrompts.pmUserStory.description'),
            isBuiltIn: true,
            order: 1160,
            searchKeywords: ['Rewrite as user story', '改写为用户故事', 'user story', '用户故事']
        },
        {
            id: "builtin-decision-matrix",
            title: i18n.t('builtInPrompts.decisionMatrix.title'),
            content: i18n.t('builtInPrompts.decisionMatrix.content'),
            description: i18n.t('builtInPrompts.decisionMatrix.description'),
            isBuiltIn: true,
            order: 1170,
            searchKeywords: ['Decision matrix', '决策矩阵', 'decision', '决策', 'matrix', '矩阵']
        },
        {
            id: "builtin-email-draft",
            title: i18n.t('builtInPrompts.emailDraft.title'),
            content: i18n.t('builtInPrompts.emailDraft.content'),
            description: i18n.t('builtInPrompts.emailDraft.description'),
            isBuiltIn: true,
            order: 1180,
            searchKeywords: ['Draft email', '草拟邮件', 'email', '邮件']
        },
        {
            id: "builtin-action-checklist",
            title: i18n.t('builtInPrompts.actionChecklist.title'),
            content: i18n.t('builtInPrompts.actionChecklist.content'),
            description: i18n.t('builtInPrompts.actionChecklist.description'),
            isBuiltIn: true,
            order: 1190,
            searchKeywords: ['Action checklist', '行动清单', 'checklist', '清单']
        },
        {
            id: "builtin-brainstorm-ideas",
            title: i18n.t('builtInPrompts.brainstormIdeas.title'),
            content: i18n.t('builtInPrompts.brainstormIdeas.content'),
            description: i18n.t('builtInPrompts.brainstormIdeas.description'),
            isBuiltIn: true,
            order: 1200,
            searchKeywords: ['Brainstorm ideas', '头脑风暴', 'brainstorm', '头脑风暴']
        },
        {
            id: "builtin-learnings-summary",
            title: i18n.t('builtInPrompts.learningsSummary.title'),
            content: i18n.t('builtInPrompts.learningsSummary.content'),
            description: i18n.t('builtInPrompts.learningsSummary.description'),
            isBuiltIn: true,
            order: 1210,
            searchKeywords: ['Summarize key learnings', '总结关键要点', 'learnings', '要点']
        },
        {
            id: "builtin-weekly-review",
            title: i18n.t('builtInPrompts.weeklyReview.title'),
            content: i18n.t('builtInPrompts.weeklyReview.content'),
            description: i18n.t('builtInPrompts.weeklyReview.description'),
            isBuiltIn: true,
            order: 1220,
            searchKeywords: ['Weekly review', '周回顾', 'weekly', '周', 'review', '回顾']
        },
        {
            id: "builtin-polish-style",
            title: i18n.t('builtInPrompts.polishStyle.title'),
            content: i18n.t('builtInPrompts.polishStyle.content'),
            description: i18n.t('builtInPrompts.polishStyle.description'),
            isBuiltIn: true,
            order: 1230,
            searchKeywords: ['Polish style', '润色风格', 'polish', '润色']
        },
        {
            id: "builtin-academic-tone",
            title: i18n.t('builtInPrompts.academicTone.title'),
            content: i18n.t('builtInPrompts.academicTone.content'),
            description: i18n.t('builtInPrompts.academicTone.description'),
            isBuiltIn: true,
            order: 1240,
            searchKeywords: ['Rewrite in academic tone', '改写为学术语气', 'academic', '学术']
        },
        {
            id: "builtin-professional-tone",
            title: i18n.t('builtInPrompts.professionalTone.title'),
            content: i18n.t('builtInPrompts.professionalTone.content'),
            description: i18n.t('builtInPrompts.professionalTone.description'),
            isBuiltIn: true,
            order: 1250,
            searchKeywords: ['Rewrite in professional tone', '改写为专业语气', 'professional', '专业']
        },
        {
            id: "builtin-conciseness",
            title: i18n.t('builtInPrompts.conciseness.title'),
            content: i18n.t('builtInPrompts.conciseness.content'),
            description: i18n.t('builtInPrompts.conciseness.description'),
            isBuiltIn: true,
            order: 1260,
            searchKeywords: ['Improve conciseness', '提高简洁性', 'concise', '简洁']
        },
        {
            id: "builtin-flow-coherence",
            title: i18n.t('builtInPrompts.flowCoherence.title'),
            content: i18n.t('builtInPrompts.flowCoherence.content'),
            description: i18n.t('builtInPrompts.flowCoherence.description'),
            isBuiltIn: true,
            order: 1270,
            searchKeywords: ['Improve flow and coherence', '改善流畅性和连贯性', 'flow', '流畅', 'coherence', '连贯']
        },
        {
            id: "builtin-enhance-persuasiveness",
            title: i18n.t('builtInPrompts.enhancePersuasiveness.title'),
            content: i18n.t('builtInPrompts.enhancePersuasiveness.content'),
            description: i18n.t('builtInPrompts.enhancePersuasiveness.description'),
            isBuiltIn: true,
            order: 1270,
            searchKeywords: ['Enhance persuasiveness', '增强说服力', 'persuasive', '说服', 'arguments', '论点']
        },
        {
            id: "builtin-rewrite-as-story",
            title: i18n.t('builtInPrompts.rewriteAsStory.title'),
            content: i18n.t('builtInPrompts.rewriteAsStory.content'),
            description: i18n.t('builtInPrompts.rewriteAsStory.description'),
            isBuiltIn: true,
            order: 1275,
            searchKeywords: ['Rewrite as story', '改写为故事', 'story', '故事', 'narrative', '叙事']
        },
        {
            id: "builtin-rewrite-as-classical-chinese-poetry",
            title: i18n.t('builtInPrompts.rewriteAsClassicalChinesePoetry.title'),
            content: i18n.t('builtInPrompts.rewriteAsClassicalChinesePoetry.content'),
            description: i18n.t('builtInPrompts.rewriteAsClassicalChinesePoetry.description'),
            isBuiltIn: true,
            order: 1278,
            searchKeywords: ['Classical Chinese poetry', '中国古诗词', 'poetry', '诗词', 'classical', '古典', '古诗']
        },
        {
            id: "builtin-write-prd",
            title: i18n.t('builtInPrompts.writePRD.title'),
            content: i18n.t('builtInPrompts.writePRD.content'),
            description: i18n.t('builtInPrompts.writePRD.description'),
            isBuiltIn: true,
            order: 1285,
            searchKeywords: ['Write PRD', '编写PRD', 'prd', '产品需求']
        },
        {
            id: "builtin-requirement-description",
            title: i18n.t('builtInPrompts.requirementDescription.title'),
            content: i18n.t('builtInPrompts.requirementDescription.content'),
            description: i18n.t('builtInPrompts.requirementDescription.description'),
            isBuiltIn: true,
            order: 1290,
            searchKeywords: ['Requirement description', '需求描述', 'requirement', '需求']
        },
        {
            id: "builtin-bug-description",
            title: i18n.t('builtInPrompts.bugDescription.title'),
            content: i18n.t('builtInPrompts.bugDescription.content'),
            description: i18n.t('builtInPrompts.bugDescription.description'),
            isBuiltIn: true,
            order: 1295,
            searchKeywords: ['Bug description', 'Bug描述', 'bug', '缺陷']
        },
        {
            id: "builtin-generate-obsidian-meta",
            title: i18n.t('builtInPrompts.generateObsidianMeta.title'),
            content: i18n.t('builtInPrompts.generateObsidianMeta.content'),
            description: i18n.t('builtInPrompts.generateObsidianMeta.description'),
            isBuiltIn: true,
            order: 1300,
            searchKeywords: ['Generate Obsidian meta', '生成Obsidian Meta信息', 'obsidian', 'meta', 'yaml', 'frontmatter', '元数据']
        },
        {
            id: "builtin-generate-sketchnote",
            title: i18n.t('builtInPrompts.generateSketchnote.title'),
            content: i18n.t('builtInPrompts.generateSketchnote.content'),
            description: i18n.t('builtInPrompts.generateSketchnote.description'),
            isBuiltIn: true,
            order: 1310,
            searchKeywords: ['Generate Sketchnote', '产生手绘图', 'sketchnote', '手绘', '思维导图', 'mindmap']
        }
    ];
}

// Backward compatibility: export a constant that gets prompts
// Note: This will use the default language until i18n is initialized
export const BUILT_IN_PROMPTS: PromptTemplate[] = [
    {
        id: "builtin-continue-writing",
        title: "Continue writing",
        content: "Based on the provided context \"{}\", continue writing naturally. Follow these guidelines:\n    1. Maintain the same writing style and tone\n    2. Ensure logical flow and coherence with the existing content\n    3. Keep the topic consistent\n    4. Return only the continuation text.",
        description: "Continues writing based on the provided context",
        isBuiltIn: true,
        order: 999
    },
    {
        id: "builtin-fix-grammar-and-spelling",
        title: "Fix grammar and spelling",
        content: "Fix the grammar and spelling of \"{}\". Preserve all formatting, line breaks, and special characters. Do not add or remove any content. Return only the corrected text.",
        description: "Corrects grammar and spelling while preserving original formatting",
        isBuiltIn: true,
        order: 1000
    },
    {
        id: "builtin-translate-to-chinese",
        title: "Translate to Chinese",
        content: "Translate \"{}\" into Chinese:\n    1. Preserve the meaning and tone\n    2. Maintain appropriate cultural context\n    3. Keep formatting and structure\n    Return only the translated text.",
        description: "Translates text to Chinese while maintaining context and tone",
        isBuiltIn: true,
        order: 1010
    },
    {
        id: "builtin-translate-to-english",
        title: "Translate to English",
        content: "Translate \"{}\" into English:\n    1. Preserve the meaning and tone\n    2. Maintain appropriate cultural context\n    3. Keep formatting and structure\n    Return only the translated text.",
        description: "Translates text to English while maintaining context and tone",
        isBuiltIn: true,
        order: 1015
    },
    {
        id: "builtin-summarize",
        title: "Summarize",
        content: "Create a bullet-point summary of \"{}\". Each bullet point should capture a key point. Return only the bullet-point summary.",
        description: "Creates concise bullet-point summaries of content",
        isBuiltIn: true,
        order: 1020
    },
    {
        id: "builtin-simplify",
        title: "Simplify",
        content: "Simplify \"{}\" to a 6th-grade reading level (ages 11-12). Use simple sentences, common words, and clear explanations. Maintain the original key concepts. Return only the simplified text.",
        description: "Simplifies text to a 6th-grade reading level",
        isBuiltIn: true,
        order: 1030
    },
    {
        id: "builtin-explain-like-i-am-5",
        title: "Explain like I am 5",
        content: "Explain \"{}\" in simple terms that a 5-year-old would understand:\n    1. Use basic vocabulary\n    2. Include simple analogies\n    3. Break down complex concepts\n    Return only the simplified explanation.",
        description: "Explains complex concepts in simple terms for children",
        isBuiltIn: true,
        order: 1040
    },
    {
        id: "builtin-emojify",
        title: "Emojify",
        content: "Add relevant emojis to enhance \"{}\". Follow these rules:\n    1. Insert emojis at natural breaks in the text\n    2. Never place two emojis next to each other\n    3. Keep all original text unchanged\n    4. Choose emojis that match the context and tone\n    Return only the emojified text.",
        description: "Adds relevant emojis to text while preserving original content",
        isBuiltIn: true,
        order: 1050
    },
    {
        id: "builtin-make-shorter",
        title: "Make shorter",
        content: "Reduce \"{}\" to half its length while preserving these elements:\n    1. Main ideas and key points\n    2. Essential details\n    3. Original tone and style\n    Return only the shortened text.",
        description: "Reduces text length by half while preserving key information",
        isBuiltIn: true,
        order: 1060
    },
    {
        id: "builtin-make-longer",
        title: "Make longer",
        content: "Expand \"{}\" to twice its length by:\n    1. Adding relevant details and examples\n    2. Elaborating on key points\n    3. Maintaining the original tone and style\n    Return only the expanded text.",
        description: "Expands text to twice its length with additional details",
        isBuiltIn: true,
        order: 1070
    },
    {
        id: "builtin-generate-table-of-contents",
        title: "Generate table of contents",
        content: "Generate a hierarchical table of contents for \"{}\". Use appropriate heading levels (H1, H2, H3, etc.). Include page numbers if present. Return only the table of contents.",
        description: "Creates a hierarchical table of contents with heading levels",
        isBuiltIn: true,
        order: 1080
    },
    {
        id: "builtin-generate-outline",
        title: "Generate note outline",
        content: "Analyze \"{}\" and generate a well-structured outline based on the existing Markdown headings. Follow these requirements:\n\n**CRITICAL: Extract from existing content ONLY**\n- **DO NOT fabricate or invent headings that don't exist in the text**\n- **ONLY use actual Markdown headings** (# H1, ## H2, ### H3, etc.)\n- If there are no Markdown headings, extract main topic sentences instead\n- Preserve the hierarchical structure from the original headings\n\n**Formatting requirements:**\n1. Use standard markdown list format with dash (-) symbols\n2. **Create clickable links** using the format: - [[#Heading Text]]\n   - This allows navigation to each section in Obsidian\n   - Use the EXACT heading text from the original document\n3. Use tab indentation to represent hierarchy levels:\n   - Level 1 (# H1): no indentation (- [[#Main topic]])\n   - Level 2 (## H2): one tab indentation (\\t- [[#Sub-topic]])\n   - Level 3 (### H3): two tab indentation (\\t\\t- [[#Supporting point]])\n4. **Maximum 3 levels** - ignore H4 and deeper headings\n5. Keep outline items **conceptual and summary-focused**:\n   - Use the exact heading text in the link\n   - Avoid adding details not present in headings\n   - Focus on the heading hierarchy structure\n6. Maintain the logical order from the original document\n\nExample format:\n- [[#Introduction]]\n- [[#Background]]\n\\t- [[#Historical context]]\n\\t- [[#Current situation]]\n\\t\\t- [[#Key challenges]]\n\\t- [[#Future trends]]\n- [[#Conclusion]]\n\nReturn only the formatted outline with proper tab indentation and clickable links, NO explanatory text.",
        description: "Creates a structured outline with hierarchical indentation",
        isBuiltIn: true,
        order: 1085
    },
    {
        id: "builtin-generate-glossary",
        title: "Generate glossary",
        content: "Create a glossary of important terms, concepts, and phrases from \"{}\". Format each entry as \"Term: Definition\". Sort entries alphabetically. Return only the glossary.",
        description: "Creates an alphabetically sorted glossary of important terms",
        isBuiltIn: true,
        order: 1090
    },
    {
        id: "builtin-remove-urls",
        title: "Remove URLs",
        content: "Remove all URLs from \"{}\". Preserve all other content and formatting. URLs may be in various formats (http, https, www). Return only the text with URLs removed.",
        description: "Removes all URLs while preserving other content and formatting",
        isBuiltIn: true,
        order: 1100
    },
    {
        id: "builtin-rewrite-as-tweet",
        title: "Rewrite as tweet",
        content: "Rewrite \"{}\" as a single tweet with these requirements:\n    1. Maximum 280 characters\n    2. Use concise, impactful language\n    3. Maintain the core message\n    Return only the tweet text.",
        description: "Rewrites content as a concise tweet under 280 characters",
        isBuiltIn: true,
        order: 1110
    },
    {
        id: "builtin-rewrite-as-tweet-thread",
        title: "Rewrite as tweet thread",
        content: "Convert \"{}\" into a Twitter thread following these rules:\n    1. Each tweet must be under 240 characters\n    2. Start with \"THREAD START\" on its own line\n    3. Separate tweets with \"\n\n---\n\n\"\n    4. End with \"THREAD END\" on its own line\n    5. Make content engaging and clear\n    Return only the formatted thread.",
        description: "Converts content into a formatted Twitter thread",
        isBuiltIn: true,
        order: 1120
    },
    {
        id: "builtin-prioritize-tasks",
        title: "Prioritize tasks",
        content: "Analyze \"{}\" and generate a prioritized task list:\n    1. Categorize tasks by urgency and importance\n    2. Apply Eisenhower Matrix (Do, Schedule, Delegate, Eliminate)\n    3. Return a clear action plan with priorities",
        description: "Helps prioritize tasks using the Eisenhower Matrix",
        isBuiltIn: true,
        order: 1130
    },
    {
        id: "builtin-daily-planner",
        title: "Daily planner",
        content: "Convert \"{}\" into a structured daily plan:\n    1. Allocate time blocks for each task\n    2. Add buffer time for breaks\n    3. Optimize for productivity and focus\n    Return only the formatted daily plan.",
        description: "Turns notes into a structured daily plan",
        isBuiltIn: true,
        order: 1140
    },
    {
        id: "builtin-meeting-summary",
        title: "Meeting summary",
        content: "Summarize \"{}\" into a meeting note format:\n    1. Key decisions\n    2. Action items with owners\n    3. Deadlines\n    4. Next steps\n    Return only the structured meeting summary.",
        description: "Creates structured meeting summaries with action items",
        isBuiltIn: true,
        order: 1150
    },
    {
        id: "builtin-pm-user-story",
        title: "Rewrite as user story",
        content: "Convert \"{}\" into a product user story format:\n    As a [user role], I want [feature] so that [benefit].\n    Add acceptance criteria in bullet points.\n    Return only the formatted user story.",
        description: "Transforms notes into agile user stories with acceptance criteria",
        isBuiltIn: true,
        order: 1160
    },
    {
        id: "builtin-decision-matrix",
        title: "Decision matrix",
        content: "Convert \"{}\" into a decision matrix:\n    1. Identify options\n    2. List evaluation criteria\n    3. Assign pros/cons for each option\n    4. Suggest the best option\n    Return only the formatted decision matrix.",
        description: "Helps structure decisions with options and trade-offs",
        isBuiltIn: true,
        order: 1170
    },
    {
        id: "builtin-email-draft",
        title: "Draft email",
        content: "Rewrite \"{}\" as a professional email:\n    1. Add subject line\n    2. Use clear and concise tone\n    3. Maintain polite and professional wording\n    4. End with a proper closing\n    Return only the email draft.",
        description: "Converts notes into polished professional emails",
        isBuiltIn: true,
        order: 1180
    },
    {
        id: "builtin-action-checklist",
        title: "Action checklist",
        content: "Convert \"{}\" into a clear, actionable checklist:\n    1. Each item must be a single actionable task\n    2. Use short imperative sentences\n    3. Return only the checklist items with checkboxes",
        description: "Creates actionable checklists from notes",
        isBuiltIn: true,
        order: 1190
    },
    {
        id: "builtin-brainstorm-ideas",
        title: "Brainstorm ideas",
        content: "Generate 5–10 creative ideas or approaches for \"{}\". Ensure ideas are:\n    1. Diverse and original\n    2. Practical but innovative\n    3. Briefly explained\n    Return only the list of ideas.",
        description: "Generates diverse, creative ideas for problem solving",
        isBuiltIn: true,
        order: 1200
    },
    {
        id: "builtin-learnings-summary",
        title: "Summarize key learnings",
        content: "Extract key learnings from \"{}\":\n    1. What worked well\n    2. What didn't work\n    3. Recommendations for the future\n    Return only the structured key learnings summary.",
        description: "Helps capture lessons learned and recommendations",
        isBuiltIn: true,
        order: 1210
    },
    {
        id: "builtin-weekly-review",
        title: "Weekly review",
        content: "Turn \"{}\" into a weekly review format:\n    1. Achievements\n    2. Challenges\n    3. Lessons learned\n    4. Next week's focus\n    Return only the formatted weekly review.",
        description: "Transforms notes into a structured weekly review",
        isBuiltIn: true,
        order: 1220
    },
    {
        id: "builtin-polish-style",
        title: "Polish style",
        content: "Polish \"{}\" to improve clarity, flow, and readability:\n    1. Improve sentence structure\n    2. Enhance word choice\n    3. Maintain the original meaning\n    Return only the polished text.",
        description: "Polishes writing style for clarity and flow",
        isBuiltIn: true,
        order: 1230
    },
    {
        id: "builtin-academic-tone",
        title: "Rewrite in academic tone",
        content: "Rewrite \"{}\" in a formal academic tone:\n    1. Use precise vocabulary\n    2. Maintain logical flow\n    3. Avoid casual expressions\n    Return only the rewritten text.",
        description: "Rewrites text in formal academic style",
        isBuiltIn: true,
        order: 1240
    },
    {
        id: "builtin-professional-tone",
        title: "Rewrite in professional tone",
        content: "Rewrite \"{}\" in a professional and business-appropriate tone:\n    1. Use clear, concise language\n    2. Keep it polite and formal\n    3. Avoid unnecessary jargon\n    Return only the rewritten text.",
        description: "Refines text for professional business communication",
        isBuiltIn: true,
        order: 1250
    },
    {
        id: "builtin-conciseness",
        title: "Improve conciseness",
        content: "Rewrite \"{}\" to make it more concise:\n    1. Remove redundancy\n    2. Shorten long sentences\n    3. Preserve meaning and tone\n    Return only the concise text.",
        description: "Improves writing by removing redundancy and wordiness",
        isBuiltIn: true,
        order: 1260
    },
    {
        id: "builtin-flow-coherence",
        title: "Improve flow and coherence",
        content: "Edit \"{}\" to improve flow and coherence:\n    1. Ensure logical progression\n    2. Improve transitions between ideas\n    3. Maintain original meaning\n    Return only the improved text.",
        description: "Improves logical flow and coherence of writing",
        isBuiltIn: true,
        order: 1270
    },
    {
        id: "builtin-enhance-persuasiveness",
        title: "Enhance persuasiveness",
        content: "Rewrite \"{}\" to make it more persuasive:\n    1. Strengthen arguments with reasoning\n    2. Use confident, impactful wording\n    3. Keep tone appropriate\n    Return only the persuasive version.",
        description: "Strengthens arguments to make text more persuasive",
        isBuiltIn: true,
        order: 1280
    },
    {
        id: "builtin-write-prd",
        title: "Write PRD",
        content: "Convert \"{}\" into a structured Product Requirement Document (PRD):\n    1. Background and problem statement\n    2. Goals and objectives\n    3. User stories and use cases\n    4. Functional requirements\n    5. Non-functional requirements\n    6. Success metrics\n    7. Open questions or risks\n    Return only the formatted PRD.",
        description: "Generates a structured Product Requirement Document (PRD)",
        isBuiltIn: true,
        order: 1285
    },
    {
        id: "builtin-requirement-description",
        title: "Requirement description",
        content: "Rewrite \"{}\" as a formal requirement description:\n    1. Use clear and precise language\n    2. State the requirement in a testable way\n    3. Add acceptance criteria in bullet points\n    Return only the structured requirement description.",
        description: "Creates clear, testable requirement descriptions with acceptance criteria",
        isBuiltIn: true,
        order: 1290
    },
    {
        id: "builtin-bug-description",
        title: "Bug description",
        content: "Convert \"{}\" into a structured bug report:\n    1. Title\n    2. Environment (OS, browser, app version, etc.)\n    3. Steps to reproduce\n    4. Expected behavior\n    5. Actual behavior\n    6. Screenshots or logs (if available)\n    7. Severity and priority\n    Return only the formatted bug description.",
        description: "Creates clear, structured bug reports for defect tracking",
        isBuiltIn: true,
        order: 1295
    },
    {
        id: "builtin-generate-obsidian-meta",
        title: "Generate Obsidian Meta",
        content: "Generate Obsidian-compatible YAML front matter metadata for the following content \"{}\":\n\nRequirements:\n1. Extract and categorize the content appropriately\n2. Extract basic information (author, source, date, etc.) if available\n3. Do NOT fabricate information that is not present in the content\n4. Follow proper YAML formatting:\n   - Use snake_case for keys (lowercase with underscores)\n   - Use indentation (spaces, not tabs) for structure\n   - Use key: value format\n   - Use hyphens for list items\n   - Quote strings with special characters\n\nReturn only the YAML front matter block (enclosed in --- markers).",
        description: "Generate YAML front matter metadata for Obsidian notes",
        isBuiltIn: true,
        order: 1300
    },
    {
        id: "builtin-generate-sketchnote",
        title: i18n.t('builtInPrompts.generateSketchnote.title'),
        content: i18n.t('builtInPrompts.generateSketchnote.content'),
        description: i18n.t('builtInPrompts.generateSketchnote.description'),
        isBuiltIn: true,
        order: 1310,
        searchKeywords: ['Generate Sketchnote', '生成手绘笔记', 'sketchnote', '手绘', 'visual note', '视觉笔记']
    },
    {
        id: "builtin-generate-mermaid-diagram",
        title: i18n.t('builtInPrompts.generateMermaidDiagram.title'),
        content: i18n.t('builtInPrompts.generateMermaidDiagram.content'),
        description: i18n.t('builtInPrompts.generateMermaidDiagram.description'),
        isBuiltIn: true,
        order: 1320,
        searchKeywords: ['Generate Mermaid Diagram', '生成 Mermaid 图表', 'mermaid', '图表', 'diagram', 'flowchart', '流程图']
    },
    {
        id: "builtin-generate-image-suggestions",
        title: i18n.t('builtInPrompts.generateImageSuggestions.title'),
        content: i18n.t('builtInPrompts.generateImageSuggestions.content'),
        description: i18n.t('builtInPrompts.generateImageSuggestions.description'),
        isBuiltIn: true,
        order: 1330,
        searchKeywords: ['Suggest Images', '文章配图建议', 'image', '配图', 'illustration', '插图', 'cover', '封面']
    },
    {
        id: "builtin-generate-cartoon-infographic",
        title: i18n.t('builtInPrompts.generateCartoonInfographic.title'),
        content: i18n.t('builtInPrompts.generateCartoonInfographic.content'),
        description: i18n.t('builtInPrompts.generateCartoonInfographic.description'),
        isBuiltIn: true,
        order: 1340,
        searchKeywords: ['Generate Cartoon Infographic', '生成卡通信息图', 'cartoon', '卡通', 'infographic', '信息图', 'hand-drawn', '手绘']
    }
];