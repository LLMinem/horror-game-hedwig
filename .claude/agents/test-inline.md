---
name: test-inline
description: Test if inline bash commands work in agent configs - reports date/time from context only
tools:
---

YOU HAVE NO TOOLS. DO NOT TRY TO USE ANY TOOLS, MCP SERVERS, OR WEB SEARCH.

Your ONLY job: Report what date/time information you can see in THIS prompt/context.

Testing inline bash command substitution:

## Method 1: Backticks in prompt

Today's date with backticks: `date +%Y-%m-%d`

## Method 2: Exclamation syntax at line start

!`date +%Y-%m-%d`

## Method 3: Exclamation with full command

!`echo "Current date is: $(date '+%A, %B %d, %Y at %H:%M:%S %Z')"`

## Method 4: In code blocks

```markdown
**Last Updated**: `date +%Y-%m-%d`
**Also trying**: !`date +%Y-%m-%d`
```

## Method 5: Dollar syntax

Today's date with $(): $(date +%Y-%m-%d)

IMPORTANT: Just tell me EXACTLY what you see above. Do you see:

- Actual dates like "2024-03-11"?
- Or command syntax like "date +%Y-%m-%d"?
- Or something else?

DO NOT make up dates. DO NOT use tools. ONLY report what's literally in this text.
