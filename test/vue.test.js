import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.customElements = window.customElements;
globalThis.HTMLElement = window.HTMLElement;
globalThis.SVGElement = window.SVGElement;
globalThis.Element = window.Element;
globalThis.CustomEvent = window.CustomEvent;
globalThis.Event = window.Event;
globalThis.Node = window.Node;

const { createApp, defineComponent, h, nextTick, ref } = await import("vue");
const { FormUploader } = await import("../dist/vue.js");

const apps = [];

function mountHarness(setupState) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(FormUploader, {
          fields: setupState.fields?.value,
          files: setupState.files?.value,
          submitLabel: setupState.submitLabel?.value,
          ref: setupState.child,
          onSubmit: setupState.onSubmit,
          onChange: setupState.onChange,
        }),
    }),
  );
  apps.push(app);
  app.mount(container);
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

afterEach(() => {
  while (apps.length > 0) apps.pop().unmount();
  document.body.innerHTML = "";
});

describe("vue wrapper", () => {
  it("mounts the element with config and submit label", () => {
    const container = mountHarness({
      fields: ref([{ name: "company" }]),
      submitLabel: ref("Go"),
    });
    const el = container.querySelector("form-uploader");
    assert.ok(el);
    assert.deepEqual(
      el.uploader.fields.map((field) => field.name),
      ["company"],
    );
    assert.equal(el.getAttribute("submit-label"), "Go");
  });

  it("emits submit with the detail on valid submit", () => {
    let fired = null;
    const container = mountHarness({ onSubmit: (d) => (fired = d) });
    const el = container.querySelector("form-uploader");
    type(el, "name", "Ada");
    type(el, "email", "ada@example.com");
    type(el, "phone", "+123");
    submit(el);
    assert.ok(fired);
    assert.equal(fired.values.name, "Ada");
  });

  it("emits change with snapshots on input", () => {
    const seen = [];
    const container = mountHarness({ onChange: (d) => seen.push(d) });
    type(container.querySelector("form-uploader"), "name", "Ada");
    assert.equal(seen.length, 1);
    assert.equal(seen[0].values.name, "Ada");
  });

  it("applies config updates", async () => {
    const fields = ref([{ name: "a" }]);
    const container = mountHarness({ fields });
    const el = container.querySelector("form-uploader");
    fields.value = [{ name: "a" }, { name: "b" }];
    await nextTick();
    assert.deepEqual(
      el.uploader.fields.map((field) => field.name),
      ["a", "b"],
    );
  });

  it("exposes reset and validate through a template ref", () => {
    const child = ref(null);
    const container = mountHarness({ child });
    const el = container.querySelector("form-uploader");
    assert.equal(child.value.validate().valid, false);
    type(el, "name", "Ada");
    type(el, "email", "ada@example.com");
    type(el, "phone", "+123");
    assert.equal(child.value.validate().valid, true);
    child.value.reset();
    assert.deepEqual(child.value.getValues(), { name: "", email: "", phone: "", description: "" });
  });
});
