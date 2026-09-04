/** Action types that always require human approval, enforced in application code. */
export const CONSEQUENTIAL_ACTIONS = new Set([
  'rollback',
  'prepare_rollback',
  'restart_service',
  'contact_customer',
  'close_incident',
  'change_severity',
  'execute_rollback',
]);

export function isConsequentialAction(action: string): boolean {
  return CONSEQUENTIAL_ACTIONS.has(action.trim().toLowerCase());
}
