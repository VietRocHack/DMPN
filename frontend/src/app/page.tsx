import Link from "next/link";

export default function Home() {
    return (
        <main className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-gray-800 p-4">
            <div className="text-center space-y-8 max-w-2xl">
                <h1 className="text-6xl font-bold text-blue-400 mb-4 font-['Press_Start_2P']">DMPN</h1>
                <h2 className="text-2xl text-blue-200 font-['VT323']">
                    Developer Monitoring and Productivity Nexus
                </h2>
                <p className="text-xl text-gray-300 font-['VT323']">
                    Let us judge your coding skills through your webcam and screen! Get your
                    developer aura points and become the ultimate coding ninja! 🥷
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                    <Link
                        href="/dashboard"
                        className="px-8 py-4 bg-blue-700 text-white rounded-full text-xl font-bold hover:bg-blue-600 transition-all transform hover:scale-105 font-['VT323']"
                    >
                        Start Your Journey →
                    </Link>
                    <Link
                        href="/admin"
                        className="px-8 py-4 bg-slate-700 text-gray-200 rounded-full text-xl font-bold hover:bg-slate-600 transition-all transform hover:scale-105 font-['VT323']"
                    >
                        Admin Dashboard
                    </Link>
                </div>
            </div>
        </main>
    );
}
