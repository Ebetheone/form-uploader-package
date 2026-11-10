# form-uploader

One form for every site: contact fields plus multi-image upload. A framework-agnostic core plus a drop-in `<form-uploader>` custom element. Zero runtime dependencies, ESM only, TypeScript types included.

- Drop-in element works in plain HTML and anywhere, with React and Vue wrappers included.
- Core module is DOM-free, so you can drive your own UI or run it in Node.
- Validation, file limits, and `FormData` payload building included.
- Themed with CSS variables, dark-mode aware, keyboard accessible.

## Install

```bash
npm install form-uploader
```

## Drop-in element

```html
<form-uploader id="u" submit-label="Send"></form-uploader>
<script type="module">
  import "form-uploader/element";

  const el = document.getElementById("u");
  el.onSubmit = async ({ formData, values, files }) => {
    await fetch("/api/upload", { method: "POST", body: formData });
  };
</script>
```

Serve your page over HTTP, since modules do not load from `file://`.

By default the form has Name, Email, and Phone (required) plus Description (optional) and an image picker with previews.

### Handling submit

Two ways, pick one:

```js
el.onSubmit = async ({ formData, values, files }) => {
  await fetch("/api/upload", { method: "POST", body: formData });
};

el.addEventListener("form-submit", (event) => {
  event.preventDefault();
  console.log(event.detail.values);
});
```

`onSubmit` runs after a valid submit. If you listen for the `form-submit` event (it bubbles and crosses shadow DOM) and call `preventDefault()`, `onSubmit` is skipped. Both receive `{ formData, values, files }`.

### Configuring the element

```js
import { DEFAULT_FIELDS } from "form-uploader";

el.config = {
  fields: [...DEFAULT_FIELDS, { name: "company", label: "Company" }],
  files: { maxFiles: 3 },
};
el.reset();
```

- `el.config` sets fields and files. Setting it resets the form.
- `el.reset()` clears values, files, and errors.
- `el.uploader` exposes the core instance below for direct control.
- The `submit-label` attribute sets the button text (default `"Submit"`).

## Frameworks

### React / Next.js

```jsx
import { FormUploader } from "form-uploader/react";

<FormUploader
  fields={fields}
  files={{ maxFiles: 3 }}
  submitLabel="Send"
  onSubmit={async ({ formData }) => {
    await fetch("/api/upload", { method: "POST", body: formData });
  }}
  onChange={({ values }) => console.log(values)}
/>;
```

The wrapper is marked client-side, so Next.js App Router pages can import it directly, even from Server Components. `onChange` streams `{ values, files, errors, valid }` snapshots. A `ref` exposes `reset()`, `validate()`, `getValues()`, and `getFiles()`. Equal configs never wipe typed input, so inline props are safe. Requires `react >= 18`.

### Vue

```vue
<script setup>
import { FormUploader } from "form-uploader/vue";
</script>

<template>
  <FormUploader :fields="fields" :files="{ maxFiles: 3 }" submit-label="Send" @submit="send" />
</template>
```

Props are `fields`, `files`, `validateOnChange`, and `submitLabel`. Events are `submit` and `change`, carrying the same payloads as the element. `class`, `style`, and other attributes fall through to the element for placement. A template ref exposes `reset()`, `validate()`, `getValues()`, and `getFiles()`. Requires `vue ^3`.

### Angular

No wrapper needed: bind the element directly.

```ts
import "form-uploader/element";
import { CUSTOM_ELEMENTS_SCHEMA, Component } from "@angular/core";
import type { FormSubmitDetail, FormUploaderConfig } from "form-uploader";

@Component({
  selector: "app-contact",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <form-uploader
      [config]="config"
      submit-label="Send"
      (form-submit)="onSubmit($event.detail)"
    ></form-uploader>
  `,
})
export class ContactComponent {
  config: FormUploaderConfig = { files: { maxFiles: 3 } };

  onSubmit(detail: FormSubmitDetail): void {
    fetch("/api/upload", { method: "POST", body: detail.formData });
  }
}
```

Import `form-uploader/element` once (for example in `main.ts`) to register the tag. `config` binds as a property and the events carry the same payloads as below. A `ViewChild` reference gives you `reset()` and the core `uploader` for anything else.

### Server-rendered pages (Django, Flask, plain HTML)

No build step. Pin a version and drop in a script tag:

```html
<script src="https://unpkg.com/form-uploader@0.2.0/dist/form-uploader.global.js"></script>
<form-uploader submit-label="Send"></form-uploader>
<script>
  document.querySelector("form-uploader").onSubmit = async ({ formData }) => {
    await fetch("/upload", { method: "POST", body: formData });
  };
</script>
```

## Core (your own UI)

```js
import { createFormUploader } from "form-uploader";

