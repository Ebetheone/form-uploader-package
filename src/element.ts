import {
  FILES_ERROR_KEY,
  createFormUploader,
  type FormChangeDetail,
  type FormSubmitDetail,
  type FormUploader,
  type FormUploaderConfig,
  type NormalizedField,
  type ValidationErrors,
} from "./core.js";

export const ELEMENT_NAME = "form-uploader";
export const SUBMIT_EVENT = "form-submit";
export const CHANGE_EVENT = "form-change";

const BaseElement: typeof HTMLElement =
  (globalThis as { HTMLElement?: typeof HTMLElement }).HTMLElement ??
  (class {} as unknown as typeof HTMLElement);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

const STYLES = [
  ":host { display: block; font: inherit; color-scheme: light dark; container-type: inline-size; }",
  ":host {",
  "  --fu-accent: #2563eb;",
  "  --fu-accent-hover: #1d4ed8;",
  "  --fu-accent-contrast: #ffffff;",
  "  --fu-text: #1c1917;",
  "  --fu-muted: #57534e;",
  "  --fu-border: #d6d3d1;",
  "  --fu-surface: #ffffff;",
  "  --fu-surface-soft: #f5f5f4;",
  "  --fu-error: #b91c1c;",
  "  --fu-ring: rgb(37 99 235 / 0.25);",
  "  --fu-radius: 10px;",
  "  --fu-radius-sm: 8px;",
  "}",
  "@media (prefers-color-scheme: dark) {",
  "  :host {",
  "    --fu-text: #e7e5e4;",
  "    --fu-muted: #a8a29e;",
  "    --fu-border: #44403c;",
  "    --fu-surface: #1c1917;",
  "    --fu-surface-soft: #292524;",
  "    --fu-error: #f87171;",
  "    --fu-ring: rgb(96 165 250 / 0.35);",
  "  }",
  "}",
  "form { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; color: var(--fu-text); }",
  ".field { min-width: 0; grid-column: span 2; }",
  ".field.half { grid-column: span 1; }",
  "@container (max-width: 28rem) { .field.half { grid-column: span 2; } }",
  ".group { grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0; padding: 1rem; border: 1px solid var(--fu-border); border-radius: var(--fu-radius); background: var(--fu-surface); }",
  ".group-title { grid-column: span 2; font-size: 0.875rem; font-weight: 600; }",
  ".group-description { grid-column: span 2; font-size: 0.8125rem; color: var(--fu-muted); margin: 0; }",
  ".help { font-size: 0.8125rem; color: var(--fu-muted); margin: 0.375rem 0 0; }",
  ".field > label:not(.dropzone) { display: grid; gap: 0.375rem; font-size: 0.875rem; font-weight: 500; }",
  "input, textarea { font: inherit; color: var(--fu-text); background: var(--fu-surface); border: 1px solid var(--fu-border); border-radius: var(--fu-radius); padding: 0.625rem 0.75rem; width: 100%; box-sizing: border-box; transition: border-color 0.15s ease, box-shadow 0.15s ease; }",
  "input::placeholder, textarea::placeholder { color: var(--fu-muted); opacity: 1; }",
  "input:focus-visible, textarea:focus-visible { outline: none; border-color: var(--fu-accent); box-shadow: 0 0 0 3px var(--fu-ring); }",
  "input[aria-invalid='true'], textarea[aria-invalid='true'] { border-color: var(--fu-error); }",
  "input[aria-invalid='true']:focus-visible, textarea[aria-invalid='true']:focus-visible { box-shadow: 0 0 0 3px color-mix(in srgb, var(--fu-error) 25%, transparent); }",
  "textarea { min-height: 6rem; resize: vertical; }",
  ".error { color: var(--fu-error); font-size: 0.8125rem; margin: 0.375rem 0 0; }",
  ".dropzone { position: relative; display: grid; justify-items: center; gap: 0.375rem; padding: 1.5rem 1rem; border: 1.5px dashed var(--fu-border); border-radius: var(--fu-radius); background: var(--fu-surface-soft); cursor: pointer; text-align: center; transition: border-color 0.15s ease, box-shadow 0.15s ease; }",
  ".dropzone:hover { border-color: var(--fu-accent); }",
  ".dropzone:focus-within { outline: none; border-color: var(--fu-accent); box-shadow: 0 0 0 3px var(--fu-ring); }",
  ".dropzone input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }",
  ".dropzone-mark { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 999px; background: var(--fu-accent); color: var(--fu-accent-contrast); font-size: 1.5rem; font-weight: 300; line-height: 1; }",
  ".dropzone-title { font-size: 0.875rem; font-weight: 600; }",
  ".dropzone-hint { font-size: 0.8125rem; font-weight: 400; color: var(--fu-muted); }",
  ".previews { display: grid; grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr)); gap: 0.625rem; margin-top: 0.625rem; }",
  ".preview { margin: 0; position: relative; border: 1px solid var(--fu-border); border-radius: var(--fu-radius-sm); overflow: hidden; background: var(--fu-surface); }",
  ".preview img { width: 100%; height: 5.25rem; object-fit: cover; display: block; background: var(--fu-surface-soft); }",
  ".preview figcaption { font-size: 0.7rem; padding: 0.25rem 0.375rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--fu-muted); }",
  ".preview button { position: absolute; top: 0.25rem; right: 0.25rem; width: 1.5rem; height: 1.5rem; display: grid; place-items: center; padding: 0; border: none; border-radius: 999px; background: rgb(0 0 0 / 0.6); color: #ffffff; font-size: 1rem; line-height: 1; cursor: pointer; }",
  ".preview button:hover { background: rgb(0 0 0 / 0.8); }",
  "button[type='submit'] { justify-self: start; font: inherit; font-weight: 600; color: var(--fu-accent-contrast); background: var(--fu-accent); border: 1px solid transparent; border-radius: var(--fu-radius); padding: 0.625rem 1.25rem; cursor: pointer; transition: background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease; }",
  "button[type='submit']:hover { background: var(--fu-accent-hover); }",
  "button[type='submit']:active { transform: scale(0.98); }",
  "button[type='submit']:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--fu-ring); }",
  "@media (prefers-reduced-motion: reduce) {",
  "  *, *::before, *::after { transition: none; }",
  "}",
].join("\n");

