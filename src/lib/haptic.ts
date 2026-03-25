/**
 * Haptic feedback via navigator.vibrate().
 * Silently fails on unsupported devices.
 */
export function hapticLight(): void {
  try {
    navigator?.vibrate?.(10)
  } catch { /* unsupported */ }
}

export function hapticMedium(): void {
  try {
    navigator?.vibrate?.(25)
  } catch { /* unsupported */ }
}

export function hapticSuccess(): void {
  try {
    navigator?.vibrate?.([10, 50, 20])
  } catch { /* unsupported */ }
}

export function hapticError(): void {
  try {
    navigator?.vibrate?.([50, 30, 50])
  } catch { /* unsupported */ }
}