const form = createFormUploader();
form.setValue("email", "ada@example.com");
form.addFiles(fileInput.files);

const { valid, errors } = form.validate();
if (valid) {
  await fetch("/api/upload", { method: "POST", body: form.buildPayload() });
}
```

Methods: `setValue(name, value)`, `getValues()`, `getFiles()`, `addFiles(files)`, `removeFile(index)`, `clearFiles()`, `validate()`, `getErrors()`, `buildPayload()`, `reset()`. Also exposed: `fields`, `filesEnabled`, `fileConfig`.

`addFiles` accepts an array or a `FileList` and returns `{ added, rejected }`, where each rejection carries a human-readable `reason`.

## Fields and files

```js
const form = createFormUploader({
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "company", label: "Company", placeholder: "Acme Inc." },
    {
      name: "age",
      label: "Age",
      validate: (value) => (Number(value) >= 18 ? null : "Must be 18+."),
    },
  ],
  files: { maxFiles: 3, maxSize: 2 * 1024 * 1024, accept: "image/*", required: true },
});
```

Field options:

- `name` (required), `label`, `type` (`text`, `email`, `tel`, `textarea`; default `text`)
- `required` (default `false`), `placeholder`
- `minLength`, `maxLength`, counted in characters
- `validate(value)` returning an error string or `null`
- `width` (`full` default, `half` shares a row; stacks on narrow containers)
- `help` (hint text under the input), `group` (name of a group below)

File options:

- `fieldName` (default `"images"`), the `FormData` key files are appended under
- `maxFiles` (default `5`), `maxSize` in bytes per file (default 5 MB)
- `accept` (default `"image/*"`; empty string allows everything)
- `required` (default `false`)
- Pass `files: false` to disable uploads entirely

Top-level options:

- `groups: [{ name, title, description }]` renders titled cards in order; fields without a group, or with an unknown one, render first
- `validateOnChange` (default `false`): revalidate on every keystroke with live errors; focus is preserved

Validation order per field is required, email format, length, then your `validate`, first failure wins. Email is checked only when non-empty. Phone has no format check since formats vary, so add `validate` or `minLength` if you need one.

The payload is a `FormData` with one entry per field plus each file under `fieldName`, ready to `POST` to your backend.

## Events

Both events bubble and cross shadow DOM.

- `form-submit`: a valid submit, detail `{ formData, values, files }`. Calling `preventDefault()` skips `onSubmit`.
- `form-change`: every keystroke and file change, detail `{ values, files, errors, valid }`. `errors` and `valid` reflect the last validation run, so pair it with `validateOnChange: true` for live validity.

## Styling

The element inherits your page font and adapts to light and dark mode automatically. Override any variable to theme it:

```css
form-uploader {
  --fu-accent: #7c3aed;
  --fu-radius: 14px;
}
```

| Variable               | Default                 | Used for                      |
| ---------------------- | ----------------------- | ----------------------------- |
| `--fu-accent`          | `#2563eb`               | Submit button, focus, accents |
| `--fu-accent-hover`    | `#1d4ed8`               | Submit button hover           |
| `--fu-accent-contrast` | `#ffffff`               | Text on the accent color      |
| `--fu-text`            | `#1c1917`               | Labels and input text         |
| `--fu-muted`           | `#57534e`               | Hints, placeholders, captions |
| `--fu-border`          | `#d6d3d1`               | Input and card borders        |
| `--fu-surface`         | `#ffffff`               | Input and card background     |
| `--fu-surface-soft`    | `#f5f5f4`               | Dropzone and image backdrop   |
| `--fu-error`           | `#b91c1c`               | Error text and invalid rings  |
| `--fu-ring`            | `rgb(37 99 235 / 0.25)` | Focus ring                    |
| `--fu-radius`          | `10px`                  | Inputs, dropzone, button      |
| `--fu-radius-sm`       | `8px`                   | Preview cards                 |

For deeper restyling, every part is exposed via `::part`: `form`, `field`, `label`, `input`, `help`, `error`, `group`, `group-title`, `group-description`, `dropzone`, `dropzone-title`, `dropzone-hint`, `file-input`, `previews`, `preview`, `remove`, `submit`.

```css
form-uploader::part(submit) {
  width: 100%;
}
```

Focus rings, invalid states, and `prefers-reduced-motion` are handled inside the shadow DOM.

## Demo and example app

- `demo/index.html`: plain-HTML demo. Build first (`npm run build`), serve the repo folder with any static server, and open it.
- `example/`: Next.js app using the package from local source on port 3000. See `example/README.md`.

## Development

```bash
npm install
npm test           # build + test suite
npm run format     # format everything with Prettier
npm run format:check
```

## License

MIT
