# ORPHETUNE

## MASTER ENGINEERING SPECIFICATION, CODEBASE HANDOFF, AUDIT, STABILIZATION, REFINEMENT AND PRODUCTION READINESS

---

# SECTION 1 — ROLE AND RESPONSIBILITIES

You are assuming responsibility for an existing desktop music application named Orphetune, previously developed by an AI coding agent called Antigravity.

Act simultaneously as a:

- Principal software engineer
- Senior Rust engineer
- Tauri v2 specialist
- Senior React and TypeScript engineer
- Desktop application architect
- Audio systems engineer
- Database engineer
- UI/UX architect
- Application security engineer
- Performance optimization specialist
- Quality assurance engineer
- Release engineer
- Independent technical reviewer

You have full responsibility for critically evaluating the existing implementation, identifying weaknesses, correcting architectural and functional problems, refining the product, and continuing development according to this specification.

Your responsibility is not merely to generate code that compiles.

Your responsibility is to produce software that is genuinely functional, reliable, visually consistent, secure, efficient, maintainable, and suitable for everyday use.

Do not assume that Antigravity implemented anything correctly simply because it claimed to have completed a development phase.

Verify everything independently.

Do not blindly agree with previous architectural decisions, and do not introduce unnecessary complexity to demonstrate technical sophistication.

Think critically. Work methodically. Verify your conclusions.

---

# SECTION 2 — PROJECT INFORMATION

**Application name:** Orphetune

**Repository:** https://github.com/Hozaifah47/Orphetune

**Development model:** Local-first desktop application.

**Primary development platform:** Ubuntu Linux.

**Secondary target platforms:** Windows and macOS.

**Primary implementation agent before this handoff:** Antigravity.

**Your role:** Independent auditor, stabilizer, refinement engineer, and continuation agent.

## 2.1 Product Vision

Orphetune is a local-first desktop music player inspired by the usability of Spotify, the independence of traditional offline music players, and the visual language of futuristic industrial terminals.

It must establish its own recognizable identity.

It should feel like a dedicated desktop music application rather than:

- A generic React website.
- A browser dashboard inside a desktop window.
- An AI-generated SaaS interface.
- A gaming dashboard.
- A Spotify clone with different colors.
- A fictional hacker interface.
- An excessively decorated cyberpunk application.

The application should appeal to users who value music ownership, offline functionality, privacy, performance, precise controls, and intentional visual design.

## 2.2 Local-First Definition

The following must work completely offline:

- Music library.
- Local file scanning.
- Music playback.
- Playback queue.
- Equalizer.
- Playlists.
- Local search.
- Previously cached album artwork.
- Previously cached lyrics.
- Application settings.
- Playback state restoration, where implemented.

Network-dependent functionality includes:

- Online music discovery.
- Authorized music downloading.
- Online album artwork retrieval.
- Lyrics retrieval.

Network failures must never prevent the core application from functioning.

## 2.3 Priority Hierarchy

When making engineering decisions, prioritize:

1. Security and prevention of data loss.
2. Core functionality.
3. Reliability.
4. Performance.
5. Usability and accessibility.
6. Visual consistency.
7. Maintainability.
8. Additional features.

Do not sacrifice reliability or performance for decorative functionality.

## 2.4 Target Hardware

Optimize primarily for hardware comparable to:

- Intel Core i5-1135G7.
- Intel Iris Xe integrated graphics.
- 4–8 GB RAM.
- Consumer NVMe SSD.
- Ubuntu 24.04 LTS.
- Standard 1366 × 768 laptop display.

The application must remain responsive and usable on modest hardware.

Avoid assuming that every user has a powerful desktop computer, dedicated GPU, or large amounts of RAM.

---

# SECTION 3 — SOURCE OF TRUTH AND OPERATING RULES

## 3.1 Specification Authority

This document consolidates the original Orphetune build specification and subsequent engineering refinement requirements.

Use it as the authoritative specification.

When the existing implementation conflicts with this specification:

1. Identify the conflict.
2. Determine whether the existing implementation is demonstrably better.
3. Preserve the existing implementation only if it satisfies the underlying requirement.
4. Document the reasoning in `docs/STATUS.md`.

Do not change the fundamental technology stack, visual identity, or local-first architecture without explicit approval.

Where this specification distinguishes mandatory requirements from optional enhancements, mandatory requirements take precedence.

Do not interpret optional suggestions as authorization to expand the project indefinitely.

## 3.2 Existing Codebase Protection

Do not rewrite the application from scratch.

Do not replace working components unnecessarily.

Do not reinitialize an existing repository.

Do not generate a competing implementation alongside the existing implementation.

Do not perform a wholesale architectural refactor when a targeted fix would solve the problem.

Before modifying any file:

- Read the current version.
- Understand its dependencies.
- Understand its purpose.
- Identify the exact necessary changes.
- Consider potential regressions.

Keep changes small, deliberate, and reviewable.

Never delete user data, music files, playlists, databases, or application settings.

Never delete existing source files without approval when deletion is not clearly part of an authorized replacement.

## 3.3 Git Branch Protection

All Astra development must take place on:

`astra/stabilize`

Before creating or switching branches:

- Inspect the working tree.
- Inspect the current branch.
- Inspect local and remote branches.
- Inspect recent commits.
- Identify uncommitted changes.
- Verify that existing user changes will remain protected.

Create `astra/stabilize` from the current HEAD if it does not already exist.

If the branch already exists, inspect its history and continue safely when appropriate.

Do not overwrite an existing branch.

If switching branches would conflict with uncommitted user changes, stop rather than discarding them.

Never:

- Push directly to main.
- Force-push.
- Rewrite shared history.
- Run `git reset --hard`.
- Run destructive `git clean` operations.
- Automatically discard uncommitted changes.
- Automatically stage unrelated user changes.
- Merge into main without explicit approval.
- Commit credentials, secrets, or personal data.

All permitted pushes must target `astra/stabilize`.

## 3.4 Commit Discipline

Use small, atomic commits containing one logical change.

Commit formats:

- `fix(scope): description`
- `feat(scope): description`
- `refactor(scope): description`
- `perf(scope): description`
- `test(scope): description`
- `docs: description`
- `chore: description`

The original five development phase completion messages are exceptions to this convention and must retain their exact specified wording.

Use conventional commits for intermediate fixes. Use the original phase completion message for the final substantive commit completing that phase.

Before committing:

1. Review the diff.
2. Verify that unrelated files are excluded.
3. Run applicable mandatory checks.
4. Confirm that the change does not introduce regressions.
5. Update the relevant acceptance criteria in `docs/STATUS.md`.
6. Commit.
7. Push to `astra/stabilize`, if authorized and available.

Do not create empty commits solely to satisfy a commit-message requirement.

### Baseline Failure Exception

The initial documentation-only audit commits may proceed even if the inherited codebase already fails its build checks.

This exception exists because the audit must be documented before source code modifications begin.

Record every inherited failure.

During subsequent stabilization, a narrowly scoped repair commit may proceed if:

- It introduces no new failures.
- It resolves a documented inherited failure or makes verified progress toward resolving it.
- Remaining failures are unrelated or explicitly documented.
- The checks relevant to the modified subsystem pass.

This is not permission to declare a broken build stable.

All mandatory checks must pass before declaring a development phase fully verified.

## 3.5 Evidence-Based Engineering

Never claim that functionality works solely because:

- A file exists.
- A component renders.
- A function is present.
- The code appears plausible.
- A previous agent reported success.
- TypeScript compiles.
- Rust compiles.

Distinguish the following evidence types:

- Static source inspection.
- Unit testing.
- Integration testing.
- Actual GUI testing.
- Packaged application testing.
- Network-dependent testing.
- Unverified assumptions.

Never fabricate:

- Terminal output.
- Test results.
- Screenshots.
- Performance measurements.
- Git commits.
- Successful pushes.
- Application behavior.
- Security audit results.

If you cannot execute a verification step, mark it UNVERIFIED and provide exact manual verification instructions.

## 3.6 Dependency Restrictions

Do not add dependencies outside the specified stack unless there is a concrete engineering justification.

Before adding a dependency:

- Check whether the existing stack can solve the problem.
- Evaluate package size.
- Evaluate maintenance status.
- Evaluate licensing.
- Evaluate security implications.
- Evaluate cross-platform compatibility.
- Evaluate runtime performance.

Document the justification in the relevant commit and architecture notes.

Do not blindly upgrade all dependencies.

## 3.7 Decision-Making

For small implementation ambiguities, choose the safest reasonable approach, document the assumption, and continue.

Stop and request approval when a decision involves:

- Potential data loss.
- Destructive database migration.
- Fundamental architecture replacement.
- Technology stack changes.
- Major visual identity changes.
- Broad security permission changes.
- Large unplanned feature expansion.
- Irreversible repository operations.

Do not repeatedly ask questions that can be resolved safely through source inspection.

---

# SECTION 4 — EXECUTION WORKFLOW

Follow these stages in order.

Do not begin source code modifications before completing the initial audit documentation.

## STAGE 0 — Establish Repository Context and Persist the Specification

First, inspect the repository sufficiently to establish:

- Current working directory.
- Git repository status.
- Current branch.
- Current HEAD.
- Remote configuration.
- Existing uncommitted changes.
- Whether `astra/stabilize` already exists.

Safely establish the development branch.

Create or update:

`docs/SPEC.md`

Save this complete consolidated master specification in that file.

Preserve existing useful project documentation. Do not silently overwrite an existing specification that contains additional user-approved requirements; reconcile and document differences.

Commit:

`docs: add Orphetune spec`

Push to the development branch when available and authorized.

Re-read `docs/SPEC.md` at the beginning of every subsequent stage.

## STAGE 1 — Read-Only Orientation

Perform a comprehensive repository inspection before changing source code.

Run appropriate equivalents of:

```bash
git status --short
git log --oneline --decorate -n 50
git branch -a
git remote -v
git ls-files
```

Inspect the repository tree, excluding:

- `.git`
- `node_modules`
- `dist`
- `target`
- Generated caches
- Downloaded sidecar binaries

Read:

- README.md
- package.json
- Package lockfiles
- TypeScript configuration
- Vite configuration
- Tailwind configuration
- PostCSS configuration
- index.html
- Application entry points
- All relevant frontend source files
- All relevant Rust source files
- Cargo.toml
- Cargo.lock
- Tauri configuration
- Tauri capability files
- Database migrations
- Existing tests
- Existing scripts
- Existing GitHub workflows
- Existing documentation

