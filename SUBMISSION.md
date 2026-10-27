# daily.dev marketplace submission draft

Paste these fields into the form at daily.dev/marketplace/submit. The "About" field must not contain links or images, or the submission is rejected.

## Name

daily-reads: something to read while Claude works

## Short description

While your coding agent works, daily-reads shows a few daily.dev posts about exactly what you asked it to do. You get relevant reading instead of watching a spinner.

## About

### What it does

You ask Claude Code to "add caching to the FastAPI endpoints". While it works, you see:

```
📖 While you wait: daily.dev reads on fastapi, caching
  • Caching strategies for FastAPI in production (6 min · ▲310)
  • Redis vs in-memory caching: when each one wins (8 min · ▲205)
  • ...
```

The posts are shown only to you. The agent's context is untouched.

### Two ways to use it

- **Automatic (Claude Code plugin):** a prompt hook recognizes tech topics in your prompt and shows up to 3 matching posts. Each topic is shown once per session and posts never repeat.
- **On demand (agent skill, works in Claude Code, Codex and Cursor):** run the skill and the agent works out the topic from the current task and files, then gives 3 posts with a one-line reason each one is relevant.

### Privacy first

Topics are extracted locally. Only 1 or 2 generic keywords, such as "react" or "postgres", are sent to the daily.dev search API. Your prompt, code, and repository details never leave your machine.

### Friendly to the free tier

Searches are cached, rate-limited per session, and capped per month, so it fits within the free API allowance. Plus users can raise the limits.

### Setup

Create a personal access token in daily.dev settings and set it as DAILY_DEV_TOKEN. The skill can also use the daily.dev MCP server instead.

## SKILL.md

Paste the contents of `skills/daily-reads/SKILL.md`.

## Link

https://github.com/DiCaver/daily-reads
