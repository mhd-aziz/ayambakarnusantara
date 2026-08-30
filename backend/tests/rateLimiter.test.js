/**
 * rateLimiter.test.js — Exhaustive tests for createRateLimiter.
 * No DB required.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.payload = null;
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (payload) {
    this.payload = payload;
    return this;
  };
  return res;
}

describe("rateLimiter — basic enforcement", () => {
  it("allows requests up to max and blocks the next one with 429", () => {
    const { createRateLimiter } = require("../src/middlewares/rateLimiter");
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    const res = [mockRes(), mockRes(), mockRes()];
    const next = [vi.fn(), vi.fn(), vi.fn()];
    for (let i = 0; i < 3; i++) {
      limiter({ ip: "10.20.30.40", socket: {}, connection: {} }, res[i], next[i]);
    }
    expect(next[0]).toHaveBeenCalledTimes(1);
    expect(next[1]).toHaveBeenCalledTimes(1);
    expect(next[2]).not.toHaveBeenCalled();
    expect(res[2].statusCode).toBe(429);
    expect(res[2].payload.success).toBe(false);
  });

  it("isolates different IPs into separate buckets", () => {
    const { createRateLimiter } = require("../src/middlewares/rateLimiter");
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const resA = mockRes();
    const resB = mockRes();
    const nextA = vi.fn();
    const nextB = vi.fn();
    // IP A exhausts
    limiter({ ip: "192.168.0.101", socket: {}, connection: {} }, resA, nextA);
    limiter({ ip: "192.168.0.101", socket: {}, connection: {} }, resA, nextA);
    // IP B should still pass
    limiter({ ip: "192.168.0.102", socket: {}, connection: {} }, resB, nextB);
    expect(nextA).toHaveBeenCalledTimes(1);
    expect(resA.statusCode).toBe(429);
    expect(nextB).toHaveBeenCalledTimes(1);
    expect(resB.statusCode).toBe(200);
  });

  it("resets the bucket after the window expires (Date.now mock)", () => {
    const { createRateLimiter } = require("../src/middlewares/rateLimiter");
    const limiter = createRateLimiter({ windowMs: 1_000, max: 1 });
    const res1 = mockRes();
    const res2 = mockRes();
    const res3 = mockRes();
    const next1 = vi.fn();
    const next2 = vi.fn();
    const next3 = vi.fn();

    const originalNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;

    try {
      limiter({ ip: "10.0.0.99", socket: {}, connection: {} }, res1, next1);
      expect(next1).toHaveBeenCalledTimes(1);

      limiter({ ip: "10.0.0.99", socket: {}, connection: {} }, res2, next2);
      expect(next2).not.toHaveBeenCalled();
      expect(res2.statusCode).toBe(429);

      // Advance beyond window
      now += 1_500;
      limiter({ ip: "10.0.0.99", socket: {}, connection: {} }, res3, next3);
      expect(next3).toHaveBeenCalledTimes(1);
      expect(res3.statusCode).toBe(200);
    } finally {
      Date.now = originalNow;
    }
  });

  it("falls back to socket.remoteAddress and connection.remoteAddress when ip is missing", () => {
    const { createRateLimiter } = require("../src/middlewares/rateLimiter");
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const res1 = mockRes();
    const res2 = mockRes();
    const next1 = vi.fn();
    const next2 = vi.fn();
    limiter({ socket: { remoteAddress: "8.8.8.8" }, connection: {} }, res1, next1);
    limiter({ connection: { remoteAddress: "8.8.8.8" } }, res2, next2);
    expect(next1).toHaveBeenCalledTimes(1);
    // second request from same fallback IP should be blocked (counts as same bucket)
    expect(next2).not.toHaveBeenCalled();
    expect(res2.statusCode).toBe(429);
  });

  it("uses custom message when provided", () => {
    const { createRateLimiter } = require("../src/middlewares/rateLimiter");
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, message: "Custom limit hit" });
    const res1 = mockRes();
    const res2 = mockRes();
    limiter({ ip: "10.99.99.1", socket: {}, connection: {} }, res1, vi.fn());
    limiter({ ip: "10.99.99.1", socket: {}, connection: {} }, res2, vi.fn());
    expect(res2.payload.message).toBe("Custom limit hit");
  });

  it("ccreates limiter with defaults when called with no options", () => {
    const { createRateLimiter } = require("../src/middlewares/rateLimiter");
    const limiter = createRateLimiter();
    const res = mockRes();
    const next = vi.fn();
    limiter({ ip: "10.55.55.55", socket: {}, connection: {} }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it("treats 'unknown' bucket when no ip/socket/connection is available", () => {
    const { createRateLimiter } = require("../src/middlewares/rateLimiter");
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const res1 = mockRes();
    const res2 = mockRes();
    limiter({}, res1, vi.fn());
    limiter({}, res2, vi.fn());
    expect(res2.statusCode).toBe(429);
  });
});