Identify the actual development environment:

- Operating system.
- Host architecture.
- Rust toolchain.
- Node.js version.
- Package manager.
- Tauri CLI version.
- Webview environment.
- GUI display availability.
- Sidecar availability.
- Native build dependencies.

Run all baseline checks that the environment supports.

Record their actual results.

Classify each of the original development phases as:

- COMPLETE — Implementation exists and satisfies its mandatory criteria, with sufficient verification.
- PARTIAL — Some functionality exists but mandatory criteria remain incomplete or broken.
- MISSING — No meaningful implementation exists.
- UNVERIFIED — Implementation may be present, but evidence is insufficient to establish functionality.

Do not classify phases based solely on Git commit messages.

## STAGE 2 — Comprehensive Audit

Create:

`docs/STATUS.md`

For every applicable acceptance criterion in this specification, record:

| ID | Status | Severity | Evidence | Issue | Proposed Fix |
|---|---|---|---|---|---|

Allowed statuses:

- PASS
- FAIL
- PARTIAL
- UNVERIFIED
- NOT APPLICABLE, with justification

For each confirmed problem, identify:

- Affected files.
- Exact source locations.
- Root cause.
- User impact.
- Security implications.
- Performance implications.
- Proposed solution.
- Estimated complexity.
- Verification method.
- Relevant dependencies.
- Whether the problem is confirmed or suspected.

Use the following severity levels:

### P0 — Critical

- Build failures.
- TypeScript failures.
- Rust compilation failures.
- Data loss.
- Database corruption.
- Critical security vulnerabilities.
- Fundamental application crashes.
- Completely broken core playback.

### P1 — Major

- Functional failures in implemented development phases.
- Incorrect playback behavior.
- Broken scanning.
- Broken playlists.
- Failed persistence.
- Unsafe sidecar handling.
- Major architectural inconsistencies.
- Significant accessibility failures preventing core functionality.

### P2 — Design and Reliability

- Violations of mandatory design rules.
- Incorrect UI behavior.
- Significant usability problems.
- Error handling deficiencies.
- Moderate reliability problems.
- Performance defects that noticeably affect normal use.

### P3 — Refinement

- Noncritical performance optimization.
- Minor accessibility improvements.
- Code quality improvements.
- Missing noncritical tests.
- Visual polish.
- Maintainability improvements.

### P4 — Optional Enhancements

- Additional features.
- Experimental functionality.
- Future architectural improvements.
- Nonessential customization.

Commit the initial audit:

`docs: add codebase audit and acceptance status`

Do not modify application source code until this audit has been saved and committed, or, if Git access prevents committing, saved locally with the blocker explicitly reported.

## STAGE 3 — Stabilization

Work through confirmed issues in priority order:

1. P0.
2. P1.
3. Mandatory P2.
4. Relevant P3 where reasonable.

Do not treat missing functionality from future, unimplemented development phases as a defect in an earlier phase unless it breaks already implemented behavior.

Do not prematurely implement Phase 5 functionality while repairing Phase 2.

For every fix:

- Re-read affected source files.
- Identify the smallest correct solution.
- Implement the fix.
- Add or update relevant tests.
- Run verification.
- Review the diff.
- Update `docs/STATUS.md`.
- Commit.
- Push to the development branch where possible.

Continue until critical stabilization requirements are satisfied or a genuine blocker requires approval.

## STAGE 4 — Continue the First Unfinished Development Phase

After stabilization:

1. Identify the earliest PARTIAL or MISSING original development phase.
2. Read its complete acceptance criteria.
3. Determine which requirements remain unfinished.
4. Implement the missing requirements.
5. Preserve working functionality.
6. Run all required checks.
7. Update the acceptance criteria.
8. Complete the phase using its specified commit message.
9. Push to `astra/stabilize`.
10. STOP.

Do not begin another original development phase without explicit approval.

If all five original phases are already implemented, verify them and produce a prioritized production-refinement roadmap.

Do not begin unrestricted feature expansion.

## STAGE 5 — Report

Whenever work stops, provide:

- Executive summary.
- Development phase status table.
- Issues discovered.
- Issues resolved.
- Files created and modified.
- Architectural decisions.
- Security improvements.
- Performance improvements.
- Visual refinements.
- Tests executed and actual results.
- Commits made.
- Branch and push status.
- Remaining problems.
- Unverified functionality.
- Manual testing instructions.
- Assumptions.
- Environment limitations.
- Risks.
- Recommended next action.
- Exact commands required to run the application.

---

# SECTION 5 — PINNED TECHNOLOGY STACK

## G1 — Technology Requirements

Frontend:

- React 18.
- Vite.
- TypeScript in strict mode.
- Tailwind CSS v3.4.
- Zustand.
- `@tanstack/react-virtual`.
- Vitest.
- Lucide icons.
- Self-hosted JetBrains Mono through `@fontsource`.
- Self-hosted IBM Plex Sans through `@fontsource`.

Desktop:

- Tauri v2.
- Rust.

Rust dependencies:

- walkdir.
- lofty.
- reqwest with rustls.
- serde.
- tokio.

Tauri plugins:

- dialog.
- shell, restricted to required sidecar functionality.
- sql with SQLite.

Audio:

- Web Audio API.
- HTMLAudioElement.
- MediaElementAudioSourceNode.
- BiquadFilterNode.
- GainNode.

External integrations:

- LRCLIB.
- iTunes Search API.
- MusicBrainz.
- Cover Art Archive.
- yt-dlp.
- FFmpeg.

Motion:

- CSS transitions of 150 ms or less.
- Framer Motion permitted only for modal enter and exit transitions if already necessary.
- No heavy animation frameworks for ordinary UI interactions.

Do not use:

- Electron.
- Next.js.
- Remote backend services for core functionality.
- Cloud databases.
- `music-metadata`.
- Tailwind CSS v4.
- Remote font CDNs.
- Unnecessary component libraries that violate the visual design.

## G2 — Mandatory Verification Commands

Use the project's actual scripts and package manager.

At minimum, verify appropriate equivalents of:

```bash
npx tsc --noEmit
npm run build
npm test
```

Ensure the test command runs noninteractively. If necessary, use the configured equivalent of:

```bash
npx vitest run
```

For Rust:

```bash
cd src-tauri
cargo fmt --check
cargo check
cargo test
cargo clippy --all-targets
```

Aim for:

```bash
cargo clippy --all-targets -- -D warnings
```

Do not suppress meaningful warnings merely to pass the check.

Fix warnings in modified code and record unrelated inherited warnings.

When the environment supports a desktop build:

```bash
npm run tauri build
```

When a graphical display is available:

```bash
npm run tauri dev
```

Inspect actual package scripts before assuming these commands exist.

Do not claim that a successful Vite build proves that the native application works.

## G3 — Security

Use least-privilege Tauri v2 capabilities, narrow asset protocol scopes, safe Rust IPC commands, and a restrictive Content Security Policy.

No remote scripts.

No unsafe-eval.

No general-purpose shell access exposed to the frontend.

## G4 — Repository Hygiene

Ensure `.gitignore` covers at least:

```text
node_modules/
dist/
src-tauri/target/
src-tauri/binaries/*
.cache/
```

Also exclude:

- Personal SQLite database files.
- Local music files.
- Downloaded media.
- Private configuration.
- Credentials.
- Cached album artwork.
- Temporary download files.

Keep necessary directory placeholders and scripts tracked where appropriate.

Sidecar executables must never be committed.

Maintain reproducible dependency lockfiles.

## G5 — Offline Behavior

Verify that core functionality works with networking disabled.

Network failures must produce meaningful logs without crashing or disabling unrelated functionality.

## G6 — Error Handling

No unhandled promise rejections.

Rust commands should return structured or readable errors through `Result`.

Frontend errors should be surfaced appropriately.

Distinguish recoverable errors from unrecoverable failures.

## G7 — Resource Cleanup

Release:

- DOM event listeners.
- Timers.
- Animation frame handles.
- Tauri event subscriptions.
- Temporary object URLs.
- Cancelled asynchronous requests.
- Finished child processes.
- Unneeded resources.

Long-lived application resources such as the singleton audio engine must be managed according to their intended lifecycle rather than recreated during component rendering.

## G8 — Database Ownership

SQLite access is performed through `tauri-plugin-sql`.

The frontend application owns runtime database queries and mutations.

Rust defines and registers migrations through the plugin.

Rust scanning, metadata, lyrics, and sidecar subsystems return data through commands, events, and Channels.

Do not introduce a competing Rust database connection or independent runtime database writer.

The plugin's internal database implementation and migration execution are expected exceptions to the prohibition on direct Rust database access.

---

# SECTION 6 — ARCHITECTURE REQUIREMENTS

## A1 — Project Structure

Preserve an appropriate modular structure comparable to:

```text
Orphetune/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── hud/
│   │   ├── library/
│   │   ├── player/
│   │   ├── eq/
│   │   ├── search/
│   │   └── lyrics/
│   ├── hooks/
│   ├── stores/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── styles/
│   └── App.tsx
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   ├── scanner/
│   │   ├── metadata/
│   │   ├── lyrics/
│   │   └── sidecar/
│   ├── capabilities/
│   ├── binaries/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── scripts/
├── docs/
└── README.md
```

This structure is a guideline, not authorization to move working files unnecessarily.

Do not introduce unnecessary directory layers.

## A2 — Separation of Responsibilities

App.tsx should primarily compose components.

Avoid placing all application logic in:

- App.tsx.
- One global Zustand store.
- One oversized Rust module.
- One monolithic service.

Separate:

- Visual components.
- Playback state.
- Library state.
- Navigation state.
- Persistent settings.
- Database access.
- Network operations.
- Audio processing.
- Temporary operation state.

## A3 — Single Source of Truth

Define an authoritative source for:

- Track metadata.
- Playback queue.
- Current track.
- Actual playback position.
- Playback status.
- Equalizer settings.
- Volume.
- Playlists.
- Download jobs.
- Lyrics cache.
- Application preferences.

Prevent contradictory state between the audio element, Zustand, SQLite, and React components.

Derive state where possible instead of storing redundant copies.

## A4 — Code Quality

Audit for:

