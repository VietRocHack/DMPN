/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

// Import images
import coverImage from "@/images/cover_image.png";
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
    API_URL: "http://127.0.0.1:5000",
    // Default capture interval in seconds
    DEFAULT_INTERVAL: 5,
};

// Helper function to get the appropriate emote based on score and changes
const getAuraEmote = (score: number, lastChange: number | null) => {
    // Use locked_in for very high scores with positive change
    if (score > 150 && lastChange && lastChange > 0) return lockedInEmote;
    
    // Use laugh for high scores with big jumps
    if (score > 100 && lastChange && lastChange > 8) return laughEmote;
    
    // Use shocked for big point changes (positive or negative)
    if (lastChange && Math.abs(lastChange) > 12) return shockedEmote;
    
    // Use sleeping for very low scores
    if (score < 20) return sleepingEmote;
    
    // Original logic
    if (score < 30) return tiredEmote;
    if (score > 80) return happyEmote;
    if (lastChange && lastChange > 5) return competitiveEmote;
    if (lastChange && lastChange < 0) return indifferentEmote;
    return lazyEmote;
};

// Helper to get emote for specific point changes in the activity feed
const getActivityEmote = (change: number) => {
    if (change > 12) return laughEmote; // Big positive change - laugh
    if (change > 8) return lockedInEmote; // Good positive change - locked in
    if (change > 5) return competitiveEmote; // Medium positive change - competitive
    if (change > 0) return happyEmote; // Small positive change - happy
    if (change < -12) return shockedEmote; // Big negative change - shocked
    if (change < -8) return sleepingEmote; // Bigger negative change - sleeping
    if (change < -5) return tiredEmote; // Medium negative change - tired
    return indifferentEmote; // Small negative change - indifferent
};

// Meme-style reasons for aura changes
const positiveReasons = [
    "Epic code energy detected!",
    "Keyboard warrior mode activated!",
    "Clean code vibes intensify!",
    "Syntax mastery observed!",
    "Bug squashing champion!",
    "Code quality meter exploding!",
    "Pixel-perfect focus detected!",
    "Git commits on fire!",
    "Debugging like a wizard!"
];

const negativeReasons = [
    "Coffee levels critically low!",
    "Distracted by cat videos!",
    "Stackoverflow connection lost!",
    "Needs more RGB lighting!",
    "Syntax error in brain.js!",
    "Keyboard rage detected!",
    "Yawning at code reviews!",
    "Stack overflow in real life!",
    "Runtime error in attention span!"
];

