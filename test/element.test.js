import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("element entry", () => {
  it("imports safely outside a browser and exports its API", async () => {
    const mod = await import("../dist/element.js");
    assert.equal(mod.ELEMENT_NAME, "form-uploader");
    assert.equal(mod.SUBMIT_EVENT, "form-submit");
    assert.equal(typeof mod.FormUploaderElement, "function");
  });
});
