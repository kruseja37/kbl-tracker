import { describe, expect, test } from "vitest";

import { createResilientAuthStorage } from "../../../supabase";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  onSet?: (key: string, value: string) => void;

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.onSet?.(key, value);
    this.values.set(key, value);
  }
}

describe("Supabase auth storage", () => {
  const tokenKey = "sb-project-auth-token";

  test("uses persistent local storage during an ordinary token write", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    session.setItem(tokenKey, "stale-session-token");
    const storage = createResilientAuthStorage({ local, session });

    storage.setItem(tokenKey, "persistent-token");

    expect(local.getItem(tokenKey)).toBe("persistent-token");
    expect(session.getItem(tokenKey)).toBeNull();
    expect(storage.getItem(tokenKey)).toBe("persistent-token");
  });

  test("falls back to the current tab when Chrome rejects a quota-exceeded token write", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    local.setItem(tokenKey, "stale-local-token");
    local.onSet = () => {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    };
    const storage = createResilientAuthStorage({ local, session });

    storage.setItem(tokenKey, "current-session-token");

    expect(session.getItem(tokenKey)).toBe("current-session-token");
    expect(storage.getItem(tokenKey)).toBe("current-session-token");
  });

  test("removes only the requested auth key from both stores", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    local.setItem(tokenKey, "local-token");
    local.setItem("league-data", "preserve-local");
    session.setItem(tokenKey, "session-token");
    session.setItem("draft-data", "preserve-session");
    const storage = createResilientAuthStorage({ local, session });

    storage.removeItem(tokenKey);

    expect(local.getItem(tokenKey)).toBeNull();
    expect(session.getItem(tokenKey)).toBeNull();
    expect(local.getItem("league-data")).toBe("preserve-local");
    expect(session.getItem("draft-data")).toBe("preserve-session");
  });

  test("does not hide non-quota storage failures", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    local.onSet = () => {
      throw new DOMException("Storage denied", "SecurityError");
    };
    const storage = createResilientAuthStorage({ local, session });

    expect(() => storage.setItem(tokenKey, "token")).toThrow("Storage denied");
    expect(session.getItem(tokenKey)).toBeNull();
  });
});
