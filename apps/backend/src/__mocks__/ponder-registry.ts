/**
 * Mock for ponder:registry — collects handler registrations without running Ponder.
 *
 * ponder.on() stores the callback; tests can import handlers that call ponder.on()
 * without side effects.
 */
const handlers = new Map<string, Function>();

export const ponder = {
  on(name: string, fn: Function) {
    handlers.set(name, fn);
  },
};
