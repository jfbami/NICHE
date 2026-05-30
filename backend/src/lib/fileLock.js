const lockChains = new Map();

export function withLock(key, task) {
  const previous = lockChains.get(key) || Promise.resolve();
  const next = previous.then(task, task);
  lockChains.set(key, next.catch(() => {}));
  return next;
}
