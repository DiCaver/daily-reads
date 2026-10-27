---
name: daily-reads
description: Find 3 daily.dev posts relevant to the task you're working on right now, so the user has something useful to read while you work. Use when the user asks for reads, articles, "something to read while you work", or runs /daily-reads.
---

# daily-reads

Give the user a short reading list from daily.dev that matches **the task currently being worked on** in this conversation, so they can read while you work.

## 1. Work out the topic (locally)

Build the topic from what you already know. Don't ask the user.

- The user's latest request and the files you're reading or editing.
- The project stack: `package.json` dependencies, `requirements.txt` / `pyproject.toml`, `go.mod`, `Cargo.toml`, `*.csproj`, `Dockerfile`, and so on.

Reduce it to **1–2 short, generic tech keywords** that daily.dev would have articles on, for example `react server components`, `postgres indexing`, `kubernetes helm`, or `fastapi testing`.

**Privacy rule:** send only these generic keywords. Never send prompt text, file contents, code, repository names, company names, hostnames, or anything else that identifies the user's project.

## 2. Search daily.dev

**With the daily.dev MCP server connected**, call the `getSearchPosts` tool with `q` set to the keywords, `limit` 10 and `time` `year`.

**Otherwise, use the public API.** The token is in the `DAILY_DEV_TOKEN` environment variable (it starts with `dda_`). Only ever send it to `api.daily.dev`.

```bash
curl -s -H "Authorization: Bearer $DAILY_DEV_TOKEN" \
  "https://api.daily.dev/public/v1/search/posts?q=react+server+components&limit=10&time=year"
```

The response is `{ "data": [ { "id", "title", "url", "commentsPermalink", "summary", "tags", "readTime", "numUpvotes", "numComments", "source": { "name" } } ], "pagination": {...} }`.

If no token is set and there is no MCP server, tell the user how to get one: create a token at daily.dev under Settings > API (free accounts can do this), then set `DAILY_DEV_TOKEN`. Then stop.

If the search returns nothing, retry once with only the single most important keyword. The free tier allows about 200 requests a month, so don't make more than 2 requests per run.

## 3. Pick and present

From the results, pick the **3 most relevant** posts. Prefer posts that match the task closely, then higher `numUpvotes`, then recent ones. Skip posts you already showed earlier in this conversation.

Present them briefly and then go straight back to the task:

```
📖 While you wait: daily.dev reads on <keywords>
  • <title> (<readTime> min · ▲<numUpvotes>)
    <commentsPermalink>
    <one sentence on why it's relevant to the current task>
```

Use `commentsPermalink` (the daily.dev post page) as the link, falling back to `url`.

Don't let reading suggestions take over the conversation. They're a side dish, and the user's task always comes first.
