/**
 * Extracts a readable message from a value caught in a `catch` clause. JavaScript lets any value be
 * thrown, so the caught value is `unknown` and only an `Error` is guaranteed to carry a message.
 * @param caughtValue - The value received by the `catch` clause.
 * @returns The error message, or the string form of the value when it is not an `Error`.
 */
export function describeError(caughtValue: unknown): string {
  if (caughtValue instanceof Error) {
    return caughtValue.message;
  }
  return String(caughtValue);
}
