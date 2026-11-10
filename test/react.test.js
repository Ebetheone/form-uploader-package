import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.customElements = window.customElements;
globalThis.HTMLElement = window.HTMLElement;
globalThis.CustomEvent = window.CustomEvent;
globalThis.Event = window.Event;
globalThis.Node = window.Node;
globalThis.navigator = window.navigator;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = await import("react");
const { act, createElement, createRef } = React;
const { createRoot } = await import("react-dom/client");
const { FormUploader } = await import("../dist/react.js");

const roots = [];

async function render(node) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(node);
  });
  return container;
}

function type(el, name, value) {
  const input = el.shadowRoot.querySelector(`[data-field="${name}"]`);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function submit(el) {
  el.shadowRoot
    .querySelector("form")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    await act(async () => {
      root.unmount();
    });
  }
  document.body.innerHTML = "";
});

describe("react wrapper", () => {
  it("mounts the element with config and submit label", async () => {
    const container = await render(
      createElement(FormUploader, { fields: [{ name: "company" }], submitLabel: "Go" }),
    );
    const el = container.querySelector("form-uploader");
    assert.ok(el);
    assert.deepEqual(
      el.uploader.fields.map((field) => field.name),
      ["company"],
    );
    assert.equal(el.getAttribute("submit-label"), "Go");
  });

  it("calls onSubmit with the detail on valid submit", async () => {
    let fired = null;
    const container = await render(createElement(FormUploader, { onSubmit: (d) => (fired = d) }));
    const el = container.querySelector("form-uploader");
    type(el, "name", "Ada");
    type(el, "email", "ada@example.com");
    type(el, "phone", "+123");
    submit(el);
    assert.ok(fired);
    assert.equal(fired.values.name, "Ada");
  });

  it("calls onChange with snapshots on input", async () => {
    const seen = [];
    const container = await render(createElement(FormUploader, { onChange: (d) => seen.push(d) }));
    type(container.querySelector("form-uploader"), "name", "Ada");
    assert.equal(seen.length, 1);
    assert.equal(seen[0].values.name, "Ada");
  });

  it("keeps typed values when rerendered with an equal inline config", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    await act(async () => {
      root.render(createElement(FormUploader, { fields: [{ name: "x" }] }));
    });
    const el = container.querySelector("form-uploader");
    type(el, "x", "hello");
    await act(async () => {
      root.render(createElement(FormUploader, { fields: [{ name: "x" }] }));
    });
    assert.equal(el.uploader.getValues().x, "hello");
  });

  it("exposes reset and validate through a ref", async () => {
    const ref = createRef();
    const container = await render(createElement(FormUploader, { ref }));
    const el = container.querySelector("form-uploader");
    assert.equal(ref.current.validate().valid, false);
    type(el, "name", "Ada");
    type(el, "email", "ada@example.com");
    type(el, "phone", "+123");
    assert.equal(ref.current.validate().valid, true);
    ref.current.reset();
    assert.deepEqual(ref.current.getValues(), { name: "", email: "", phone: "", description: "" });
  });
});
