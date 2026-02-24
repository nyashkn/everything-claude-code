# PR Description Template

Use for feature PRs, bug fixes, and refactoring work spanning multiple components.

---

## Feature/Fix: Brief Title

### Summary

1-2 sentence description of what this PR accomplishes and why.

---

### Before

```
User -> [component] existingFunction() -> Result
```

### After

```
User -> [component] newFunction() -> [service] endpoint() -> Result
```

---

### Changes by Component

| Component | Change |
|-----------|--------|
| frontend  | **New/Modified/Removed**: description |
| backend   | **New/Modified/Removed**: description |
| infra     | **New/Modified/Removed**: description |

**Change Types:** New · Modified · Breaking · Deprecated · Removed

---

### Implementation Details

<details>
<summary>Technical details</summary>

**Architecture decisions**
- Why this approach over alternatives

**Key files modified**
- `path/to/file.ts` — description

**New dependencies**
- `package@version` — purpose

</details>

---

### Testing

<details>
<summary>Scenarios covered</summary>

- User can perform X and see Y result
- System handles Z edge case gracefully

</details>

<details>
<summary>How to run tests</summary>

```bash
# Run all tests
make test

# Run specific tests
# [fill in project-specific commands]
```

</details>

---

### Verification

**For frontend changes:**
1. Start the stack
2. Navigate to [page/route]
3. Perform [action]
4. Observe [expected result]

**For backend changes:**
1. Start the stack
2. Verify health: `curl http://localhost:{port}/health`
3. Test endpoint: `curl http://localhost:{port}/api/v1/[endpoint]`
4. Check logs and verify response

<details>
<summary>Demo — screenshots</summary>

**Feature in action:**

![Feature](.claude/pr-artifacts/{branch}/screenshots/feature-main.png)

</details>

<details>
<summary>Demo — video</summary>

[Recording](.claude/pr-artifacts/{branch}/recordings/)

</details>

<details>
<summary>Demo — API samples</summary>

**Endpoint**: `GET /api/v1/example`

**Response (success)**:
```json
{}
```

</details>

---

### Tasks

- [ ] Tests pass
- [ ] Code reviewed
- [ ] Ready to merge

---

### Related

- Closes #issue-number
- Relates to #other-pr
