---
name: ReportFlow Structural System
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fc'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1eb'
  on-surface: '#1a1b22'
  on-surface-variant: '#444653'
  inverse-surface: '#2f3037'
  inverse-on-surface: '#f1f0fa'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#611e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#872d00'
  on-tertiary-container: '#ffa583'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#802a00'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1eb'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for high-density information environments where clarity, speed of comprehension, and reliability are paramount. The brand personality is authoritative yet secondary to the data it presents; the UI acts as a precise tool rather than a decorative layer.

The design style follows a **Corporate / Modern** approach with a focus on **Systematic Minimalism**. It utilizes a rigorous grid, deliberate whitespace to prevent cognitive overload, and a restrained use of color to ensure that semantic signals (status changes, errors, alerts) are immediately identifiable. The aesthetic reflects an "institutional" quality—sturdy, predictable, and frictionless.

## Colors

The palette is anchored by **Corporate Blue (#1E40AF)**, used strategically for primary actions and active states to denote focus and intent. The background and surface architecture rely on a **Slate** neutral scale, providing a sophisticated, low-fatigue environment for long-form data review.

Semantic colors are strictly reserved for functional status:
- **Emerald (#10B981):** Successful completions, approved workflows, and "Go" states.
- **Amber (#F59E0B):** Pending actions requiring attention, warnings, and transitions.
- **Rose (#E11D48):** Rejections, critical errors, and required "Redo" actions.
- **Gray (#94A3B8):** Canceled items, drafts, or archival information.

## Typography

This design system utilizes **Inter** exclusively for its exceptional legibility in data-heavy contexts. The type scale is built on a modular 4px baseline. 

- **Display & Headlines:** Use Semi-Bold (600) or Bold (700) weights with slightly tighter letter spacing to create a strong visual hierarchy for report titles and dashboard headers.
- **Body Text:** Primarily uses `body-md` (14px) for standard data display to maintain high density without sacrificing readability.
- **Labels:** Small caps or bolded 12px labels are used for table headers and metadata descriptions to differentiate them from dynamic user content.
- **Monospace-like Utility:** While Inter is sans-serif, its tabular numeric features should be enabled for all data tables to ensure columns of figures align vertically.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a 12-column structure for desktop interfaces. 

- **Desktop (1280px+):** 12 columns, 20px gutters, 32px side margins.
- **Tablet (768px - 1279px):** 8 columns, 16px gutters, 24px side margins.
- **Mobile (<767px):** 4 columns, 12px gutters, 16px side margins.

A strict 4px / 8px spacing rhythm is applied to all internal component padding. High-density views (like Audit Timelines) use the `sm` (8px) unit, while document views use `md` (16px) or `lg` (24px) to increase focus and breathing room.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows. This preserves the "flat" and efficient feel of an enterprise tool.

- **Level 0 (Background):** Slate 50. Used for the main application canvas.
- **Level 1 (Cards/Tables):** White (#FFFFFF) surface with a 1px border of Slate 200. No shadow.
- **Level 2 (Modals/Dropdowns):** White surface with a 1px border of Slate 200 and a soft, "Large" ambient shadow (0px 10px 15px -3px rgba(0,0,0,0.05)).
- **Interactive States:** Hovering over list items or table rows should trigger a background shift to Slate 100, providing immediate tactile feedback without changing elevation.

## Shapes

The design system employs a **Soft (1)** shape language. The subtle rounding (4px) softens the clinical nature of the data while maintaining a professional, structured silhouette.

- **Standard Elements (Buttons, Inputs, Small Cards):** 0.25rem (4px).
- **Large Containers (Panels, Sections):** 0.5rem (8px).
- **Status Badges:** Fully rounded (pill) to distinguish them from interactive buttons or square data cells.

## Components

### Data Tables
Tables are the core of this design system. Use a "Zebra-stripe" alternative: instead of alternating row colors, use a 1px Slate 200 bottom border for all rows. Table headers use `label-md` with a Slate 100 background. Use fixed-width columns for status and date, and fluid columns for report names.

### Status Badges
Small, pill-shaped indicators using a "Soft Fill" style: a 10% opacity version of the semantic color for the background, and the 100% color for the text (e.g., Success = 10% Emerald background + 100% Emerald text).

### Timeline Audits
A vertical line (Slate 200) connects nodes. Each node uses a 12px circle colored by status. Annotations use `body-md` for the activity description and `label-md` in Slate 500 for the timestamp and user ID.

### File Upload Areas
A dashed 2px border (Slate 300) on a Slate 50 background. The "active/drag" state transitions the border to Primary Blue and the background to a 5% Blue tint.

### Buttons
- **Primary:** Solid Corporate Blue with White text.
- **Secondary:** White fill with Slate 200 border and Slate 800 text.
- **Ghost:** Transparent background with Primary Blue text; used for secondary actions like "Cancel" or "Add Row".

### Input Fields
Inputs use a White background, Slate 300 border, and a 4px corner radius. On focus, the border shifts to Primary Blue with a 2px outer glow (Blue at 10% opacity).