- Circular dependencies.
- Dead code.
- Duplicate functionality.
- Unused imports.
- Unsafe TypeScript assertions.
- Incorrect asynchronous code.
- Race conditions.
- Unnecessary abstractions.
- Fragile state synchronization.
- Excessive component rerendering.
- Improper resource cleanup.
- Incorrect OS-specific assumptions.

Do not refactor purely for aesthetic code preferences.

---

# SECTION 7 — MANDATORY DESIGN SYSTEM

## D1 — Visual Direction

The design language is:

**Cyberpunk industrial terminal HUD.**

The intended impression is:

- Precise.
- Restrained.
- Technical.
- Industrial.
- Dark.
- Minimal.
- Deliberately geometric.
- Mature rather than theatrical.

If `image_da049f.jpg` exists and is accessible, inspect it as the visual reference.

If it is unavailable, use the written specification.

Where visual reference imagery conflicts with mandatory written design requirements, the written requirements take precedence.

Preserve visual quality through composition, alignment, typography, spacing, scale, and contrast.

## D2 — Color Tokens

Define the following exact tokens in the Tailwind configuration.

| Token | Value | Purpose |
|---|---|---|
| Background start | #080202 | Primary background |
| Background end | #110505 | Secondary gradient endpoint |
| Crimson | #D32F2F | Fills and active controls |
| Bright red | #FF3333 | Red text and thin strokes |
| White | #FFFFFF | Primary text |
| Muted text | #B07A7A | Secondary readable text |
| Inactive | #8A5A5A | Non-text decorative elements |

The dark maroon background gradient is the only visible decorative color gradient.

Functional masks or gradients used solely to construct corner brackets are permitted.

Do not use crimson for small text.

Do not use `#8A5A5A` for readable text.

Use white for most information.

Red should communicate activity, selection, interaction, emphasis, or meaningful status.

Calculate actual contrast ratios against the relevant backgrounds.

Do not rely on approximate ratios inherited from the previous prompt.

Minimum requirements:

- Normal text: 4.5:1.
- Applicable UI component boundaries and graphical indicators: 3:1.
- Focus indicators must be clearly distinguishable.

Produce a contrast table during the audit or Phase 1 verification.

Check text displayed on crimson-filled controls as well as text against the main background.

## D3 — Geometry

Absolute requirements:

- Zero border radius.
- No pill-shaped controls.
- No rounded cards.
- No decorative box shadows.
- No glow.
- No neon bloom.
- No glassmorphism.
- No backdrop blur.
- No decorative grid lines.

Set Tailwind border-radius behavior appropriately.

Inspect native form controls and range sliders for unintended rounding.

Functional focus indicators are permitted, preferably implemented using outlines.

## D4 — Corner Brackets

Implement:

- `hud-corners`
- `hud-corners-active`

Use CSS pseudo-elements and variables controlling corner size, thickness, and color.

Corner brackets are reserved for:

- Album covers.
- Player HUD.
- Focused panels.
- Modal windows.

Do not place them around every component.

Separate ordinary sections using spacing, typography, alignment, and subtle tonal differences.

## D5 — Typography

JetBrains Mono is permitted for:

- Track names and technical track paths.
- Playback timers.
- Technical logs.
- Text inputs.

IBM Plex Sans is used for:

- Navigation.
- Headings.
- Buttons.
- Labels.
- Ordinary interface text.
- Lyrics.
- Dialogs.

Track path format:

`artist/album/title`

Use middle truncation when necessary so meaningful identifying information remains visible.

Display the complete information through an accessible tooltip or equivalent mechanism where appropriate.

HUD playback timer:

`00 : 00 : 00 : 00`

Representing:

Hours : Minutes : Seconds : Centiseconds

Ordinary track durations:

`M:SS`

Example:

`3:40`

Update the HUD timer through requestAnimationFrame without forcing unrelated components to rerender.

## D6 — Volume Dial

Use an eight-point compass-rose SVG volume dial.

It must support:

- Pointer dragging.
- Mouse wheel adjustment.
- Arrow-key adjustment.
- Keyboard focus.
- Appropriate minimum and maximum values.
- Clamping.
- Visible interaction feedback.

Accessibility attributes:

- `role="slider"`
- `aria-valuemin`
- `aria-valuemax`
- `aria-valuenow`
- Accessible name.
- Appropriate value text where useful.

The geometry must remain sharp and industrial.

## D7 — Icons and Missing Artwork

Use Lucide icons.

The custom compass dial and functional HUD geometry are exceptions to the Lucide-only icon requirement.

No emoji icons.

No decorative icon clutter.

Missing cover artwork must appear as an empty bracketed square with one Lucide music-note icon.

Do not invent fake album covers or decorative placeholder artwork.

## D8 — Terminal Logging

Implement `TerminalLog`.

Required level tags:

- `[INFO]`
- `[FETCH]`
- `[WARN]`
- `[ERR]`

Requirements:

- `role="log"`.
- Appropriate polite live-region behavior.
- Maximum six visible log lines.
- Bounded log history.
- Actual events only.
- Meaningful status messages.
- No fabricated progress.
- No fake timed loading sequences.

Every visible log line must correspond to a real event, operation, or error.

Logs must not continuously overwhelm screen readers.

Technical details may be retained in diagnostic history while user-facing messages remain concise and actionable.

Progress bars are permitted only for measurable progress.

When progress cannot be measured, show the actual operation state instead of inventing a percentage.

## D9 — Motion

Use transitions of 150 ms or less for ordinary UI interactions.

Motion must communicate an actual state change.

No:

- Spinners.
- Decorative pulsing.
- Bouncing icons.
- Fake loading animations.
- Staggered entrance animations.
- Large animated backgrounds.
- Unnecessary continuous motion.

Respect `prefers-reduced-motion`.

Disable nonessential transitions and smooth scrolling when reduced motion is requested.

## D10 — Accessibility

Mandatory:

- Visible 2 px focus outline using #FF3333.
- 2 px focus offset.
- Complete keyboard operation for core functionality.
- Accessible names for icon-only controls.
- Correct semantic HTML.
- Correct disabled states.
- Modal focus traps.
- Escape to close modals.
- Focus restoration.
- Meaningful interaction states.
- No exclusive reliance on color to communicate status.

Ensure custom sliders are keyboard accessible.

Do not add `aria-live` behavior to rapidly updating playback timestamps.

## D11 — Complete Anti-Slop Rules

The following are prohibited:

1. Colored stripes on cards.
2. Borders around every content block.
3. Colored italic accent text.
4. Uppercase labels above ordinary headings.
5. Purposeless badges and status dots.
6. Monospace typography for ordinary prose.
7. Writing numerical readouts as words instead of numerals.
8. Long noun-stacked titles.
9. Emoji-based interface icons.
10. Decorative placeholders.
11. Overstuffed screens.
12. Visual metaphors requiring unnecessary explanatory labels.
13. Text-based demonstration panels.
14. Glassmorphism.
15. Rounded geometry and decorative drop shadows.
16. Low-contrast text.
17. Meaningless motion.
18. Heavy or staggered entrance animations.
19. Fabricated counts or social proof.
20. Purple gradients.
21. Glow, neon bloom, or decorative grid lines.
22. Generic SaaS dashboard layouts.
23. Repetitive card-based layouts.
24. Excessive crimson usage.
25. Oversized welcome messages.
26. Unnecessary onboarding screens.
27. Excessive explanatory interface copy.
28. Unnecessary badges, decorative containers, and labels.
29. Oversized typography that wastes desktop space.
30. Visual effects that compromise readability or performance.

Every interface element must have an identifiable purpose.

---

# SECTION 8 — DESKTOP UI AND INTERACTION DESIGN

## U1 — Application Layout

Preserve a clear desktop application structure consisting of:

### Left Sidebar

Mandatory navigation:

- Library.
- Search.
- Playlists.

Provide playlist navigation and creation.

Settings access and additional organization views may be introduced during the appropriate refinement phase.

Keep the sidebar visually restrained.

### Main Content Area

Displays the selected application view.

Use the correct content presentation:

- Virtualized cover grid for the library.
- List rows for playlists.
- List rows for queue entries.
- List rows for search results.
- Appropriate lyrics view.

### Persistent Player HUD

The player remains accessible while switching application views.

Include the required playback controls:

- Album artwork.
- Current track information.
- Previous.
- Play/pause.
- Next.
- Shuffle.
- Repeat.
- Scrubber.
- Playback position.
- Track duration.
- Compass volume control.
- Equalizer access.

Queue and lyrics access must be discoverable when their corresponding functionality is implemented.

Evaluate an optional collapsible right-side queue or lyrics panel.

Do not permanently display every possible control.

## U2 — Desktop Adaptability

Test at:

- 800 × 600.
- 1024 × 768.
- 1280 × 720.
- 1366 × 768.
- 1920 × 1080.
- Maximized window.
- Restored window.
- High-DPI scaling.

Verify:

- Text truncation.
- Sidebar behavior.
- Minimum window dimensions.
- Modal positioning.
- Scroll behavior.
- Virtualization behavior.
- Player visibility.
- Horizontal overflow.
- Keyboard accessibility.

If a specific resolution is below the practical minimum size, document and enforce a reasonable minimum rather than claiming unsupported usability.

Do not prioritize mobile layouts over desktop usability.

## U3 — Interaction Refinement

Evaluate and implement appropriate interactions within authorized refinement scope:

- Double-click to play.
- Right-click context menus.
- Add to queue.
- Play next.
- Add to playlist.
- Remove from playlist.
- Reveal file in file manager.
- Copy track information.
- Multi-selection.
- Drag-and-drop queue reordering.
- Drag-and-drop playlist reordering.
- Keyboard alternatives.

Do not expose unrestricted filesystem or shell commands to implement file-manager actions.

Validate authorized paths.

## U4 — Keyboard Shortcuts

Evaluate the following shortcut scheme:

| Shortcut | Action |
|---|---|
| Space | Play/pause |
| Left/Right | Seek |
| Up/Down | Volume |
| Ctrl+F | Search |
| Ctrl+L | Library |
| Ctrl+E | Equalizer |
| Ctrl+Shift+L | Lyrics |
| Ctrl+M | Mute |
| Esc | Close active modal or panel |

Adapt appropriately for macOS.

Avoid overriding:

- Text editing.
- Text selection.
- Slider-native keyboard behavior.
- Accessibility controls.
- Existing platform conventions.

Shortcuts must be context-aware.

