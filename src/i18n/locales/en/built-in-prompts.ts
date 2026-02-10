/**
 * English built-in prompts
 */
export const enBuiltInPrompts = {
  continueWriting: {
    title: 'Continue Writing',
    description: 'Continue writing based on the provided context',
    content: 'Based on the provided context "{}", continue writing naturally. Follow these guidelines:\n    1. Maintain the same writing style and tone\n    2. Ensure logical flow and coherence with the existing content\n    3. Keep the topic consistent\n    4. Return only the continuation text.'
  },
  fixGrammarAndSpelling: {
    title: 'Fix Grammar and Spelling',
    description: 'Fix grammar and spelling errors while preserving original formatting',
    content: 'Fix the grammar and spelling of "{}". Preserve all formatting, line breaks, and special characters. Do not add or remove any content. Return only the corrected text.'
  },
  translateToChinese: {
    title: 'Translate to Chinese',
    description: 'Translate text to Chinese, maintaining context and tone',
    content: 'Translate "{}" into Chinese:\n    1. Preserve the meaning and tone\n    2. Maintain appropriate cultural context\n    3. Keep formatting and structure\n    Return only the translated text.'
  },
  translateToEnglish: {
    title: 'Translate to English',
    description: 'Translate text to English, maintaining context and tone',
    content: 'Translate "{}" into English:\n    1. Preserve the meaning and tone\n    2. Maintain appropriate cultural context\n    3. Keep formatting and structure\n    Return only the translated text.'
  },
  summarize: {
    title: 'Summarize',
    description: 'Create a concise bullet-point summary of the content',
    content: 'Create a bullet-point summary of "{}". Each bullet point should capture a key point. Return only the bullet-point summary.'
  },
  simplify: {
    title: 'Simplify',
    description: 'Simplify text to a sixth-grade reading level',
    content: 'Simplify "{}" to a 6th-grade reading level (ages 11-12). Use simple sentences, common words, and clear explanations. Maintain the original key concepts. Return only the simplified text.'
  },
  explainLikeIAm5: {
    title: 'Explain Like I\'m 5',
    description: 'Explain complex concepts using simple language',
    content: 'Explain "{}" in simple terms that a 5-year-old would understand:\n    1. Use basic vocabulary\n    2. Include simple analogies\n    3. Break down complex concepts\n    Return only the simplified explanation.'
  },
  emojify: {
    title: 'Add Emojis',
    description: 'Add relevant emojis while preserving original content',
    content: 'Add relevant emojis to enhance "{}". Follow these rules:\n    1. Insert emojis at natural breaks in the text\n    2. Never place two emojis next to each other\n    3. Keep all original text unchanged\n    4. Choose emojis that match the context and tone\n    Return only the emojified text.'
  },
  makeShorter: {
    title: 'Make Shorter',
    description: 'Reduce text length by half while retaining key information',
    content: 'Reduce "{}" to half its length while preserving these elements:\n    1. Main ideas and key points\n    2. Essential details\n    3. Original tone and style\n    Return only the shortened text.'
  },
  makeLonger: {
    title: 'Expand',
    description: 'Expand text to double length with more details',
    content: 'Expand "{}" to twice its length by:\n    1. Adding relevant details and examples\n    2. Elaborating on key points\n    3. Maintaining the original tone and style\n    Return only the expanded text.'
  },
  generateTableOfContents: {
    title: 'Generate Table of Contents',
    description: 'Create a hierarchical table of contents with heading levels',
    content: 'Generate a hierarchical table of contents for "{}". Use appropriate heading levels (H1, H2, H3, etc.). Include page numbers if present. Return only the table of contents.'
  },
  generateOutline: {
    title: 'Generate Note Outline',
    description: 'Create a structured outline with hierarchical indentation',
    content: `Analyze "{}" and generate a well-structured outline based on the existing Markdown headings. Follow these requirements:

**CRITICAL: Extract from existing content ONLY**
- **DO NOT fabricate or invent headings that don't exist in the text**
- **ONLY use actual Markdown headings** (# H1, ## H2, ### H3, etc.)
- If there are no Markdown headings, extract main topic sentences instead
- Preserve the hierarchical structure from the original headings

**Formatting requirements:**
1. Use standard markdown list format with dash (-) symbols
2. **Create clickable links** using the format: - [[#Heading Text]]
   - This allows navigation to each section in Obsidian
   - Use the EXACT heading text from the original document
3. Use tab indentation to represent hierarchy levels:
   - Level 1 (# H1): no indentation (- [[#Main topic]])
   - Level 2 (## H2): one tab indentation (\t- [[#Sub-topic]])
   - Level 3 (### H3): two tab indentation (\t\t- [[#Supporting point]])
4. **Maximum 3 levels** - ignore H4 and deeper headings
5. Keep outline items **conceptual and summary-focused**:
   - Use the exact heading text in the link
   - Avoid adding details not present in headings
   - Focus on the heading hierarchy structure
6. Maintain the logical order from the original document

Example format:
- [[#Introduction]]
- [[#Background]]
\t- [[#Historical context]]
\t- [[#Current situation]]
\t\t- [[#Key challenges]]
\t- [[#Future trends]]
- [[#Conclusion]]

Return only the formatted outline with proper tab indentation and clickable links, NO explanatory text.`
  },
  generateGlossary: {
    title: 'Generate Glossary',
    description: 'Create an alphabetically sorted glossary of important terms',
    content: 'Create a glossary of important terms, concepts, and phrases from "{}". Format each entry as "Term: Definition". Sort entries alphabetically. Return only the glossary.'
  },
  removeUrls: {
    title: 'Remove URLs',
    description: 'Remove all URLs while preserving other content and formatting',
    content: 'Remove all URLs from "{}". Preserve all other content and formatting. URLs may be in various formats (http, https, www). Return only the text with URLs removed.'
  },
  rewriteAsTweet: {
    title: 'Rewrite as Tweet',
    description: 'Rewrite content as a concise tweet within 280 characters',
    content: 'Rewrite "{}" as a single tweet with these requirements:\n    1. Maximum 280 characters\n    2. Use concise, impactful language\n    3. Maintain the core message\n    Return only the tweet text.'
  },
  rewriteAsTweetThread: {
    title: 'Rewrite as Tweet Thread',
    description: 'Convert content into a formatted Twitter thread',
    content: 'Convert "{}" into a Twitter thread following these rules:\n    1. Each tweet must be under 240 characters\n    2. Start with "THREAD START" on its own line\n    3. Separate tweets with "\n\n---\n\n"\n    4. End with "THREAD END" on its own line\n    5. Make content engaging and clear\n    Return only the formatted thread.'
  },
  prioritizeTasks: {
    title: 'Prioritize Tasks',
    description: 'Help prioritize tasks using the Eisenhower Matrix',
    content: 'Analyze "{}" and generate a prioritized task list:\n    1. Categorize tasks by urgency and importance\n    2. Apply Eisenhower Matrix (Do, Schedule, Delegate, Eliminate)\n    3. Return a clear action plan with priorities'
  },
  dailyPlanner: {
    title: 'Daily Planner',
    description: 'Convert notes into a structured daily plan',
    content: 'Convert "{}" into a structured daily plan:\n    1. Allocate time blocks for each task\n    2. Add buffer time for breaks\n    3. Optimize for productivity and focus\n    Return only the formatted daily plan.'
  },
  meetingSummary: {
    title: 'Meeting Summary',
    description: 'Create a structured meeting summary with action items',
    content: 'Summarize "{}" into a meeting note format:\n    1. Key decisions\n    2. Action items with owners\n    3. Deadlines\n    4. Next steps\n    Return only the structured meeting summary.'
  },
  pmUserStory: {
    title: 'Rewrite as User Story',
    description: 'Convert notes into agile user stories with acceptance criteria',
    content: 'Convert "{}" into a product user story format:\n    As a [user role], I want [feature] so that [benefit].\n    Add acceptance criteria in bullet points.\n    Return only the formatted user story.'
  },
  decisionMatrix: {
    title: 'Decision Matrix',
    description: 'Help structure decisions through options and trade-offs',
    content: 'Convert "{}" into a decision matrix:\n    1. Identify options\n    2. List evaluation criteria\n    3. Assign pros/cons for each option\n    4. Suggest the best option\n    Return only the formatted decision matrix.'
  },
  emailDraft: {
    title: 'Draft Email',
    description: 'Convert notes into a polished professional email',
    content: 'Rewrite "{}" as a professional email:\n    1. Add subject line\n    2. Use clear and concise tone\n    3. Maintain polite and professional wording\n    4. End with a proper closing\n    Return only the email draft.'
  },
  actionChecklist: {
    title: 'Action Checklist',
    description: 'Create an actionable checklist from notes',
    content: 'Convert "{}" into a clear, actionable checklist:\n    1. Each item must be a single actionable task\n    2. Use short imperative sentences\n    3. Return only the checklist items with checkboxes'
  },
  brainstormIdeas: {
    title: 'Brainstorm',
    description: 'Generate diverse, creative problem-solving ideas',
    content: 'Generate 5–10 creative ideas or approaches for "{}". Ensure ideas are:\n    1. Diverse and original\n    2. Practical but innovative\n    3. Briefly explained\n    Return only the list of ideas.'
  },
  learningsSummary: {
    title: 'Summarize Key Takeaways',
    description: 'Help capture lessons learned and recommendations',
    content: 'Extract key learnings from "{}":\n    1. What worked well\n    2. What didn\'t work\n    3. Recommendations for the future\n    Return only the structured key learnings summary.'
  },
  weeklyReview: {
    title: 'Weekly Review',
    description: 'Convert notes into a structured weekly review',
    content: 'Turn "{}" into a weekly review format:\n    1. Achievements\n    2. Challenges\n    3. Lessons learned\n    4. Next week\'s focus\n    Return only the formatted weekly review.'
  },
  polishStyle: {
    title: 'Polish Style',
    description: 'Polish writing style to improve clarity and flow',
    content: 'Polish "{}" to improve clarity, flow, and readability:\n    1. Improve sentence structure\n    2. Enhance word choice\n    3. Maintain the original meaning\n    Return only the polished text.'
  },
  academicTone: {
    title: 'Rewrite in Academic Tone',
    description: 'Rewrite text in formal academic style',
    content: 'Rewrite "{}" in a formal academic tone:\n    1. Use precise vocabulary\n    2. Maintain logical flow\n    3. Avoid casual expressions\n    Return only the rewritten text.'
  },
  professionalTone: {
    title: 'Rewrite in Professional Tone',
    description: 'Refine text for professional business communication',
    content: 'Rewrite "{}" in a professional and business-appropriate tone:\n    1. Use clear, concise language\n    2. Keep it polite and formal\n    3. Avoid unnecessary jargon\n    Return only the rewritten text.'
  },
  conciseness: {
    title: 'Improve Conciseness',
    description: 'Improve writing by removing redundancy and verbosity',
    content: 'Rewrite "{}" to make it more concise:\n    1. Remove redundancy\n    2. Shorten long sentences\n    3. Preserve meaning and tone\n    Return only the concise text.'
  },
  flowCoherence: {
    title: 'Improve Flow and Coherence',
    description: 'Improve logical flow and coherence of writing',
    content: 'Edit "{}" to improve flow and coherence:\n    1. Ensure logical progression\n    2. Improve transitions between ideas\n    3. Maintain original meaning\n    Return only the improved text.'
  },
  enhancePersuasiveness: {
    title: 'Enhance Persuasiveness',
    description: 'Strengthen arguments to make text more persuasive',
    content: 'Rewrite "{}" to make it more persuasive:\n    1. Strengthen arguments with reasoning\n    2. Use confident, impactful wording\n    3. Keep tone appropriate\n    Return only the persuasive version.'
  },
  rewriteAsStory: {
    title: 'Rewrite as Story',
    description: 'Transform text into an engaging narrative story',
    content: 'Rewrite "{}" as an engaging story:\n    1. Create a narrative arc with beginning, middle, and end\n    2. Develop characters and setting if applicable\n    3. Use vivid descriptions and dialogue\n    4. Maintain the core message or information\n    Return only the story version.'
  },
  rewriteAsClassicalChinesePoetry: {
    title: 'Rewrite as Classical Chinese Poetry',
    description: 'Transform text into classical Chinese poetry style',
    content: 'Rewrite "{}" as classical Chinese poetry (古诗词):\n    1. Use traditional poetic forms (e.g., 五言, 七言, 律诗, 绝句)\n    2. Maintain rhythm and rhyme patterns\n    3. Capture the essence and emotion of the original text\n    4. Use elegant classical Chinese language\n    Return only the poetry version.'
  },
  writePRD: {
    title: 'Write PRD',
    description: 'Generate a structured Product Requirements Document (PRD)',
    content: 'Convert "{}" into a structured Product Requirement Document (PRD):\n    1. Background and problem statement\n    2. Goals and objectives\n    3. User stories and use cases\n    4. Functional requirements\n    5. Non-functional requirements\n    6. Success metrics\n    7. Open questions or risks\n    Return only the formatted PRD.'
  },
  requirementDescription: {
    title: 'Requirement Description',
    description: 'Create clear, testable requirement descriptions with acceptance criteria',
    content: 'Rewrite "{}" as a formal requirement description:\n    1. Use clear and precise language\n    2. State the requirement in a testable way\n    3. Add acceptance criteria in bullet points\n    Return only the structured requirement description.'
  },
  bugDescription: {
    title: 'Bug Description',
    description: 'Create clear, structured bug reports for defect tracking',
    content: 'Convert "{}" into a structured bug report:\n    1. Title\n    2. Environment (OS, browser, app version, etc.)\n    3. Steps to reproduce\n    4. Expected behavior\n    5. Actual behavior\n    6. Screenshots or logs (if available)\n    7. Severity and priority\n    Return only the formatted bug description.'
  },
  generateObsidianMeta: {
    title: 'Generate Obsidian Meta',
    description: 'Generate YAML front matter metadata for Obsidian notes',
    content: `Please generate Obsidian note metadata for the given text. Extract and categorize content appropriately, including basic information (author, source, etc.) if available. Do NOT fabricate information that is not present in the content.

YAML formatting requirements:
1. Use indentation to define structure (spaces, not tabs)
2. Use key: value pairs for data
3. Use hyphens and space for list items (e.g., - item)
4. Keys should use snake_case (lowercase with underscores, e.g., my_variable_name)
5. Avoid dashes in keys, prefer underscores
6. Strings with spaces or special characters need quotes
7. Values can be strings, numbers, booleans, lists, or dictionaries

Example format:
---
tags: [tag1, tag2, tag3]
aliases: [alias1, alias2]
author: Author Name
source: Source URL or reference
category: Category
summary: Brief summary (1-2 sentences)
---

Please output the generated YAML front matter directly, with no additional explanatory text.`
  },
  generateSketchnote: {
    title: 'Generate Sketchnote',
    description: 'Transform text into a dense, logical, and cute hand-drawn sketchnote',
    content: 'You are a professional "Visual Note-taking Artist" and "Knowledge Extraction Expert". Your core task is to transform the long article or complex text provided in "{}" into a knowledge-dense, logically clear, and cute hand-drawn sketchnote. Focus on extracting key concepts and organizing them visually.'
  },
  generateMermaidDiagram: {
    title: 'Generate Mermaid Diagram',
    description: 'Create professional diagrams in Mermaid format with SVG output',
    content: `Please create a [diagram type] in Mermaid format for the content: "{}"

Requirements:
1. Use a clear and professional layout
2. Professional color scheme
3. Appropriate font sizes
4. Output SVG code directly
5. Handle Chinese/English text properly to avoid garbled characters

Example diagram types: flowchart, sequence diagram, class diagram, state diagram, ER diagram, gantt chart, pie chart, mindmap, timeline`
  },
  generateImageSuggestions: {
    title: 'Suggest Images for Article',
    description: 'Recommend cover images for each paragraph with clean, minimal design',
    content: `Please recommend a cover image for each paragraph of this article: "{}"

For each paragraph, provide:
1. Image type: Clean white background with minimalist design
2. Image description: 
   - Focus on the core concept of the paragraph
   - Minimal text, use logical diagrams to convey meaning
   - Simple and professional aesthetic
   - Emphasize visual communication over text

Format:
Paragraph X:
- Image type: [description]
- Content: [core concept visualization]
- Design notes: [key visual elements]`
  },
  generateCartoonInfographic: {
    title: 'Generate Cartoon Infographic',
    description: 'Create hand-drawn style infographic with cartoon elements',
    content: `Please create a cartoon-style infographic for: "{}"

Style requirements:
- Hand-drawn aesthetic, horizontal layout (16:9 ratio)
- Include minimal simple cartoon elements and icons to enhance visual interest and memory
- If there are sensitive persons or copyrighted content, create similar alternatives without refusing generation
- All images and text must use hand-drawn style, no photorealistic elements
- Unless specified, language should match the input content language
- Keep information concise, highlight keywords and core concepts, leave plenty of whitespace, easy to grasp at a glance

Design principles:
1. Visual hierarchy with clear focal points
2. Playful but professional appearance
3. Color palette that's friendly and approachable
4. Iconography that supports comprehension
5. Balanced composition with good use of negative space`
  }
} as const;
