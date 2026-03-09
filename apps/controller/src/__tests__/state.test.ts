import test from "node:test";
import assert from "node:assert/strict";
import { createInitialMultiState } from "../state/multiState";

test("createInitialMultiState creates performer dictionary", () => {
  const state = createInitialMultiState([
    { id: "nova", displayName: "Nova" },
    { id: "echo", displayName: "Echo" }
  ]);

  assert.ok(state.performers.nova);
  assert.ok(state.performers.echo);
  assert.equal(state.stage.mode, "idle");
});
