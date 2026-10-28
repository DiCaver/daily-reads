# daily.dev marketplace submission draft

Paste these fields into the form at daily.dev/marketplace/submit. The "About" field must not contain links or images, or the form refuses the submission.

## Name

daily-reads

## Short description

Reading for the wait. As your agent starts a task, daily-reads shows 3 short daily.dev posts about what you just asked for, then gets on with the work. It works from your request, before any code exists. Claude Code users can make it automatic on every prompt.

## About

### Reading for the wait, not a research step

You ask your agent for something that will take a few minutes, like "add caching to the FastAPI endpoints". Before it starts, it shows you three short posts about that goal, then begins the work in the same turn:

```
📖 While you wait: daily.dev reads on <keywords>
  • <post title> (<reading time> min · ▲<upvotes>)
    <daily.dev post link>
    <one sentence on why it fits this task>
```

The reads fill the wait. They never delay the task or take over the conversation.

### What makes it different

- **Starts from your request, not your code.** It reads the task you just gave, so it's useful at the very beginning, before there is a diff, and it works in any folder, git repository or not.
- **Fits the time you have.** It prefers posts you can finish in 10 minutes or less, while the agent works.
- **Light on the free tier.** One search per run, two at most, so it stays well inside the free API allowance even if you use it every day.
- **Can be automatic.** In Claude Code, the companion plugin in the linked repository adds a prompt hook that shows matching posts on every prompt, with no command to run. Each topic is shown once per session and posts never repeat. The hook caches searches and has a monthly cap.

### Privacy first

The topic is worked out locally. Only 1 or 2 generic keywords, such as "fastapi caching", are sent to the daily.dev search API. Your prompt, code, file names and repository details never leave your machine.

### Setup

Connect the daily.dev MCP server, or create a personal access token in daily.dev settings and set it as DAILY_DEV_TOKEN. Free accounts can create one.

## SKILL.md

Paste the contents of `skills/daily-reads/SKILL.md`.

## Link

https://github.com/DiCaver/daily-reads
