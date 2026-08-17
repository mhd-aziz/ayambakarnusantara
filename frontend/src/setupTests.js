// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Test asli CRA memakai API `jest.*` (jest.fn / jest.mock / jest.spyOn dll).
// Vitest menyediakan API yang sama di `vi`. Alias global ini membuat test
// CRA berjalan tanpa mengubah isi file test satu per satu.
import { vi } from 'vitest';

globalThis.jest = vi;

// jsdom menyediakan localStorage; mock fallback kecil kalau environment
// tidak menyediakannya (mencegah crash AuthContext di test).
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
}

// jsdom 26 (Vitest) menjalankan constraint validation internal pada submit
// button (input `required` kosong -> submit diblokir), berbeda dengan jsdom 16
// (CRA) yang selalu men-dispatch submit. Karena jalur ini internal (tidak bisa
// di-patch dari luar), dua test "submit kosong" di Login/RegisterForm memakai
// fireEvent.submit(form) — lihat komentar di file test tersebut.