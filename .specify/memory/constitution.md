<!--
 Sync Impact Report
 Version change: N/A → 1.0.0
 Modified principles: N/A (initial adoption)
 Added sections: Core Principles, Quality Gates, Development Workflow, Governance
 Removed sections: None
 Templates requiring updates:
 - .specify/templates/plan-template.md: aligned (no changes)
 - .specify/templates/spec-template.md: aligned (no changes)
 - .specify/templates/tasks-template.md: aligned (no changes)
 - .specify/templates/commands: not present
 Follow-up TODOs: None
 -->
 
 # Speedrail Constitution
 
 ## Core Principles

 ### Code Quality
 
 - MUST compile with TypeScript strict and zero `any` or suppressed errors.
 - MUST pass lint and formatting in CI with zero warnings.
 - No dead code or unused exports/imports.
 - Small, cohesive modules with descriptive names and clear boundaries.
 - Public contracts documented in Markdown, not in code.
 
 Rationale: Ensures maintainability and reduces defect rate.
 
 ### UX Consistency
 
 - Reuse shared components from `components/` and shared design tokens.
 - Follow consistent navigation patterns and gestures across screens.
 - Ensure accessibility: labels, contrast, and touch targets.
 - Avoid visual drift; align with established patterns.
 
 Rationale: Consistency speeds user learning and reduces errors.
 
 ### Performance Budgets
 
 - Cold start to first interactive screen: p95 ≤ 2s on mid‑tier devices.
 - Interaction latency: p95 ≤ 200ms.
 - Smoothness: 60fps scrolling/animations; no long frames (>50ms) in p95.
 - Lists must be virtualized; avoid overfetching; batch network calls; cache results.
 - Map and heavy views must use clustering/virtualization techniques.
 
 Rationale: Performance preserves user trust and battery.
 
 ### Self‑Documenting Code Only (No Comments)
 
 - No inline or block comments allowed (`//`, `/* */`, `#`) in source files.
 - Express intent through naming, small functions, and clear structure.
 - Explanations belong in Markdown docs and commit messages, not code.
 - CI must block any code containing comments; reviewers must remove them.
 
 Rationale: Eliminates drift between code and comments; forces clarity in code.
 
 ### Simplicity & Minimalism
 
 - Prefer the simplest workable solution; avoid abstraction until duplication demands it.
 - Keep dependencies to a minimum; justify any new package in the PR description.
 - Favor convention over configuration.
 
 Rationale: Simpler systems are easier to change and faster.

 ## Quality Gates
 
 - Type safety: `tsc --noEmit` with `strict` passes.
 - Lint/format: ESLint + Prettier pass with zero warnings.
 - Comment scanner: CI step fails on `//`, `/*`, or `#` in source files.
 - Performance: PRs affecting UX include measurements against budgets or rationale.
 - UI: Use shared components and tokens; provide screenshots for visual changes.

 ## Development Workflow
 
 - Small, focused PRs linked to a spec/plan task.
 - Conventional commit messages (e.g., feat, fix, docs, refactor).
 - At least one maintainer approval; merges blocked if any gate fails.
 - PRs must include "User Impact" and "Performance Considerations".

 ## Governance
 
 - This constitution supersedes conflicting practices; PRs must certify compliance.
 - Amendments are made via PR with rationale and migration plan; after approval, bump version and record in the file header.
 - Versioning uses SemVer:
   - MAJOR: Backward-incompatible principle removals or redefinitions.
   - MINOR: New principle/section added or materially expanded guidance.
   - PATCH: Clarifications, wording, typo fixes; no rule changes.
 - Compliance: Maintainers enforce gates; any temporary exemption requires a documented, time-bounded follow-up task in spec/plan.

 **Version**: 1.0.0 | **Ratified**: 2025-11-09 | **Last Amended**: 2025-11-09
