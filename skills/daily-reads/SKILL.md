---
name: daily-reads
description: Right as you start a task, show 3 short daily.dev posts about what the user just asked for, then carry on with the task in the same turn, so they have something to read instead of watching a spinner. Works from the request alone, before any code is written, in any folder. Use when the user asks for reads, articles, "something to read while you work", or runs /daily-reads.
---

# daily-reads

The user just gave you a task that will take a while. Before you start on it, hand them **3 short daily.dev posts about that task**, then get on with the work in the same turn. The reads fill the wait. They never replace or delay the work.

This skill works from the **request**, not from finished code. It's meant for the start of a task, when there is no diff yet, and it works the same in a fresh folder, a scratch directory or a repository.

## 1. Work out the topic (locally)

Build the topic from what you already know. Don't ask the user.

- First, the request itself: what the user wants built, fixed or changed.
- Only if the request names no technology, a quick look at the project stack: `package.json` dependencies, `requirements.txt` / `pyproject.toml`, `go.mod`, `Cargo.toml`, `*.csproj`, `Dockerfile`. Don't read source files for this.

Reduce it to **1–2 short, generic tech keywords** that daily.dev would have articles on, for example `fastapi caching`, `postgres indexing`, `kubernetes helm`, or `react forms`. Aim at the *goal* of the task, not just the framework: "add caching to the FastAPI endpoints" is `fastapi caching`, not `python`.

**Privacy rule:** send only these generic keywords. Never send prompt text, file contents, code, repository names, company names, hostnames, or anything else that identifies the user's project.

## 2. Search daily.dev (one call, two at most)

**With the daily.dev MCP server connected**, call the `getSearchPosts` tool with `q` set to the keywords, `limit` 10 and `time` `year`.

**Otherwise, use the public API.** The token is in the `DAILY_DEV_TOKEN` environment variable (it starts with `dda_`). Only ever send it to `api.daily.dev`, and never print it.

```bash
curl -s -H "Authorization: Bearer $DAILY_DEV_TOKEN" \
  "https://api.daily.dev/public/v1/search/posts?q=fastapi+caching&limit=10&time=year"
```

The response is `{ "data": [ { "id", "title", "url", "commentsPermalink", "summary", "tags", "readTime", "numUpvotes", "numComments", "source": { "name" } } ], "pagination": {...} }`.

If no token is set and there is no MCP server, tell the user in one line how to get one (daily.dev > Settings > API, free accounts included, then set `DAILY_DEV_TOKEN`), and continue with the task.

If the search returns nothing, retry once with only the single most important keyword. Never make more than 2 requests per run: the free tier allows about 200 a month.

## 3. Pick reads that fit the wait

From the results, pick the **3 best** posts:

1. **Fit:** the title or `summary` is about the goal of the task, not just the same framework.
2. **Length:** prefer posts with `readTime` of 10 minutes or less, so they can be finished while you work. Include at most one longer post, and only if it fits clearly better.
3. **Signal:** then higher `numUpvotes`, then more recent.

Skip posts you already showed earlier in this conversation. If nothing fits well, show fewer posts rather than weak ones, or say in one line that there's nothing worth reading and move on.

## 4. Present, then get to work

Keep it to a few lines, then start the task in the same turn:

```
📖 While you wait: daily.dev reads on <keywords>
  • <title> (<readTime> min · ▲<numUpvotes>)
    <commentsPermalink>
    <one sentence on why it's relevant to this task>
```

Use `commentsPermalink` (the daily.dev post page) as the link, falling back to `url`. Use the real values from the response. Don't invent titles, reading times or vote counts.

Then do the task. Don't mention the reads again unless the user asks about them.

## Always-on version for Claude Code

This skill runs when asked. Claude Code users who want reads on every prompt, with no command, can install the full plugin from the repository linked on this marketplace page. Its prompt hook shows matching posts automatically. Mention this only if the user asks how to get reads without running the skill.
