"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import Image from "next/image";

// Import emotes
import happyEmote from "@/images/happy.png"; 
import lazyEmote from "@/images/lazy.png";
import indifferentEmote from "@/images/indifferent.png";
import competitiveEmote from "@/images/competitive.png";
import tiredEmote from "@/images/tired.png";
import sleepingEmote from "@/images/sleeping.png";
import shockedEmote from "@/images/shocked.png";
import laughEmote from "@/images/laugh.png";
import lockedInEmote from "@/images/locked_in.png";

// Constants for the application
const API_CONFIG = {
    // Set this to false to use dummy data, true to use the actual backend
    USE_REAL_API: true,
    // API endpoint URL - update this to your actual backend URL
    API_URL: "http://172.23.28.117:5000",
    // WebSocket URL - should match your backend WebSocket endpoint
    IO_URL: "http://172.23.28.117:5000",
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

// Helper function to get appropriate emote based on aura level
const getAuraLevelEmote = (points: number) => {
    if (points < 0) return tiredEmote; // Debugging Disaster
    if (points < 20) return sleepingEmote; // Low Code Cadet
    if (points < 50) return indifferentEmote; // Code Cadet
    if (points < 100) return competitiveEmote; // Function Fanatic
    if (points < 150) return happyEmote; // Algorithm Ace
    if (points < 200) return laughEmote; // High Algorithm Ace
    return lockedInEmote; // Programming Prodigy
};

// Get emote for snapshot based on point change
const getSnapshotEmote = (pointChange: number | undefined) => {
    if (!pointChange) return indifferentEmote;
    if (pointChange > 10) return laughEmote;
    if (pointChange > 5) return happyEmote;
    if (pointChange > 0) return competitiveEmote;
    if (pointChange < -10) return sleepingEmote;
    if (pointChange < -5) return tiredEmote;
    if (pointChange < 0) return lazyEmote; // Small negative change
    return shockedEmote; // Zero change
};

export default function AdminDashboard() {
    // State for total aura points
    const [totalPoints, setTotalPoints] = useState<number>(50);
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
                const mockImage = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQ4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==`;

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
        if (totalPoints < 0) return "#ef4444"; // red-500
        if (totalPoints < 50) return "#f97316"; // orange-500
        if (totalPoints < 100) return "#eab308"; // yellow-500
        if (totalPoints < 200) return "#22c55e"; // green-500
        return "#3b82f6"; // blue-500
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
        <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-900 to-gray-800 text-gray-200 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-blue-400 mb-2 font-['Press_Start_2P']">Aura Observatory</h1>
                    <p className="text-lg text-gray-300 font-['VT323']">
                        Monitor developer aura activity in real-time
                    </p>
                </div>

                {/* Connection Status */}
                <div className={`mb-6 p-4 rounded-lg font-['VT323'] text-xl ${
                    connected ? "bg-slate-800" : "bg-slate-800 border border-red-500"
                }`}>
                        <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${
                            connected ? "bg-green-500" : "bg-red-500"
                        }`}></div>
                        <span className={connected ? "text-green-400" : "text-red-400"}>
                            {connected ? "Connected to WebSocket" : "Disconnected"}
                        </span>
                        {useRealApi && (
                            <div className="ml-4">
                                <button
                                    onClick={() => {
                                        socketRef.current?.connect();
                                    }}
                                    className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    disabled={connected}
                                >
                                    Reconnect
                                </button>
                            </div>
                        )}
                        {!useRealApi && (
                            <span className="ml-4 text-yellow-400">(Using mock data)</span>
                        )}
                    </div>
                    {error && <div className="mt-2 text-red-400">{error}</div>}

                    {/* Toggle for real API / mock data */}
                    <div className="mt-4 flex items-center">
                        <span className="text-gray-300 mr-2">Mode:</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={useRealApi}
                                onChange={() => setUseRealApi(!useRealApi)}
                            />
                            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 hover:after:scale-110 hover:ring-1 hover:ring-blue-300 transition-all duration-300"></div>
                            <span className="ml-3 text-gray-300 group-hover:text-blue-300 transition-colors duration-300">
                                {useRealApi ? "Real-time Data" : "Mock Data"}
                            </span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column - Snapshot Timeline */}
                    <div className="lg:col-span-5 xl:col-span-4 bg-slate-800 rounded-lg p-4 shadow-md">
                        <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Aura Snapshots</h2>
                        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                            {snapshots.length > 0 ? (
                                snapshots.map((snapshot, index) => (
                                    <div key={index} className="bg-slate-900 rounded-lg overflow-hidden shadow-md">
                                        {/* Snapshot Header */}
                                        <div className="p-3 flex items-center justify-between">
                                            <div className="flex items-center text-xl font-['VT323']">
                                                {/* Add snapshot emote */}
                                                <div className="flex-shrink-0 mr-3 relative w-8 h-8">
                                                    <Image
                                                        src={getSnapshotEmote(snapshot.pointChange)}
                                                        alt="Reaction"
                                                        layout="fill"
                                                        objectFit="contain"
                                                    />
                                                </div>
                                                <span
                                                    className={`text-xl ${
                                                        (snapshot.pointChange || 0) > 0 
                                                    ? "text-green-400"
                                                            : (snapshot.pointChange || 0) < 0 
                                                                ? "text-red-400" 
                                                                : "text-gray-400"
                                            }`}
                                                >
                                                    {(snapshot.pointChange || 0) > 0 
                                                ? `+${snapshot.pointChange}`
                                                        : snapshot.pointChange}
                                                </span>
                                                <span className="text-gray-400 text-sm ml-2">
                                                    {snapshot.timestamp ? formatTime(snapshot.timestamp) : "Just now"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Image(s) */}
                                        <div className="flex flex-col sm:flex-row">
                                            {/* Webcam Image */}
                                            {snapshot.image && (
                                                <div className="flex-1 relative">
                                                    <img 
                                                        src={snapshot.image.startsWith('data:') ? snapshot.image : `data:image/jpeg;base64,${snapshot.image}`} 
                                                        alt="Developer" 
                                                        className="w-full h-48 object-cover border-t border-b border-slate-700"
                                                        onError={(e) => {
                                                            console.error("Error loading webcam image");
                                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQ4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
                                                        }}
                                                    />
                                                    <div className="absolute top-2 left-2 bg-slate-900/70 px-2 py-1 rounded text-xs text-gray-300">
                                                        Webcam
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Screen Image - only shown if available */}
                                            {snapshot.screenshot_image && (
                                                <div className="flex-1 relative">
                                                    <img 
                                                        src={snapshot.screenshot_image.startsWith('data:') ? snapshot.screenshot_image : `data:image/jpeg;base64,${snapshot.screenshot_image}`} 
                                                        alt="Screen" 
                                                        className="w-full h-48 object-cover border-t border-b border-slate-700"
                                                        onError={(e) => {
                                                            console.error("Error loading screenshot image");
                                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQ4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNTU1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPlNjcmVlbiBFcnJvcjwvdGV4dD48L3N2Zz4=';
                                                        }}
                                                    />
                                                    <div className="absolute top-2 left-2 bg-slate-900/70 px-2 py-1 rounded text-xs text-gray-300">
                                                        Screen
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Analysis */}
                                        <div className="p-3">
                                            <p className="text-gray-300 font-['VT323'] text-lg">
                                                {snapshot.explanation || "No analysis available"}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="bg-slate-900 rounded-lg p-4 text-center">
                                    <p className="text-gray-400 font-['VT323'] text-xl">
                                        Waiting for developer activity...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Middle Column - Aura Points */}
                    <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-6">
                        <div className="bg-slate-800 rounded-lg p-6 flex-1 flex flex-col items-center justify-center shadow-md relative overflow-hidden">
                            {/* Remove pulsating background */}
                            
                            {/* Remove outer glow */}
                            
                            <h2 className="text-2xl font-bold mb-2 text-blue-300 font-['VT323'] relative z-10">Developer Aura</h2>
                            
                            {/* Add emote above the points */}
                            <div className="relative w-32 h-32 mb-4">
                                <Image
                                    src={getAuraLevelEmote(totalPoints)}
                                    alt="Aura Level"
                                    layout="fill"
                                    objectFit="contain"
                                />
                            </div>
                            
                            {/* Points display without pulsating ring */}
                            <div className="relative mb-2">
                                {/* Remove pulsating ring */}
                                <div 
                                    className="text-8xl font-bold font-['Press_Start_2P'] relative z-10"
                                    style={{ color: getAuraColor() }}
                                >
                                    {totalPoints}
                                </div>
                            </div>
                            
                            <div 
                                className="text-3xl text-center font-['VT323'] relative z-10 mb-4"
                                style={{ color: getAuraColor() }}
                            >
                                {getAuraLevel()}
                            </div>
                            
                            <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden relative z-10">
                                <div 
                                    className="h-full rounded-full transition-all duration-500 ease-out"
                                    style={{ 
                                        width: `${Math.min(Math.max(totalPoints, 0), 100)}%`,
                                        backgroundColor: getAuraColor() 
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Image capture stats (simplified) */}
                        <div className="bg-slate-800 rounded-lg p-6 shadow-md">
                            <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Session Stats</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300 font-['VT323'] text-lg">
                                        Snapshots received
                                    </span>
                                    <span className="text-xl font-bold text-blue-300 font-['VT323']">
                                        {snapshots.length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300 font-['VT323'] text-lg">
                                        Current aura level
                                    </span>
                                    <span className="text-xl font-bold font-['VT323']" style={{ color: getAuraColor() }}>
                                        {getAuraLevel()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300 font-['VT323'] text-lg">
                                        WebSocket status
                                    </span>
                                    <span className={`text-xl font-bold font-['VT323'] ${connected ? "text-green-400" : "text-red-400"}`}>
                                        {connected ? "Connected" : "Disconnected"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Tips */}
                    <div className="lg:col-span-3 xl:col-span-4 bg-slate-800 rounded-lg p-6 shadow-md">
                        <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Developer Tips</h2>
                        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                            {tips.map((tip, index) => (
                                <div 
                                    key={index}
                                    className={`p-4 rounded-lg ${
                                        index % 2 === 0 ? "bg-slate-700" : "bg-slate-900"
                                    } cursor-pointer hover:bg-opacity-80 hover:transform hover:scale-[1.01] transition-all duration-300 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] group`}
                                >
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 mr-3 relative w-6 h-6 transition-transform duration-300 group-hover:scale-125">
                                            <Image
                                                src={index % 5 === 0 ? laughEmote : 
                                                     index % 4 === 0 ? competitiveEmote : 
                                                     index % 3 === 0 ? happyEmote : 
                                                     index % 2 === 0 ? indifferentEmote : 
                                                     lockedInEmote}
                                                alt="Tip"
                                                layout="fill"
                                                objectFit="contain"
                                            />
                                        </div>
                                        <p className="text-gray-300 font-['VT323'] text-lg group-hover:text-blue-300 transition-colors duration-300">{tip}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
