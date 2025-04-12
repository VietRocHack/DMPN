import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pressStart2P = Press_Start_2P({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-press-start-2p",
});

const vt323 = VT323({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-vt323",
});

export const metadata: Metadata = {
    title: "DMPN - Developer Monitoring and Productivity Nexus",
    description: "Measure your developer aura points through webcam and screen monitoring!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${pressStart2P.variable} ${vt323.variable}`}>{children}</body>
        </html>
    );
}
