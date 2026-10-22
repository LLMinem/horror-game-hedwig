# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `LLMinem/horror-game-hedwig`.
Use `gh` from this clone. Publishing to the tracker means creating an issue;
fetching a ticket means reading its body, labels and comments.

Keep plans, progress, measurements and approval records in the owning issue or
PR. Reuse existing issues for related findings; do not create one ticket per old
note. Preserve historical evidence with commit-pinned links rather than mutable
branch links when removing repository reports.

## Operations

- Search before creating: `gh issue list --state all --search "<terms>"`
- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --json number,title,body,labels,comments`
- List: `gh issue list --state open --json number,title,labels`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..." --remove-label "..."`
- Close with evidence: `gh issue close <number> --comment "..."`

## Parent issues and dependencies

Use native GitHub sub-issues for parent/child relationships and native issue
dependencies for blocking edges. These are distinct relationships.

- Find an issue's database ID:
  `gh api repos/{owner}/{repo}/issues/<number> --jq .id`
- Read an issue's blockers:
  `gh api repos/{owner}/{repo}/issues/<number>/dependencies/blocked_by`
- Attach a child:
  `gh api --method POST repos/{owner}/{repo}/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`
- Add a blocker:
  `gh api --method POST repos/{owner}/{repo}/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`

If native relationships are unavailable, use a task list in the parent,
`Part of #<parent>` in the child, and `Blocked by: #<number>` for dependencies.
A ticket is runnable only when all blockers are closed and required external or
human prerequisites are satisfied. `ready-for-agent` means specified, not
unconditionally authorized. The parent specification need not be closed first.

## Wayfinding

Use one map issue labelled `wayfinder:map`, with child tickets labelled
`wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling` or
`wayfinder:task`. Create these labels when that workflow is used.

Choose an unassigned child with no open blockers, in map order.
Claim it with `gh issue edit <number> --add-assignee @me`.
Resolve with an answer comment, close the ticket, then link the decision
from the map.

## Pull requests as a triage surface

**PRs as a request surface: no.**
