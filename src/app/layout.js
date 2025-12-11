import "./globals.css";

export const metadata = {
  title: "SISTEM AKSES LAB",
  description: "Lab Accessing System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body className="bg-[#fbfbfb] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}