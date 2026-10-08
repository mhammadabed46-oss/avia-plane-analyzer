/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#102331',
    tint: '#087D8B',

    // Core surfaces
    background: '#F3F7F8',
    foreground: '#102331',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#102331',

    // Primary action color (buttons, links, active states)
    primary: '#087D8B',
    primaryForeground: '#FFFFFF',
    primarySoft: '#DDF2F2',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E7EFF1',
    secondaryForeground: '#17303F',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EDF2F4',
    mutedForeground: '#71818C',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#E4F4F3',
    accentForeground: '#17303F',

    // Destructive actions (delete, error states)
    destructive: '#C84448',
    destructiveForeground: '#FFFFFF',
    warning: '#CF9137',
    warningSoft: '#F9EFD9',
    success: '#28B982',

    // Borders and input outlines
    border: '#DDE5E8',
    input: '#DDE5E8',
    heroTop: '#0A1B28',
    heroBottom: '#15364A',
  },

  dark: {
    text: '#F0F6F8',
    tint: '#4FD1D0',
    background: '#0B141C',
    foreground: '#ECF3F6',
    card: '#121F29',
    cardForeground: '#ECF3F6',
    primary: '#4FD1D0',
    primaryForeground: '#09232B',
    primarySoft: '#1C3A42',
    secondary: '#1D2C37',
    secondaryForeground: '#E5EEF2',
    muted: '#1C2A35',
    mutedForeground: '#94A6B3',
    accent: '#18353B',
    accentForeground: '#E5EEF2',
    destructive: '#EE7777',
    destructiveForeground: '#2A1115',
    warning: '#F0B457',
    warningSoft: '#342B1F',
    success: '#45D6A3',
    border: '#273744',
    input: '#273744',
    heroTop: '#08131B',
    heroBottom: '#102838',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 14,
};

export default colors;
