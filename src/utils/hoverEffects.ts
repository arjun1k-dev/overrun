// ============================================================
// Enhanced Hover Effects for Tactical Components
// ============================================================

// Hover effect class combinations to use in components

export const hoverEffects = {
  // Card hover effects
  card: "hover-card hover-lift",

  // Button hover effects by type
  buttonPrimary: "hover-btn-primary hover-shimmer",
  buttonSuccess: "hover-scale hover-success-glow",
  buttonWarning: "hover-scale hover-warning-glow",
  buttonDanger: "hover-scale hover-danger-glow",
  buttonPurple: "hover-scale hover-purple-glow",

  // Icon hover effects
  icon: "hover-icon",
  iconSpin: "hover-icon-spin",

  // Interactive elements
  interactive: "hover-interactive",
  ripple: "hover-ripple",

  // Special effects
  glow: "hover-glow",
  borderGlow: "hover-border-glow",
  shimmer: "hover-shimmer",
  blur: "hover-blur",

  // Text effects
  textGlow: "hover-text-glow"
};

// Helper function to combine base classes with hover effects
export function withHover(baseClasses: string, hoverType: keyof typeof hoverEffects) {
  return `${baseClasses} ${hoverEffects[hoverType]}`;
}

// Usage example:
// <div className={withHover("tactical-card p-4", "card")} />
