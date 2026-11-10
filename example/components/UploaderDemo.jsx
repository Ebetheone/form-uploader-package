"use client";

import { useMemo, useRef, useState } from "react";
import { FormUploader } from "form-uploader/react";
import { DEFAULT_FIELDS } from "form-uploader";

export default function UploaderDemo() {
  const formRef = useRef(null);
  const [result, setResult] = useState(null);
  const fields = useMemo(
    () => [
      { ...DEFAULT_FIELDS[0], width: "half" },
      { ...DEFAULT_FIELDS[1], width: "half" },
      ...DEFAULT_FIELDS.slice(2),
      { name: "company", label: "Company", help: "Where do you work?" },
    ],
    [],
  );
  const files = useMemo(() => ({ maxFiles: 3 }), []);

  return (
    <section>
      <FormUploader
        ref={formRef}
        fields={fields}
        files={files}
        submitLabel="Send"
        onSubmit={async ({ values, files: submitted, formData }) => {
          setResult({
            values,
            files: submitted.map((file) => `${file.name} (${file.size} bytes)`),
            formDataKeys: [...formData.keys()],
          });
        }}
      />
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
