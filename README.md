# daily-reads

Something relevant to read while Claude works.

When you send Claude a prompt, this Claude Code plugin picks out the tech topics (for example "react", "postgres", or "kubernetes"), searches [daily.dev](https://daily.dev), and shows you a few matching posts:

```
📖 While you wait: daily.dev reads on react, vite
  • Migrating a large React app to Vite (7 min · ▲412) → https://daily.dev/posts/abc123XYZ
  • ...
```

The posts are shown **to you only**. Nothing is added to Claude's context, so Claude's work isn't affected.

## Install

```
/plugin marketplace add DiCaver/daily-reads
/plugin install daily-reads@daily-reads
```

Requires Node.js 18+ on your `PATH`.

## Set up a token

1. Create a personal access token at daily.dev under **Settings > API**. Free accounts can do this.
2. Make it available to Claude Code as `DAILY_DEV_TOKEN`, either as an environment variable or in `~/.claude/settings.json`:

```json
{ "env": { "DAILY_DEV_TOKEN": "dda_..." } }
```

Without a token, the hook does nothing.

## Privacy

- Topics are matched **locally** against a fixed list of tech terms. Only those generic terms (at most 2) are sent to `api.daily.dev`. Your prompt, code, and file names never leave your machine.
- The hook reads `package.json`, `requirements.txt`, `go.mod`, and similar files to guess your stack, but only when the prompt itself names no topic, and only once per session.

## Staying under the rate limit

The free daily.dev tier allows about **200 API requests a month**, so the hook is frugal:

| Behaviour | Default | Override with |
|---|---|---|
| Posts shown per topic | 3 | `DAILY_READS_MAX_POSTS` |
| Minimum time between searches in a session | 10 min | `DAILY_READS_COOLDOWN_MINUTES` |
| Searches per calendar month | 150 | `DAILY_READS_MONTHLY_BUDGET` |
| Cache lifetime for a search | 72 h | `DAILY_READS_CACHE_HOURS` |
| API timeout | 4000 ms | `DAILY_READS_TIMEOUT_MS` |

Other rules:

- Each topic is shown once per session, and the same post is never shown twice in a session.
- Prompts with no recognizable tech topic are skipped.
- Set `DAILY_READS_DISABLED=1` to turn the hook off.

State and cache live in `~/.claude/daily-reads/state.json`.

## On-demand reads

The plugin also ships a skill, **`/daily-reads`**. Claude works out the topic from what you just asked for, which is smarter than the hook's keyword list, shows 3 short posts (10 minutes or less where possible) with a one-line reason each, and then gets on with the task. It uses one search, two at most. The same `SKILL.md` is what's submitted to the daily.dev plugin marketplace, so it also works in Codex and Cursor. It can use the daily.dev MCP server instead of a token.

### Clickable links in the desktop app

The desktop app shows hook notices as plain text, so the links in them aren't clickable there. In most terminals you can Ctrl+click them.

For clickable links in the desktop app, use the skill: run `/daily-reads`. The posts then appear in Claude's own reply, where the desktop app turns links into clickable ones. You also get a short reason why each post fits your task.
