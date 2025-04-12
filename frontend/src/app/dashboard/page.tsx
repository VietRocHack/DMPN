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
    const [totalPoints, setTotalPoints] = useState<number>(0);
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

    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-white font-['Press_Start_2P']">
                        User Dashboard
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

                {/* API Status Message */}
                {apiMessage && (
                    <div
                        className={`mb-4 p-3 rounded-lg font-['VT323'] text-lg text-center ${
                            apiMessage.includes("Error")
                                ? "bg-red-500/20 text-white"
                                : "bg-green-500/20 text-white"
                        }`}
                    >
                        {apiMessage}
                    </div>
                )}

                {/* Aura Score Display */}
                <div className="bg-black/30 rounded-xl p-6 mb-6 text-center">
                    <h2 className="text-2xl text-white font-['VT323'] mb-2">Your Developer Aura</h2>
                    <div className="text-5xl font-bold text-white mb-2 font-['Press_Start_2P']">
                        {totalPoints}
                    </div>
                    {lastAnalysis && (
                        <div className="text-xl text-white/90 font-['VT323']">{lastAnalysis}</div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Webcam Section */}
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl text-white font-['VT323']">Webcam Feed</h2>
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-['VT323'] ${
                                    webcamPermission === null
                                        ? "bg-yellow-500/20 text-yellow-200"
                                        : webcamPermission
                                        ? "bg-green-500/20 text-green-200"
                                        : "bg-red-500/20 text-red-200"
                                }`}
                            >
                                {webcamPermission === null
                                    ? "No Permission"
                                    : webcamPermission
                                    ? "Ready"
                                    : "Denied"}
                            </span>
                        </div>
                        {webcamPermission === null ? (
                            <button
                                onClick={requestWebcam}
                                className="w-full py-4 bg-white text-purple-600 rounded-lg font-bold hover:bg-opacity-90 transition-all font-['VT323'] text-xl"
                            >
                                Enable Webcam
                            </button>
                        ) : webcamPermission ? (
                            <div className="relative">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    controls={false}
                                    muted
                                    width="640"
                                    height="480"
                                    className="w-full h-[200px] object-contain rounded-lg bg-black"
                                    style={{ transform: "scaleX(-1)" }}
                                    onPlay={() => console.log("Webcam video play event fired")}
                                />

                                {/* Hidden canvas for capturing frames */}
                                <canvas ref={webcamCanvasRef} className="hidden"></canvas>

                                {/* Fallback image display */}
                                {webcamImage && (
                                    <div className="mt-2">
                                        <div className="text-xs text-white mb-1 font-['VT323']">
                                            Latest Captured Frame:
                                        </div>
                                        <img
                                            src={webcamImage}
                                            alt="Webcam capture"
                                            className="w-full h-[80px] object-contain bg-black/50 rounded-lg"
                                            style={{ transform: "scaleX(-1)" }}
                                        />
                                    </div>
                                )}

                                <div className="absolute top-2 left-2 text-green-300 font-['VT323'] text-xs bg-black/50 p-1 rounded">
                                    {webcamStreamRef.current
                                        ? `Active: ${
                                              webcamStreamRef.current.getVideoTracks().length
                                          } tracks`
                                        : "No active stream"}
                                </div>

                                <button
                                    onClick={testWebcamCapture}
                                    className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded font-['VT323']"
                                >
                                    Test Capture
                                </button>
                            </div>
                        ) : (
                            <div className="text-red-400 text-center py-4 font-['VT323']">
                                Webcam access denied
                            </div>
                        )}
                    </div>

                    {/* Screen Capture Section */}
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl text-white font-['VT323']">Screen Capture</h2>
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-['VT323'] ${
                                    screenPermission === null
                                        ? "bg-yellow-500/20 text-yellow-200"
                                        : screenPermission
                                        ? "bg-green-500/20 text-green-200"
                                        : "bg-red-500/20 text-red-200"
                                }`}
                            >
                                {screenPermission === null
                                    ? "No Permission"
                                    : screenPermission
                                    ? "Ready"
                                    : "Denied"}
                            </span>
                        </div>
                        {screenPermission === null ? (
                            <button
                                onClick={requestScreen}
                                className="w-full py-4 bg-white text-purple-600 rounded-lg font-bold hover:bg-opacity-90 transition-all font-['VT323'] text-xl"
                            >
                                Enable Screen Capture
                            </button>
                        ) : screenPermission ? (
                            <div className="relative">
                                <video
                                    ref={screenRef}
                                    autoPlay
                                    playsInline
                                    controls={false}
                                    muted
                                    width="640"
                                    height="480"
                                    className="w-full h-[200px] object-contain rounded-lg bg-black"
                                    onPlay={() => console.log("Screen video play event fired")}
                                />

                                {/* Hidden canvas for capturing frames */}
                                <canvas ref={screenCanvasRef} className="hidden"></canvas>

                                {/* Fallback image display */}
                                {screenImage && (
                                    <div className="mt-2">
                                        <div className="text-xs text-white mb-1 font-['VT323']">
                                            Latest Captured Frame:
                                        </div>
                                        <img
                                            src={screenImage}
                                            alt="Screen capture"
                                            className="w-full h-[80px] object-contain bg-black/50 rounded-lg"
                                        />
                                    </div>
                                )}

                                <div className="absolute top-2 left-2 text-green-300 font-['VT323'] text-xs bg-black/50 p-1 rounded">
                                    {screenStreamRef.current
                                        ? `Active: ${
                                              screenStreamRef.current.getVideoTracks().length
                                          } tracks`
                                        : "No active stream"}
                                </div>

                                <button
                                    onClick={testScreenCapture}
                                    className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded font-['VT323']"
                                >
                                    Test Capture
                                </button>
                            </div>
                        ) : (
                            <div className="text-red-400 text-center py-4 font-['VT323']">
                                Screen capture access denied
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls Section */}
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <label className="text-white font-['VT323'] text-xl">
                                Capture Interval (seconds):
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="60"
                                value={captureInterval}
                                onChange={handleIntervalChange}
                                className="w-20 px-2 py-1 rounded bg-white/20 text-white font-['VT323'] text-xl"
                                disabled={isCapturing}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                            <button
                                onClick={isCapturing ? stopCapturing : startCapturing}
                                disabled={!webcamPermission || !screenPermission}
                                className={`px-8 py-4 rounded-lg font-bold transition-all font-['VT323'] text-xl w-full sm:w-auto ${
                                    isCapturing
                                        ? "bg-red-500 text-white hover:bg-red-600"
                                        : "bg-white text-purple-600 hover:bg-opacity-90"
                                } ${
                                    !webcamPermission || !screenPermission
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                }`}
                            >
                                {isCapturing ? "Stop Capturing" : "Start Capturing"}
                            </button>
                            {isCapturing && (
                                <div className="text-white font-['VT323'] text-xl bg-black/30 px-3 py-1 rounded text-center sm:text-left w-full sm:w-auto">
                                    Captures: {captureCount} | Interval: {captureInterval}s
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Debug button only shown in development */}
                    {process.env.NODE_ENV !== "production" && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={generateCurlCommand}
                                className="px-4 py-2 bg-gray-800 text-gray-200 rounded-lg font-['VT323'] text-sm hover:bg-gray-700"
                            >
                                Debug: Generate cURL Command
                            </button>
                            <div className="text-white/50 text-xs mt-1 font-['VT323']">
                                (Check console for output)
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Popup for image sent notification */}
            {showPopup && (
                <div className="fixed bottom-8 right-8 bg-white text-purple-600 px-6 py-4 rounded-lg shadow-lg font-['VT323'] text-xl animate-bounce">
                    Images sent successfully! 🚀
                </div>
            )}
        </main>
    );
}
