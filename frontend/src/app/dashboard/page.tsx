"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function Dashboard() {
    const [webcamPermission, setWebcamPermission] = useState<boolean | null>(null);
    const [screenPermission, setScreenPermission] = useState<boolean | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [interval, setInterval] = useState(5); // Default 5 seconds
    const [webcamImage, setWebcamImage] = useState<string | null>(null);
    const [screenImage, setScreenImage] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const screenRef = useRef<HTMLVideoElement>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const webcamCanvasRef = useRef<HTMLCanvasElement>(null);
    const screenCanvasRef = useRef<HTMLCanvasElement>(null);

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

    // Start capturing and sending images
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

            setIsCapturing(true);
            console.log(
                "Starting capture with dimensions - Webcam:",
                videoRef.current?.videoWidth,
                videoRef.current?.videoHeight,
                "Screen:",
                screenRef.current?.videoWidth,
                screenRef.current?.videoHeight
            );

            // Test capture once immediately
            testWebcamCapture();
            testScreenCapture();

            captureIntervalRef.current = setInterval(() => {
                // Here you would send the images to your backend
                testWebcamCapture();
                testScreenCapture();

                // Show popup
                setShowPopup(true);
                setTimeout(() => setShowPopup(false), 2000);
            }, interval * 1000);
        }
    };

    // Stop capturing
    const stopCapturing = () => {
        if (captureIntervalRef.current) {
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

    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-white font-['Press_Start_2P']">
                        User Dashboard
                    </h1>
                    <Link
                        href="/"
                        className="text-white hover:text-purple-200 transition-colors font-['VT323'] text-xl"
                    >
                        ← Back to Home
                    </Link>
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
                        <div className="flex items-center gap-4">
                            <label className="text-white font-['VT323'] text-xl">
                                Capture Interval (seconds):
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="60"
                                value={interval}
                                onChange={(e) => setInterval(Number(e.target.value))}
                                className="w-20 px-2 py-1 rounded bg-white/20 text-white font-['VT323'] text-xl"
                                disabled={isCapturing}
                            />
                        </div>
                        <button
                            onClick={isCapturing ? stopCapturing : startCapturing}
                            disabled={!webcamPermission || !screenPermission}
                            className={`px-8 py-4 rounded-lg font-bold transition-all font-['VT323'] text-xl ${
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
                    </div>
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
