export async function runCompanionTradeWrite<T>(input: {
  pull: () => Promise<void>;
  write: () => Promise<T>;
  refreshAfterFailure: () => Promise<void>;
}): Promise<T> {
  try {
    await input.pull();
    return await input.write();
  } catch (cause) {
    try {
      await input.refreshAfterFailure();
    } catch {
      // Preserve the mutation failure: it is the action the user must retry.
    }
    throw cause;
  }
}
