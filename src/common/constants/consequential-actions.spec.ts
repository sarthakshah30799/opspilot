import { isConsequentialAction } from './consequential-actions.js';

describe('consequential actions', () => {
  it('flags rollback-style actions as consequential', () => {
    expect(isConsequentialAction('prepare_rollback')).toBe(true);
    expect(isConsequentialAction('rollback')).toBe(true);
    expect(isConsequentialAction('gather_more_information')).toBe(false);
  });
});
