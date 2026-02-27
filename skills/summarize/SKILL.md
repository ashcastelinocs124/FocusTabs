---
name: summarize
description: Generate structured conversation summaries highlighting key activities, technical changes, and decisions. Use when the user requests a summary of the current conversation, asks "what have we done?", "summarize this session", "what changed?", or wants to review recent work and technical decisions made during the conversation.
---

# Summarize

Generate comprehensive summaries of the conversation that capture key activities, technical changes, architectural decisions, and outcomes.

## Instructions

When asked to summarize the conversation:

1. **Review the entire conversation history** to understand:
   - Main tasks and goals discussed
   - All file operations (created, modified, deleted)
   - Commands executed and their purposes
   - Technical decisions made and rationale
   - Problems encountered and solutions applied
   - Current state and any pending work

2. **Organize the summary** using the template structure in [references/summary-template.md](references/summary-template.md):
   - **Overview**: 1-2 sentence summary of the main task
   - **Key Activities**: Chronological list of major activities
   - **Technical Changes**: Detailed breakdown of files, decisions, commands
   - **Outcomes**: What was accomplished
   - **Next Steps**: Any pending tasks (if applicable)

3. **Focus on technical substance**:
   - Emphasize code changes with file paths and line numbers (e.g., `src/app.js:45-67`)
   - Highlight architectural decisions with rationale and alternatives considered
   - Include commands that were executed and their outcomes
   - Note any errors encountered and how they were resolved

4. **Use clear, actionable language**:
   - Write in past tense for completed actions
   - Be specific about what changed and why
   - Group related changes together
   - Prioritize important decisions over minor details

5. **Reference examples** in [references/examples.md](references/examples.md) for formatting guidance

6. **Store the summary in a context folder**:
   - Write the final summary to `context/conversation-summary-YYYY-MM-DD.md`
   - This file is used by Cursor, Claude, or any agent for future context
   - Use the same content as your response

## Output Format

Use markdown with clear section headers, bullet points, and code formatting. Include file references in the format `file_path:line_number` to make them clickable in the IDE.

Keep summaries moderate in detail (3-5 main sections), balancing completeness with readability.
