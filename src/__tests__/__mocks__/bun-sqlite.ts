class MockStatement {
  run(..._args: unknown[]) { return; }
  all(..._args: unknown[]) { return []; }
  get(..._args: unknown[]) { return {}; }
}

class MockDatabase {
  exec(_sql: string) { return this; }
  prepare(_sql: string) { return new MockStatement(); }
  close() { return; }
}

export function Database(_path: string, _opts?: unknown) {
  return new MockDatabase();
}