---

# SECTION 9 — ORIGINAL DEVELOPMENT PHASE 1

## SCAFFOLD, THEME AND APPLICATION SHELL

### P1.1 — Application Setup

Verify that the existing Tauri v2, React 18, Vite, and TypeScript strict project is correctly configured.

If initialization is genuinely missing, create the necessary project structure.

Do not reinitialize an already functioning project.

### P1.2 — Design Configuration

Verify:

- Tailwind v3.4 configuration.
- Exact design tokens.
- Zero-radius geometry.
- Self-hosted fonts.
- Background gradient.
- HUD bracket utilities.
- Focus indicators.
- Reduced-motion rules.

### P1.3 — Core Components

Verify or implement:

- Sidebar.
- MainView.
- PlayerHud.
- TerminalLog.

Use Zustand for appropriate navigation state.

App.tsx should compose components rather than own application business logic.

### P1.4 — Application Launch

Verify:

- TypeScript compilation.
- Vite production build.
- Rust compilation.
- Tauri desktop launch when possible.

Do not claim GUI verification if no display is available.

### P1.5 — Visual Acceptance

Verify the complete mandatory design system.

Produce the actual contrast table.

Inspect available screenshots or the running application when supported.

### Phase 1 Commit Message

`Initialize Tauri project, configure Tailwind maroon/crimson theme, and scaffold HUD layout.`

---

# SECTION 10 — ORIGINAL DEVELOPMENT PHASE 2

## LIBRARY, FILE SCANNING, METADATA, DATABASE AND PLAYLISTS

### P2.1 — SQLite Database

Maintain migrations for:

#### tracks

- id
- path, UNIQUE
- mtime
- size
- title
- artist
- album
- track_no
- duration_ms
- format
- cover_path

#### playlists

Appropriate unique identifier, name, and relevant metadata.

#### playlist_tracks

- Playlist reference.
- Track reference.
- Position.

#### lyrics_cache

- track_id
- synced
- plain
- instrumental
- fetched_at

#### settings

- key
- value

Create appropriate indexes on:

- Artist.
- Album.
- Title.

Verify:

- Foreign key enforcement.
- Correct deletion behavior.
- Unique constraints.
- Deterministic playlist ordering.
- Migration correctness.
- Transaction handling.

Additional metadata fields may be introduced through safe backward-compatible migrations when justified.

Never perform destructive migrations without approval.

### P2.2 — Rust File Scanner

Implement or verify:

```text
scan_library(dir, known_files)
scan_file(path)
```

Requirements:

- Folder selected through the Tauri dialog plugin.
- Authorized library directory validation.
- Recursive walkdir traversal.
- Blocking filesystem operations executed through `spawn_blocking` or an appropriate bounded blocking mechanism.
- Case-insensitive file extension matching.
- Supported formats: MP3, FLAC, WAV.
- Incremental scanning using path, modification time, and file size.
- Batches of approximately 50 tracks.
- Tauri Channel for streaming results.
- Real scan logs.
- Unreadable-file warnings.
- Single-file ingestion.

Do not block the frontend or async runtime.

### P2.3 — Scanner Reliability

Handle:

- Empty directories.
- Large music libraries.
- Deep nesting.
- Permission denial.
- Corrupted audio.
- Missing metadata.
- Uppercase extensions.
- Unicode filenames.
- Non-UTF-8 filesystem paths.
- Windows path differences.
- Extremely long paths.
- Symlink loops.
- Files changing during scanning.
- Files disappearing during scanning.
- Interrupted scans.
- Concurrent scan attempts.
- Unavailable external drives.

Do not follow symbolic links outside authorized library scope.

Do not silently convert paths in ways that make distinct files indistinguishable.

Where a filesystem path cannot be safely represented, report the limitation instead of corrupting the path.

Implement safe scan cancellation.

Use bounded concurrency.

Prevent duplicate scan operations from corrupting database state.

Incremental scanning should correctly identify:

- Added files.
- Modified files.
- Unchanged files.
- Missing files.

Never remove large sets of database records merely because a scan was interrupted or a drive was temporarily unavailable.

Only reconcile missing files after a successful authoritative scan or another reliable confirmation mechanism.

### P2.4 — Metadata Extraction

Use lofty in Rust.

Support:

- ID3v2.
- Vorbis comments.
- RIFF INFO.
- Embedded artwork.
- Duration.
- Title.
- Artist.
- Album.
- Track number.

Use filename as a fallback title.

Handle missing values consistently.

Never display literal null or undefined to the user.

Evaluate additional metadata support:

- Album artist.
- Disc number.
- Genre.
- Release year.
- Technical audio information.

Keep these additions backward-compatible.

Do not modify the original audio files without explicit authorization.

### P2.5 — Album Artwork Pipeline

Required fallback order:

1. Embedded artwork.
2. Local `folder.jpg`.
3. Local `cover.jpg`.
4. iTunes Search API.
5. MusicBrainz and Cover Art Archive.
6. Bracketed music-note placeholder.

Online lookups must occur asynchronously after local metadata ingestion.

Network requests must never block basic library scanning.

MusicBrainz:

- Maximum one request per second.
- Descriptive User-Agent.
- Appropriate retry and rate-limit handling.

Cache artwork under:

`app_cache_dir()/covers/`

Use stable hashed filenames.

If filenames use `.jpg`, ensure the cached content is actually valid JPEG.

Otherwise use an appropriate validated image format and extension.

Verify:

- Cache deduplication.
- Image size limits.
- Malformed image handling.
- MIME/content validation.
- Cache invalidation.
- Thumbnail sizing.
- Network timeouts.
- Redirect handling.
- Matching accuracy.
- Cancellation.
- Offline availability.

Do not fetch arbitrary unvalidated URLs.

Do not transmit complete local paths.

Provide an option to disable online artwork retrieval during the appropriate settings refinement.

### P2.6 — Database Ingestion

The frontend persists scanned metadata.

Requirements:

- Parameterized queries.
- Batched inserts.
- Transactional writes.
- Upsert by unique path.
- Correct handling of changed metadata.
- No duplicate tracks.

Verify that any chosen transaction mechanism works correctly with the SQLite plugin's connection behavior.

Do not assume separate transaction statements necessarily use the same connection.

If required, use a supported atomic batch strategy or another verified mechanism that preserves the database ownership model.

### P2.7 — Library UI

Implement:

- Virtualized cover grid.
- Bracketed album artwork.
- Correct metadata presentation.
- Local database-backed library state.
- Persisted selected library folder.
- Rescan action.
- Real TerminalLog activity.

Do not render the entire library simultaneously.

### P2.8 — Playlists

Implement:

- Create.
- Rename.
- Delete.
- Add tracks.
- Remove tracks.
- Reorder tracks.
- Sidebar listing.
- Persistent storage.

Playlist deletion must never delete the underlying audio files.

Ensure playlist ordering is deterministic.

Prevent orphaned playlist references.

### P2.9 — Database Reliability

Audit:

- SQLite initialization.
- Database migrations.
- Concurrent operations.
- Query performance.
- Transaction boundaries.
- Referential integrity.
- Error recovery.
- Persistence.
- Search behavior.

Use existing indexes appropriately.

Evaluate SQLite FTS only when justified by measured library performance.

### Phase 2 Commit Message

`Implement Rust local directory scanner, SQLite caching, cover metadata fallback, and playlists.`

---

# SECTION 11 — ORIGINAL DEVELOPMENT PHASE 3

## AUDIO ENGINE, PLAYBACK CONTROLS AND EQUALIZER

The audio subsystem is the core of the application.

Treat playback reliability as a higher priority than visual polish or new functionality.

### P3.1 — Audio Architecture

Implement or verify:

`useAudioEngine`

Required architecture:

- One authoritative HTMLAudioElement.
- One singleton AudioContext.
- AudioContext initialized or resumed on an appropriate user gesture.
- One MediaElementAudioSourceNode per authoritative element.
- Stable audio graph.
- No full-file decoding into JavaScript memory.
- Streaming local audio playback.

Baseline audio graph:

```text
HTMLAudioElement
        ↓
MediaElementAudioSourceNode
        ↓
Low-shelf filter — Bass
        ↓
Peaking filter — Mid
        ↓
High-shelf filter — Treble
        ↓
GainNode — Volume
        ↓
AudioContext destination
```

A justified headroom or preamp stage may be added during audio refinement if needed to prevent clipping.

### P3.2 — Local Audio Delivery

Use Tauri's local asset protocol with `convertFileSrc` or an equivalent verified secure streaming mechanism compatible with the existing architecture.

Restrict local media access to authorized library paths.

Set appropriate cross-origin configuration before assigning the source URL.

Explicitly test:

`crossOrigin = "anonymous"`

Do not assume this alone resolves cross-origin issues.

Verify that actual audio reaches the Web Audio processing graph.

Investigate:

- Asset protocol response headers.
- CORS restrictions.
- Seeking and range handling.
- Linux WebKitGTK behavior.
- GStreamer or platform media codec availability.
- Windows and macOS webview differences.

If the media element appears to play but the Web Audio graph is silent, investigate the protocol and webview behavior.

Do not solve silent audio by decoding entire FLAC or WAV files into memory.

Do not broadly weaken security permissions.

### P3.3 — Audio Lifecycle

Verify:

- AudioContext resumes correctly.
- React Strict Mode does not create duplicate engines.
- MediaElementAudioSourceNode is not created twice for the same element.
- Switching views does not interrupt playback.
- Rapid track switching behaves correctly.
- Event subscriptions are managed correctly.
- Playback state remains synchronized.
- Failed `play()` promises are handled.
- Application shutdown releases appropriate resources.

Prevent stale events from a previous track from overwriting current playback state.

### P3.4 — Playback Store

Use Zustand for appropriate playback state.

Implement:

- Queue.
- Current queue index or stable queue-entry identity.
- Current track.
- Play.
- Pause.
- Resume.
- Next.
- Previous.
- Seek.
- Volume.
- Shuffle.
- Repeat off.
- Repeat all.
- Repeat one.

Use the audio element as the authoritative source for actual media position and media events.

Do not simulate playback position independently.

### P3.5 — Shuffle

Use a correct Fisher-Yates shuffle.

When shuffle is enabled:

- Preserve the current track.
- Place the current queue entry first in the new shuffled sequence.
- Avoid repeating entries before exhausting the sequence, unless repeat behavior requires it.
- Preserve sufficient original ordering information to restore non-shuffled playback.

