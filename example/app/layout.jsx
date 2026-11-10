import "./globals.css";

export const metadata = {
  title: "form-uploader example",
  description: "Demo of the form-uploader package in a Next.js app.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
