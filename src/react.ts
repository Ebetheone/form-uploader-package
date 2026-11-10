"use client";

import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CSSProperties } from "react";
import "./element.js";
import type {
  FieldConfig,
  FileUploadConfig,
  FormChangeDetail,
  FormSubmitDetail,
  ValidationResult,
} from "./core.js";
import type { FormUploaderElement } from "./element.js";

export interface ReactFormUploaderProps {
  fields?: FieldConfig[];
  files?: FileUploadConfig | false;
  validateOnChange?: boolean;
  submitLabel?: string;
  className?: string;
  style?: CSSProperties;
  onSubmit?: (detail: FormSubmitDetail) => void | Promise<void>;
  onChange?: (detail: FormChangeDetail) => void;
}

export interface ReactFormUploaderHandle {
  reset(): void;
  validate(): ValidationResult;
  getValues(): Record<string, string>;
  getFiles(): File[];
}

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

export const FormUploader = forwardRef<ReactFormUploaderHandle, ReactFormUploaderProps>(
  function FormUploader(props, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const elRef = useRef<FormUploaderElement | null>(null);
    const appliedRef = useRef<{
      fields?: FieldConfig[];
      files?: FileUploadConfig | false;
      validateOnChange?: boolean;
    } | null>(null);
    const submitRef = useRef(props.onSubmit);
    submitRef.current = props.onSubmit;
    const changeRef = useRef(props.onChange);
    changeRef.current = props.onChange;

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      const el = document.createElement("form-uploader");
      host.appendChild(el);
      elRef.current = el;
      el.onSubmit = (detail) => {
        void submitRef.current?.(detail);
      };
      const handleChange = (event: Event) => {
        changeRef.current?.((event as CustomEvent<FormChangeDetail>).detail);
      };
      el.addEventListener("form-change", handleChange);
      return () => {
        el.removeEventListener("form-change", handleChange);
        el.onSubmit = undefined;
        host.removeChild(el);
        if (elRef.current === el) elRef.current = null;
        appliedRef.current = null;
      };
    }, []);

    useEffect(() => {
      const el = elRef.current;
      if (!el) return;
      const next = {
        fields: props.fields,
        files: props.files,
        validateOnChange: props.validateOnChange,
      };
      if (appliedRef.current && isSameValue(appliedRef.current, next)) return;
      appliedRef.current = next;
      el.config = next;
      if (props.submitLabel === undefined) el.removeAttribute("submit-label");
      else el.setAttribute("submit-label", props.submitLabel);
    });

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          elRef.current?.reset();
        },
        validate: () => elRef.current?.uploader.validate() ?? { valid: false, errors: {} },
        getValues: () => elRef.current?.uploader.getValues() ?? {},
        getFiles: () => elRef.current?.uploader.getFiles() ?? [],
      }),
      [],
    );

    return createElement("div", {
      ref: hostRef,
      className: props.className,
      style: props.style,
    });
  },
);
