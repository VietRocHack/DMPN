"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Define the types for the WebSocket message
interface AuraMessage {
    image: string; // Base64 encoded image
    pointChange: number; // Points change (positive or negative)
    explanation: string; // Explanation for the point change
    timestamp: number; // Message timestamp
}

export default function AdminDashboard() {
    // State for total aura points
    const [totalPoints, setTotalPoints] = useState<number>(0);
    // State for snapshot history
    const [snapshots, setSnapshots] = useState<AuraMessage[]>([]);
    // WebSocket connection status
    const [connected, setConnected] = useState<boolean>(false);
    // Error message if connection fails
    const [error, setError] = useState<string | null>(null);

    // Reference to the WebSocket connection
    const wsRef = useRef<WebSocket | null>(null);

    // List of tips for increasing aura points
    const tips = [
        "Focus on one task at a time for maximum productivity",
        "Use proper ergonomics to maintain coding posture",
        "Take short breaks every 45 minutes to rest your eyes",
        "Stay off social media during coding sessions",
        "Comment your code for future you to understand",
        "Keep your workspace clean and organized",
        "Use keyboard shortcuts to speed up your workflow",
        "Stay hydrated while coding - your brain needs water!",
        "Write small, testable functions rather than monoliths",
        "Pair program with a friend to boost learning",
    ];

    // Connect to WebSocket server
    useEffect(() => {
        // For demonstration purposes, let's use a mock connection and data
        // In a real app, replace with your actual WebSocket server URL
        const connectWebSocket = () => {
            try {
                setError(null);

                // In a real app, use a real WebSocket server
                // wsRef.current = new WebSocket('ws://your-backend-url/ws');

                // Simulate connection success
                console.log("Connecting to mock WebSocket server...");
                setConnected(true);

                // Simulate incoming messages at random intervals
                const simulateIncomingMessages = () => {
                    const interval = setInterval(() => {
                        // Generate random point change (-10 to +20)
                        const pointChange = Math.floor(Math.random() * 31) - 10;

                        // Create a list of possible explanations
                        const explanations = [
                            "Great coding posture detected! +10 points",
                            "User was distracted by social media. -5 points",
                            "Efficient keyboard shortcut usage. +8 points",
                            "Excellent focus on task. +15 points",
                            "User appears tired, recommend a break. -3 points",
                            "Clean code structure detected. +12 points",
                            "Too many browser tabs open. -7 points",
                            "Good hydration habits observed. +5 points",
                            "Proper debugging techniques used. +10 points",
                            "Excessive copy-pasting detected. -8 points",
                        ];

                        // Pick a random explanation that matches the point direction
                        let explanation;
                        if (pointChange >= 0) {
                            explanation = explanations.filter((e) => e.includes("+"));
                        } else {
                            explanation = explanations.filter((e) => e.includes("-"));
                        }
                        const randomExplanation =
                            explanation[Math.floor(Math.random() * explanation.length)];

                        // Create a mock image (would be base64 from server)
                        const mockImage = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQ4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPlVzZXIgU25hcHNob3Q8L3RleHQ+PC9zdmc+`;

                        // Create the message
                        const newMessage: AuraMessage = {
                            image: mockImage,
                            pointChange: pointChange,
                            explanation: randomExplanation,
                            timestamp: Date.now(),
                        };

                        // Update state
                        setSnapshots((prev) => [newMessage, ...prev].slice(0, 10)); // Keep last 10 snapshots
                        setTotalPoints((prev) => prev + pointChange);

                        console.log("Received new aura point update:", newMessage);
                    }, Math.random() * 5000 + 3000); // Random interval between 3-8 seconds

                    return interval;
                };

                const interval = simulateIncomingMessages();

                return () => {
                    clearInterval(interval);
                    setConnected(false);
                };
            } catch (err) {
                console.error("WebSocket connection error:", err);
                setError("Failed to connect to server. Please try again later.");
                setConnected(false);
            }
        };

        const cleanup = connectWebSocket();

        return () => {
            if (cleanup) cleanup();
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    // Format the timestamp
    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    // Calculate aura color based on points
    const getAuraColor = () => {
        if (totalPoints < 0) return "from-red-500 to-orange-500";
        if (totalPoints < 50) return "from-orange-400 to-yellow-400";
        if (totalPoints < 100) return "from-yellow-300 to-green-400";
        if (totalPoints < 200) return "from-green-400 to-blue-500";
        return "from-blue-400 to-purple-600";
    };

    // Get aura level text
    const getAuraLevel = () => {
        if (totalPoints < 0) return "Debugging Disaster";
        if (totalPoints < 50) return "Code Cadet";
        if (totalPoints < 100) return "Function Fanatic";
        if (totalPoints < 200) return "Algorithm Ace";
        return "Programming Prodigy";
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-white font-['Press_Start_2P']">
                        Admin Dashboard
                    </h1>
                    <Link
                        href="/"
                        className="text-white hover:text-purple-200 transition-colors font-['VT323'] text-xl"
                    >
                        ← Back to Home
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-500/20 text-white p-4 rounded-lg mb-8 font-['VT323'] text-xl">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Snapshot Timeline */}
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 overflow-auto max-h-[80vh]">
                        <h2 className="text-2xl text-white font-['VT323'] mb-4">
                            Aura Point Timeline
                        </h2>

                        <div className="space-y-6">
                            {connected && snapshots.length === 0 && (
                                <div className="text-white font-['VT323'] text-center py-8">
                                    Waiting for user activity data...
                                </div>
                            )}

                            {snapshots.map((snapshot, index) => (
                                <div key={index} className="bg-black/20 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span
                                            className={`text-xl font-['VT323'] ${
                                                snapshot.pointChange >= 0
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                            }`}
                                        >
                                            {snapshot.pointChange >= 0
                                                ? `+${snapshot.pointChange}`
                                                : snapshot.pointChange}{" "}
                                            points
                                        </span>
                                        <span className="text-sm text-white/70 font-['VT323']">
                                            {formatTime(snapshot.timestamp)}
                                        </span>
                                    </div>

                                    <div className="mb-3 text-white font-['VT323']">
                                        {snapshot.explanation}
                                    </div>

                                    <img
                                        src={snapshot.image}
                                        alt={`User snapshot at ${formatTime(snapshot.timestamp)}`}
                                        className="w-full h-32 object-cover rounded-lg"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Middle Column - Aura Points Display */}
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 flex flex-col items-center justify-center">
                        <h2 className="text-2xl text-white font-['VT323'] mb-4">Developer Aura</h2>

                        <div
                            className={`w-64 h-64 rounded-full bg-gradient-to-r ${getAuraColor()} flex items-center justify-center mb-6 relative`}
                        >
                            <div className="text-5xl font-bold text-white font-['Press_Start_2P']">
                                {totalPoints}
                            </div>

                            {/* Animated pulse effect */}
                            <div
                                className={`absolute w-full h-full rounded-full bg-gradient-to-r ${getAuraColor()} opacity-60 animate-ping`}
                                style={{ animationDuration: "3s" }}
                            ></div>
                        </div>

                        <div className="text-3xl text-white font-['VT323'] mb-2">
                            {getAuraLevel()}
                        </div>

                        <div className="text-white/80 font-['VT323'] text-center mt-4">
                            {connected ? (
                                <span className="flex items-center">
                                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                    Monitoring active
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                                    Disconnected
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Tips */}
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 overflow-auto max-h-[80vh]">
                        <h2 className="text-2xl text-white font-['VT323'] mb-4">
                            Tips for Improvement
                        </h2>

                        <ul className="space-y-4">
                            {tips.map((tip, index) => (
                                <li key={index} className="bg-black/20 p-4 rounded-lg">
                                    <div className="flex items-start">
                                        <span className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-white font-['VT323'] mr-3">
                                            {index + 1}
                                        </span>
                                        <span className="text-white font-['VT323'] text-lg">
                                            {tip}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}