export class FormUploaderElement extends BaseElement {
  private uploaderInstance: FormUploader = createFormUploader({});
  private elementConfig: FormUploaderConfig = {};
  private previewUrls = new Map<File, string>();
  private fileNotice: string | null = null;

  onSubmit?: (detail: FormSubmitDetail) => void | Promise<void>;

  static get observedAttributes(): string[] {
    return ["submit-label"];
  }

  get config(): FormUploaderConfig {
    return this.elementConfig;
  }

  set config(next: FormUploaderConfig) {
    this.elementConfig = next ?? {};
    this.uploaderInstance = createFormUploader(this.elementConfig);
    this.fileNotice = null;
    this.revokePreviews();
    this.render();
  }

  get uploader(): FormUploader {
    return this.uploaderInstance;
  }

  connectedCallback(): void {
    this.render();
  }

  disconnectedCallback(): void {
    this.revokePreviews();
  }

  attributeChangedCallback(): void {
    this.render();
  }

  reset(): void {
    this.uploaderInstance.reset();
    this.fileNotice = null;
    this.render();
  }

  private get submitLabel(): string {
    const host = this as unknown as HTMLElement;
    if (typeof host.getAttribute !== "function") return "Submit";
    return host.getAttribute("submit-label") || "Submit";
  }

  private fieldHtml(
    field: NormalizedField,
    values: Record<string, string>,
    errors: ValidationErrors,
  ): string {
    const value = escapeHtml(values[field.name] ?? "");
    const error = errors[field.name]
      ? `<p class="error" part="error">${escapeHtml(errors[field.name])}</p>`
      : "";
    const label = escapeHtml(field.label || field.name);
    const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : "";
    const required = field.required ? " required" : "";
    const safeName = escapeHtml(field.name);
    const invalid = errors[field.name] ? ` aria-invalid="true"` : "";
    const width = field.width === "half" ? " half" : "";
    const help = field.help ? `<p class="help" part="help">${escapeHtml(field.help)}</p>` : "";
    const control =
      field.type === "textarea"
        ? `<textarea part="input" data-field="${safeName}" rows="4"${placeholder}${required}${invalid}>${value}</textarea>`
        : `<input part="input" data-field="${safeName}" type="${field.type}" value="${value}"${placeholder}${required}${invalid} />`;
    return `<div class="field${width}" part="field"><label part="label"><span>${label}</span>${control}</label>${help}${error}</div>`;
  }