Distinguish unique queue entries from track IDs if the same track can appear more than once.

### P3.6 — Playback Edge Cases

Define and test behavior when:

- The queue is empty.
- The current track is removed.
- The final track ends.
- Repeat one is enabled.
- Repeat all is enabled.
- Shuffle is enabled midway through playback.
- Shuffle is disabled.
- Multiple queue entries reference the same track.
- A file is missing.
- A file is corrupted.
- A track cannot be decoded.
- A file disappears during playback.
- The user rapidly changes tracks.
- A new track is selected while another track is loading.
- Seeking occurs before duration is known.
- Restored playback position exceeds duration.

Missing or undecodable tracks must:

- Produce a real `[ERR]` log.
- Skip safely to the next eligible track.

Prevent infinite skip loops.

If every track is unavailable, stop playback and report the failure clearly.

### P3.7 — Equalizer

Three required bands:

| Band | Filter | Frequency | Q |
|---|---|---|---|
| Bass | Low shelf | 120 Hz | Appropriate shelf behavior |
| Mid | Peaking | 1 kHz | 1 |
| Treble | High shelf | 8 kHz | Appropriate shelf behavior |

Gain range:

−12 dB to +12 dB.

Step:

0.5 dB.

Apply gain changes smoothly using `setTargetAtTime` or another justified AudioParam smoothing mechanism.

Verify that EQ controls actually affect the connected audio graph.

Do not implement cosmetic controls disconnected from audio processing.

### P3.8 — Audio Quality

Investigate:

- Clipping from positive EQ gains.
- Gain staging.
- Abrupt volume changes.
- Audible clicks.
- Zipper noise.
- Filter parameter smoothing.
- AudioContext sample rate.
- Volume mapping.

Use reasonable headroom where necessary.

Do not introduce expensive DSP without measurable benefit.

Do not claim:

- Bit-perfect audio.
- Audiophile-grade processing.
- Lossless end-to-end signal delivery.

Unless these claims have been independently verified.

### P3.9 — Player HUD

Implement:

- Play.
- Pause.
- Previous.
- Next.
- Shuffle.
- Repeat.
- Keyboard-accessible playback scrubber.
- Compass volume dial.
- Digital playback timer.
- Current track path.
- Current track artwork.

Use the mandatory design system.

Disable unavailable controls appropriately.

### P3.10 — Equalizer Modal

Implement:

- Three sharp rectangular sliders.
- Bass control.
- Mid control.
- Treble control.
- Current gain values.
- Reset button.
- HUD corner brackets.
- Escape-to-close.
- Focus trap.
- Focus restoration.

No rounded slider thumbs or decorative glow.

### P3.11 — Media Session

Integrate `navigator.mediaSession` where supported.

Provide:

- Track metadata.
- Play/pause handlers.
- Previous/next handlers.
- Seek handlers where appropriate.
- OS media-key integration.

Feature-detect unsupported functionality.

Do not allow missing Media Session support to break playback.

### P3.12 — Persistence

Persist:

- Volume.
- Equalizer values.
- Shuffle.
- Repeat.

Evaluate restoring during the appropriate refinement:

- Current track.
- Last playback position.
- Queue.
- Last application view.

Never begin playing audio automatically simply because the application was opened.

Debounce or otherwise efficiently persist settings.

Do not write to SQLite every animation frame.

### P3.13 — Playback Rendering Performance

Isolate frequently updated playback position from ordinary application state.

Verify:

- requestAnimationFrame cleanup.
- Efficient Zustand selectors.
- Limited React rerendering.
- Accurate timer formatting.
- Background and minimized window behavior.
- Appropriate resynchronization when the window becomes visible.

Do not keep unnecessary animation loops running.

### Phase 3 Commit Message

`Integrate Web Audio API engine, HUD playback controls, and 3-band geometric equalizer.`

---

# SECTION 12 — ORIGINAL DEVELOPMENT PHASE 4

## LOCAL SEARCH, ONLINE DISCOVERY AND AUTHORIZED DOWNLOADING

### P4.1 — Local Search

Local search must remain completely offline.

Search against appropriate SQLite metadata:

- Title.
- Artist.
- Album.
- Additional indexed fields where available.

Handle:

- Case differences.
- Whitespace.
- Empty queries.
- Common Unicode normalization issues.
- Large result sets.

Use virtualization where appropriate.

Prevent outdated asynchronous search results from replacing current results.

### P4.2 — Online Discovery

Maintain clearly separated local and online search sections.

Online discovery must be intentional.

Do not send every local search query to external services automatically.

Use yt-dlp with structured arguments equivalent to:

```text
yt-dlp
ytsearch10:<query>
--flat-playlist
--dump-json
```

Extract:

- id
- title
- uploader
- duration
- thumbnail

Validate all external data.

Handle:

- Missing fields.
- Malformed JSON.
- No results.
- Network failures.
- Timeouts.
- Rate limiting.
- Request cancellation.
- Rapid query changes.

Display real terminal events.

### P4.3 — Sidecar Management

Implement:

`scripts/fetch-sidecars`

Requirements:

- Pinned yt-dlp version.
- Pinned FFmpeg version.
- Host target-triple detection.
- Official or otherwise verified upstream distribution sources.
- Artifact checksum verification where available.
- Executable permissions on Linux and macOS.
- Correct Windows executable suffix.
- Appropriate architecture selection.

Tauri sidecar filenames:

`<name>-<target-triple>[.exe]`

Examples must correspond to the actual supported target architecture.

Configure Tauri `externalBin`.

Verify development and packaged sidecar paths.

Verify that yt-dlp can correctly locate the bundled FFmpeg executable, including packaged layouts where target-triple naming and runtime executable naming differ.

Do not assume a development-only directory path will exist in production.

Log the real yt-dlp version when checking availability.

Missing binaries must disable only the dependent functionality, not local playback.

### P4.4 — Secure Sidecar Invocation

Rust should validate operations before launching sidecars.

Never interpolate untrusted text into a shell command.

Use structured process arguments.

Validate video IDs against:

```regex
^[A-Za-z0-9_-]{11}$
```

This validation applies to the supported YouTube video-ID workflow.

Construct supported source URLs safely.

Do not accept arbitrary executable paths, shell fragments, or unrestricted command-line arguments from the frontend.

Validate destination directories against the authorized library scope.

Prevent:

- Path traversal.
- Symlink escapes.
- Arbitrary filesystem writes.
- Filename collisions.
- Argument injection.
- Uncontrolled subprocess execution.

Grant frontend shell permissions only if the verified implementation requires them.

Prefer validated Rust command boundaries over exposing general sidecar execution to frontend code.

### P4.5 — Download Operation

Implement or verify:

```text
download_track(video_id, dest_dir)
```

Use structured yt-dlp arguments equivalent to:

```text
-x
--audio-format mp3
--audio-quality 0
--embed-metadata
--embed-thumbnail
--ffmpeg-location <verified runtime location>
--newline
```

Use a machine-readable progress template.

Download output must be MP3 to match the baseline scanner formats.

Do not claim that converting already compressed source audio to MP3 improves source audio quality.

### P4.6 — Download Progress and Management

Implement genuine progress reporting.

Distinguish:

- Pending.
- Downloading.
- Processing.
- Completed.
- Failed.
- Cancelled.

Only display percentages when actual measurable progress exists.

FFmpeg post-processing may display an indeterminate textual processing state.

Never display invented progress.

The baseline implementation must support cancellation.

Evaluate persistent or concurrent download queues during later refinement.

### P4.7 — Download Reliability

Handle:

- Missing sidecars.
- Network interruption.
- Insufficient disk space.
- Invalid filenames.
- Duplicate files.
- Destination conflicts.
- Interrupted downloads.
- Application shutdown.
- Malformed subprocess output.
- Failed FFmpeg conversion.
- Cancellation during processing.

Terminate the associated process tree where supported.

Ensure FFmpeg does not continue consuming resources after its parent download is cancelled.

Use temporary output paths and atomic finalization where practical.

Never overwrite existing music files without explicit authorization.

Never ingest partial files as completed music.

### P4.8 — Library Integration

After a successful verified download:

1. Identify the actual finalized output file.
2. Validate its location.
3. Confirm its expected format.
4. Run `scan_file`.
5. Return metadata to the frontend.
6. Insert or update the SQLite record.
7. Refresh relevant library views.

Prevent duplicate ingestion.

Evaluate source-media identifiers as an additional duplicate detection mechanism.

### P4.9 — Responsible Use and Distribution

Downloading functionality is intended only for content the user is authorized to download.

Respect copyright, applicable platform terms, and access restrictions.

Do not implement:

- DRM circumvention.
- Authentication bypass.
- Paywall bypass.
- Access-control evasion.

Review sidecar redistribution licenses, bundled FFmpeg build licensing, and applicable third-party service requirements before public distribution.

### P4.10 — Documentation

README must explain:

- Sidecar installation.
- Supported platforms.
- Updating pinned versions.
- Troubleshooting missing binaries.
- Limitations.
- Authorized-use expectations.

### Phase 4 Commit Message

`Integrate yt-dlp sidecar for in-app music discovery and direct local downloading.`

---

# SECTION 13 — ORIGINAL DEVELOPMENT PHASE 5

## SYNCED LYRICS AND OFFLINE CACHE

### P5.1 — LRCLIB Integration

Implement:

```text
fetch_lyrics(artist, title, album, duration_s)
```

Primary endpoint:

`https://lrclib.net/api/get`

User-Agent:

`Orphetune/0.1 (https://github.com/Hozaifah47/Orphetune)`

Use URL-encoded query parameters.

On HTTP 404, fall back to:

`/api/search`

Select the closest valid metadata match with an approximately two-second duration tolerance.

Do not choose results based solely on duration when the artist or track identity differs significantly.

Return:

- synced
- plain
- instrumental

Also preserve sufficient result status information to distinguish successful, absent, and temporarily failed retrieval.

### P5.2 — Lyrics Cache

Check SQLite before performing a network request.

Cache:

- Valid synced lyrics.
- Valid plain lyrics.
- Confirmed instrumental results.
- Confirmed no-match results with an appropriate retry or expiration policy.

Do not permanently cache temporary network failures as no lyrics found.

Previously cached lyrics must remain available offline.

Provide retry or refresh functionality where appropriate.

