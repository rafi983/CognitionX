// app/layout.jsx
import localFont from "next/font/local";
import "./globals.css";

// Setup the local font
// const satoshi = localFont({
//     src: [
//         { path: '../fonts/Satoshi-Light.woff2', weight: '300' },
//         { path: '../fonts/Satoshi-Regular.woff2', weight: '400' },
//         { path: '../fonts/Satoshi-Medium.woff2', weight: '500' },
//         { path: '../fonts/Satoshi-Bold.woff2', weight: '700' },
//     ],
// });

export const metadata = {
  title: "CognitionX",
  description: "AI Chat Application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
