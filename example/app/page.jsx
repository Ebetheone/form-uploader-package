import UploaderDemo from "../components/UploaderDemo";

export default function Page() {
  return (
    <main>
      <h1>form-uploader example</h1>
      <p>
        This page renders the package&apos;s <code>&lt;form-uploader&gt;</code> element with one
        extra field (<code>company</code>) and a 3-image limit. Submit shows the payload your
        backend would receive.
      </p>
      <UploaderDemo />
    </main>
  );
}