  private render(): void {
    const host = this as unknown as HTMLElement;
    if (typeof host.attachShadow !== "function") return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    this.syncPreviews();

    const values = this.uploaderInstance.getValues();
    const errors = this.uploaderInstance.getErrors();
    const files = this.uploaderInstance.getFiles();
    const fileConfig = this.uploaderInstance.fileConfig;

    const groups = this.elementConfig.groups ?? [];
    const knownGroups = new Set(groups.map((group) => group.name));
    const renderField = (field: NormalizedField): string => this.fieldHtml(field, values, errors);
    const ungroupedHtml = this.uploaderInstance.fields
      .filter((field) => !field.group || !knownGroups.has(field.group))
      .map(renderField)
      .join("");
    const groupsHtml = groups
      .map((group) => {
        const members = this.uploaderInstance.fields.filter((field) => field.group === group.name);
        if (members.length === 0) return "";
        const title = escapeHtml(group.title);
        const description = group.description
          ? `<p class="group-description" part="group-description">${escapeHtml(group.description)}</p>`
          : "";
        return (
          `<div class="group" part="group" role="group" aria-label="${title}">` +
          `<span class="group-title" part="group-title">${title}</span>` +
          description +
          members.map(renderField).join("") +
          `</div>`
        );
      })
      .join("");
    const fieldsHtml = ungroupedHtml + groupsHtml;

    const fileError = errors[FILES_ERROR_KEY] ?? this.fileNotice;
    const dropzoneTitle = fileConfig.accept === "image/*" ? "Choose images" : "Choose files";
    const acceptLabel = fileConfig.accept === "image/*" ? "Images" : fileConfig.accept || "Files";
    const dropzoneHint = `${acceptLabel} up to ${formatBytes(fileConfig.maxSize)} each, max ${fileConfig.maxFiles} ${fileConfig.maxFiles === 1 ? "file" : "files"}`;
    const filesHtml = !this.uploaderInstance.filesEnabled
      ? ""
      : `<div class="field" part="field">` +
        `<label class="dropzone" part="label dropzone">` +
        `<span class="dropzone-mark" aria-hidden="true">+</span>` +
        `<span class="dropzone-title" part="dropzone-title">${dropzoneTitle}</span>` +
        `<span class="dropzone-hint" part="dropzone-hint">${escapeHtml(dropzoneHint)}</span>` +
        `<input part="file-input" data-files type="file" multiple accept="${escapeHtml(fileConfig.accept)}" />` +
        `</label>` +
        (fileError ? `<p class="error" part="error">${escapeHtml(fileError)}</p>` : "") +
        `<div class="previews" part="previews">${files
          .map(
            (file, index) =>
              `<figure class="preview" part="preview">` +
              `<img src="${this.previewUrls.get(file) ?? ""}" alt="${escapeHtml(file.name)}" />` +
              `<figcaption>${escapeHtml(file.name)}</figcaption>` +
              `<button type="button" part="remove" data-remove="${index}" aria-label="Remove ${escapeHtml(file.name)}">×</button>` +
              `</figure>`,
          )
          .join("")}</div></div>`;

    shadow.innerHTML =
      `<style>${STYLES}</style>` +
      `<form part="form" novalidate>${fieldsHtml}${filesHtml}` +
      `<button type="submit" part="submit">${escapeHtml(this.submitLabel)}</button></form>`;

    shadow.querySelector("form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.handleSubmit();
    });

    shadow.querySelectorAll("[data-field]").forEach((el) => {
      el.addEventListener("input", () => {
        const name = (el as HTMLElement).dataset.field;
        if (!name) return;
        this.uploaderInstance.setValue(name, (el as HTMLInputElement).value);
        this.afterChange();
      });
    });

    const fileInput = shadow.querySelector("[data-files]") as HTMLInputElement | null;
    fileInput?.addEventListener("change", () => {
      if (fileInput.files) {
        const result = this.uploaderInstance.addFiles(fileInput.files);
        this.fileNotice =
          result.rejected.length > 0
            ? result.rejected.map((rejection) => rejection.reason).join(" ")
            : null;
      }
      fileInput.value = "";
      if (this.elementConfig.validateOnChange) this.uploaderInstance.validate();
      this.render();
      this.focusFileInput();
      this.emitChange();
    });

