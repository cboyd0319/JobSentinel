# JobSentinel Agent Notes

## Git Remote Safety

- Treat `origin` as the user's fork and `upstream` as the main project unless the user says otherwise.
- Never push directly to `upstream` or any non-fork remote unless the user explicitly asks for that exact action in this thread and then confirms the remote and branch.
- Default publish flow: create a feature branch, push it to the user's fork, and open a pull request back to the main project.
- If the remotes are missing, renamed, or ambiguous, stop and confirm before pushing.
