---
name: Kinetic Dark
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#ffb59a'
  on-secondary: '#5a1b00'
  secondary-container: '#ff5e07'
  on-secondary-container: '#531900'
  tertiary: '#ffffff'
  on-tertiary: '#00363a'
  tertiary-container: '#7df4ff'
  on-tertiary-container: '#006f77'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#ffb59a'
  on-secondary-fixed: '#370e00'
  on-secondary-fixed-variant: '#802a00'
  tertiary-fixed: '#7df4ff'
  tertiary-fixed-dim: '#00dbe9'
  on-tertiary-fixed: '#002022'
  on-tertiary-fixed-variant: '#004f54'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
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
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  stack-xl: 40px
  margin-mobile: 16px
  margin-desktop: 32px
  gutter: 16px
---

## Brand & Style

The design system is engineered for high-performance athletic environments. It utilizes a **Modern Athletic Dark Mode** aesthetic, prioritizing legibility in low-light gym settings and high-movement scenarios. The brand personality is energetic, disciplined, and data-driven.

The style leans into **Minimalism** with a **High-Contrast** edge. It avoids unnecessary decoration to focus on performance metrics, using vibrant accents to pull the eye toward primary actions and progress indicators. The interface should feel like a high-end piece of fitness equipment: tactile, responsive, and precise.

## Colors

The palette is built on a "Deep Charcoal" foundation to reduce eye strain and maximize the pop of functional colors. 

- **Primary (Electric Lime):** Used for critical action buttons, active workout states, and primary progress bars.
- **Secondary (Vivid Orange):** Reserved for high-intensity alerts, "Break Record" notifications, or secondary CTA buttons.
- **Tertiary (Cyber Cyan):** Used specifically for "Rest" states and recovery metrics to provide a cooling visual contrast to the high-energy lime.
- **Neutral:** A tiered grayscale starting from `#0A0A0A` for the base background, using subtle shifts in lightness to define surface hierarchy.

## Typography

This design system uses **Inter** for all UI and instructional copy due to its exceptional legibility and modern geometric feel. For data-heavy elements, timers, and rep counters, **JetBrains Mono** is introduced to provide a "technical" and precise feel, ensuring that numbers do not shift horizontally (tabular figures) as they update during a workout.

**Key Rules:**
- Use `display-lg` for massive timer screens.
- Use `data-lg` for weight and rep inputs.
- All labels should be uppercase with slightly increased letter spacing to ensure clarity at small sizes.

## Layout & Spacing

The layout utilizes a **Fluid Grid** model centered on a 4px baseline. In a workout context, touch targets are prioritized, meaning nothing interactive should be smaller than 48px in height.

- **Mobile:** 4-column grid with 16px side margins.
- **Tablet/Desktop:** 12-column grid.
- **Vertical Rhythm:** Use `stack-md` (16px) for most groupings, and `stack-lg` (24px) to separate distinct exercise blocks. 

The design should prioritize "Thumb-Zone" ergonomics, placing primary workout controls at the bottom 30% of the screen.

## Elevation & Depth

Depth is communicated through **Tonal Layers** rather than heavy shadows. In a dark athletic UI, shadows are often invisible; therefore, we use surface color shifts to indicate hierarchy.

1.  **Level 0 (Base):** `#0A0A0A` - Used for the main app background.
2.  **Level 1 (Card):** `#1E1E1E` - Used for exercise cards and list items.
3.  **Level 2 (Active/Floating):** `#2A2A2A` - Used for active input fields or buttons.

**Outlines:** Use "Ghost Borders" (1px solid white at 10% opacity) for cards to provide definition without adding visual noise. For active states, replace the ghost border with a 2px `primary_color` border.

## Shapes

The design system uses a **Soft** shape language (`0.25rem` or `4px` base radius). This maintains a professional, high-performance "tech" feel that is sharper than consumer lifestyle apps but more approachable than a purely brutalist industrial interface.

- **Buttons:** 4px radius (Standard), 8px radius (Large).
- **Cards:** 12px radius.
- **Progress Bars:** Fully rounded (caps) to differentiate them from structural containers.

## Components

### Buttons
- **Primary:** Background `primary_color_hex`, Text `#000000` (Black). Weight: Bold.
- **Secondary:** Transparent background, 2px border of `primary_color_hex`, Text `primary_color_hex`.
- **Tertiary (Rest):** Background `tertiary_color_hex`, Text `#000000`.

### Status Badges
High-contrast pill shapes for quick scanning:
- **Active:** Electric Lime background, Black text.
- **Resting:** Cyber Cyan background, Black text.
- **Completed:** Green background, White text.
- **Upcoming:** Border only, White text.

### Progress Bars
- **Track:** Background `#2A2A2A`.
- **Indicator:** `primary_color_hex` for workout progress, `tertiary_color_hex` for rest countdowns.
- **Height:** 8px for standard, 4px for secondary metrics.

### Input Fields (Workout Data)
- **Style:** Large, centered text. Bottom-border only or fully enclosed with `#2A2A2A` background.
- **Focus:** Border changes to `primary_color_hex`.

### Muscle-Group Icons
- **Style:** Monolinear, 2px stroke width.
- **Active State:** Fill icon with 20% opacity of `primary_color_hex` and 100% opacity stroke.