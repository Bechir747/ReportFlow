---
name: ReportFlow
description: Event-driven workflow management system for report submission, review, and approval
colors:
  primary: "#00288e"
  on-primary: "#ffffff"
  primary-container: "#1e40af"
  on-primary-container: "#a8b8ff"
  secondary: "#505f76"
  on-secondary: "#ffffff"
  secondary-container: "#d0e1fb"
  on-secondary-container: "#54647a"
  tertiary: "#611e00"
  on-tertiary: "#ffffff"
  tertiary-container: "#872d00"
  on-tertiary-container: "#ffa583"
  surface: "#fbf8ff"
  surface-dim: "#dad9e3"
  surface-bright: "#fbf8ff"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f4f2fc"
  surface-container: "#eeedf7"
  surface-container-high: "#e8e7f1"
  surface-container-highest: "#e3e1eb"
  on-surface: "#1a1b22"
  on-surface-variant: "#444653"
  inverse-surface: "#2f3037"
  inverse-on-surface: "#f1f0fa"
  inverse-primary: "#b8c4ff"
  outline: "#757684"
  outline-variant: "#c4c5d5"
  surface-tint: "#3755c3"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  success: "#10b981"
  success-container: "#d1fae5"
  on-success: "#ffffff"
  warning: "#f59e0b"
  warning-container: "#fef3c7"
  on-warning: "#ffffff"
  background: "#fbf8ff"
  on-background: "#1a1b22"
typography:
  display-lg:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 36px
    fontWeight: "700"
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
  body-lg:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-md:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  label-md:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 12px
    fontWeight: "600"
    lineHeight: 16px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 16px
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 12px 24px
    typography: label-md
  button-secondary:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: 12px 24px
    border: 1px solid "{colors.outline-variant}"
    typography: label-md
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 12px 24px
    typography: label-md
  input-text:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
    border: 1px solid "{colors.outline-variant}"
    typography: body-md
  badge-pending:
    backgroundColor: "#fef3c7"
    textColor: "#92400e"
    rounded: "{rounded.full}"
    padding: 2px 8px
    typography: code-sm
  badge-approved:
    backgroundColor: "{colors.success-container}"
    textColor: "#065f46"
    rounded: "{rounded.full}"
    padding: 2px 8px
    typography: code-sm
  badge-rejected:
    backgroundColor: "{colors.error-container}"
    textColor: "{colors.on-error-container}"
    rounded: "{rounded.full}"
    padding: 2px 8px
    typography: code-sm
  badge-draft:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.full}"
    padding: 2px 8px
    typography: code-sm
---

# Design System: ReportFlow

## 1. Overview

**Creative North Star: "The Corporate Atelier"**

A precise and trustworthy tool. Every pixel in its right place. The interface feels like a well-organized workspace where nothing is surprising and everything is where you expect it — like a craftsman's bench arranged for efficiency, not decoration.

ReportFlow is designed for high-density information environments where clarity, speed of comprehension, and reliability are paramount. The brand personality is authoritative yet secondary to the data it presents; the UI acts as a precise tool rather than a decorative layer. This is not a marketing site — it is a surface that gets out of the way and lets compliance officers, financial auditors, and report submitters focus on their work.

The system explicitly rejects Material Design conventions (no heavy shadows, no card-first everything, no floating action buttons) and the generic SaaS-cream aesthetic that makes every enterprise app look identical.

**Key Characteristics:**
- Systematic Minimalism — rigorous grid, deliberate whitespace, restrained color
- Tonal layering over shadows — depth through color shifts, not drop shadows
- Status as signal — color is reserved for workflow state, never decoration
- Professional restraint — one accent color (Corporate Blue) used on ≤10% of surface area

## 2. Colors

The palette is anchored by a deep Corporate Blue with a sophisticated neutral scale built from tinted slate tones. Semantic colors (emerald, amber, rose) are strictly reserved for functional workflow status.

