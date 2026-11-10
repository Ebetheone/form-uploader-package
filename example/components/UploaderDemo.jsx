"use client";

import { useEffect, useRef, useState } from "react";
import "form-uploader/element";
import { DEFAULT_FIELDS } from "form-uploader";

export default function UploaderDemo() {
  const formRef = useRef(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    el.config = {
      fields: [...DEFAULT_FIELDS, { name: "company", label: "Company" }],
      files: { maxFiles: 3 },
    };
    el.onSubmit = async ({ values, files, formData }) => {
      setResult({
        values,
        files: files.map((file) => `${file.name} (${file.size} bytes)`),
        formDataKeys: [...formData.keys()],
      });
    };
  }, []);

  return (
    <section>
      <form-uploader ref={formRef} submit-label="Send" />
      <div className="actions">
        <button
          type="button"
          onClick={() => {
            formRef.current?.reset();
            setResult(null);
          }}
        >
          Reset demo
        </button>
      </div>
      <h2>Submitted payload</h2>
      <pre>{result ? JSON.stringify(result, null, 2) : "Fill the form and submit…"}</pre>
    </section>
  );
}
