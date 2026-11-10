import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";

describe("browser bundle", () => {
  it("registers and renders the element from the IIFE bundle", async () => {
    const code = await readFile(
      new URL("../dist/form-uploader.global.js", import.meta.url),
      "utf8",
    );
    const window = new Window();
    window.eval(code);
    assert.equal(typeof window.customElements.get("form-uploader"), "function");
    const el = window.document.createElement("form-uploader");
    window.document.body.appendChild(el);
    assert.equal(el.shadowRoot.querySelectorAll("[data-field]").length, 4);
  });
});