### Primary
- **Corporate Blue** (#00288e / oklch(0.29 0.13 270)): Primary actions, active navigation state, focused inputs. Used sparingly — its rarity signals importance.
- **Blue Container** (#1e40af / oklch(0.34 0.14 270)): Hover states for primary elements, selected nav items.
- **Blue Tint** (#dde1ff / oklch(0.9 0.04 270)): Subtle backgrounds for selected table rows, active filter chips.

### Secondary
- **Slate Blue** (#505f76 / oklch(0.44 0.03 270)): Secondary text, muted headings, inactive navigation.
- **Slate Blue Container** (#d0e1fb / oklch(0.88 0.04 260)): Selected secondary elements, hover states on muted controls.

### Tertiary
- **Ember** (#611e00 / oklch(0.3 0.06 40)): High-priority markers, urgent indicators.
- **Ember Container** (#872d00 / oklch(0.4 0.09 40)): Priority-high backgrounds, warning icons.

### Neutral
- **Surface White** (#fbf8ff / oklch(0.98 0.005 280)): Main application background.
- **Card White** (#ffffff): Card and elevated surface backgrounds.
- **Surface Low** (#f4f2fc / oklch(0.96 0.006 280)): Table header rows, secondary surface.
- **Surface High** (#e8e7f1 / oklch(0.93 0.006 280)): Hover states on table rows, active drag zones.
- **Ink** (#1a1b22 / oklch(0.18 0.01 280)): Primary text color.
- **Ink Muted** (#444653 / oklch(0.35 0.01 280)): Secondary text, metadata labels.

### Semantic
- **Emerald** (#10b981): APPROVED status, success states.
- **Amber** (#f59e0b): PENDING status, TO_REDO, items requiring attention.
- **Rose** (#e11d48): REJECTED status, errors, critical alerts.
- **Gray** (#94a3b8): CANCELED status, DRAFT state, archival items.

### Named Rules
**The One Voice Rule.** Primary blue is used on ≤10% of any given screen. Its rarity is the point — it directs attention to exactly one action per view.

**The Status-Only Rule.** Emerald, amber, and rose are reserved exclusively for workflow status signals. Never use them for decorative elements, link colors, or UI chrome.

## 3. Typography

**Display Font:** Inter (with ui-sans-serif, system-ui, sans-serif fallback)
**Body Font:** Inter (same stack)
**Label/Mono Font:** Inter (tabular numbers enabled for data tables)

**Character:** A single sans-serif stack keeps the interface clean and uncluttered. Inter's exceptional legibility at small sizes makes it ideal for dense data tables. The scale uses aggressive weight contrast (700 → 600 → 400) rather than many size steps, creating clear hierarchy without wasting space.

### Hierarchy
- **Display** (700, 36px/44px, -0.02em letter-spacing): Dashboard welcome messages, page-level headings. Used once per page.
- **Headline** (600, 24px/32px): Section titles, modal headers, card titles.
- **Body Large** (400, 16px/24px): Welcome text, empty-state messages, file names.
- **Body** (400, 14px/20px): All standard text — table cells, descriptions, comments. Max line length 65–75ch.
- **Label** (600, 12px/16px, 0.02em letter-spacing): Table headers, metadata labels, button text, timestamps. Uppercase only on dedicated data labels, never on buttons.
- **Code** (400, 12px/16px): User IDs, report IDs, version numbers, file paths.

### Named Rules
**The Density Rule.** Body text never exceeds 14px in data views. The 12px label scale handles all metadata. This keeps data tables dense enough to be scannable without forcing horizontal scroll.

## 4. Elevation

The system uses tonal layering rather than drop shadows. Depth is conveyed through subtle shifts in the neutral palette — a surface one step higher in the scale (e.g., surface-container-low → surface-container) feels closer to the user without adding visual noise.

Three levels:
- **Level 0 — Canvas** (background/surface): The application backdrop. Plain, no border.
- **Level 1 — Containers** (surface-container-lowest with 1px outline-variant border): Cards, tables, panels. Flat, no shadow.
- **Level 2 — Overlays** (surface-container-lowest with 1px outline-variant border and `0 10px 15px -3px rgba(0,0,0,0.05)` shadow): Modals, dropdowns, popovers. The only surfaces with a shadow — the soft glow signals "this is temporary."

Interactive states use their own tonal shift: hover → surface-container-high, active/selected → surface-container-highest.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, focus) or for modals and dropdowns. A shadow on a resting card is a design error.

## 5. Components

### Buttons
- **Shape:** Gently squared (4px radius).
- **Primary:** Corporate Blue fill, white label (12px/600/16px). Hover shifts to Blue Container.
- **Secondary:** White fill, 1px outline-variant border, Ink text. Hover shifts background to Surface Low.
- **Ghost:** Transparent, Corporate Blue text. Hover adds Surface Low background.
- **Semantic action buttons** (Approved/Rejected/Redo/Cancel): Use the semantic color as background at 10% opacity with the full-color text. Hover intensifies the background to 20%.

### Status Badges
- **Style:** Pill-shaped (full radius), 10% opacity semantic background with full-color text. 12px/600/16px label.
- **Variants:** Emerald for APPROVED, Amber for PENDING, Rose for REJECTED, Gray for DRAFT/CANCELED, Blue for active states.
- **Usage:** Always inline within table cells or metadata rows. Never used as standalone hero elements.

### Data Tables
- **Structure:** Full-width, collapsed borders. 1px outline-variant bottom border on each row.
- **Header:** Surface Low background, label-md typography (12px/600, 0.02em letter-spacing). Sticky when scrolling.
- **Rows:** Card White background at rest. Hover shifts to Surface High. No zebra striping.
- **Cells:** body-md (14px/400). Status and date columns get fixed widths; title and type columns are fluid.
- **Pagination:** Compact bar at the bottom with label navigation and "Showing X-Y of Z" text in code-sm.

### Input Fields
- **Style:** White fill, 1px outline-variant border, 4px radius. body-md text.
- **Focus:** Border shifts to Corporate Blue with a 2px outer glow at 10% opacity.
- **Placeholder:** outline-variant color, body-md.
- **Error:** Rose border with error-container background tint.
- **Icon prefix:** Material Symbol at 18px, absolute-positioned 12px from left, outline color.

### File Upload Areas
- **Resting:** Dashed 2px outline-variant border, Surface Low background. Centered cloud-upload icon and "Drag & drop or click to browse" text.
- **Drag active:** Border shifts to Corporate Blue, background tints to Blue Tint (5% opacity).
- **Uploaded state:** Replaces the drop zone with a file chip showing name, size, and a remove button.

### Modals
- **Overlay:** 40% opacity Ink background with backdrop blur (4px).
- **Container:** Card White surface, 8px radius, outline-variant border.
- **Header:** Card White, bottom border. headline-sm title, close icon button top-right.
- **Footer:** Card White, top border. Right-aligned actions: Ghost Cancel + Primary Confirm.
- **Width:** Max 640px for standard forms, 800px for audit logs.

### Navigation (Sidebar)
- **Style:** Fixed left sidebar, 256px wide. Card White background, right border (outline-variant).
- **Items:** body-md text, 8px vertical padding, 16px horizontal. 8px radius on hover.
- **Active state:** Blue Container background with Blue Tint text. Bold weight.
- **Icon:** Material Symbol at 20px, left-aligned, 16px gap before label text.

### Notification Bell
- **Icon:** Material Symbol (notifications) at 24px. outline color, hover shifts to Ink.
- **Badge:** Rose dot (8px diameter) top-right when unread notifications exist.
- **Dropdown:** Card White, 4px radius, outline-variant border. 300px wide, max 400px tall with scroll. Each item shows message (body-md) and timestamp (code-sm, outline color).

### Timeline (Audit Log)
- **Vertical line:** 2px outline-variant stroke connecting nodes.
- **Nodes:** 12px filled circle, surface-variant color by default.
- **Entries:** Timestamp (code-sm, outline), action label (body-md, bold), status transition arrow ("DRAFT → PENDING"), actor ID (code-sm, outline).
- **Minimalist:** No background card on entries — just the line and text. The spare aesthetic communicates immutability.

## 6. Do's and Don'ts

### Do:
- **Do** use tonal layering for depth. Surface-container-low → surface-container → surface-container-high replaces shadows.
- **Do** use the primary blue sparingly (≤10% of screen). Its rarity signals what matters.
- **Do** keep tables dense. body-md (14px) for content, label-md (12px) for headers. Consistent 8px vertical padding.
- **Do** pillar badges for status. Full-radius pill, 10% semantic background, full-color text.
- **Do** show empty states with a brief message and the primary CTA when applicable.
- **Do** use Inter with tabular numbers in data columns so figures align vertically.

### Don't:
- **Don't** use Material Design patterns — no floating action buttons, no heavy card shadows, no bottom navigation.
- **Don't** apply border-left or border-right greater than 1px as a colored accent stripe on cards or list items. Use full borders, background tints, or nothing.
- **Don't** use gradient text (`background-clip: text`). One solid color. Emphasis via weight or size.
- **Don't** wrap everything in cards. Cards are for grouped data, not for every surface.
- **Don't** use emerald, amber, or rose for anything other than workflow status. They are signal, not decoration.
- **Don't** nest cards. A card inside a card is always wrong.
- **Don't** use the hero-metric template (big number, small label, supporting stat) — it is a SaaS cliché.
- **Don't** show audit trails in modals by default. The audit timeline should be visible inline or in a dedicated panel.
