import { describe, expect, it } from 'vitest';
import { createLatestRequestGate } from './latestRequestGate';

describe('createLatestRequestGate', () => {
  it('treats the only request in flight as the latest', () => {
    const gate = createLatestRequestGate();
    const token = gate.begin();

    expect(gate.isLatest(token)).toBe(true);
  });

  it('rejects an older request once a newer one has begun, whatever order they finish in', () => {
    const gate = createLatestRequestGate();
    const unfiltered = gate.begin();
    const filtered = gate.begin();

    expect(gate.isLatest(filtered)).toBe(true);
    expect(gate.isLatest(unfiltered)).toBe(false);
  });

  it('keeps gates independent', () => {
    const a = createLatestRequestGate();
    const b = createLatestRequestGate();
    const tokenA = a.begin();
    b.begin();
    b.begin();

    expect(a.isLatest(tokenA)).toBe(true);
  });

  it('lets follow-up work (load more, resync) bind to the current request without starting a new one', () => {
    const gate = createLatestRequestGate();
    gate.begin();
    const followUp = gate.current();

    expect(gate.isLatest(followUp)).toBe(true);
    gate.begin();
    expect(gate.isLatest(followUp)).toBe(false);
  });
});
