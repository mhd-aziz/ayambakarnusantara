import { vi } from "vitest";
// Vitest jest-compat global
globalThis.jest = vi;
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Node 26 punya localStorage eksperimental (undefined tanpa flag) yang menimpa jsdom -> mock manual
const lsStore = {};
const lsMock = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
  clear: () => { for (const k in lsStore) delete lsStore[k]; },
  key: (i) => Object.keys(lsStore)[i] ?? null,
  get length() { return Object.keys(lsStore).length; },
};
Object.defineProperty(globalThis, "localStorage", { value: lsMock, configurable: true, writable: true });
