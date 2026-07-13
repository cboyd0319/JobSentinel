import assert from "node:assert/strict";
import { createServer } from "node:net";
import test from "node:test";
import {
  createPlaywrightEnv,
  findAvailablePlaywrightPort,
  mergeNodeOptions,
  preparePlaywrightEnv,
} from "../run-playwright.mjs";

async function listenOnLoopback() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return { port: address.port, server };
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("mergeNodeOptions suppresses only known upstream Node warnings", () => {
  assert.equal(mergeNodeOptions(""), "--disable-warning=DEP0205");
});

test("mergeNodeOptions preserves existing options without duplicating warning flags", () => {
  assert.equal(
    mergeNodeOptions("--trace-warnings --disable-warning=DEP0205"),
    "--trace-warnings --disable-warning=DEP0205",
  );
});

test("createPlaywrightEnv removes NO_COLOR for Playwright child processes", () => {
  const env = createPlaywrightEnv({
    NO_COLOR: "1",
    NODE_OPTIONS: "--trace-warnings",
    PATH: "/usr/bin",
  });

  assert.equal(env.NO_COLOR, undefined);
  assert.equal(env.NODE_OPTIONS, "--trace-warnings --disable-warning=DEP0205");
  assert.equal(env.PATH, "/usr/bin");
});

test("createPlaywrightEnv keeps FORCE_COLOR when present", () => {
  const env = createPlaywrightEnv({
    FORCE_COLOR: "1",
  });

  assert.equal(env.FORCE_COLOR, "1");
  assert.equal(env.NODE_OPTIONS, "--disable-warning=DEP0205");
});

test("findAvailablePlaywrightPort keeps an available preferred port", async () => {
  const { port, server } = await listenOnLoopback();
  await closeServer(server);

  assert.equal(await findAvailablePlaywrightPort(port), port);
});

test("findAvailablePlaywrightPort avoids an occupied preferred port", async () => {
  const { port, server } = await listenOnLoopback();
  try {
    const availablePort = await findAvailablePlaywrightPort(port);
    assert.notEqual(availablePort, port);
    assert.ok(Number.isInteger(availablePort));
    assert.ok(availablePort > 0);
  } finally {
    await closeServer(server);
  }
});

test("preparePlaywrightEnv selects a port and disables implicit reuse", async () => {
  const { port, server } = await listenOnLoopback();
  try {
    const env = await preparePlaywrightEnv({}, { preferredPort: port });
    assert.notEqual(env.PLAYWRIGHT_PORT, String(port));
    assert.equal(env.PLAYWRIGHT_REUSE_EXISTING_SERVER, "0");
  } finally {
    await closeServer(server);
  }
});

test("preparePlaywrightEnv rejects an occupied explicit port without reuse", async () => {
  const { port, server } = await listenOnLoopback();
  try {
    await assert.rejects(
      preparePlaywrightEnv({ PLAYWRIGHT_PORT: String(port) }),
      /already in use/,
    );
    const env = await preparePlaywrightEnv({
      PLAYWRIGHT_PORT: String(port),
      PLAYWRIGHT_REUSE_EXISTING_SERVER: "1",
    });
    assert.equal(env.PLAYWRIGHT_PORT, String(port));
    assert.equal(env.PLAYWRIGHT_REUSE_EXISTING_SERVER, "1");
  } finally {
    await closeServer(server);
  }
});
