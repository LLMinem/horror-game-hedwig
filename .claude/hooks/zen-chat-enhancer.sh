#!/bin/bash

# Get the user's prompt from argument or stdin
if [ -n "$1" ]; then
  PROMPT="$1"
else
  PROMPT="$(cat)"
fi

# Add logging to diagnose if hook is being called
LOG_DIR="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hooks/logs"
mkdir -p "$LOG_DIR"
{
  echo "[$(date -Is)] invoked"
  echo "CWD: $(pwd)"
  echo "CLAUDE_PROJECT_DIR: ${CLAUDE_PROJECT_DIR:-<unset>}"
  echo "ARGC: $#"
  echo "PROMPT (len=$(printf %s "$PROMPT" | wc -c)):"
  printf '%s\n' "$PROMPT"
  echo "---"
} >> "$LOG_DIR/user_prompt_submit.log" 2>&1

# Remove quoted text temporarily for pattern checking
# This prevents triggering on "chat with o3" or 'ask gemini'
PROMPT_NO_QUOTES=$(echo "$PROMPT" | sed -E "s/\"[^\"]*\"//g; s/'[^']*'//g")

# Check if prompt contains trigger patterns (case-insensitive)
# Using portable regex that works with grep -E
if echo "$PROMPT_NO_QUOTES" | grep -iE '(^|[^[:alnum:]_])(chat with|ask)[[:space:]]+(o3|gemini|gpt5)($|[^[:alnum:]_])' > /dev/null; then
    
    # Detect which model was mentioned
    MODEL=""
    if echo "$PROMPT_NO_QUOTES" | grep -iE '(^|[^[:alnum:]_])o3($|[^[:alnum:]_])' > /dev/null; then
        MODEL="o3"
    elif echo "$PROMPT_NO_QUOTES" | grep -iE '(^|[^[:alnum:]_])gemini($|[^[:alnum:]_])' > /dev/null; then
        MODEL="gemini"
    elif echo "$PROMPT_NO_QUOTES" | grep -iE '(^|[^[:alnum:]_])gpt5($|[^[:alnum:]_])' > /dev/null; then
        MODEL="gpt5"
    fi
    
    # Check for web search override
    USE_WEBSEARCH="true"
    if echo "$PROMPT" | grep -iE '\(no web ?search\)|\(without web ?search\)' > /dev/null; then
        USE_WEBSEARCH="false"
    fi
    
    # Check for subagent modifier
    USE_SUBAGENT=""
    if echo "$PROMPT" | grep -iE '\(subagent\)' > /dev/null; then
        USE_SUBAGENT="- **Use the Task tool** with appropriate subagent_type for this chat request"
    fi
    
    # Output the original prompt with injected instructions
    echo "$PROMPT"
    echo ""
    echo "---"
    echo ""
    echo "**IMPORTANT Zen MCP Chat Configuration:**"
    echo "- Model: $MODEL"
    echo "- Required settings: \`thinking_mode: \"high\", use_websearch: $USE_WEBSEARCH\`"
    echo "- Remember to attach relevant files to provide context for the query"
    if [ -n "$USE_SUBAGENT" ]; then
        echo "$USE_SUBAGENT"
    fi
    echo "- Provide a detailed description of the topic/issue when using the chat tool"
else
    # No trigger patterns found, return prompt unchanged
    echo "$PROMPT"
fi