Prevent stale lyrics requests from updating the wrong current track.

### P5.3 — LRC Parser

Support:

- `[mm:ss.xx]`
- `[mm:ss.xxx]`
- Multiple timestamps per line.
- `[offset:ms]`.
- Metadata tags.
- Empty lines.
- Duplicate timestamps.
- Unordered timestamps.
- Malformed timestamps.
- Windows CRLF.
- Unix line endings.
- Unicode.
- Byte-order marks.
- Negative effective timestamps.

Define deterministic behavior for duplicate timestamps.

Sort parsed timestamps appropriately.

Malformed input must never crash the application.

Cover all meaningful parser edge cases with tests.

### P5.4 — Lyrics Synchronization

Use the actual audio element's `currentTime`.

Determine the active lyric through binary search.

Do not scan the entire lyrics array every animation frame.

Use requestAnimationFrame where appropriate.

Cancel unnecessary animation loops.

Correctly handle:

- Forward playback.
- Pause.
- Seeking forward.
- Seeking backward.
- Track switching.
- Track ending.
- Invalid lyrics.
- Missing duration.

### P5.5 — Lyrics View

Active lyric:

- #FF3333.
- Leading `>` marker.
- IBM Plex Sans.
- Clear position within surrounding lyrics.

Inactive lyrics must remain readable.

Implement:

- Active-line following.
- Appropriate automatic scrolling.
- Click-to-seek.
- Keyboard-accessible lyric interactions.
- Reduced-motion behavior.

When the user manually scrolls away, avoid immediately forcing the view back.

Provide a clear mechanism to resume automatic following.

No fake typing animations.

### P5.6 — Fallbacks

Plain lyrics:

Display unsynchronized text.

Instrumental:

`[INFO] Instrumental`

Confirmed no match:

`[INFO] No lyrics found`

Temporary network failure:

Display an appropriate recoverable error or offline status.

A lyrics failure must never interrupt audio playback.

### Phase 5 Commit Message

`Implement Lrclib API fetching and synced terminal-style lyrics view.`

---

# SECTION 14 — SECURITY AND PRIVACY AUDIT

## S1 — Tauri Capabilities

Inspect all capability files.

Flag:

- Unrestricted filesystem permissions.
- Wildcard shell permissions.
- Arbitrary command execution.
- Broad home-directory access.
- Unnecessary plugin permissions.
- Overly broad IPC access.

Do not fix permissions by granting unrestricted access.

Document the purpose of every nontrivial permission.

## S2 — Asset Protocol

Local audio access must remain restricted to authorized library paths.

Cached artwork may additionally require access to a narrowly scoped application-owned covers directory.

Do not solve artwork access by granting access to the entire filesystem.

Verify:

- Dynamic library-folder authorization.
- Path normalization.
- Canonicalization.
- Library authorization restoration after restart.
- Revocation when changing library folders.
- Symlink behavior.
- Cached artwork scope.
- Local playback compatibility.

Do not expose arbitrary local files through the media protocol.

## S3 — Content Security Policy

Use a strict CSP compatible with the verified Tauri application.

No remote scripts.

No unsafe-eval.

Restrict network destinations and media sources as appropriate.

Document necessary exceptions rather than blindly copying a permissive policy.

Do not allow arbitrary external origins merely to avoid debugging an asset-loading issue.

## S4 — IPC Validation

Rust commands must validate their own inputs.

Do not trust frontend validation alone.

Validate:

- File paths.
- Folder paths.
- Search queries.
- Video IDs.
- Output destinations.
- Metadata.
- External URLs.
- Operation identifiers.

Use appropriate input limits and error handling.

## S5 — Untrusted Content

Treat all external text as untrusted:

- Filenames.
- Track tags.
- Album names.
- Artist names.
- Lyrics.
- Search results.
- Subprocess output.
- API responses.

Never render these as unsanitized HTML.

Avoid:

- `dangerouslySetInnerHTML`.
- Arbitrary `innerHTML`.
- `eval`.
- Dynamic execution of external text.

Use safe rendering and structured data.

## S6 — Network Security

For external requests:

- Use appropriate TLS validation.
- Use request timeouts.
- Bound response sizes.
- Validate redirects.
- Restrict destinations where practical.
- Handle invalid content.
- Apply appropriate rate limits.
- Avoid arbitrary filesystem or local-network URLs.

Do not disable certificate verification.

## S7 — Privacy

Do not introduce:

- Analytics.
- Telemetry.
- Advertisements.
- Mandatory accounts.
- Remote playback history.
- Device tracking.
- Unnecessary background network requests.

Do not transmit:

- Full filesystem paths.
- Complete music libraries.
- Personal identifiers.
- Device identifiers.
- Unnecessary listening history.

Only transmit metadata necessary for the requested external operation.

Document which external services are contacted and why.

## S8 — Dependency Security

Review npm and Rust dependencies for known vulnerabilities when appropriate tooling is available.

Do not blindly apply automated breaking upgrades.

Record findings and relevant mitigation.

Do not claim a dependency audit passed if the necessary database or tooling was unavailable.

---

# SECTION 15 — MANDATORY AUTOMATED AUDIT SCANS

Use `rg` where available.

Fall back to equivalent grep or platform-specific tools.

Treat these scans as investigative heuristics, not automatic proof of violations.

Inspect every relevant result in context.

## 15.1 Geometry and Visual Effects

Search frontend source for:

```text
rounded
shadow
blur
backdrop
drop-shadow
box-shadow
border-radius
```

Flag unintended rounding, shadows, and blur.

Do not flag legitimate focus outlines or explicit zero-radius declarations as violations.

## 15.2 Motion

Search for:

```text
animate-
spin
pulse
ping
bounce
@keyframes
framer-motion
```

Inspect all animation use.

Flag purposeless motion.

## 15.3 Fake Progress

Inspect:

```text
setTimeout
setInterval
```

Especially around:

- Logs.
- Download progress.
- Scanner progress.
- Loading states.

Distinguish legitimate debouncing and timeouts from fabricated progress.

## 15.4 Emoji

Inspect rendered interface text and icon usage for emoji-based decoration.

A Unicode search may be used to identify candidates, but do not incorrectly flag legitimate user-provided metadata or lyrics containing emoji.

## 15.5 Color Drift

Inspect:

- Hex color values.
- Tailwind color classes.
- Purple.
- Violet.
- Indigo.
- Fuchsia.
- Gradient usage.

Distinguish legitimate bracket construction from prohibited decorative gradients.

## 15.6 Remote Assets

Inspect:

```text
fonts.googleapis
cdn.
http://
https://
```

In index.html, CSS, frontend source, and relevant configuration.

Distinguish authorized API URLs from unauthorized remote scripts or font assets.

## 15.7 Excessive Borders

Inspect border use per component.

Evaluate visually rather than enforcing an arbitrary numerical limit.

## 15.8 Database Ownership

Search Rust application code for:

```text
rusqlite
sqlx
Connection::open
```

Investigate independent runtime database connections.

Do not flag plugin internals, legitimate migration registration, or lockfile transitive dependencies as architectural violations.

## 15.9 Unsafe Rendering and Execution

Search:

```text
dangerouslySetInnerHTML
innerHTML
eval(
```

Inspect any dynamic HTML or execution.

## 15.10 Permission Scope

Inspect:

- `**`
- `$HOME/**`
- Arbitrary shell arguments.
- Broad filesystem scopes.
- Broad asset protocol permissions.

## 15.11 Tracked Binaries

Inspect:

```bash
git ls-files
```

Identify tracked:

- Sidecar executables.
- `.exe` files.
- `.dll` files.
- Generated binaries.
- Build artifacts.
- Unexpected large files.

Review the largest tracked files.

Do not automatically rewrite history to remove previously committed files.

## 15.12 Dependency Correctness

Verify:

- React major version.
- Tailwind major version.
- Tauri major version.
- TypeScript strict mode.
- Lofty usage.
- Absence of `music-metadata`.
- Self-hosted fonts.
- Correct plugin versions.

## 15.13 Timer Implementation

Inspect whether `timeupdate` is incorrectly used as the sole driver of the centisecond HUD timer.

Use actual media time with requestAnimationFrame for the digital timer.

## 15.14 Cleanup

Inspect:

- `addEventListener`.
- `requestAnimationFrame`.
- `setInterval`.
- Tauri subscriptions.
- AbortController.
- Object URLs.
- Child process handles.

Verify corresponding cleanup.

---

# SECTION 16 — KNOWN FAILURE MODES TO VERIFY EXPLICITLY

Check every applicable item below.

For unimplemented subsystems, mark the item NOT APPLICABLE for the current stage and carry it forward to the relevant development phase.

1. Audio appears to play but is silent through MediaElementAudioSourceNode because of asset protocol or CORS restrictions.
2. AudioContext is created before a user gesture and remains suspended.
3. Multiple AudioContexts are created during React rendering.
4. MediaElementAudioSourceNode is created twice for the same audio element.
5. EQ controls exist visually but do not affect audio.
6. EQ gain values use incorrect units.
7. Abrupt gain changes introduce zipper noise.
8. Positive EQ gain introduces clipping.
9. Scanner blocks the async runtime.
10. Scanner follows symlink loops or escapes authorized folders.
11. File extension matching is case-sensitive.
12. Unicode or platform-specific paths become corrupted.
13. Interrupted scans incorrectly remove database records.
14. Database ingestion performs excessive per-row transactions.
15. Missing unique-path upserts create duplicates.
16. SQLite transaction statements do not use the intended transactional connection.
17. Library renders every track simultaneously.
18. Artwork retrieval blocks local scanning.
19. MusicBrainz requests exceed appropriate rate limits.
20. Missing descriptive API User-Agent.
21. Malformed or oversized artwork causes memory problems.
22. Sidecar binaries lack correct target-triple filenames.
23. Missing `externalBin` configuration.
24. Sidecar binaries are committed to Git.
25. FFmpeg cannot be located in the packaged application.
26. yt-dlp receives user input through unsafe shell strings.
27. Invalid video IDs are accepted.
28. Download destinations escape authorized library scope.
29. Download cancellation leaves child processes running.
30. Progress parsing fails on unexpected output.
31. Partial files are ingested as completed downloads.
32. Downloaded tracks are not scanned automatically.
33. Duplicate downloads overwrite or duplicate existing records.
34. Lyrics parser fails on multiple timestamps.
35. Lyrics parser mishandles milliseconds.
36. Offset tags are ignored or applied incorrectly.
37. CRLF or BOM input breaks parsing.
38. Unsorted lyrics timestamps produce incorrect synchronization.
39. Lyrics synchronization performs unnecessary linear searches.
40. Animation frame loops are not cancelled.
41. HUD timer updates only through low-frequency `timeupdate` events.
42. HUD timer displays incorrect centiseconds.
43. Stale asynchronous events overwrite current track state.
44. Broken tracks create infinite skip loops.
45. Shuffle loses original queue ordering.
46. Repeat modes behave incorrectly.
47. Volume or EQ settings fail to persist.
48. Library folder authorization is lost after restart.
49. Tauri event subscriptions are not released.
50. Object URLs accumulate without cleanup.
51. Tailwind v4 is installed accidentally.
52. Rounded component-library styles violate geometry rules.
53. Native sliders retain unwanted rounding or shadows.
54. #8A5A5A is used for readable text.
55. #D32F2F is used for small text.
56. Local search sends queries externally without user intent.
57. Temporary network errors are cached permanently.
58. Network failures interrupt core playback.
59. Opening the application unexpectedly begins playing audio.
60. Frequent playback updates rerender the entire application.

