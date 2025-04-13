"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// Constants for the application
const API_CONFIG = {
    // Set this to false to use dummy data, true to use the actual backend
    USE_REAL_API: true,
    // API endpoint URL - update this to your actual backend URL
    API_URL: "http://127.0.0.1:5000",
    // Default capture interval in seconds
    DEFAULT_INTERVAL: 5,
};

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

        // Show popup
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
                setTotalPoints(result.updated_score);
                setLastAnalysis(result.analysis);
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

            setTotalPoints(newPoints);
            setLastAnalysis(
                pointChange >= 0
                    ? "Your focused coding stance is impressive! Keep it up."
                    : "You seem distracted. Try to focus more on your code."
            );

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

    // Function to determine the aura color based on points
    const getAuraColor = () => {
        if (totalPoints < 30) return "#ef4444"; // red-500
        if (totalPoints < 50) return "#f97316"; // orange-500
        if (totalPoints < 70) return "#eab308"; // yellow-500
        if (totalPoints < 90) return "#22c55e"; // green-500
        return "#3b82f6"; // blue-500
    };

    // Function to determine the aura level based on points
    const getAuraLevel = () => {
        if (totalPoints < 30) return "Code Newbie";
        if (totalPoints < 50) return "Script Kiddie";
        if (totalPoints < 70) return "Function Fiend";
        if (totalPoints < 90) return "Algorithm Ace";
        return "Syntax Sorcerer";
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-900 to-gray-800 text-gray-200 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-blue-400 mb-2 font-['Press_Start_2P']">User Dashboard</h1>
                    <p className="text-lg text-gray-300 font-['VT323']">
                        Share your webcam and screen to analyze your developer aura
                    </p>
                </header>

                {/* Permission Request Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Webcam Section */}
                    <div className="bg-slate-800 rounded-lg p-6 shadow-md">
                        <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Webcam</h2>
                        <div className="mb-4">
                            {webcamPermission === null ? (
                                <button
                                    onClick={requestWebcam}
                                    className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors font-['VT323'] text-xl"
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
                        <div className="relative bg-slate-700 rounded-lg overflow-hidden aspect-video">
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
                                    className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors font-['VT323'] text-xl"
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
                        <div className="relative bg-slate-700 rounded-lg overflow-hidden aspect-video">
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

                {/* Controls and Stats Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Aura Points and Control Section */}
                    <div className="bg-slate-800 rounded-lg p-6 shadow-md">
                        <div className="flex flex-col items-center mb-6">
                            <h2 className="text-3xl font-bold text-center mb-2 text-blue-300 font-['VT323']">
                                Developer Aura Points
                            </h2>
                            <div
                                className="text-5xl font-bold mb-1 font-['VT323']"
                                style={{ color: getAuraColor() }}
                            >
                                {totalPoints}
                            </div>
                            <div
                                className="text-2xl font-['VT323']"
                                style={{ color: getAuraColor() }}
                            >
                                {getAuraLevel()}
                            </div>
                        </div>

                        {/* Capture Controls */}
                        <div className="mb-6">
                            <div className="flex mb-4">
                                <button
                                    onClick={isCapturing ? stopCapturing : startCapturing}
                                    disabled={!webcamPermission || !screenPermission}
                                    className={`flex-1 px-6 py-3 text-xl rounded-lg font-['VT323'] transition-colors ${
                                        isCapturing
                                            ? "bg-red-600 hover:bg-red-700 text-white"
                                            : "bg-blue-700 hover:bg-blue-600 text-white"
                                    } ${
                                        !webcamPermission || !screenPermission
                                            ? "opacity-50 cursor-not-allowed"
                                            : ""
                                    }`}
                                >
                                    {isCapturing ? "Stop Capturing" : "Start Capturing"}
                                </button>
                            </div>

                            {/* Interval Control */}
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
                                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            {/* API Mode Toggle */}
                            <div className="flex items-center space-x-3">
                                <span className="text-gray-300 font-['VT323'] text-lg">
                                    Use mock data
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useRealApi}
                                        onChange={() => setUseRealApi(!useRealApi)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                                <span className="text-gray-300 font-['VT323'] text-lg">
                                    Use real API
                                </span>
                            </div>
                        </div>

                        {/* Capture Status */}
                        <div className="mb-6">
                            <h3 className="text-xl font-bold mb-2 text-blue-300 font-['VT323']">
                                Status
                            </h3>
                            <div className="bg-slate-900 p-4 rounded-lg text-lg font-['VT323']">
                                {isCapturing ? (
                                    <div className="text-green-400">
                                        Capturing active - {captureCount} snapshots sent
                                    </div>
                                ) : (
                                    <div className="text-gray-400">Waiting to start capture...</div>
                                )}
                                {apiMessage && (
                                    <div className="mt-2 text-yellow-300 text-base">
                                        {apiMessage}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Last Analysis */}
                    <div className="bg-slate-800 rounded-lg p-6 shadow-md">
                        <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Last Analysis</h2>
                        {lastAnalysis ? (
                            <div className="bg-slate-900 p-4 rounded-lg">
                                <div className="font-['VT323'] text-xl text-gray-300">{lastAnalysis}</div>
                            </div>
                        ) : (
                            <div className="bg-slate-900 p-4 rounded-lg text-gray-400 font-['VT323'] text-xl">
                                No data yet. Start capturing to see analysis results!
                            </div>
                        )}

                        {/* Ranked Mode CTA */}
                        <div className="mt-8 p-6 bg-slate-700 rounded-lg text-center">
                            <h3 className="text-2xl font-bold mb-3 text-blue-300 font-['VT323']">
                                Ready to compete?
                            </h3>
                            <p className="text-lg text-gray-300 mb-4 font-['VT323']">
                                Challenge other developers in ranked mode and see who has the higher
                                developer aura!
                            </p>
                            <Link
                                href="/ranked"
                                className="inline-block px-8 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors font-['VT323'] text-xl"
                            >
                                Enter Ranked Mode
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Canvas elements used for capture (hidden) */}
                <canvas ref={webcamCanvasRef} style={{ display: "none" }}></canvas>
                <canvas ref={screenCanvasRef} style={{ display: "none" }}></canvas>
            </div>

            {/* Capture Notification Popup */}
            {showPopup && (
                <div className="fixed bottom-6 right-6 bg-slate-800 text-gray-200 rounded-lg shadow-lg p-4 border border-blue-500 max-w-md font-['VT323']">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 text-blue-400 text-3xl">
                            <span role="img" aria-label="camera">
                                📸
                            </span>
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-bold text-blue-300">Snapshot Sent</h3>
                            <p className="text-gray-300">
                                Your webcam and screen snapshots have been sent for aura analysis.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
