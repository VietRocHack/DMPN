"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { io } from "socket.io-client";

// Constants for the application
const API_CONFIG = {
    // Set this to false to use dummy data, true to use the actual backend
    USE_REAL_API: true,
    // API endpoint URL - update this to your actual backend URL
    API_URL: "http://127.0.0.1:5000",
    // WebSocket URL - should match your backend WebSocket endpoint
    IO_URL: "http://127.0.0.1:5000",
};

// Define the types for the WebSocket message
interface AuraMessage {
    // Image-related fields
    webcam_image?: string; // Base64 image from backend
    screenshot_image?: string; // Base64 screenshot from backend
    image?: string; // Normalized image for frontend display

    // Score-related fields
    score_change?: number; // Score change from backend
    pointChange?: number; // Frontend version
    updated_score?: number; // New total score from backend

    // Text-related fields
    reason?: string; // Explanation from backend
    explanation?: string; // Frontend version
    analysis?: string; // Analysis text

    // Additional fields
    tips?: string[]; // Tips from backend
    timestamp?: number; // Message timestamp
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
    // Use real API or mock data
    const [useRealApi, setUseRealApi] = useState<boolean>(API_CONFIG.USE_REAL_API);
    // Tips from backend
    const [tips, setTips] = useState<string[]>([
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
    ]);