export default function Dashboard() {
    const [webcamPermission, setWebcamPermission] = useState<boolean | null>(null);
    const [screenPermission, setScreenPermission] = useState<boolean | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [captureInterval, setCaptureInterval] = useState<number>(API_CONFIG.DEFAULT_INTERVAL);
    const [webcamImage, setWebcamImage] = useState<string | null>(null);
    const [screenImage, setScreenImage] = useState<string | null>(null);
    const [captureCount, setCaptureCount] = useState(0);
    const [totalPoints, setTotalPoints] = useState<number>(50);
    const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
    const [useRealApi, setUseRealApi] = useState<boolean>(API_CONFIG.USE_REAL_API);
    const [apiMessage, setApiMessage] = useState<string | null>(null);
    const [lastPointChange, setLastPointChange] = useState<number | null>(null);
    const [activityHistory, setActivityHistory] = useState<Array<{change: number; reason: string; timestamp: string}>>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const screenRef = useRef<HTMLVideoElement>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const webcamCanvasRef = useRef<HTMLCanvasElement>(null);
    const screenCanvasRef = useRef<HTMLCanvasElement>(null);
    const intervalValueRef = useRef<number>(captureInterval); // Store the interval value in a ref

    // Request webcam permission
    const requestWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 15 }, // Lower frameRate for better compatibility
                },
                audio: false,
            });
            webcamStreamRef.current = stream;

            console.log("Webcam stream tracks:", stream.getVideoTracks().length);
            console.log("Webcam track settings:", stream.getVideoTracks()[0].getSettings());

            if (videoRef.current) {
                videoRef.current.srcObject = stream;

                // Add multiple event listeners for better debugging
                videoRef.current.onloadedmetadata = () => {
                    console.log("Webcam video metadata loaded");
                    if (videoRef.current) {
                        console.log(
                            "Webcam dimensions after metadata:",
                            videoRef.current.videoWidth,
                            videoRef.current.videoHeight
                        );
                    }
                };

                videoRef.current.onloadeddata = () => {
                    console.log("Webcam video data loaded");
                    if (videoRef.current) {
                        console.log(
                            "Webcam dimensions after data load:",
                            videoRef.current.videoWidth,
                            videoRef.current.videoHeight
                        );
                        videoRef.current
                            .play()
                            .then(() => {
                                console.log("Webcam video started playing");
                                console.log(
                                    "Webcam dimensions after play:",
                                    videoRef.current?.videoWidth,
                                    videoRef.current?.videoHeight
                                );
                            })
                            .catch((err) => console.error("Error playing webcam video:", err));
                    }
                };
            }
            setWebcamPermission(true);
        } catch (error) {
            console.error("Error accessing webcam:", error);
            setWebcamPermission(false);
        }
    };

    // Request screen capture permission
    const requestScreen = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: { ideal: 15 }, // Lower frameRate for better compatibility
                },
                audio: false,
            });
            screenStreamRef.current = stream;

            console.log("Screen stream tracks:", stream.getVideoTracks().length);
            console.log("Screen track settings:", stream.getVideoTracks()[0].getSettings());

            if (screenRef.current) {
                screenRef.current.srcObject = stream;

                // Add multiple event listeners for better debugging
                screenRef.current.onloadedmetadata = () => {
                    console.log("Screen video metadata loaded");
                    if (screenRef.current) {
                        console.log(
                            "Screen dimensions after metadata:",
                            screenRef.current.videoWidth,
                            screenRef.current.videoHeight
                        );
                    }
                };

                screenRef.current.onloadeddata = () => {
                    console.log("Screen video data loaded");
                    if (screenRef.current) {
                        console.log(
                            "Screen dimensions after data load:",
                            screenRef.current.videoWidth,
                            screenRef.current.videoHeight
                        );
                        screenRef.current
                            .play()
                            .then(() => {
                                console.log("Screen video started playing");
                                console.log(
                                    "Screen dimensions after play:",
                                    screenRef.current?.videoWidth,
                                    screenRef.current?.videoHeight
                                );
                            })
                            .catch((err) => console.error("Error playing screen video:", err));
                    }
                };
            }
            setScreenPermission(true);

            // Add event listener for when user stops sharing screen
            stream.getVideoTracks()[0].addEventListener("ended", () => {
                console.log("Screen sharing ended by user");
                if (screenRef.current) {
                    screenRef.current.srcObject = null;
                }
                screenStreamRef.current = null;
                setScreenPermission(null);
            });
        } catch (error) {
            console.error("Error accessing screen:", error);
            setScreenPermission(false);
        }
    };

    // Function to capture a single frame from video
    const captureFrame = (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => {
        const ctx = canvasElement.getContext("2d");
        if (!ctx) return null;

        if (!videoElement.videoWidth || !videoElement.videoHeight) {
            console.log(
                "Video dimensions not available yet:",
                videoElement.videoWidth,
                videoElement.videoHeight
            );
            return null;
        }

        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        return canvasElement.toDataURL("image/jpeg");
    };

    // Test capture for webcam
    const testWebcamCapture = () => {
        if (videoRef.current && webcamCanvasRef.current) {
            console.log(
                "Testing webcam capture, video dimensions:",
                videoRef.current.videoWidth,
                videoRef.current.videoHeight
            );

            if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
                console.log("Webcam not ready yet, waiting for video to load");
                // Try again after a short delay if video isn't ready
                setTimeout(testWebcamCapture, 500);
                return;
            }

            const imageData = captureFrame(videoRef.current, webcamCanvasRef.current);
            setWebcamImage(imageData);
        }
    };

    // Test capture for screen
    const testScreenCapture = () => {
        if (screenRef.current && screenCanvasRef.current) {
            console.log(
                "Testing screen capture, video dimensions:",
                screenRef.current.videoWidth,
                screenRef.current.videoHeight
            );

            if (!screenRef.current.videoWidth || !screenRef.current.videoHeight) {
                console.log("Screen capture not ready yet, waiting for video to load");
                // Try again after a short delay if video isn't ready
                setTimeout(testScreenCapture, 500);
                return;
            }

            const imageData = captureFrame(screenRef.current, screenCanvasRef.current);
            setScreenImage(imageData);
        }
    };

    // Function to capture and send data to the backend
    const captureAndSendData = useCallback(async () => {
        if (
            !videoRef.current ||
            !screenRef.current ||
            !webcamCanvasRef.current ||
            !screenCanvasRef.current
        ) {
            console.log("References not available yet");
            return;
        }

        // Capture images
        const webcamImageData = captureFrame(videoRef.current, webcamCanvasRef.current);
        const screenImageData = captureFrame(screenRef.current, screenCanvasRef.current);

        if (!webcamImageData || !screenImageData) {
            console.log("Failed to capture images");
            return;
        }

        // Update local state with the captured images
        setWebcamImage(webcamImageData);
        setScreenImage(screenImageData);
        setCaptureCount((prev) => prev + 1);

        // Show notification popup but only briefly
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 2000);

        // Extract base64 data (remove the data:image/jpeg;base64, prefix)
        const webcamBase64 = webcamImageData.split(",")[1];
        const screenBase64 = screenImageData.split(",")[1];

        if (useRealApi) {
            try {
                setApiMessage("Sending data to backend...");

                // Validate base64 data before sending
                if (!webcamBase64 || !screenBase64) {
                    throw new Error("Failed to extract base64 data from images");
                }

                // Ensure totalPoints is a number and defaults to 0 if undefined/null
                const currentScore = totalPoints || 0;

                console.log("Sending data to backend:", {
                    webcam_image_length: webcamBase64.length,
                    screenshot_length: screenBase64.length,
                    current_score: currentScore,
                });

                // More detailed logging for debugging
                const requestData = {
                    webcam_image: webcamBase64,
                    screenshot: screenBase64,
                    current_score: currentScore,
                };

                console.log("Sending data with the following properties:");
                console.log(
                    "- webcam_image: " +
                        typeof webcamBase64 +
                        ", length: " +
                        webcamBase64.length +
                        ", starts with: " +
                        webcamBase64.substring(0, 20)
                );
                console.log(
                    "- screenshot: " +
                        typeof screenBase64 +
                        ", length: " +
                        screenBase64.length +
                        ", starts with: " +
                        screenBase64.substring(0, 20)
                );
                console.log("- current_score: " + typeof currentScore + ", value: " + currentScore);

                // Stringify once to avoid duplicate work and ensure what we log is what we send
                const requestBody = JSON.stringify(requestData);
                console.log("Request body size (bytes):", requestBody.length);

                let response;
                try {
                    response = await fetch(`${API_CONFIG.API_URL}/analyze_aura`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        mode: "cors",
                        credentials: "omit",
                        body: requestBody,
                    });

                    console.log("Response status:", response.status);
                    console.log(
                        "Response headers:",
                        Object.fromEntries([...response.headers.entries()])
                    );
                } catch (networkError: unknown) {
                    console.error("Network error during fetch:", networkError);
                    throw new Error(
                        `Network error: ${
                            networkError instanceof Error
                                ? networkError.message
                                : String(networkError)
                        }`
                    );
                }

                if (!response.ok) {
                    let errorText;
                    let errorJson;

                    try {
                        // First try to parse as JSON
                        const errorData = await response.json();
                        errorJson = errorData;
                        errorText = JSON.stringify(errorData);
                    } catch {
                        // If not JSON, get as text
                        errorText = await response.text();
                    }

                    console.error("API error response status:", response.status);
                    console.error("API error response body:", errorText);
                    if (errorJson) {
                        console.error("API error parsed:", errorJson);
                    }

                    throw new Error(
                        `API error: ${response.status} - ${errorText.substring(0, 100)}`
                    );
                }

                const result = await response.json();
                console.log("API Result:", result);

                // Update points and analysis
                const pointChange = result.updated_score - totalPoints;
                setTotalPoints(result.updated_score);
                setLastAnalysis(result.analysis);
                setLastPointChange(pointChange);
                
                // Add to activity history
                const now = new Date();
                const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                
                // Use reason from API if available, otherwise use analysis
                const reason = result.reason || result.analysis;
                
                setActivityHistory(prev => [{
                    change: pointChange,
                    reason: reason || "Aura analyzed",
                    timestamp
                }, ...prev].slice(0, 10)); // Keep last 10 entries
                
                setApiMessage("Data sent successfully!");

                // Hide the message after 3 seconds
                setTimeout(() => setApiMessage(null), 3000);
            } catch (error) {
                console.error("Error sending data to backend:", error);
                setApiMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                setTimeout(() => setApiMessage(null), 5000);
            }
        } else {
            // Use dummy data
            console.log("Using dummy data (not sending to API)");
            const pointChange = Math.floor(Math.random() * 21) - 10; // -10 to +10
            const newPoints = totalPoints + pointChange;

            // Use previously defined reason arrays
            const reason = pointChange >= 0 
                ? positiveReasons[Math.floor(Math.random() * positiveReasons.length)]
                : negativeReasons[Math.floor(Math.random() * negativeReasons.length)];

            setTotalPoints(newPoints);
            setLastAnalysis(
                pointChange >= 0
                    ? "Your focused coding stance is impressive! Keep it up."
                    : "You seem distracted. Try to focus more on your code."
            );
            setLastPointChange(pointChange);
            
            // Add to activity history
            const now = new Date();
            const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            
            setActivityHistory(prev => [{
                change: pointChange,
                reason: reason,
                timestamp
            }, ...prev].slice(0, 10));

            setApiMessage("Using dummy data (API disabled)");
            setTimeout(() => setApiMessage(null), 3000);
        }
    }, [totalPoints, useRealApi]);

    // Update intervalValueRef when interval state changes
    useEffect(() => {
        intervalValueRef.current = captureInterval;
    }, [captureInterval]);

    // Add an effect to properly update interval timing when interval value changes
    useEffect(() => {
        // Log the interval value for debugging
        console.log(`Interval state changed to: ${captureInterval}`);
        intervalValueRef.current = captureInterval;

        // Only update if we're currently capturing
        if (isCapturing && captureIntervalRef.current) {
            console.log(`Interval value changed to ${captureInterval}. Resetting interval...`);
            clearInterval(captureIntervalRef.current);

            const captureFunction = () => {
                console.log(
                    "Interval triggered (from changed interval), interval value:",
                    intervalValueRef.current
                );
                captureAndSendData();
            };

            const intervalMs = captureInterval * 1000;
            console.log(`Setting new interval to ${intervalMs}ms`);
            captureIntervalRef.current = setInterval(captureFunction, intervalMs);
        }
    }, [captureInterval, isCapturing, captureAndSendData]);

    // Update startCapturing to use our new function
    const startCapturing = () => {
        if (webcamPermission && screenPermission) {
            // Check if videos are ready
            const webcamReady = videoRef.current?.videoWidth && videoRef.current?.videoHeight;
            const screenReady = screenRef.current?.videoWidth && screenRef.current?.videoHeight;

            if (!webcamReady || !screenReady) {
                console.log("Videos not ready yet. Waiting 1 second before retrying...");
                console.log(
                    "Webcam dimensions:",
                    videoRef.current?.videoWidth,
                    videoRef.current?.videoHeight
                );
                console.log(
                    "Screen dimensions:",
                    screenRef.current?.videoWidth,
                    screenRef.current?.videoHeight
                );
                setTimeout(startCapturing, 1000);
                return;
            }

            // Stop any existing interval first
            if (captureIntervalRef.current) {
                console.log("Clearing existing interval before starting new one");
                clearInterval(captureIntervalRef.current);
                captureIntervalRef.current = null;
            }

            setIsCapturing(true);
            console.log(
                "Starting capture with dimensions - Webcam:",
                videoRef.current?.videoWidth,
                videoRef.current?.videoHeight,
                "Screen:",
                screenRef.current?.videoWidth,
                screenRef.current?.videoHeight,
                "Interval:",
                captureInterval,
                "seconds"
            );

            // Capture once immediately
            captureAndSendData();

            // Set up interval for future captures
            const captureIntervalMs = captureInterval * 1000;
            console.log(`Setting up interval to capture every ${captureIntervalMs}ms`);
            captureIntervalRef.current = setInterval(captureAndSendData, captureIntervalMs);
        }
    };

    // Stop capturing
    const stopCapturing = () => {
        if (captureIntervalRef.current) {
            console.log("Stopping capture interval");
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }
        setIsCapturing(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCapturing();
            webcamStreamRef.current?.getTracks().forEach((track) => track.stop());
            screenStreamRef.current?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    // Add this useEffect after the other useEffects but before the return statement
    // Monitor video elements and ensure they're properly initialized
    useEffect(() => {
        if (webcamPermission && videoRef.current && !videoRef.current.videoWidth) {
            console.log("Webcam permission granted but video dimensions not set, waiting...");
            const checkTimer = setTimeout(() => {
                console.log("Checking webcam initialization...");
                if (videoRef.current && !videoRef.current.videoWidth && webcamStreamRef.current) {
                    console.log("Webcam still not initialized properly, re-attaching stream");
                    videoRef.current.srcObject = null;
                    setTimeout(() => {
                        if (videoRef.current && webcamStreamRef.current) {
                            videoRef.current.srcObject = webcamStreamRef.current;
                            videoRef.current
                                .play()
                                .catch((err) => console.error("Error replaying webcam:", err));
                        }
                    }, 500);
                }
            }, 3000);
            return () => clearTimeout(checkTimer);
        }
    }, [webcamPermission]);

    useEffect(() => {
        if (screenPermission && screenRef.current && !screenRef.current.videoWidth) {
            console.log("Screen permission granted but video dimensions not set, waiting...");
            const checkTimer = setTimeout(() => {
                console.log("Checking screen initialization...");
                if (screenRef.current && !screenRef.current.videoWidth && screenStreamRef.current) {
                    console.log("Screen still not initialized properly, re-attaching stream");
                    screenRef.current.srcObject = null;
                    setTimeout(() => {
                        if (screenRef.current && screenStreamRef.current) {
                            screenRef.current.srcObject = screenStreamRef.current;
                            screenRef.current
                                .play()
                                .catch((err) => console.error("Error replaying screen:", err));
                        }
                    }, 500);
                }
            }, 3000);
            return () => clearTimeout(checkTimer);
        }
    }, [screenPermission]);

    // Handle interval change with proper validation
    const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        // Ensure we always have a valid number
        const numericValue =
            newValue === "" ? 5 : Math.max(1, Math.min(60, parseInt(newValue, 10) || 5));
        setCaptureInterval(numericValue);
    };

    // Generate a cURL command for debugging
    const generateCurlCommand = () => {
        if (!webcamImage || !screenImage) {
            console.error("No images available to generate cURL command");
            return;
        }

        const webcamBase64 = webcamImage.split(",")[1];
        const screenBase64 = screenImage.split(",")[1];

        if (!webcamBase64 || !screenBase64) {
            console.error("Failed to extract base64 data from images");
            return;
        }

        const currentScore = totalPoints || 0;

        // Create a shorter version for the curl command (first 100 chars of each image)
        const shortData = {
            webcam_image: webcamBase64.substring(0, 100) + "...",
            screenshot: screenBase64.substring(0, 100) + "...",
            current_score: currentScore,
        };

        // Generate the full command with actual data (will be long)
        const fullData = {
            webcam_image: webcamBase64,
            screenshot: screenBase64,
            current_score: currentScore,
        };

        const curlCmd = `curl -X POST "${API_CONFIG.API_URL}/analyze_aura" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '${JSON.stringify(shortData).replace(/'/g, "'\\''")}'`;

        console.log("Sample cURL command (with truncated image data):");
        console.log(curlCmd);

        console.log("\nFull data object for debugging:");
        console.log(
            JSON.stringify(
                {
                    webcam_image_length: webcamBase64.length,
                    screenshot_length: screenBase64.length,
                    current_score: currentScore,
                },
                null,
                2
            )
        );

        // Save the full data to a variable in the window for manual testing
        // Safe type casting for window object
        interface CustomWindow extends Window {
            __debugApiData?: Record<string, unknown>;
        }
        (window as CustomWindow).__debugApiData = fullData;
        console.log(
            "Full API data saved to window.__debugApiData - you can use this for manual testing"
        );
    };

    // Function to update aura points with animation
    const updateAuraPoints = (newPoints: number, analysis: string) => {
        const change = newPoints - totalPoints;
        setLastPointChange(change);
        setTotalPoints(newPoints);
        setLastAnalysis(analysis);
        
        // Add to activity history
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        setActivityHistory(prev => [{
            change,
            reason: analysis || "Aura analyzed",
            timestamp
        }, ...prev].slice(0, 10)); // Keep last 10 entries
    };

    // Get aura color based on points
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
                {/* Hero Banner */}
                <div className="mb-8 rounded-xl overflow-hidden shadow-[0_0_25px_rgba(59,130,246,0.2)] border border-blue-500/20 relative">
                    <div className="relative h-48 lg:h-64">
                        <Image
                            src={coverImage}
                            alt="Developer Aura Tracking"
                            layout="fill"
                            objectFit="cover"
                            className="opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-transparent"></div>
                        <div className="absolute inset-0 flex flex-col justify-center px-8">
                            <h1 className="text-4xl font-bold text-blue-400 mb-2 font-['Press_Start_2P'] drop-shadow-lg">Aura Calibration Studio</h1>
                            <p className="text-lg text-gray-300 font-['VT323'] max-w-xl">
                                Share your webcam and screen to analyze your developer aura. Our AI will judge your programming skills and provide feedback.
                            </p>
                        </div>
                        
                        {/* Aura Status Badge */}
                        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 bg-slate-800/90 rounded-lg p-4 border border-blue-500/30 hidden md:block">
                            <div className="flex items-center gap-4">
                                <div className="relative w-20 h-20">
                                    <Image
                                        src={getAuraEmote(totalPoints, lastPointChange)}
                                        alt="Aura Status"
                                        layout="fill"
                                        objectFit="contain"
                                    />
                                </div>
                                <div>
                                    <div className="text-gray-300 font-['VT323'] text-lg">Your Aura:</div>
                                    <div className="text-4xl font-bold font-['VT323']" style={{ color: getAuraColor() }}>
                                        {totalPoints}
                                    </div>
                                    <div className="text-sm font-['VT323']" style={{ color: getAuraColor() }}>
                                        {getAuraLevel()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Dashboard Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Webcam & Screen Capture */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Permission Request Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Webcam Section */}
                            <div className="bg-slate-800 rounded-lg p-6 shadow-md">
                                <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Webcam</h2>
                                <div className="mb-4">
                                    {webcamPermission === null ? (
                                        <button
                                            onClick={requestWebcam}
                                            className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] font-['VT323'] text-xl"
                                        >
                                            Enable Webcam
                                        </button>
                                    ) : webcamPermission ? (
                                        <div className="text-green-400 font-['VT323'] text-lg">
                                            ✓ Webcam enabled
                                        </div>
                                    ) : (
                                        <div className="text-red-400 font-['VT323'] text-lg">
                                            ✗ Webcam access denied
                                        </div>
                                    )}
                                </div>
                                <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    ></video>
                                    {!webcamPermission && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-gray-300 font-['VT323'] text-xl">
                                            No webcam access
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Screen Capture Section */}
                            <div className="bg-slate-800 rounded-lg p-6 shadow-md">
                                <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Screen Capture</h2>
                                <div className="mb-4">
                                    {screenPermission === null ? (
                                        <button
                                            onClick={requestScreen}
                                            className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] font-['VT323'] text-xl"
                                        >
                                            Share Screen
                                        </button>
                                    ) : screenPermission ? (
                                        <div className="text-green-400 font-['VT323'] text-lg">
                                            ✓ Screen sharing enabled
                                        </div>
                                    ) : (
                                        <div className="text-red-400 font-['VT323'] text-lg">
                                            ✗ Screen sharing denied
                                        </div>
                                    )}
                                </div>
                                <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
                                    <video
                                        ref={screenRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    ></video>
                                    {!screenPermission && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-gray-300 font-['VT323'] text-xl">
                                            No screen access
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Capture Controls Section */}
                        <div className="bg-slate-800 rounded-lg p-6 shadow-md">
                            <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Capture Controls</h2>
                            
                            <div className="mb-6">
                                <button
                                    onClick={isCapturing ? stopCapturing : startCapturing}
                                    disabled={!webcamPermission || !screenPermission}
                                    className={`w-full px-6 py-4 text-xl rounded-lg font-['VT323'] transition-all duration-300 flex items-center justify-center gap-2 
                                        ${
                                        isCapturing
                                            ? "bg-red-600 hover:bg-red-700 text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:scale-[1.02]"
                                            : "bg-blue-700 hover:bg-blue-600 text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:scale-[1.02]"
                                    } ${
                                        !webcamPermission || !screenPermission
                                            ? "opacity-50 cursor-not-allowed"
                                            : "cursor-pointer"
                                    }`}
                                >
                                    {isCapturing ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Stop Aura Capture
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Start Aura Capture
                                        </>
                                    )}
                                </button>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block mb-2 text-gray-300 font-['VT323'] text-lg">
                                    Capture interval: {captureInterval} seconds
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="30"
                                    value={captureInterval}
                                    onChange={handleIntervalChange}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                        
                        {/* Aura Visualization (only shown when capturing) */}
                        {isCapturing && (
                            <div className="bg-slate-800 rounded-lg p-6 shadow-md">
                                <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Aura Visualization</h2>
                                
                                <div className="flex flex-col items-center mb-6">
                                    <div className="relative w-32 h-32 mb-4">
                                        <Image
                                            src={getAuraEmote(totalPoints, lastPointChange)}
                                            alt="Aura Visualization"
                                            layout="fill"
                                            objectFit="contain"
                                        />
                                        
                                        {lastPointChange && (
                                            <div className={`absolute -top-4 -right-4 rounded-full px-2 py-1 text-white font-bold
                                                ${lastPointChange > 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                                                {lastPointChange > 0 ? `+${lastPointChange}` : lastPointChange}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="w-full max-w-md">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-red-400 font-['VT323']">Debugging Disaster</span>
                                            <span className="text-blue-400 font-['VT323']">Programming Prodigy</span>
                                        </div>
                                        <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden">
                                            <div
                                                className="h-full transition-all duration-500 ease-out"
                                                style={{
                                                    width: `${Math.min(Math.max(totalPoints, 0), 200) / 2}%`,
                                                    backgroundColor: getAuraColor()
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                                
                                {lastAnalysis && (
                                    <div className="bg-slate-900 p-4 rounded-lg">
                                        <h3 className="text-lg font-bold mb-2 text-blue-300 font-['VT323']">AI Analysis:</h3>
                                        <p className="text-gray-300 font-['VT323']">{lastAnalysis}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Right Column - Activity & Stats */}
                    <div className="space-y-6">
                        {/* Mobile Aura Display (visible only on mobile) */}
                        <div className="bg-slate-800 rounded-lg p-6 shadow-md flex items-center gap-4 md:hidden">
                            <div className="relative w-16 h-16">
                                <Image
                                    src={getAuraEmote(totalPoints, lastPointChange)}
                                    alt="Aura Status"
                                    layout="fill"
                                    objectFit="contain"
                                />
                            </div>
                            <div>
                                <div className="text-gray-300 font-['VT323']">Your Aura:</div>
                                <div className="text-3xl font-bold font-['VT323']" style={{ color: getAuraColor() }}>
                                    {totalPoints}
                                </div>
                                <div className="text-sm font-['VT323']" style={{ color: getAuraColor() }}>
                                    {getAuraLevel()}
                                </div>
                            </div>
                        </div>
                        
                        {/* Status and Stats */}
                        <div className="bg-slate-800 rounded-lg p-6 shadow-md">
                            <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Session Stats</h2>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300 font-['VT323']">Status:</span>
                                    <span className={`font-['VT323'] ${isCapturing ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {isCapturing ? 'Capturing Active' : 'Ready to Start'}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300 font-['VT323']">Snapshots Sent:</span>
                                    <span className="text-blue-300 font-['VT323'] font-bold">{captureCount}</span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300 font-['VT323']">Current Level:</span>
                                    <span className="font-['VT323'] font-bold" style={{ color: getAuraColor() }}>
                                        {getAuraLevel()}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300 font-['VT323']">Using API:</span>
                                    <div className="flex items-center">
                                        <span className="text-gray-300 font-['VT323'] mr-2">
                                            {useRealApi ? 'Real' : 'Mock'}
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={useRealApi}
                                                onChange={() => setUseRealApi(!useRealApi)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 hover:after:scale-110 hover:ring-1 hover:ring-blue-300 transition-all duration-300"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Activity Feed */}
                        <div className="bg-slate-800 rounded-lg p-6 shadow-md">
                            <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Activity Feed</h2>
                            
                            {activityHistory.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 font-['VT323']">
                                    No activity yet. Start capturing to see your aura changes!
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                    {activityHistory.map((item, index) => (
                                        <div key={index} className="bg-slate-900 rounded-lg p-4 flex items-center gap-3">
                                            {/* Points change indicator */}
                                            <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-md font-['VT323'] text-lg font-bold ${
                                                item.change > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                                {item.change > 0 ? `+${item.change}` : item.change}
                                            </div>
                                            
                                            {/* Emote image - use the new helper function */}
                                            <div className="flex-shrink-0">
                                                <div className="relative w-12 h-12">
                                                    <Image
                                                        src={getActivityEmote(item.change)}
                                                        alt="Emotion"
                                                        layout="fill"
                                                        objectFit="contain"
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                {/* Reason as a "meme caption" */}
                                                <p className="text-gray-100 font-['VT323'] text-lg font-bold mb-1">
                                                    &ldquo;{item.reason}&rdquo;
                                                </p>
                                                <div className="flex justify-between text-xs">
                                                    <span className={`${
                                                        item.change > 0 ? 'text-green-400' : 'text-red-400'
                                                    }`}>
                                                        {item.change > 0 ? 'Aura boosted' : 'Aura diminished'}
                                                    </span>
                                                    <span className="text-gray-400">{item.timestamp}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Try Ranked Battles */}
                        <div className="bg-slate-800 rounded-lg p-6 shadow-md text-center">
                            <div className="mb-4">
                                <div className="relative w-16 h-16 mx-auto">
                                    <Image
                                        src={lockedInEmote}
                                        alt="Competitive"
                                        layout="fill"
                                        objectFit="contain"
                                    />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-blue-300 font-['VT323']">Ready for a Challenge?</h2>
                            <p className="text-gray-300 font-['VT323'] mb-4">
                                Test your developer aura against other programmers!
                            </p>
                            <Link 
                                href="/ranked" 
                                className="inline-block px-6 py-3 bg-gradient-to-r from-purple-700 to-pink-700 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] font-['VT323'] text-xl relative overflow-hidden group"
                            >
                                <span className="relative z-10">Try Ranked Aura Battles 🏆</span>
                                <span className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
                            </Link>
                        </div>
                    </div>
                </div>
                
                {/* Hidden canvas elements */}
                <canvas ref={webcamCanvasRef} style={{ display: "none" }}></canvas>
                <canvas ref={screenCanvasRef} style={{ display: "none" }}></canvas>
            </div>
            
            {/* Popup Modal - Changed to be a notification instead of a requirement message */}
            {showPopup && (
                <div className="fixed bottom-6 right-6 bg-slate-800 rounded-lg p-4 shadow-xl border border-blue-500/30 max-w-sm animate-fade-in-out z-50">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 p-1">
                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 019.07 4h5.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4 flex-1">
                            <h3 className="text-lg font-bold text-blue-300 font-['VT323']">Snapshot Captured</h3>
                            <p className="text-gray-300 font-['VT323'] text-sm">
                                Webcam and screen data sent for aura analysis
                            </p>
                            <div className="text-xs text-gray-400 mt-1 font-['VT323']">
                                Total captures: {captureCount}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPopup(false)}
                        className="w-full py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] font-['VT323']"
                    >
                        Understand
                    </button>
                </div>
            )}
        </div>
    );
}
