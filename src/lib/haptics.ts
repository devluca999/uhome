export const haptic = {
  light: () => navigator.vibrate?.(6),
  medium: () => navigator.vibrate?.(12),
  success: () => navigator.vibrate?.([6, 40, 6]),
}
