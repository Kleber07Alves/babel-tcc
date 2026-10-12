import { describe, it, expect } from 'vitest';
import { describeError } from '../../src/services/errorMessage';

describe('describeError', () => {
  it('should return the message of an Error', () => {
    expect(describeError(new Error('core crashed'))).toBe('core crashed');
  });

  it('should return the message of an Error subclass', () => {
    expect(describeError(new TypeError('not a function'))).toBe('not a function');
  });

  it('should return a thrown string unchanged', () => {
    expect(describeError('plain failure')).toBe('plain failure');
  });

  it('should stringify a thrown value that is not an Error', () => {
    expect(describeError(42)).toBe('42');
    expect(describeError(undefined)).toBe('undefined');
  });
});