Document evidence and corrective action for each confirmed failure.

---

# SECTION 17 — PERFORMANCE ENGINEERING

## E1 — Profiling Before Optimization

Do not claim performance improvements without measurements or clearly identified technical evidence.

Establish available baseline measurements for:

- Cold startup.
- Idle RAM.
- Idle CPU.
- Playback RAM.
- Playback CPU.
- Scanning performance.
- Library rendering.
- Search responsiveness.
- Database query latency.
- Artwork loading.

Record:

- Hardware.
- Operating system.
- Build configuration.
- Library size.
- Test method.

Compare equivalent before-and-after conditions.

## E2 — Low-Resource Optimization

Investigate:

- Excessive React rerendering.
- Large bundle size.
- Unnecessary dependencies.
- Continuous timers.
- Background animation loops.
- Unbounded caches.
- Unbounded terminal logs.
- Excessive SQLite writes.
- Unbounded network concurrency.
- Duplicate audio resources.
- Large artwork allocations.

Prioritize measurable improvements.

## E3 — Large Library Testing

Use representative generated or permitted test fixtures containing approximately:

- 100 tracks.
- 1,000 tracks.
- 10,000 tracks.
- 50,000 tracks where practical.

Test:

- Initial library loading.
- Incremental scanning.
- Search.
- Sorting.
- Scrolling.
- Artwork loading.
- Memory consumption.
- Playlist loading.

Use lightweight fixtures where full audio content is unnecessary.

Do not claim real media scanning performance based solely on metadata-only fixtures.

## E4 — Rendering

Use virtualization for large lists.

Use appropriate lazy loading.

Avoid expensive image decoding and layout work.

Ensure playback timer updates do not trigger global application rerenders.

## E5 — Cache Management

Ensure caches are bounded or manageable.

Evaluate:

- Artwork cache size.
- Failed-request caching.
- Lyrics cache behavior.
- Temporary download cleanup.
- Stale metadata.
- Cache invalidation.

Never clear user-owned music files when clearing application caches.

## E6 — Dependency Efficiency

Identify:

- Unused packages.
- Duplicate functionality.
- Unnecessarily heavy libraries.
- Incorrect Rust feature flags.
- Incompatible versions.
- Dead dependencies.

Remove dependencies only after verifying they are unnecessary.

---

# SECTION 18 — FAILURE RECOVERY AND RESILIENCE

## R1 — Network Failure

Test:

- Complete internet disconnection.
- DNS failure.
- API unavailability.
- HTTP 429.
- Request timeout.
- Invalid response.
- Connection interruption.

Local functionality must remain available.

## R2 — Filesystem Failure

Test:

- Missing music file.
- Deleted folder.
- Permission denial.
- Corrupted media.
- Unavailable drive.
- Disk exhaustion.
- Filename collision.

Avoid data loss.

## R3 — Database Failure

Handle:

- Database initialization failure.
- Invalid stored settings.
- Failed migration.
- Locked database.
- Interrupted write.
- Invalid relationships.

Do not automatically destroy or recreate a user's database in response to a recoverable error.

## R4 — Process Failure

Test:

- Missing yt-dlp.
- Missing FFmpeg.
- Failed subprocess launch.
- Failed conversion.
- Unexpected subprocess termination.
- User cancellation.
- Application shutdown during processing.

## R5 — Fault Isolation

A lyrics failure must not stop playback.

An artwork failure must not stop scanning.

An online search failure must not stop local search.

A download failure must not stop library access.

A single corrupted track must not crash the application.

---

# SECTION 19 — TESTING REQUIREMENTS

## T1 — Frontend Unit Tests

Use Vitest.

Required tests include:

- HUD timer formatting.
- Ordinary duration formatting.
- Shuffle current-entry preservation.
- Shuffle ordering.
- Repeat logic.
- Queue operations.
- Playback state transitions.
- Active lyric binary search.
- LRC parser.
- Settings validation.
- Search result ordering.
- Stale asynchronous result handling.

Where applicable, test:

- Empty inputs.
- Invalid inputs.
- Duplicate entries.
- Boundary values.
- Race conditions.
- Failure recovery.

## T2 — Rust Unit Tests

Required tests include:

- Case-insensitive extension matching.
- Incremental scan skip logic.
- Filename sanitization.
- Video-ID validation.
- Path authorization.
- Path traversal prevention.
- Scanner behavior.
- Metadata fallback.
- Sidecar argument construction.
- API response parsing.
- Download output validation.

Include platform-specific tests where practical.

## T3 — Database Tests

Verify:

- Unique-path upsert.
- Transactional ingestion.
- Playlist ordering.
- Playlist deletion.
- Track relationships.
- Foreign key behavior.
- Migration compatibility.
- Settings persistence.
- Lyrics cache behavior.
- Safe reconciliation of missing files.

Use temporary test databases rather than personal application databases.

## T4 — Integration Tests

Test complete data flows where supported:

```text
Filesystem → Rust scanner → Tauri Channel → SQLite → Library UI
```

```text
Library selection → Audio engine → Playback state → Player HUD
```

```text
Current track → LRCLIB → Cache → Synced lyrics
```

```text
Download → FFmpeg processing → scan_file → SQLite → Library refresh
```

```text
Playlist creation → Persistence → Queue → Playback
```

```text
Application restart → Restored settings → Authorized library access
```

Mock external APIs for deterministic automated tests.

Where actual platform behavior matters, supplement mocks with native application testing.

## T5 — Audio Testing

Verify:

- Actual audible playback.
- Pause and resume.
- Seeking.
- Volume adjustment.
- EQ changes.
- Track transitions.
- Missing-file behavior.
- Shuffle.
- Repeat.
- Rapid track switching.
- Queue changes.

Test MP3, FLAC, and WAV using legal or generated fixtures.

Do not assume support for every codec variant without testing.

## T6 — Manual Acceptance Test

Perform or provide exact instructions for the following journey:

1. Install and launch the application.
2. Select a music library.
3. Scan the library.
4. Verify tracks appear.
5. Verify metadata.
6. Verify artwork.
7. Play a track.
8. Pause and resume.
9. Seek through the track.
10. Adjust volume.
11. Test the compass dial using mouse and keyboard.
12. Open the equalizer.
13. Adjust each EQ band.
14. Reset EQ.
15. Test next and previous.
16. Test shuffle.
17. Test repeat off, all, and one.
18. Modify the queue.
19. Create a playlist.
20. Rename the playlist.
21. Add tracks.
22. Remove tracks.
23. Reorder tracks.
24. Search locally.
25. Retrieve lyrics.
26. Verify lyric synchronization.
27. Seek through lyrics.
28. Test permitted online discovery.
29. Test an authorized download.
30. Verify download progress.
31. Verify library ingestion.
32. Disconnect the internet.
33. Verify offline playback.
34. Verify cached lyrics.
35. Verify local playlists.
36. Close the application.
37. Relaunch it.
38. Verify saved settings.
39. Verify library access.
40. Test missing and corrupted files.
41. Resize the application.
42. Test keyboard navigation.
43. Verify reduced-motion behavior.
44. Test cancellation of long-running operations.

If GUI access is unavailable, provide these as explicit manual tests and mark them UNVERIFIED.

Do not simulate screenshots or invent test results.

## T7 — Regression Policy

Every confirmed bug fix should include an appropriate regression test where practical.

Never weaken tests solely to produce passing results.

Do not disable strict mode or compiler protections.

---

# SECTION 20 — PRODUCTION REFINEMENT ROADMAP

The following features and refinements are candidates after the baseline five-phase application is stabilized.

Do not implement every candidate automatically.

Evaluate each against usefulness, implementation complexity, maintenance burden, performance cost, security risk, and visual fit.

## High-Value Refinements

- Playback state restoration.
- Persistent queue.
- Favorites.
- Recently played tracks.
- Album grouping.
- Artist grouping.
- Context menus.
- Multi-selection.
- Improved queue management.
- Download queue.
- Keyboard shortcuts.
- Explicit offline mode.
- Application settings view.
- Improved library sorting.

## Medium-Priority Refinements

- Multiple library folders.
- Import and export playlists.
- M3U/M3U8 interoperability.
- Cache management.
- Configurable EQ presets.
- Configurable seek intervals.
- Additional audio formats.
- Technical track information.
- Local search history.
- Duplicate track management.
- Library filtering.

## Experimental Features

- Spectrum analyzer.
- ReplayGain.
- Gapless playback.
- Crossfade.
- Automatic playlist rules.
- Sleep timer.
- Advanced audio statistics.

Advanced audio features must be evaluated against the actual Web Audio and HTMLAudioElement architecture.

Do not promise true gapless playback, bit-perfect output, or advanced processing without establishing technical feasibility.

If introducing an audio visualization, it must be functional, optional, restrained, and consistent with the design system.

Do not introduce decorative neon visualizers or continuous animation without a justified purpose.

## Refinement Sequence

After all original phases are complete, propose:

### Refinement A — Core Reliability

Remaining audio, database, filesystem, state, and concurrency improvements.

### Refinement B — Desktop Experience

Layout, responsiveness, keyboard access, menus, and interaction polish.

