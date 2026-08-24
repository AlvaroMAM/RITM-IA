---
name: Andalusian Learning Initiative
colors:
  surface: '#f9f9fc'
  surface-dim: '#dadadc'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#3f4943'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#6f7a73'
  outline-variant: '#bec9c1'
  surface-tint: '#006c4d'
  primary: '#00523a'
  on-primary: '#ffffff'
  primary-container: '#006d4e'
  on-primary-container: '#94ebc4'
  inverse-primary: '#81d7b1'
  secondary: '#27609d'
  on-secondary: '#ffffff'
  secondary-container: '#89bcff'
  on-secondary-container: '#004a86'
  tertiary: '#3f4a42'
  on-tertiary: '#ffffff'
  tertiary-container: '#566259'
  on-tertiary-container: '#d0ddd1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9df4cd'
  primary-fixed-dim: '#81d7b1'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#005139'
  secondary-fixed: '#d3e4ff'
  secondary-fixed-dim: '#a3c9ff'
  on-secondary-fixed: '#001c38'
  on-secondary-fixed-variant: '#004882'
  tertiary-fixed: '#d9e6da'
  tertiary-fixed-dim: '#bdcabe'
  on-tertiary-fixed: '#131e17'
  on-tertiary-fixed-variant: '#3e4a41'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-base:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-adhd:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: 0.03em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  hit-area-min: 48px
  adhd-section-gap: 64px
---

## Brand & Style

The design system centers on a "Civic Modernist" aesthetic—a refined, accessible evolution of traditional institutional interfaces. It serves the Andalusian educational community by balancing the authority of the Junta de Andalucía with a welcoming, student-centric clarity. 

The visual narrative is built on **Institutional Minimalism**. It prioritizes extreme legibility, high-contrast interactive elements, and a calm, structured environment that reduces cognitive load. By stripping away non-essential decoration, the interface empowers students with ADHD and dyslexia to focus on content. The emotional response is one of reliability, inclusion, and organized progress.

## Colors

The palette is derived from the official identity of the Junta de Andalucía, optimized for WCAG 2.1 AAA compliance. 

- **Primary Green (#006D4E):** Used for primary actions, progress indicators, and institutional branding.
- **Secondary Blue (#004B87):** Used for navigation, links, and secondary interactive components.
- **Neutral Surface:** In light mode, surfaces use a soft off-white to reduce glare. In dark mode, a deep slate (#121212) is used to maintain contrast without harshness.
- **Accessibility Overlays:** 
    - **Colorblind-Safe:** All status indicators (success/error) must use both color and distinctive iconography.
    - **ADHD Tint:** A specific "Focus Mode" token replaces white backgrounds with a warm, low-contrast cream to soothe visual overstimulation.

## Typography

Typography is the core of this design system’s accessibility mission. 

- **Primary Stack:** **Plus Jakarta Sans** provides a friendly, modern feel for headings. **Atkinson Hyperlegible Next** is the default body face, specifically designed to increase character recognition.
- **Accessibility Roles:** 
    - **Dyslexia Support:** While Atkinson is the default, the system supports a global toggle to a specialized typeface if required by the user profile.
    - **ADHD Spacing:** The `body-adhd` token increases line height and letter spacing significantly to prevent "text crowding" and wandering focus.
    - **Monospaced Labels:** **JetBrains Mono** is used for metadata and technical labels to ensure distinct character differentiation (e.g., distinguishing '1', 'l', and 'I').

## Layout & Spacing

The layout follows a **Fluid Grid** with a strict 8px rhythmic baseline. 

- **Large Hit Areas:** Every interactive element (buttons, checkboxes, menu items) must maintain a minimum height/width of `hit-area-min` (48px) to accommodate motor-skill diversity and mobile usage.
- **Cognitive Pacing:** For students, content is grouped into clearly defined cards. In "Standard Mode," vertical spacing is tight; in "Focus/ADHD Mode," the `adhd-section-gap` is applied between modules to create a "one task at a time" visual flow.
- **Breakpoints:**
    - Mobile: <600px (1 column, 16px margins)
    - Tablet: 600px - 1024px (2 columns or sidebar-main layout)
    - Desktop: >1024px (12-column grid, max-width 1280px)

## Elevation & Depth

To maintain clarity and reduce visual "noise," this design system uses **Tonal Layers** and **Low-Contrast Outlines** instead of heavy drop shadows.

- **Surface Levels:** The background is the lowest level (Level 0). Content cards sit on Level 1, using a subtle 1px border (`#E0E0E0`) rather than a shadow. 
- **Active States:** Elevation is conveyed through color shifts (e.g., a card background darkening slightly on hover) and a 2px stroke in the Primary Green to indicate focus or selection. 
- **Modals:** Only critical alerts use a soft, wide ambient shadow (10% opacity) to pull the user's attention away from the background content.

## Shapes

The shape language is **Rounded (Level 2)**. 

- **Standard Elements:** Buttons and input fields use a 0.5rem (8px) radius. This provides a soft, approachable feel that is less "aggressive" than sharp corners, which helps in reducing testing anxiety in educational contexts.
- **Large Components:** Content cards and containers use `rounded-lg` (1rem / 16px) to clearly encapsulate learning modules.
- **Interactive Indicators:** Progress bars and toggles use pill-shaping (full rounding) to differentiate them from static content containers.

## Components

- **Buttons:** Bold, solid fills for primary actions. Use 18px bold text. Ghost buttons are reserved for "Cancel" or "Back" actions to maintain a clear primary path.
- **Progress Indicators:** Linear bars are preferred over radial ones for cognitive ease. They must include a percentage text label (e.g., "75% Complete") to ensure accessibility.
- **Learning Cards:** These are the primary containers for course content. They must feature a clear header, a brief description, and a high-contrast footer action.
- **Input Fields:** Use a 2px bottom border by default, which transforms into a full 2px stroke on focus. Labels must never disappear (use floating labels or fixed top labels).
- **Accessibility Overlays / Toggles:** A persistent, high-visibility icon (e.g., a person icon or gear) in the top-right corner allows users to toggle "ADHD Focus Mode," "High Contrast Mode," or "Dyslexia Font" at any time without leaving the current page.
- **Course Lists:** Vertical lists with large icons representing the subject matter. Each list item has a minimum height of 64px to ensure easy tapping.