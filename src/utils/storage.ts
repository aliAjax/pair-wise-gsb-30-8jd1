// localStorage 读写小工具：各模块分开存，重开页面后可接着办

export function loadList<T>(key: string): T[] | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as T[]) : null;
  } catch {
    return null;
  }
}

export function saveList<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadValue<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveValue<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
