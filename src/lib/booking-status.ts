/**
 * Shared booking status constants — single source of truth.
 *
 * Rules:
 * - operational_status: UPPERCASE strings (from bookings table)
 * - driver_execution_status: lowercase strings (from assignments table)
 * - These values must match the backend enum/DB values exactly.
 * - DO NOT invent new values. If backend adds a value, add it here first.
 *
 * Last verified: 2026-03-09
 */

// ── Operational status (bookings.operational_status) ─────────────────────
export const OP_STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  dot: string;
}> = {
  PENDING_CUSTOMER_CONFIRMATION: {
    label: 'Confirming',
    color: '#F59E0B',
    bg:    'rgba(245,158,11,0.15)',
    dot:   '#F59E0B',
  },
  AWAITING_CONFIRMATION: {
    label: 'Awaiting Confirmation',
    color: '#F59E0B',
    bg:    'rgba(245,158,11,0.15)',
    dot:   '#F59E0B',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: '#22C55E',
    bg:    'rgba(34,197,94,0.15)',
    dot:   '#22C55E',
  },
  COMPLETED: {
    label: 'Completed',
    color: '#6366F1',
    bg:    'rgba(99,102,241,0.15)',
    dot:   '#6366F1',
  },
  FULFILLED: {
    label: 'Fulfilled',
    color: '#9CA3AF',
    bg:    'rgba(156,163,175,0.12)',
    dot:   '#9CA3AF',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#EF4444',
    bg:    'rgba(239,68,68,0.15)',
    dot:   '#EF4444',
  },
  PAYMENT_FAILED: {
    label: 'Pay Failed',
    color: '#EF4444',
    bg:    'rgba(239,68,68,0.15)',
    dot:   '#EF4444',
  },
};

// ── Driver execution status (assignments.driver_execution_status) ─────────
// All values are LOWERCASE — exactly as returned by backend
export const DRIVER_EXEC_STATUS: Record<string, { label: string; color: string; emoji: string }> = {
  assigned: {
    label: 'Driver Assigned',
    color: '#60A5FA',
    emoji: '🚗',
  },
  accepted: {
    label: 'Driver Accepted',
    color: '#60A5FA',
    emoji: '✅',
  },
  on_the_way: {
    label: 'Driver En Route',
    color: '#60A5FA',
    emoji: '🚗',
  },
  arrived: {
    label: 'Driver Arrived',
    color: '#F97316',
    emoji: '📍',
  },
  passenger_on_board: {
    label: 'Passenger On Board',
    color: '#A78BFA',
    emoji: '🎉',
  },
  job_done: {
    label: 'Trip Complete',
    color: '#22C55E',
    emoji: '✓',
  },
};

// ── Cancellable operational statuses ─────────────────────────────────────
export const CANCELLABLE_STATUSES = [
  'PENDING_CUSTOMER_CONFIRMATION',
  'AWAITING_CONFIRMATION',
  'CONFIRMED',
] as const;

// ── Confirmable (customer confirm action) ─────────────────────────────────
export const CUSTOMER_CONFIRMABLE_STATUSES = [
  'PENDING_CUSTOMER_CONFIRMATION',
] as const;

// ── Terminal statuses (hide driver status section) ────────────────────────
export const TERMINAL_STATUSES = [
  'COMPLETED',
  'FULFILLED',
  'CANCELLED',
  'PAYMENT_FAILED',
] as const;