    // Reference to the Socket.IO connection
    const socketRef = useRef<ReturnType<typeof io> | null>(null);
    // Reference to dummy data interval
    const dummyIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Connect to Socket.IO server or use mock data
    useEffect(() => {
        if (useRealApi) {
            // Clean up any existing dummy data interval
            if (dummyIntervalRef.current) {
                clearInterval(dummyIntervalRef.current);
                dummyIntervalRef.current = null;
            }

            // Connect to real Socket.IO server
            try {
                setError(null);
                console.log(`Connecting to Socket.IO at ${API_CONFIG.IO_URL}...`);

                // Create Socket.IO connection
                socketRef.current = io(API_CONFIG.IO_URL, {
                    transports: ["websocket"],
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                });

                socketRef.current.on("connect", () => {
                    console.log("Socket.IO connection established with ID:", socketRef.current?.id);
                    setConnected(true);
                });

                socketRef.current.on("aura_update", (messageData) => {
                    try {
                        // Clean debug logging, focus on screenshot debugging
                        console.log("[DEBUG] Raw message from server:", messageData);

                        // Check screenshot-related data specifically
                        console.log("[DEBUG] Screenshot properties in message:", {
                            hasWebcamOnly: messageData.image && !messageData.screenshot_image,
                            hasScreenshot: !!messageData.screenshot_image,
                            screenshotLength: messageData.screenshot_image
                                ? messageData.screenshot_image.length
                                : 0,
                        });

                        // Normalize the message format to match our frontend format
                        const normalizedMessage: AuraMessage = {
                            // Keep both webcam and screenshot images
                            webcam_image: messageData.webcam_image || messageData.image,
                            // Use the screenshot_image directly from the backend
                            screenshot_image: messageData.screenshot_image,
                            // Backend sends webcam_image, but our frontend needs image
                            image: messageData.webcam_image || messageData.image,
                            // Backend sends score_change, but we might use pointChange
                            pointChange: messageData.score_change || messageData.pointChange || 0,
                            // Backend sends reason, but we might use explanation
                            explanation: messageData.reason || messageData.explanation || "",
                            // Add current timestamp if none provided
                            timestamp: messageData.timestamp || Date.now(),
                            // Keep analysis text
                            analysis: messageData.analysis || "",
                        };

                        console.log("[DEBUG] Normalized message:", normalizedMessage);
                        console.log(
                            "[DEBUG] Screenshot in normalized message:",
                            normalizedMessage.screenshot_image
                                ? "PRESENT (length: " +
                                      normalizedMessage.screenshot_image.length +
                                      ")"
                                : "MISSING"
                        );

                        // Debug full message structure
                        console.log("[DEBUG] Keys in message:", Object.keys(messageData));

                        // Update snapshots
                        setSnapshots((prev) => {
                            const newSnapshots = [normalizedMessage, ...prev].slice(0, 10);
                            console.log(
                                "[DEBUG] First snapshot screenshot:",
                                newSnapshots[0].screenshot_image ? "PRESENT" : "MISSING"
                            );
                            return newSnapshots;
                        });

                        // Update total points - backend sends an updated_score with the new total
                        if (messageData.updated_score !== undefined) {
                            setTotalPoints(messageData.updated_score);
                        } else if (normalizedMessage.pointChange !== undefined) {
                            setTotalPoints((prev) => prev + normalizedMessage.pointChange!);
                        }

                        // Update tips if available - now accumulating tips rather than replacing
                        if (messageData.tips) {
                            // Ensure tips is always an array
                            let newTips: string[] = [];
                            if (Array.isArray(messageData.tips)) {
                                newTips = messageData.tips;
                            } else if (typeof messageData.tips === "string") {
                                // If it's a string, try to parse it as JSON, or make it a single-item array
                                try {
                                    const parsedTips = JSON.parse(messageData.tips);
                                    newTips = Array.isArray(parsedTips)
                                        ? parsedTips
                                        : [messageData.tips];
                                } catch (e) {
                                    console.debug("Failed to parse tips as JSON:", e);
                                    newTips = [messageData.tips];
                                }
                            } else {
                                // If it's something else, convert to string and use as single tip
                                newTips = [String(messageData.tips)];
                            }

                            // Accumulate tips instead of replacing them
                            setTips((prevTips) => {
                                // Create a new array that includes all new tips that aren't already in the list
                                const uniqueNewTips = newTips.filter(
                                    (tip) => !prevTips.includes(tip)
                                );
                                // Put new tips at the beginning of the array
                                return [...uniqueNewTips, ...prevTips];
                            });
                        }
                    } catch (err) {
                        console.error("Error handling Socket.IO message:", err);
                    }
                });

                socketRef.current.on("connect_error", (err) => {
                    console.error("Socket.IO connection error:", err);
                    setError(`Socket.IO connection error: ${err.message}`);
                    setConnected(false);

                    // Retry connection after a delay if we got an error
                    setTimeout(() => {
                        setUseRealApi(false); // Temporarily switch to dummy data
                        setTimeout(() => {
                            if (!socketRef.current?.connected) {
                                console.log("Retrying Socket.IO connection...");
                                setUseRealApi(true); // Try to reconnect
                            }
                        }, 5000);
                    }, 1000);
                });

                socketRef.current.on("disconnect", (reason) => {
                    console.log("Socket.IO connection closed:", reason);
                    setConnected(false);
                });
            } catch (err) {
                console.error("Socket.IO setup error:", err);
                setError("Failed to connect to Socket.IO server.");
                setConnected(false);
            }

            // Cleanup function
            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }
            };
        } else {
            // Use mock data
            setConnected(true);
            console.log("Using dummy data instead of Socket.IO");

            // Generate mock data at random intervals
            const generateMockData = () => {
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
                    webcam_image: mockImage,
                    screenshot_image: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQ4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNTU1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPlNjcmVlbiBTbmFwc2hvdDwvdGV4dD48L3N2Zz4=`,
                    pointChange: pointChange,
                    explanation: randomExplanation,
                    timestamp: Date.now(),
                };

                // Update state
                setSnapshots((prev) => [newMessage, ...prev].slice(0, 10)); // Keep last 10 snapshots
                setTotalPoints((prev) => prev + pointChange);

                console.log(
                    "[DEBUG-MOCK] Generated message with screenshot:",
                    newMessage.screenshot_image ? "PRESENT" : "MISSING"
                );
            };

            // Clean up any existing interval
            if (dummyIntervalRef.current) {
                clearInterval(dummyIntervalRef.current);
            }

            // Initial mock data
            generateMockData();

            // Set up interval for more mock data
            dummyIntervalRef.current = setInterval(
                generateMockData,
                Math.random() * 5000 + 3000 // Random interval between 3-8 seconds
            );

            // Cleanup function
            return () => {
                if (dummyIntervalRef.current) {
                    clearInterval(dummyIntervalRef.current);
                    dummyIntervalRef.current = null;
                }
                setConnected(false);
            };
        }
    }, [useRealApi]); // Dependency on useRealApi to reconnect when toggled

    // Format the timestamp
    const formatTime = (timestamp?: number) => {
        if (!timestamp) return "Unknown";
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
                    <div className="flex items-center gap-4">
                        <div className="flex items-center">
                            <label className="text-white mr-2 font-['VT323'] text-xl">
                                Use API:
                            </label>
                            <input
                                type="checkbox"
                                checked={useRealApi}
                                onChange={() => setUseRealApi(!useRealApi)}
                                className="w-5 h-5"
                            />
                        </div>
                        <Link
                            href="/"
                            className="text-white hover:text-purple-200 transition-colors font-['VT323'] text-xl"
                        >
                            ← Back to Home
                        </Link>
                    </div>
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
                                                (snapshot.pointChange || 0) >= 0
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                            }`}
                                        >
                                            {(snapshot.pointChange || 0) >= 0
                                                ? `+${snapshot.pointChange}`
                                                : snapshot.pointChange}{" "}
                                            points
                                        </span>
                                        <span className="text-white/70 font-['VT323']">
                                            {formatTime(snapshot.timestamp)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        {/* Webcam image */}
                                        <div className="relative overflow-hidden rounded bg-black/40">
                                            {(snapshot.webcam_image || snapshot.image) && (
                                                <>
                                                    <div className="absolute top-1 left-1 text-xs bg-black/50 text-white px-1 rounded">
                                                        Webcam
                                                    </div>
                                                    <img
                                                        src={
                                                            (snapshot.webcam_image ||
                                                                snapshot.image)!.startsWith("data:")
                                                                ? (snapshot.webcam_image ||
                                                                      snapshot.image)!
                                                                : `data:image/jpeg;base64,${(snapshot.webcam_image ||
                                                                      snapshot.image)!}`
                                                        }
                                                        alt="Webcam snapshot"
                                                        className="w-full object-cover"
                                                        style={{ maxHeight: "150px" }}
                                                    />
                                                </>
                                            )}
                                        </div>

                                        {/* Screen image */}
                                        <div className="relative overflow-hidden rounded bg-black/40">
                                            {snapshot.screenshot_image ? (
                                                <>
                                                    <div className="absolute top-1 left-1 text-xs bg-black/50 text-white px-1 rounded">
                                                        Screen
                                                    </div>
                                                    <img
                                                        src={
                                                            snapshot.screenshot_image.startsWith(
                                                                "data:"
                                                            )
                                                                ? snapshot.screenshot_image
                                                                : `data:image/jpeg;base64,${snapshot.screenshot_image}`
                                                        }
                                                        alt="Screen snapshot"
                                                        className="w-full object-cover"
                                                        style={{ maxHeight: "150px" }}
                                                        onError={(e) => {
                                                            console.log(
                                                                "[DEBUG] Screenshot image load error:",
                                                                e
                                                            );
                                                            (
                                                                e.target as HTMLImageElement
                                                            ).style.display = "none";
                                                        }}
                                                        onLoad={() =>
                                                            console.log(
                                                                "[DEBUG] Screenshot loaded successfully for snapshot:",
                                                                snapshot.timestamp
                                                            )
                                                        }
                                                    />
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-white/70 text-sm p-2">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-8 w-8 mb-2 text-white/40"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                    No screen capture available
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-white font-['VT323'] text-lg">
                                        {snapshot.explanation}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Middle Column - Aura Score */}
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <h2 className="text-2xl text-white font-['VT323'] mb-6">
                            Developer Aura Status
                        </h2>

                        <div
                            className={`w-64 h-64 rounded-full bg-gradient-to-br ${getAuraColor()} flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.3)]`}
                        >
                            <div className="text-white text-center">
                                <div className="text-6xl font-bold font-['Press_Start_2P']">
                                    {totalPoints}
                                </div>
                                <div className="text-xl mt-2 font-['VT323']">Aura Points</div>
                            </div>
                        </div>

                        <div className="text-3xl text-white font-['VT323'] mb-2">
                            {getAuraLevel()}
                        </div>

                        <div
                            className={`mt-4 px-4 py-2 rounded-lg ${
                                connected ? "bg-green-500/20" : "bg-red-500/20"
                            }`}
                        >
                            <span className="text-white font-['VT323'] text-lg">
                                {connected
                                    ? useRealApi
                                        ? "Connected to aura monitoring system"
                                        : "Using simulated data"
                                    : "Disconnected from aura monitoring system"}
                            </span>
                        </div>
                    </div>

                    {/* Right Column - Tips */}
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
                        <h2 className="text-2xl text-white font-['VT323'] mb-4">
                            Productivity Tips
                        </h2>

                        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            {Array.isArray(tips) && tips.length > 0 ? (
                                tips.map((tip, index) => (
                                    <li
                                        key={index}
                                        className="bg-black/20 rounded-lg p-3 text-white font-['VT323'] text-lg"
                                    >
                                        {tip}
                                    </li>
                                ))
                            ) : (
                                <li className="bg-black/20 rounded-lg p-3 text-white font-['VT323'] text-lg">
                                    No tips available yet.
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}
