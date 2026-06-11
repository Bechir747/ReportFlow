# Product

## Register

product

## Users

Three distinct roles, each with a different relationship to the product:

- **Admins** — configure and manage report workflows. They create report configurations, assign depositors, set dates, activate workflows, and audit the full system. They need a high-level overview plus drill-down into specific reports.
- **Depositors** — submit reports. They see only their assigned reports, upload files, handle redo requests, and track version history. Their primary task is timely, correct submission.
- **Approvers** — review and validate reports. They work through a PENDING queue, download files, make review decisions (approve/reject/redo/cancel), and communicate via threaded comments.

All three roles share authentication via JWT and receive in-app notifications for workflow events.

## Product Purpose

ReportFlow is an event-driven workflow management system for report submission, review, and approval. It exists to provide a structured, auditable, and role-based process for organizations that need formal report handling — compliance, financial audits, regulatory filings, incident reporting.

Success looks like: complete, on-time submissions with clear audit trails and minimal friction between depositors and approvers.

## Brand Personality

Professional, Clean, Reliable.

The interface should feel sturdy and predictable — a tool that gets out of the way and lets users focus on their work. No unnecessary decoration, no surprises. Trustworthy enough that a compliance officer or financial auditor would feel confident using it daily.

## Anti-references

- No Material Design aesthetic (no heavy shadows, no card-first everything, no floating action buttons)
- No "generic SaaS cream" — avoid the overly-safe white/blue/gray that makes every enterprise app look identical

## Design Principles

1. **Clarity over cleverness** — every element should communicate its purpose instantly. Users should never wonder "what does this button do?"
2. **Respect the workflow** — each role has a primary task. The UI should lead users toward that task and remove friction from it.
3. **Information density with breathing room** — dashboards show lots of data, but spacing and hierarchy prevent cognitive overload.
4. **Status as signal** — workflow status is the most important piece of metadata. Color, placement, and typography should make it immediately scannable.
5. **Auditability by default** — every action leaves a trace. The UI should make the audit trail visible and understandable, not hidden in a settings page.

## Accessibility & Inclusion

Basic accessibility — semantic HTML, adequate color contrast, keyboard navigable forms and tables. No formal WCAG target specified for MVP.