    shadow.querySelectorAll("[data-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        this.uploaderInstance.removeFile(Number((button as HTMLElement).dataset.remove));
        this.fileNotice = null;
        if (this.elementConfig.validateOnChange) this.uploaderInstance.validate();
        this.render();
        this.focusFileInput();
        this.emitChange();
      });
    });
  }

  private afterChange(): void {
    if (this.elementConfig.validateOnChange) {
      const focus = this.snapshotFocus();
      this.uploaderInstance.validate();
      this.render();
      this.restoreFocus(focus);
    }
    this.emitChange();
  }

  private emitChange(): void {
    const errors = this.uploaderInstance.getErrors();
    const detail: FormChangeDetail = {
      values: this.uploaderInstance.getValues(),
      files: this.uploaderInstance.getFiles(),
      errors,
      valid: Object.keys(errors).length === 0,
    };
    const host = this as unknown as HTMLElement;
    host.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail, bubbles: true, composed: true }));
  }

  private snapshotFocus(): { name: string | null; start: number; end: number } {
    const host = this as unknown as HTMLElement;
    const active = host.shadowRoot?.activeElement as HTMLElement | null;
    const name = active?.dataset?.field ?? null;
    let start = -1;
    let end = -1;
    if (name && active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
      try {
        const control = active as unknown as HTMLInputElement;
        start = control.selectionStart ?? -1;
        end = control.selectionEnd ?? -1;
      } catch {
        start = -1;
        end = -1;
      }
    }
    return { name, start, end };
  }

  private restoreFocus(focus: { name: string | null; start: number; end: number }): void {
    if (!focus.name) return;
    const host = this as unknown as HTMLElement;
    const controls = host.shadowRoot?.querySelectorAll("[data-field]");
    let next: HTMLElement | null = null;
    if (controls) {
      for (const el of controls) {
        if ((el as HTMLElement).dataset.field === focus.name) next = el as HTMLElement;
      }
    }
    if (next) next.focus({ preventScroll: true });
    if (focus.start >= 0 && next && (next.tagName === "INPUT" || next.tagName === "TEXTAREA")) {
      try {
        (next as unknown as HTMLInputElement).setSelectionRange(focus.start, focus.end);
      } catch {
        return;
      }
    }
  }

  private focusFileInput(): void {
    const host = this as unknown as HTMLElement;
    const fileInput = host.shadowRoot?.querySelector("[data-files]") as HTMLElement | null;
    fileInput?.focus({ preventScroll: true });
  }

  private async handleSubmit(): Promise<void> {
    this.fileNotice = null;
    const { valid } = this.uploaderInstance.validate();
    this.render();
    if (!valid) {
      const host = this as unknown as HTMLElement;
      const firstInvalid = host.shadowRoot?.querySelector(
        "[aria-invalid='true']",
      ) as HTMLElement | null;
      firstInvalid?.focus();
      return;
    }
    const detail: FormSubmitDetail = {
      formData: this.uploaderInstance.buildPayload(),
      values: this.uploaderInstance.getValues(),
      files: this.uploaderInstance.getFiles(),
    };
    const host = this as unknown as HTMLElement;
    const cancelled = !host.dispatchEvent(
      new CustomEvent(SUBMIT_EVENT, { detail, bubbles: true, composed: true }),
    );
    if (!cancelled) await this.onSubmit?.(detail);
  }

  private syncPreviews(): void {
    const files = this.uploaderInstance.getFiles();
    for (const [file, url] of this.previewUrls) {
      if (!files.includes(file)) {
        URL.revokeObjectURL(url);
        this.previewUrls.delete(file);
      }
    }
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
    for (const file of files) {
      if (!this.previewUrls.has(file)) this.previewUrls.set(file, URL.createObjectURL(file));
    }
  }

  private revokePreviews(): void {
    for (const url of this.previewUrls.values()) {
      if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(url);
      }
    }
    this.previewUrls.clear();
  }
}

if (typeof customElements !== "undefined" && !customElements.get(ELEMENT_NAME)) {
  customElements.define(ELEMENT_NAME, FormUploaderElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "form-uploader": FormUploaderElement;
  }
}
