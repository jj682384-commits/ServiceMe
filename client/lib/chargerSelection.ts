let _pending: { name: string; address: string; miles: number } | null = null;

export function setPendingCharger(c: { name: string; address: string; miles: number }) {
  _pending = c;
}

export function consumePendingCharger(): { name: string; address: string; miles: number } | null {
  const val = _pending;
  _pending = null;
  return val;
}
