import { describe, it, beforeEach } from "node:test";
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

await import("../dist/element.js");

function mount(config) {
  const el = document.createElement("form-uploader");
  if (config) el.config = config;
  document.body.appendChild(el);
  return el;
}

function fieldInput(el, name) {
  return el.shadowRoot.querySelector(`[data-field="${name}"]`);
}

function type(el, name, value) {
  const input = fieldInput(el, name);
  input.focus();
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

describe("rendering", () => {
  it("renders the default fields and file picker", () => {
    const el = mount();
    const names = [...el.shadowRoot.querySelectorAll("[data-field]")].map(
      (input) => input.dataset.field,
    );
    assert.deepEqual(names, ["name", "email", "phone", "description"]);
    assert.ok(el.shadowRoot.querySelector("[data-files]"));
    assert.match(el.shadowRoot.querySelector(".dropzone-hint").textContent, /5 MB/);
  });

  it("hides the file picker when files are disabled", () => {
    const el = mount({ files: false });
    assert.equal(el.shadowRoot.querySelector("[data-files]"), null);
    assert.equal(el.shadowRoot.querySelector(".dropzone"), null);
  });

  it("renders half-width fields, help text, and groups", () => {
    const el = mount({
      fields: [
        { name: "a", width: "half" },
        { name: "b", width: "half", help: "Pick wisely" },
        { name: "c", group: "g" },
        { name: "d", group: "nope" },
      ],
      groups: [{ name: "g", title: "Grouped", description: "Desc here" }],
    });
    assert.equal(el.shadowRoot.querySelectorAll(".field.half").length, 2);
    assert.equal(el.shadowRoot.querySelector(".help").textContent, "Pick wisely");
    assert.equal(el.shadowRoot.querySelector(".group-title").textContent, "Grouped");
    assert.equal(el.shadowRoot.querySelector(".group-description").textContent, "Desc here");
    assert.ok(fieldInput(el, "c").closest(".group"));
    assert.equal(fieldInput(el, "d").closest(".group"), null);
  });
});

describe("submit flow", () => {
  it("shows errors and skips submit when invalid", () => {
    const el = mount();
    let fired = null;
    el.addEventListener("form-submit", (event) => {
      fired = event.detail;
    });
    submit(el);
    assert.equal(el.shadowRoot.querySelectorAll(".error").length, 3);
    assert.equal(fired, null);
  });

  it("fires form-submit with values, files, and FormData when valid", () => {
    const el = mount();
    let fired = null;
    el.addEventListener("form-submit", (event) => {
      fired = event.detail;
    });
    type(el, "name", "Ada");
    type(el, "email", "ada@example.com");
    type(el, "phone", "+123");
    submit(el);
    assert.ok(fired);
    assert.equal(fired.values.email, "ada@example.com");
    assert.deepEqual(fired.files, []);
    assert.ok(fired.formData instanceof FormData);
    assert.equal(fired.formData.get("name"), "Ada");
  });
});

describe("change flow", () => {
  it("emits form-change with a values snapshot on input", () => {
    const el = mount();
    const seen = [];
    el.addEventListener("form-change", (event) => {
      seen.push(event.detail);
    });
    type(el, "name", "Ada");
    assert.equal(seen.length, 1);
    assert.equal(seen[0].values.name, "Ada");
    assert.deepEqual(seen[0].errors, {});
  });

  it("validates live and keeps focus with validateOnChange", () => {
    const el = mount({ validateOnChange: true });
    type(el, "email", "bad");
    const emailError = fieldInput(el, "email").closest(".field").querySelector(".error");
    assert.match(emailError.textContent, /valid email/);
    assert.equal(el.shadowRoot.activeElement?.dataset.field, "email");
    type(el, "email", "ada@example.com");
    assert.equal(fieldInput(el, "email").closest(".field").querySelector(".error"), null);
  });
});
