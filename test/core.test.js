import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createFormUploader, DEFAULT_FIELDS, FILES_ERROR_KEY } from "../dist/index.js";

function makeFile(name = "photo.png", type = "image/png", size = 1024) {
  return new File([new Uint8Array(size)], name, { type });
}

function fillValid(uploader, overrides = {}) {
  uploader.setValue("name", "Ada");
  uploader.setValue("email", "ada@example.com");
  uploader.setValue("phone", "+1234567890");
  uploader.setValue("description", "Hello");
  for (const [key, value] of Object.entries(overrides)) uploader.setValue(key, value);
}

describe("defaults", () => {
  it("exposes name, email, phone, description by default", () => {
    const uploader = createFormUploader();
    assert.deepEqual(
      uploader.fields.map((field) => field.name),
      ["name", "email", "phone", "description"],
    );
    assert.equal(DEFAULT_FIELDS.length, 4);
  });

  it("ignores unknown field names", () => {
    const uploader = createFormUploader();
    assert.equal(uploader.setValue("nope", "x"), false);
    assert.ok(!("nope" in uploader.getValues()));
  });
});

describe("validation", () => {
  it("requires name, email, phone but not description", () => {
    const uploader = createFormUploader();
    const { valid, errors } = uploader.validate();
    assert.equal(valid, false);
    assert.ok(errors.name && errors.email && errors.phone);
    assert.ok(!("description" in errors));
  });

  it("accepts a fully valid form", () => {
    const uploader = createFormUploader();
    fillValid(uploader);
    assert.equal(uploader.validate().valid, true);
  });

  it("rejects a bad email", () => {
    const uploader = createFormUploader();
    fillValid(uploader, { email: "not-an-email" });
    const { valid, errors } = uploader.validate();
    assert.equal(valid, false);
    assert.ok(errors.email);
  });

  it("supports custom fields with custom validation", () => {
    const uploader = createFormUploader({
      fields: [
        {
          name: "age",
          label: "Age",
          required: true,
          validate: (value) => (Number(value) >= 18 ? null : "Must be 18+."),
        },
      ],
    });
    assert.equal(uploader.setValue("age", "16"), true);
    assert.match(uploader.validate().errors.age, /18/);
    uploader.setValue("age", "21");
    assert.equal(uploader.validate().valid, true);
  });

  it("enforces minLength and maxLength", () => {
    const uploader = createFormUploader({
      fields: [{ name: "code", minLength: 3, maxLength: 5 }],
    });
    uploader.setValue("code", "ab");
    assert.ok(uploader.validate().errors.code);
    uploader.setValue("code", "abcdef");
    assert.ok(uploader.validate().errors.code);
    uploader.setValue("code", "abcd");
    assert.equal(uploader.validate().valid, true);
  });
});

describe("files", () => {
  it("adds image files within limits", () => {
    const uploader = createFormUploader();
    const result = uploader.addFiles([makeFile(), makeFile("b.jpg", "image/jpeg")]);
    assert.equal(result.added.length, 2);
    assert.equal(result.rejected.length, 0);
    assert.equal(uploader.getFiles().length, 2);
  });

  it("rejects non-image files by default", () => {
    const uploader = createFormUploader();
    const result = uploader.addFiles([makeFile("doc.pdf", "application/pdf")]);
    assert.equal(result.added.length, 0);
    assert.equal(result.rejected.length, 1);
  });

  it("enforces maxFiles", () => {
    const uploader = createFormUploader({ files: { maxFiles: 1 } });
    const result = uploader.addFiles([makeFile(), makeFile("b.png")]);
    assert.equal(result.added.length, 1);
    assert.equal(result.rejected.length, 1);
  });

  it("enforces maxSize", () => {
    const uploader = createFormUploader({ files: { maxSize: 10 } });
    const result = uploader.addFiles([makeFile("big.png", "image/png", 1024)]);
    assert.equal(result.rejected.length, 1);
  });

  it("removes and clears files", () => {
    const uploader = createFormUploader();
    uploader.addFiles([makeFile(), makeFile("b.png")]);
    assert.equal(uploader.removeFile(0), true);
    assert.equal(uploader.getFiles().length, 1);
    assert.equal(uploader.removeFile(5), false);
    uploader.clearFiles();
    assert.equal(uploader.getFiles().length, 0);
  });

  it("requires files when configured", () => {
    const uploader = createFormUploader({ files: { required: true } });
    fillValid(uploader);
    assert.ok(uploader.validate().errors[FILES_ERROR_KEY]);
    uploader.addFiles([makeFile()]);
    assert.equal(uploader.validate().valid, true);
  });

  it("disables files when files is false", () => {
    const uploader = createFormUploader({ files: false });
    assert.equal(uploader.filesEnabled, false);
    const result = uploader.addFiles([makeFile()]);
    assert.equal(result.added.length, 0);
    assert.equal(result.rejected.length, 1);
    fillValid(uploader);
    assert.equal(uploader.validate().valid, true);
  });
});

describe("payload", () => {
  it("builds FormData with values and files", () => {
    const uploader = createFormUploader();
    fillValid(uploader);
    uploader.addFiles([makeFile(), makeFile("b.png")]);
    const formData = uploader.buildPayload();
    assert.ok(formData instanceof FormData);
    assert.equal(formData.get("name"), "Ada");
    assert.equal(formData.get("email"), "ada@example.com");
    assert.equal(formData.getAll("images").length, 2);
  });

  it("uses a custom field name for files", () => {
    const uploader = createFormUploader({ files: { fieldName: "photos" } });
    uploader.addFiles([makeFile()]);
    assert.equal(uploader.buildPayload().getAll("photos").length, 1);
  });

  it("reset clears values, files, and errors", () => {
    const uploader = createFormUploader();
    fillValid(uploader);
    uploader.addFiles([makeFile()]);
    uploader.validate();
    uploader.reset();
    assert.deepEqual(uploader.getValues(), {
      name: "",
      email: "",
      phone: "",
      description: "",
    });
    assert.equal(uploader.getFiles().length, 0);
    assert.deepEqual(uploader.getErrors(), {});
  });
});
