import Link from "next/link";
import Image from "next/image";
import coverImage from "@/images/cover_image_2.png";

export default function Home() {
    return (
        <main className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-gray-800 p-4">
            <div className="max-w-3xl w-full mx-auto mb-8 relative">
                <div className="rounded-xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.3)] border border-blue-500/30">
                    <div className="relative aspect-video">
                        <Image
                            src={coverImage}
                            alt="Developer Aura Battle"
                            layout="fill"
                            objectFit="cover"
                            priority
                            className="rounded-xl"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 right-6 text-white">
                            <h1 className="text-4xl sm:text-6xl font-bold text-blue-400 mb-2 font-['Press_Start_2P'] leading-tight drop-shadow-lg">DMPN</h1>
                            <h2 className="text-xl sm:text-2xl text-blue-200 font-['VT323'] drop-shadow-md">
                                Developer Monitoring and Productivity Nexus
                            </h2>
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-center space-y-8 max-w-2xl">
                <p className="text-xl text-gray-300 font-['VT323']">
                    Let us judge your coding skills through your webcam and screen! Get your
                    developer aura points and become the ultimate coding ninja! 🥷
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                    <Link
                        href="/dashboard"
                        className="px-8 py-4 bg-blue-700 text-white rounded-full text-xl font-bold hover:bg-blue-600 transition-all transform hover:scale-105 font-['VT323']"
                    >
                        Aura Calibration Studio
                    </Link>
                    <Link
                        href="/admin"
                        className="px-8 py-4 bg-slate-700 text-gray-200 rounded-full text-xl font-bold hover:bg-slate-600 transition-all transform hover:scale-105 font-['VT323']"
                    >
                        Aura Observatory
                    </Link>
                </div>
                <Link 
                    href="/ranked" 
                    className="px-8 py-4 bg-gradient-to-r from-purple-700 to-pink-700 text-white rounded-full text-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 font-['VT323'] inline-block"
                >
                    Try Ranked Aura Battles! 🏆
                </Link>
            </div>
        </main>
    );
}
