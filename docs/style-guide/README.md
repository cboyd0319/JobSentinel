# JobSentinel Documentation Style Guide

This guide helps you write clear, friendly documentation for JobSentinel users.

## Who are our readers?

JobSentinel users are **job seekers from all backgrounds**. Many have never used a technical tool
like this before. They're stressed about finding work and don't have time to decode jargon.

**Write for someone who:**

- Has never heard of "APIs" or "webhooks"
- Might not know what a "database" is
- Just wants to find a job, not learn tech terminology
- Is reading on their phone between job applications

## The golden rules

### 1. Use plain language

Write like you're explaining something to a friend.

| Don't write | Write instead |
|-------------|---------------|
| Configure your webhook endpoints | Set up your notifications |
| The scraper aggregates job postings | JobSentinel finds jobs for you |
| Initialize the application | Open the app |
| Utilize the search functionality | Search for jobs |

### 2. Keep sentences short

- Aim for 15-20 words per sentence
- One idea per sentence
- Break up long explanations into steps

### 3. Use contractions

Contractions make writing feel warmer and more human.

| Don't write | Write instead |
|-------------|---------------|
| You will need to | You'll need to |
| It does not support | It doesn't support |
| You cannot use | You can't use |

### 4. Address the reader directly

Use "you" and "your" instead of "the user" or "one."

| Don't write | Write instead |
|-------------|---------------|
| The user should click | Click |
| One must configure | Set up your |
| Users can access | You can access |

### 5. Lead with the action

Start instructions with a verb.

| Don't write | Write instead |
|-------------|---------------|
| The Settings button can be found in... | Click **Settings** in... |
| Configuration is done through... | Go to **Settings** to... |

## Reading level target

**All user documentation should be readable at a 6th-grade level.**

This doesn't mean dumbing things down. It means:

- Short sentences
- Common words
- Clear structure
- No unnecessary jargon

Our linting tools check this automatically.

## Voice and tone

### Be helpful, not robotic

We're helping people find jobs. That's important work. Be warm and supportive.

**Good:** "Great! Your notification is set up. You'll get alerts when new jobs match your search."

**Not great:** "Notification configuration successful. Alerts will be dispatched upon matching criteria."

### Be honest, not hype-y

Don't oversell features or make promises we can't keep.

**Good:** "JobSentinel checks job boards for you, so you don't have to refresh them manually."

**Not great:** "JobSentinel's revolutionary AI-powered engine transforms your job search forever!"

### Be respectful, not condescending

Assume readers are smart people who just aren't familiar with our specific tool.

**Good:** "Here's how to set up notifications."

**Not great:** "It's easy! Just follow these simple steps."

## Formatting standards

### Headings

- Use sentence case (capitalize first word only)
- Keep headings short and scannable
- Use headings to help readers find what they need

### Lists

- Use bullet points for unordered items
- Use numbered lists for steps or sequences
- Keep list items parallel in structure

### Code and UI elements

- Use **bold** for UI elements: Click **Settings**
- Use `code formatting` for things users type
- Use keyboard shortcuts format: Press <kbd>Ctrl</kbd>+<kbd>F</kbd>

### Links

- Use descriptive link text
- Don't use "click here" or "this link"

**Good:** Learn more in the [quick start guide](../user/QUICK_START.md).

**Not great:** Click [here](../user/QUICK_START.md) for more info.

## Terms to avoid (with alternatives)

See [GLOSSARY.md](GLOSSARY.md) for our full list of terms and their plain-language alternatives.

## Tools we use

### Vale

Vale checks your writing for:

- Reading level (aim for grade 6)
- Jargon and technical terms
- Plain language suggestions
- Consistent terminology

Run Vale locally:

```bash
vale docs/
```

### markdownlint

markdownlint checks Markdown formatting:

- Consistent heading styles
- Proper list formatting
- No trailing whitespace
- Correct link syntax

Run markdownlint locally:

```bash
npx markdownlint-cli2 "docs/**/*.md"
```

### Pre-commit hooks

Both tools run automatically when you commit. If there are issues, the commit will show warnings. Fix them before pushing.

## Need help?

- Check the [GLOSSARY.md](GLOSSARY.md) for term definitions
- Read [WRITING-FOR-JOB-SEEKERS.md](WRITING-FOR-JOB-SEEKERS.md) for more tips
- Ask in the team chat if you're unsure about something
