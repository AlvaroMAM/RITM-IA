---
name: Andalusian Academic Framework
colors:
  surface: '#fcf9f2'
  surface-dim: '#dcdad3'
  surface-bright: '#fcf9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ec'
  surface-container: '#f1eee7'
  surface-container-high: '#ebe8e1'
  surface-container-highest: '#e5e2db'
  on-surface: '#1c1c18'
  on-surface-variant: '#3f4941'
  inverse-surface: '#31312c'
  inverse-on-surface: '#f3f0e9'
  outline: '#6f7a71'
  outline-variant: '#bec9bf'
  surface-tint: '#046d40'
  primary: '#00502e'
  on-primary: '#ffffff'
  primary-container: '#006b3f'
  on-primary-container: '#91e9b1'
  inverse-primary: '#81d9a2'
  secondary: '#006d3d'
  on-secondary: '#ffffff'
  secondary-container: '#61fba3'
  on-secondary-container: '#007240'
  tertiary: '#6f3500'
  on-tertiary: '#ffffff'
  tertiary-container: '#934800'
  on-tertiary-container: '#ffcbaa'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9df5bd'
  primary-fixed-dim: '#81d9a2'
  on-primary-fixed: '#002110'
  on-primary-fixed-variant: '#00522f'
  secondary-fixed: '#64fea6'
  secondary-fixed-dim: '#41e18c'
  on-secondary-fixed: '#00210f'
  on-secondary-fixed-variant: '#00522d'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb785'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#723700'
  background: '#fcf9f2'
  on-background: '#1c1c18'
  surface-variant: '#e5e2db'
typography:
  display-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 280px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  stack-gap: 1rem
  section-gap: 2.5rem
---

## Brand & Style
The design system for the RITM-IA teacher portal is rooted in **Professional Institutionalism** with a focus on **Radical Accessibility**. The target audience is educators within the Andalusian education system who require a tool that is dependable, clear, and efficient for high-frequency daily use.

The style is **Modernized Modular**, taking the structural familiarity of traditional LMS platforms like Moodle and refining them through a clean, systematic lens. It prioritizes clarity over decoration, using whitespace and structural containment to reduce cognitive load. The emotional response is one of calm authority, ensuring teachers feel supported by a stable and inclusive digital environment.

## Colors
The palette is derived from the Andalusian institutional identity, utilizing "Junta Green" as the primary anchor.

- **Primary (#006B3F):** Used for navigation, primary actions, and branding. It ensures AA/AAA contrast ratios against light backgrounds.
- **Secondary (#00C372):** An accent green for progress indicators and success states.
- **Tertiary (#E87B1B):** A warm orange used sparingly for warnings, active unit highlights, or time-sensitive notifications.
- **Neutrals:** A warm-tinted neutral scale (`#F4F1EA`) replaces cold greys to create a more inviting, less "clinical" academic atmosphere.

Both Light and Dark modes utilize these core hues, with the dark mode shifting the neutral scale to deep forest-greys while maintaining the vibrancy of the primary green for interactive elements.

## Typography
Accessibility is the primary driver for typographic choices. This design system exclusively utilizes **Atkinson Hyperlegible Next** to ensure maximum character differentiation, which is critical for educators managing complex data and diverse student groups.

- **Scale:** A generous base size of 16px is used for body text to ensure readability across all devices.
- **Hierarchy:** Strong weight differentiation (Regular 400 vs Bold 700) is used to guide the eye through nested unit structures.
- **Spacing:** Paragraph spacing is set to 1.5x the line height to assist users with dyslexia or visual tracking difficulties.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model optimized for administrative dashboard tasks.

- **Sidebar:** A persistent 280px sidebar on the left houses the primary navigation and subject tree. It collapses into a hamburger menu on mobile.
- **Grid:** A 12-column grid is used for the main content area. Dashboard widgets typically span 4 columns (1/3 width) or 6 columns (1/2 width).
- **Subject/Unit Hierarchy:** Deeply nested content (Units within Subjects) uses a progressive indent system of 24px per level to maintain visual clarity in the course builder.
- **Safe Areas:** On mobile, margins reduce to 16px, and grid columns collapse into a single vertical stack.

## Elevation & Depth
Depth is communicated through **Tonal Layering** rather than heavy shadows, ensuring the UI remains clean and high-contrast.

- **Level 0 (Canvas):** The base background using the Neutral 50 shade.
- **Level 1 (Cards):** Pure white (light mode) or deep slate (dark mode) containers with a subtle 1px border in a slightly darker neutral shade.
- **Level 2 (Popovers/Modals):** These use a soft ambient shadow (8% opacity, 12px blur) to indicate temporary overlay status.
- **Interaction:** Hover states on interactive cards use a slight 2px vertical lift and a primary-colored border-left (4px width) to signify focus.

## Shapes
This design system uses a **Soft (0.25rem)** rounding strategy. This provides a professional, "system-like" feel that is more modern than sharp corners but remains more serious and structured than fully rounded "consumer" apps. 

- **Inputs & Buttons:** 4px (0.25rem) radius.
- **Cards:** 8px (0.5rem) radius to create a distinct container feel.
- **Search Bars:** Rounded-XL (12px) to distinguish utility elements from content elements.

## Components

### Buttons
- **Primary:** Solid Primary Green with White text. High contrast is mandatory.
- **Secondary:** Outlined Primary Green with 2px stroke.
- **Ghost:** Transparent background with Primary Green text, used for secondary sidebar actions.

### Cards (The "Moodle-Modern" Module)
- All course units and subjects are housed in cards.
- Cards feature a consistent header area for the "Unit Title" and a footer for "Progress/Status" badges.
- Use a left-accent border (4px) to color-code different subject categories.

### Chips & Badges
- Used for status (e.g., "Published", "Draft", "Late Submission").
- Backgrounds use 10% opacity of the status color (Green, Orange, Red) with 100% opacity text for the label.

### Input Fields
- Large tap targets (minimum 48px height).
- Labels are always persistent above the field (no floating labels) to ensure users never lose context, adhering to accessibility best practices.

### Sidebar Navigation
- Systematic list items with 20px icons on the left.
- Active states use a "Flood Fill" of the primary green with a white icon and text.
- Group headers (e.g., "MY CLASSES") use the Label-SM style in uppercase for clear sectioning.