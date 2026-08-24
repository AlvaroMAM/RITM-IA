---
name: RITM-IA
colors:
  surface: '#fff9e8'
  surface-dim: '#e0dac6'
  surface-bright: '#fff9e8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf4df'
  surface-container: '#f4eeda'
  surface-container-high: '#eee8d4'
  surface-container-highest: '#e8e2cf'
  on-surface: '#1e1c10'
  on-surface-variant: '#414848'
  inverse-surface: '#333123'
  inverse-on-surface: '#f7f1dc'
  outline: '#727878'
  outline-variant: '#c1c8c7'
  surface-tint: '#476363'
  primary: '#032121'
  on-primary: '#ffffff'
  primary-container: '#1a3636'
  on-primary-container: '#829f9f'
  inverse-primary: '#aecccc'
  secondary: '#6f5b3d'
  on-secondary: '#ffffff'
  secondary-container: '#f6dcb5'
  on-secondary-container: '#736041'
  tertiary: '#0d2113'
  on-tertiary: '#ffffff'
  tertiary-container: '#223627'
  on-tertiary-container: '#899f8b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cae8e8'
  primary-fixed-dim: '#aecccc'
  on-primary-fixed: '#022020'
  on-primary-fixed-variant: '#304b4b'
  secondary-fixed: '#f9dfb8'
  secondary-fixed-dim: '#dcc39e'
  on-secondary-fixed: '#261903'
  on-secondary-fixed-variant: '#554427'
  tertiary-fixed: '#d1e9d2'
  tertiary-fixed-dim: '#b5cdb7'
  on-tertiary-fixed: '#0c2012'
  on-tertiary-fixed-variant: '#374c3b'
  background: '#fff9e8'
  on-background: '#1e1c10'
  surface-variant: '#e8e2cf'
typography:
  display-lg:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md-mobile:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Source Serif 4
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Literata
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 32px
  body-md:
    fontFamily: Literata
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 28px
  label-md:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Work Sans
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
  unit: 8px
  container-max: 1120px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  section-gap: 80px
---

## Brand & Style
The brand personality of the design system is intellectual, scholarly, and deeply rooted in a sense of timelessness. It bridges the gap between historical academic prestige and modern digital accessibility. The target audience includes students, educators, and researchers who value clarity, focus, and a sophisticated learning environment.

The design style is **Minimalist with Editorial influence**. It prioritizes heavy whitespace and superior typography to create a calm, distraction-free atmosphere. It avoids unnecessary ornamentation, relying instead on high-quality typesetting and a restrained color palette to communicate authority and elegance. The emotional response should be one of quiet confidence, reliability, and intellectual clarity.

## Colors
The color palette is inspired by traditional library materials and natural pigments. 

- **Primary**: A deep, scholarly forest green used for primary actions, headings, and core branding elements.
- **Secondary**: A muted parchment gold used for subtle accents, highlights, and secondary interactive states.
- **Tertiary**: A soft sage green used for supportive information and decorative borders.
- **Neutral**: A warm cream base (Parchment) that replaces pure white to reduce eye strain during long reading sessions.

Backgrounds should primarily utilize the neutral cream, with the primary color reserved for high-contrast text and critical UI components.

## Typography
Typography is the cornerstone of this design system. We use a tiered serif approach to maximize readability and establish an authoritative voice.

- **Headlines (Source Serif 4)**: Used for all major titles. It conveys a professional and trustworthy academic tone.
- **Body (Literata)**: Specifically chosen for long-form reading comfort. Its "bookish" quality makes digital learning feel natural and effortless.
- **Labels (Work Sans)**: Used for functional UI elements like buttons, navigation, and metadata. The sans-serif contrast provides immediate clarity for utility-based interactions.

Maintain generous line heights for body text (minimum 1.6x) to preserve the editorial feel.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for desktop to maintain optimal line lengths for reading, transitioning to a fluid model for mobile devices.

- **Desktop**: A 12-column grid with a maximum width of 1120px. Centering the content creates a focused, scholarly "manuscript" feel.
- **Spacing Rhythm**: Based on an 8px base unit. Use larger gaps (section-gap) between distinct content blocks to allow the design to "breathe."
- **Mobile**: Margins reduce to 16px. Typography should reflow to the mobile-specific tokens defined in the typography section.

## Elevation & Depth
This design system avoids heavy shadows and floating effects, opting for **Tonal Layers** and **Low-Contrast Outlines**.

Depth is communicated through:
1.  **Background Shifts**: Using subtle variations of the neutral palette (e.g., a slightly darker cream for a sidebar).
2.  **Fine Rules**: 1px borders in the tertiary color or a low-opacity version of the primary color to define boundaries.
3.  **Inclusion**: Cards do not "float" with shadows; they are defined by their borders or a subtle background tint change. This maintains the "flat paper" aesthetic.

## Shapes
The shape language is **Soft**. We use minimal rounding to maintain a classic, structured appearance without appearing sharp or aggressive.

- Small elements like checkboxes and tags use a 0.25rem radius.
- Larger containers like cards or input fields use a maximum of 0.5rem.
- Avoid fully rounded "pill" shapes, as they conflict with the traditional academic aesthetic.

## Components
Components should feel like parts of a well-edited journal.

- **Buttons**: Primary buttons are solid blocks of the Primary color with secondary-colored text. Secondary buttons use a fine 1px border. No heavy gradients.
- **Input Fields**: Soft-cornered rectangles with a subtle 1px border. Focus states use a slightly thicker primary border and a soft tertiary glow.
- **Lists**: Use elegant dividers (1px) between items. Leading icons should be minimal and monochromatic.
- **Chips/Tags**: Small, low-contrast capsules using the secondary or tertiary colors with Label-md typography.
- **Cards**: Defined by 1px borders or a slight background fill. Content within cards should follow the primary typography hierarchy.
- **Progress Indicators**: Thin, elegant lines rather than thick bars, reinforcing the refined nature of the design.