### Refinement C — Network Resilience

Artwork, lyrics, search, and downloading improvements.

### Refinement D — Performance and Security

Measured optimization, dependency review, permissions, and privacy.

### Refinement E — High-Value Features

Only approved feature enhancements.

### Refinement F — Production Release

Packaging, platform testing, documentation, and final release verification.

Require approval before beginning each major refinement stage.

---

# SECTION 21 — PRODUCTION PACKAGING

## B1 — Application Identity

Verify:

- Application name.
- Product identifier.
- Version.
- Native window title.
- Application icons.
- Package metadata.
- Application directories.

Do not introduce an unnecessary visual rebrand.

## B2 — Linux

Prioritize a verified Ubuntu build.

Inspect:

- Native Tauri requirements.
- WebKitGTK requirements.
- Media codec requirements.
- Sidecar permissions.
- Desktop integration.
- AppImage or other configured package formats.
- Runtime dependencies.

Document exact installation prerequisites.

## B3 — Windows

Maintain compatible:

- Filesystem paths.
- Executable suffixes.
- Sidecar naming.
- Native window behavior.
- Database paths.
- Media capabilities.

Do not claim verified Windows support without actual Windows testing.

## B4 — macOS

Maintain compatible:

- Target architectures.
- Bundle paths.
- Application data directories.
- Media handling.
- Keyboard conventions.

Document relevant packaging, signing, and distribution requirements.

Do not claim macOS verification without actual testing.

## B5 — Clean Installation

Verify when practical:

- Fresh application launch.
- Database initialization.
- Migration execution.
- First library selection.
- Sidecar availability.
- Settings initialization.
- Clean installation behavior.

Development success does not prove packaged application success.

## B6 — User Data Protection

Uninstalling, updating, or resetting Orphetune must not delete user-owned audio files.

Distinguish:

- Application installation files.
- Application settings.
- Database.
- Cache.
- Downloaded user music.
- Original music library.

Any destructive reset functionality must be explicit and appropriately confirmed.

---

# SECTION 22 — DOCUMENTATION REQUIREMENTS

Maintain appropriate project documentation.

Suggested structure:

```text
docs/
├── SPEC.md
├── STATUS.md
├── ARCHITECTURE.md
├── SECURITY.md
├── TESTING.md
├── PERFORMANCE.md
├── ROADMAP.md
└── DECISIONS.md
```

Do not create redundant empty documentation merely to satisfy the directory structure.

## SPEC.md

Authoritative project specification.

## STATUS.md

Current acceptance criteria, audit findings, evidence, severity, verification status, and remaining issues.

Update after each significant change.

## ARCHITECTURE.md

Document:

- Application structure.
- Component responsibilities.
- Rust responsibilities.
- State ownership.
- SQLite ownership.
- IPC communication.
- Audio signal flow.
- File scanning.
- Download pipeline.
- Lyrics pipeline.

## SECURITY.md

Document:

- Capabilities.
- Asset scopes.
- IPC boundaries.
- External network services.
- Sidecar execution.
- Security decisions.
- Known limitations.

## TESTING.md

Document:

- Automated commands.
- Manual tests.
- Test fixtures.
- Native GUI requirements.
- Verified platforms.
- Unverified scenarios.

## PERFORMANCE.md

Document:

- Benchmark environment.
- Baseline results.
- Test methods.
- Actual improvements.
- Remaining bottlenecks.

Do not invent measurements.

## ROADMAP.md

Document:

- Remaining original development phases.
- Prioritized refinements.
- Optional features.
- Dependencies.
- Approval checkpoints.

## DECISIONS.md

Record significant decisions involving:

- Architecture.
- Data ownership.
- Security.
- Performance.
- Design.
- Compatibility.
- Deviations from the original specification.

Avoid documenting trivial implementation details unnecessarily.

## README.md

Maintain accurate instructions for:

- Prerequisites.
- Dependency installation.
- Development.
- Sidecar installation.
- Running the desktop application.
- Testing.
- Production builds.
- Updating yt-dlp.
- Troubleshooting.
- Supported platforms.
- Known limitations.

---

# SECTION 23 — DEFINITION OF DONE

## 23.1 Individual Fix Completion

A fix is complete when:

- Its root cause has been identified.
- The implementation is corrected.
- Relevant tests exist where practical.
- Applicable checks pass.
- No known new regression is introduced.
- Acceptance status is updated.
- The diff is reviewed.
- The change is committed appropriately.

## 23.2 Development Phase Completion

A development phase is fully verified only when:

- All mandatory acceptance criteria pass.
- Applicable global requirements pass.
- Applicable design requirements pass.
- Mandatory automated checks pass.
- No unresolved critical issue blocks the phase.
- `docs/STATUS.md` is current.
- Relevant documentation is updated.

GUI-dependent or network-dependent criteria may remain UNVERIFIED only when the environment genuinely prevents testing.

In that case, report the phase as implementation-complete but verification-pending, rather than fully verified.

Provide exact manual tests.

Do not advance automatically to another phase.

## 23.3 Production Release Completion

Orphetune is suitable for an initial verified production release only when:

- All critical P0 issues are resolved.
- All major P1 issues are resolved.
- Mandatory design rules are satisfied.
- Local playback is reliable.
- Supported audio formats have been tested.
- Library scanning is reliable.
- Playlists persist correctly.
- Settings persist correctly.
- Offline functionality is verified.
- Audio processing is functional.
- Lyrics synchronization works.
- Download operations fail safely.
- Security permissions are appropriately restricted.
- Resource usage is reasonable.
- Automated tests pass.
- Native desktop builds succeed.
- The actual desktop application has been tested.
- Known limitations are documented.
- Distribution and dependency licensing requirements have been reviewed.

A successful build is not equivalent to a production-ready application.

---

# SECTION 24 — FINAL REPORT FORMAT

Whenever you reach an approval checkpoint, provide the following report.

## 1. Executive Summary

Describe the actual condition of Orphetune.

Do not use generic statements.

## 2. Development Phase Status

| Phase | Status | Verified Criteria | Failed Criteria | Unverified Criteria |
|---|---|---|---|---|
| Phase 1 | | | | |
| Phase 2 | | | | |
| Phase 3 | | | | |
| Phase 4 | | | | |
| Phase 5 | | | | |

## 3. Critical Findings

Summarize P0 and P1 problems.

## 4. Issues Resolved

| Issue | Severity | Root Cause | Fix | Verification |
|---|---|---|---|---|

## 5. Remaining Issues

Prioritize unresolved defects.

Distinguish mandatory work from optional refinement.

## 6. Architecture Changes

Explain significant changes and why they were necessary.

## 7. Design Improvements

List actual visual and interaction improvements.

## 8. Security Improvements

Describe resolved vulnerabilities and remaining limitations.

## 9. Performance Results

Provide measured before-and-after results when available.

Otherwise state that measurement remains pending.

## 10. Test Results

| Command/Test | Result | Evidence |
|---|---|---|

Allowed results:

- PASS.
- FAIL.
- UNVERIFIED.
- BLOCKED.
- NOT APPLICABLE.

## 11. Git Information

Provide:

- Current branch.
- Starting commit.
- Final commit.
- Commits created.
- Push status.
- Working tree status.

## 12. Modified Files

List created and modified files with brief descriptions.

## 13. Manual Verification

Provide exact steps for unverified functionality.

## 14. Launch Instructions

Provide the exact commands appropriate for the repository's current implementation.

Do not assume nonexistent npm scripts.

## 15. Assumptions and Limitations

Explicitly list:

- Decisions made without approval.
- Environment limitations.
- Architectural limitations.
- Unverified platforms.
- Incomplete functionality.
- Remaining risks.

## 16. Recommended Next Action

Recommend the next highest-value development action.

Then stop and request approval before beginning the next major phase.

---

# SECTION 25 — RESTRICTIONS ON OUTPUT AND IMPLEMENTATION

Do not produce:

- Placeholder source code.
- Empty event handlers.
- Nonfunctional buttons presented as working.
- Fake UI functionality.
- Hardcoded sample data presented as user data.
- Fake progress.
- Unnecessary TODO stubs.
- "Rest unchanged" comments in replacement files.
- Fabricated screenshots.
- Fabricated benchmarks.
- Fabricated terminal results.
- Fabricated Git operations.
- Unsupported claims of completion.

If working inside a repository, edit the actual files rather than dumping their complete contents into the conversation unnecessarily.

If working without repository write access, provide complete replacement files or precise applicable patches.

If working without repository read access, perform a specification-level audit and clearly state that implementation inspection was not possible.

Never pretend to have capabilities or access that are unavailable.

When a feature cannot be implemented correctly within the current architecture, explain the limitation and recommend a technically realistic solution.

---

# SECTION 26 — EXECUTION TRIGGER

Begin now.

Acknowledge this specification in one concise sentence.

Then immediately proceed with the following:

1. Establish repository access and inspect Git status.
2. Safely create or continue `astra/stabilize`.
3. Persist this specification to `docs/SPEC.md`.
4. Complete Stage 1 read-only orientation.
5. Run baseline verification commands.
6. Determine the actual state of all five original development phases.
7. Perform the complete acceptance-criteria audit.
8. Create and commit `docs/STATUS.md`.
9. Identify critical architecture, functionality, security, performance, and visual issues.
10. Stabilize the existing implementation in priority order.
11. Complete only the first unfinished original development phase.
12. Run applicable automated and native verification.
13. Update documentation.
14. Commit and push verified changes to `astra/stabilize`.
15. Produce the complete final report.
16. STOP.

If repository access is unavailable, do not fabricate inspection or implementation. Instead, produce a specification-level risk audit, exact implementation instructions, acceptance criteria, and a prioritized handover that can be executed by Antigravity or another repository-enabled coding agent.

Do not begin by rebuilding the application.

Do not begin by adding optional features.

Do not assume Antigravity's work is correct.

Do not optimize before understanding the existing implementation.

Do not sacrifice security to solve functional problems.

Do not sacrifice usability for visual decoration.

Do not sacrifice reliability to complete a phase quickly.

Your ultimate objective is to transform Orphetune into a polished, efficient, secure, reliable, distinctive desktop music player that feels deliberately designed and professionally engineered.

**Quality over quantity.**

**Evidence over assumptions.**

**Reliability over feature count.**

**Functionality over decoration.**

**Preserve what works. Repair what does not. Verify everything.**