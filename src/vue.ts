import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PropType, Ref } from "vue";
import "./element.js";
import type {
  FieldConfig,
  FileUploadConfig,
  FormChangeDetail,
  FormSubmitDetail,
  ValidationResult,
} from "./core.js";
import type { FormUploaderElement } from "./element.js";

function isSameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || typeof right !== "object" || left === null || right === null) {
    return false;
  }
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  if (leftKeys.length !== Object.keys(rightRecord).length) return false;
  return leftKeys.every((key) => isSameValue(leftRecord[key], rightRecord[key]));
}

export const FormUploader = defineComponent({
  name: "FormUploader",
  props: {
    fields: { type: Array as PropType<FieldConfig[]>, default: undefined },
    files: { type: [Object, Boolean] as PropType<FileUploadConfig | false>, default: undefined },
    validateOnChange: { type: Boolean, default: undefined },
    submitLabel: { type: String, default: undefined },
  },
  emits: {
    submit: (_detail: FormSubmitDetail) => true,
    change: (_detail: FormChangeDetail) => true,
  },
  setup(props, { emit, expose }) {
    const elRef: Ref<FormUploaderElement | null> = ref(null);
    let applied: {
      fields?: FieldConfig[];
      files?: FileUploadConfig | false;
      validateOnChange?: boolean;
    } | null = null;

    const applyConfig = (force = false): void => {
      const el = elRef.value;
      if (!el) return;
      const next = {
        fields: props.fields,
        files: props.files,
        validateOnChange: props.validateOnChange,
      };
      if (!force && applied && isSameValue(applied, next)) return;
      applied = next;
      el.config = next;
      if (props.submitLabel === undefined) el.removeAttribute("submit-label");
      else el.setAttribute("submit-label", props.submitLabel);
    };

    const handleChange = (event: Event): void => {
      emit("change", (event as CustomEvent<FormChangeDetail>).detail);
    };

    onMounted(() => {
      const el = elRef.value;
      if (!el) return;
      applyConfig(true);
      el.onSubmit = (detail) => {
        emit("submit", detail);
      };
      el.addEventListener("form-change", handleChange);
    });

    onBeforeUnmount(() => {
      const el = elRef.value;
      if (!el) return;
      el.removeEventListener("form-change", handleChange);
      el.onSubmit = undefined;
    });

    watch(
      () => [props.fields, props.files, props.validateOnChange, props.submitLabel],
      () => {
        applyConfig();
      },
    );

    expose({
      reset: () => elRef.value?.reset(),
      validate: (): ValidationResult =>
        elRef.value?.uploader.validate() ?? { valid: false, errors: {} },
      getValues: (): Record<string, string> => elRef.value?.uploader.getValues() ?? {},
      getFiles: (): File[] => elRef.value?.uploader.getFiles() ?? [],
    });

    return () => h("form-uploader", { ref: elRef });
  },
});
