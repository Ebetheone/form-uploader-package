export type FieldType = "text" | "email" | "tel" | "textarea";

export type FieldWidth = "full" | "half";

export interface FieldConfig {
  name: string;
  label?: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  width?: FieldWidth;
  help?: string;
  group?: string;
  validate?: (value: string) => string | null;
}

export interface FileUploadConfig {
  fieldName?: string;
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  required?: boolean;
}

export interface FormGroup {
  name: string;
  title: string;
  description?: string;
}

export interface FormUploaderConfig {
  fields?: FieldConfig[];
  files?: FileUploadConfig | false;
  groups?: FormGroup[];
  validateOnChange?: boolean;
}

export interface NormalizedField extends Omit<FieldConfig, "type" | "required" | "width"> {
  type: FieldType;
  required: boolean;
  width: FieldWidth;
}

export interface ResolvedFileUploadConfig {
  fieldName: string;
  maxFiles: number;
  maxSize: number;
  accept: string;
  required: boolean;
}

export interface FileRejection {
  file: File;
  reason: string;
}

export interface AddFilesResult {
  added: File[];
  rejected: FileRejection[];
}

export type ValidationErrors = Record<string, string>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrors;
}

export interface FormSubmitDetail {
  formData: FormData;
  values: Record<string, string>;
  files: File[];
}

export interface FormChangeDetail {
  values: Record<string, string>;
  files: File[];
  errors: ValidationErrors;
  valid: boolean;
}

export const DEFAULT_FIELDS: FieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", required: true },
  { name: "description", label: "Description", type: "textarea", required: false },
];
for (const field of DEFAULT_FIELDS) Object.freeze(field);
Object.freeze(DEFAULT_FIELDS);

export const DEFAULT_FILE_CONFIG: ResolvedFileUploadConfig = {
  fieldName: "images",
  maxFiles: 5,
  maxSize: 5 * 1024 * 1024,
  accept: "image/*",
  required: false,
};

export const FILES_ERROR_KEY = "files";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FormUploader {
  readonly fields: NormalizedField[];
  readonly filesEnabled: boolean;
  readonly fileConfig: ResolvedFileUploadConfig;
  setValue(name: string, value: string): boolean;
  getValues(): Record<string, string>;
  getFiles(): File[];
  addFiles(files: File[] | FileList): AddFilesResult;
  removeFile(index: number): boolean;
  clearFiles(): void;
  validate(): ValidationResult;
  getErrors(): ValidationErrors;
  buildPayload(): FormData;
  reset(): void;
}

export function createFormUploader(config: FormUploaderConfig = {}): FormUploader {
  const fields: NormalizedField[] = (config.fields ?? DEFAULT_FIELDS).map((field) => ({
    ...field,
    type: field.type ?? "text",
    required: field.required ?? false,
    width: field.width ?? "full",
  }));
  const filesEnabled = config.files !== false;
  const fileConfig: ResolvedFileUploadConfig = {
    ...DEFAULT_FILE_CONFIG,
    ...(config.files === false || config.files === undefined ? {} : config.files),
  };

  let values: Record<string, string> = {};
  let files: File[] = [];
  let errors: ValidationErrors = {};

  const resetValues = (): void => {
    values = {};
    for (const field of fields) values[field.name] = "";
  };
  resetValues();

  const findField = (name: string): NormalizedField | undefined =>
    fields.find((field) => field.name === name);

  function matchesAccept(file: File): boolean {
    const accept = fileConfig.accept.trim();
    if (accept === "") return true;
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    return accept
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean)
      .some((token) => {
        if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
        if (token.startsWith(".")) return name.endsWith(token);
        return type === token;
      });
  }

  function setValue(name: string, value: string): boolean {
    if (!findField(name)) return false;
    values[name] = value;
    return true;
  }

  function addFiles(input: File[] | FileList): AddFilesResult {
    const incoming = Array.from(input);
    const added: File[] = [];
    const rejected: FileRejection[] = [];
    if (!filesEnabled) {
      for (const file of incoming) {
        rejected.push({ file, reason: "File uploads are disabled." });
      }
      return { added, rejected };
    }
    for (const file of incoming) {
      if (files.length + added.length >= fileConfig.maxFiles) {
        rejected.push({ file, reason: `Only ${fileConfig.maxFiles} file(s) allowed.` });
        continue;
      }
      if (file.size > fileConfig.maxSize) {
        rejected.push({ file, reason: `"${file.name}" exceeds the size limit.` });
        continue;
      }
      if (!matchesAccept(file)) {
        rejected.push({ file, reason: `"${file.name}" is not an accepted file type.` });
        continue;
      }
      added.push(file);
    }
    files = files.concat(added);
    return { added, rejected };
  }

  function removeFile(index: number): boolean {
    if (index < 0 || index >= files.length) return false;
    files = files.slice(0, index).concat(files.slice(index + 1));
    return true;
  }

  function validateField(field: NormalizedField, value: string): string | null {
    const label = field.label || field.name;
    if (field.required && value.trim() === "") return `${label} is required.`;
    if (field.type === "email" && value.trim() !== "" && !EMAIL_PATTERN.test(value.trim())) {
      return "Enter a valid email address.";
    }
    if (field.minLength !== undefined && value.length < field.minLength) {
      return `${label} must be at least ${field.minLength} characters.`;
    }
    if (field.maxLength !== undefined && value.length > field.maxLength) {
      return `${label} must be at most ${field.maxLength} characters.`;
    }
    if (field.validate) return field.validate(value);
    return null;
  }

  function validate(): ValidationResult {
    const next: ValidationErrors = {};
    for (const field of fields) {
      const message = validateField(field, values[field.name] ?? "");
      if (message) next[field.name] = message;
    }
    if (filesEnabled && fileConfig.required && files.length === 0) {
      next[FILES_ERROR_KEY] = "At least one file is required.";
    }
    errors = next;
    return { valid: Object.keys(next).length === 0, errors: { ...next } };
  }

  function buildPayload(): FormData {
    const formData = new FormData();
    for (const field of fields) {
      formData.append(field.name, values[field.name] ?? "");
    }
    if (filesEnabled) {
      for (const file of files) {
        formData.append(fileConfig.fieldName, file);
      }
    }
    return formData;
  }

  function reset(): void {
    resetValues();
    files = [];
    errors = {};
  }

  return {
    fields,
    filesEnabled,
    fileConfig,
    setValue,
    getValues: () => ({ ...values }),
    getFiles: () => [...files],
    addFiles,
    removeFile,
    clearFiles: () => {
      files = [];
    },
    validate,
    getErrors: () => ({ ...errors }),
    buildPayload,
    reset,
  };
}
