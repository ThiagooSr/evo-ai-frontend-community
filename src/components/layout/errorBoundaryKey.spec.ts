import { describe, expect, it } from 'vitest';
import { errorBoundaryKey } from './errorBoundaryKey';

describe('errorBoundaryKey', () => {
  it('keeps the conversations list and every open conversation on the same key', () => {
    expect(errorBoundaryKey('/conversations')).toBe('/conversations');
    expect(errorBoundaryKey('/conversations/06b8608c-f0e5-4147-a33f-4cfe559475f7')).toBe('/conversations');
    expect(errorBoundaryKey('/conversations/123/')).toBe('/conversations');
  });

  it('keeps one key per URL for every other page', () => {
    expect(errorBoundaryKey('/contacts')).toBe('/contacts');
    expect(errorBoundaryKey('/contacts/42')).toBe('/contacts/42');
    expect(errorBoundaryKey('/pipelines/7')).toBe('/pipelines/7');
  });

  it('does not collapse routes that only share the prefix', () => {
    expect(errorBoundaryKey('/conversations-archive')).toBe('/conversations-archive');
  });
});
