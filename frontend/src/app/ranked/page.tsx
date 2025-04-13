"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// Fake data for recent matches
const RECENT_MATCHES = [
    { id: 1, user1: "CodeNinja", user2: "ByteMaster", user1Score: 78, user2Score: 65, duration: "3:00", timestamp: "10 mins ago" },
    { id: 2, user1: "PixelPirate", user2: "LogicLegend", user1Score: 92, user2Score: 88, duration: "5:00", timestamp: "25 mins ago" },
    { id: 3, user1: "SyntaxSage", user2: "BugBuster", user1Score: 73, user2Score: 85, duration: "2:30", timestamp: "1 hour ago" },
    { id: 4, user1: "DevDragon", user2: "CipherChamp", user1Score: 81, user2Score: 79, duration: "4:00", timestamp: "2 hours ago" },
];

// Constants for the application
const API_CONFIG = {
    // Set this to false to use dummy data, true to use the actual backend
    USE_REAL_API: true,
    // API endpoint URL - update this to your actual backend URL
    API_URL: "http://127.0.0.1:5000",
    // Default capture interval in seconds
    DEFAULT_INTERVAL: 5,
};

export default function RankedAura() {
    // States for the ranked mode UI
    const [searchingForMatch, setSearchingForMatch] = useState(false);
    const [matchFound, setMatchFound] = useState(false);
    const [matchStarted, setMatchStarted] = useState(false);
    const [roundTimer, setRoundTimer] = useState(0);
    const [userReady, setUserReady] = useState(false);
    const [countdownValue, setCountdownValue] = useState(3);
    const [onlineUsers, setOnlineUsers] = useState(Math.floor(Math.random() * 100) + 50); // Random number between 50-150
    const [matchDuration, setMatchDuration] = useState(10); // Default 10 minutes
    const [captureInterval, setCaptureInterval] = useState(5); // Default 5 seconds
    const [enemyName, setEnemyName] = useState("");
    const [searchTime, setSearchTime] = useState(0);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
    const [showCountdownModal, setShowCountdownModal] = useState(false);
    const [userAuraScore, setUserAuraScore] = useState(50);
    const [enemyAuraScore, setEnemyAuraScore] = useState(50);
    const [userScoreHistory, setUserScoreHistory] = useState<{change: number; reason: string; timestamp: string}[]>([]);
    const [enemyScoreHistory, setEnemyScoreHistory] = useState<{change: number; reason: string; timestamp: string}[]>([]);
    const [auraUpdateInterval, setAuraUpdateInterval] = useState<NodeJS.Timeout | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [showStopMatchModal, setShowStopMatchModal] = useState(false);
    const [imagesSent, setImagesSent] = useState(0);
    
    // Refs for webcam and screen capture
    const videoRef = useRef<HTMLVideoElement>(null);
    const screenRef = useRef<HTMLVideoElement>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const matchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

    // States for permissions
    const [webcamPermission, setWebcamPermission] = useState<boolean | null>(null);
    const [screenPermission, setScreenPermission] = useState<boolean | null>(null);

    // Add these refs for canvas elements
    const webcamCanvasRef = useRef<HTMLCanvasElement>(null);
    const screenCanvasRef = useRef<HTMLCanvasElement>(null);
    const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const intervalValueRef = useRef<number>(captureInterval);
    
    // Add states for image data
    const [webcamImage, setWebcamImage] = useState<string | null>(null);
    const [screenImage, setScreenImage] = useState<string | null>(null);
    const [apiMessage, setApiMessage] = useState<string | null>(null);

    // Request webcam permission with improved initialization
    const requestWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 15 },
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

    // Request screen capture permission with improved initialization
    const requestScreen = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: { ideal: 15 },
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

    // Start regular aura updates with real backend integration
    const startAuraUpdates = () => {
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
                setTimeout(startAuraUpdates, 1000);
                return;
            }

            // Stop any existing interval first
            if (auraUpdateInterval) {
                console.log("Clearing existing interval before starting new one");
                clearInterval(auraUpdateInterval);
                setAuraUpdateInterval(null);
            }

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
            captureAndSendAuraData();

            // Set up interval for future captures
            const captureIntervalMs = captureInterval * 1000;
            console.log(`Setting up interval to capture every ${captureIntervalMs}ms`);
            const updateInterval = setInterval(captureAndSendAuraData, captureIntervalMs);
            setAuraUpdateInterval(updateInterval);
            
            // Store the current interval value
            intervalValueRef.current = captureInterval;
        }
    };
    
    // Capture and send data to the backend for aura analysis
    const captureAndSendAuraData = async () => {
        console.log("Capturing and sending aura data");
        
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
        setImagesSent(prev => {
            const newValue = prev + 1;
            console.log(`Images sent counter updated: ${prev} → ${newValue}`);
            return newValue;
        });

        // Extract base64 data (remove the data:image/jpeg;base64, prefix)
        const webcamBase64 = webcamImageData.split(",")[1];
        const screenBase64 = screenImageData.split(",")[1];

        if (API_CONFIG.USE_REAL_API) {
            try {
                setApiMessage("Analyzing aura...");

                // Validate base64 data before sending
                if (!webcamBase64 || !screenBase64) {
                    throw new Error("Failed to extract base64 data from images");
                }

                // Ensure userAuraScore is a number and defaults to 50 if undefined/null
                const currentScore = userAuraScore || 50;

                console.log("Sending data to backend:", {
                    webcam_image_length: webcamBase64.length,
                    screenshot_length: screenBase64.length,
                    current_score: currentScore,
                });

                // Prepare request data
                const requestData = {
                    webcam_image: webcamBase64,
                    screenshot: screenBase64,
                    current_score: currentScore,
                };

                // Send data to backend
                const response = await fetch(`${API_CONFIG.API_URL}/analyze_aura`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    mode: "cors",
                    credentials: "omit",
                    body: JSON.stringify(requestData),
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const result = await response.json();
                console.log("API Result:", result);

                // Update points and add to history
                const change = result.updated_score - currentScore;
                const newScore = result.updated_score;
                
                if (change !== 0) {
                    const now = new Date();
                    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                    
                    setUserScoreHistory(prev => [{
                        change,
                        reason: result.analysis || "Aura analyzed",
                        timestamp
                    }, ...prev].slice(0, 5)); // Keep only the 5 most recent entries
                    
                    setUserAuraScore(newScore);
                }
                
                setApiMessage(null);
                
                // Also update enemy with random data
                updateEnemyAuraScore();
            } catch (error) {
                console.error("Error sending data to backend:", error);
                setApiMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                setTimeout(() => setApiMessage(null), 3000);
                
                // Fallback to random updates when API fails
                updateUserAuraScoreRandom();
                updateEnemyAuraScore();
            }
        } else {
            // Use dummy data
            updateUserAuraScoreRandom();
            updateEnemyAuraScore();
        }
    };
    
    // Update user's aura score randomly as fallback
    const updateUserAuraScoreRandom = () => {
        // Random change between -5 and +10
        const change = Math.floor(Math.random() * 16) - 5;
        const newScore = Math.max(0, Math.min(100, userAuraScore + change));
        
        // Random reason for score change
        const reasons = [
            "Good code structure detected",
            "Efficient algorithm implementation",
            "Clean variable naming",
            "Browsing Stack Overflow too much",
            "Taking too long to solve a bug",
            "Low typing speed detected",
            "Good problem-solving approach",
            "Using proper debugging techniques",
            "Too many console.log statements",
            "Distracted by social media",
            "Using AI tools effectively"
        ];
        
        const reason = reasons[Math.floor(Math.random() * reasons.length)];
        
        // Add to history with timestamp
        if (change !== 0) {
            const now = new Date();
            const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            
            setUserScoreHistory(prev => [{
                change,
                reason,
                timestamp
            }, ...prev].slice(0, 5)); // Keep only the 5 most recent entries
            
            setUserAuraScore(newScore);
        }
    };
    
    // Update enemy's aura score (simulated)
    const updateEnemyAuraScore = () => {
        // Random change between -5 and +10
        const change = Math.floor(Math.random() * 16) - 5;
        const newScore = Math.max(0, Math.min(100, enemyAuraScore + change));
        
        // Random reason for score change
        const reasons = [
            "Good code structure detected",
            "Efficient algorithm implementation",
            "Clean variable naming",
            "Browsing Stack Overflow too much",
            "Taking too long to solve a bug",
            "Low typing speed detected",
            "Good problem-solving approach",
            "Using proper debugging techniques",
            "Too many console.log statements",
            "Distracted by social media",
            "Using AI tools effectively"
        ];
        
        const reason = reasons[Math.floor(Math.random() * reasons.length)];
        
        // Add to history with timestamp
        if (change !== 0) {
            const now = new Date();
            const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            
            setEnemyScoreHistory(prev => [{
                change,
                reason,
                timestamp
            }, ...prev].slice(0, 5)); // Keep only the 5 most recent entries
            
            setEnemyAuraScore(newScore);
        }
    };

    // Handle match end
    const handleMatchEnd = () => {
        console.log("🛑 Ending match and cleaning up all intervals");
        setShowResultModal(true);
        
        // Clean up all timers and intervals
        if (matchTimerRef.current) {
            console.log("Clearing match timer");
            clearInterval(matchTimerRef.current);
            matchTimerRef.current = null;
        }
        
        if (countdownTimerRef.current) {
            console.log("Clearing countdown timer");
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        
        if (auraUpdateInterval) {
            console.log("Clearing aura update interval to stop capturing");
            clearInterval(auraUpdateInterval);
            setAuraUpdateInterval(null);
        }
        
        if (captureIntervalRef.current) {
            console.log("Clearing capture interval reference");
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }
        
        // Cancel any pending API requests
        console.log("Match ended - image capture stopped");
    };

    // Reset match
    const resetMatch = () => {
        setMatchStarted(false);
        setMatchFound(false);
        setUserReady(false);
        setShowResultModal(false);
        setUserAuraScore(50);
        setEnemyAuraScore(50);
        setUserScoreHistory([]);
        setEnemyScoreHistory([]);
        setImagesSent(0);
    };

    // Format timer as MM:SS
    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Format search time as MM:SS
    const formatSearchTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Clean up on component unmount
    useEffect(() => {
        // Simulate fluctuating online user count
        const onlineUsersInterval = setInterval(() => {
            setOnlineUsers(prev => {
                // Random fluctuation between -3 and +5 users
                const change = Math.floor(Math.random() * 9) - 3;
                return Math.max(30, prev + change); // Ensure at least 30 users online
            });
        }, 5000);
        
        return () => {
            // Stop all media streams
            if (webcamStreamRef.current) {
                webcamStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
            }
            
            // Clear any timers
            if (matchTimerRef.current) {
                clearInterval(matchTimerRef.current);
            }
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
            }
            clearInterval(onlineUsersInterval);
            if (searchTimer) {
                clearInterval(searchTimer);
            }
            if (auraUpdateInterval) {
                clearInterval(auraUpdateInterval);
            }
        };
    }, []);

    // Monitor video elements and ensure proper initialization
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

    // Add back the startMatchmaking function
    const startMatchmaking = () => {
        setSearchingForMatch(true);
        setShowSearchModal(true);
        setSearchTime(0);
        
        // Start search timer
        const timer = setInterval(() => {
            setSearchTime(prev => prev + 1);
        }, 1000);
        setSearchTimer(timer);
        
        // Simulate matchmaking with a timeout
        setTimeout(() => {
            if (searchTimer) {
                clearInterval(searchTimer);
                setSearchTimer(null);
            }
            setSearchingForMatch(false);
            setShowSearchModal(false);
            setMatchFound(true);
            setEnemyName(["CodeNinja", "ByteMaster", "PixelPirate", "LogicLegend", "SyntaxSage"][Math.floor(Math.random() * 5)]);
        }, 6000 + Math.random() * 4000); // Random 6-10 seconds
    };

    // Handle ready button click
    const handleReadyClick = () => {
        console.log("🎮 handleReadyClick called");
        setUserReady(true);
        setShowCountdownModal(true);
        
        // Start countdown
        setCountdownValue(3);
        countdownTimerRef.current = setInterval(() => {
            setCountdownValue((prev) => {
                if (prev <= 1) {
                    console.log("⏱️ Countdown finished, starting match");
                    if (countdownTimerRef.current) {
                        clearInterval(countdownTimerRef.current);
                        countdownTimerRef.current = null;
                    }
                    setShowCountdownModal(false);
                    setMatchStarted(true);
                    
                    // Start match timer
                    const startTime = Date.now();
                    const endTime = startTime + matchDuration * 60 * 1000;
                    
                    if (matchTimerRef.current) {
                        clearInterval(matchTimerRef.current);
                        matchTimerRef.current = null;
                    }
                    
                    matchTimerRef.current = setInterval(() => {
                        const remaining = Math.max(0, endTime - Date.now());
                        setRoundTimer(Math.floor(remaining / 1000));
                        
                        if (remaining <= 0) {
                            console.log("⏱️ Match timer finished, ending match");
                            if (matchTimerRef.current) {
                                clearInterval(matchTimerRef.current);
                                matchTimerRef.current = null;
                            }
                            // Handle match end
                            handleMatchEnd();
                        }
                    }, 1000);
                    
                    // Reset image count before starting new session
                    setImagesSent(0);
                    
                    // Start periodic aura score updates
                    console.log("Starting aura updates");
                    startAuraUpdates();
                    
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Stop the current match
    const stopMatch = () => {
        setShowStopMatchModal(false);
        handleMatchEnd();
    };
    
    // Calculate aura color based on points (for the circle visualization)
    const getUserAuraColor = () => {
        if (userAuraScore < 0) return "from-red-500 to-orange-500";
        if (userAuraScore < 50) return "from-orange-400 to-yellow-400";
        if (userAuraScore < 100) return "from-yellow-300 to-green-400";
        if (userAuraScore < 200) return "from-green-400 to-blue-500";
        return "from-blue-400 to-purple-600";
    };
    
    // Calculate enemy aura color
    const getEnemyAuraColor = () => {
        if (enemyAuraScore < 0) return "from-red-500 to-orange-500";
        if (enemyAuraScore < 50) return "from-orange-400 to-yellow-400";
        if (enemyAuraScore < 100) return "from-yellow-300 to-green-400";
        if (enemyAuraScore < 200) return "from-green-400 to-blue-500";
        return "from-blue-400 to-purple-600";
    };
    
    // Get aura level text
    const getUserAuraLevel = () => {
        if (userAuraScore < 0) return "Debugging Disaster";
        if (userAuraScore < 50) return "Code Cadet";
        if (userAuraScore < 100) return "Function Fanatic";
        if (userAuraScore < 200) return "Algorithm Ace";
        return "Programming Prodigy";
    };
    
    // Get enemy aura level text
    const getEnemyAuraLevel = () => {
        if (enemyAuraScore < 0) return "Debugging Disaster";
        if (enemyAuraScore < 50) return "Code Cadet";
        if (enemyAuraScore < 100) return "Function Fanatic";
        if (enemyAuraScore < 200) return "Algorithm Ace";
        return "Programming Prodigy";
    };

    // Add effect to update interval when captureInterval changes
    useEffect(() => {
        // Only restart the interval if we're already in a match
        if (matchStarted && auraUpdateInterval) {
            console.log(`Capture interval changed to ${captureInterval}s, restarting timer`);
            console.log("fuck");
            // Just call startAuraUpdates which will handle cleaning up the old interval
            // and starting a new one with the current captureInterval value
            startAuraUpdates();
        }
    }, [captureInterval, matchStarted]);

    return (
        <main className="min-h-screen flex flex-col bg-gradient-to-br from-purple-600 to-blue-500 p-6">
            {/* Hidden canvas elements for capturing */}
            <canvas ref={webcamCanvasRef} style={{ display: 'none' }}></canvas>
            <canvas ref={screenCanvasRef} style={{ display: 'none' }}></canvas>
            
            {/* API Message notification */}
            {apiMessage && (
                <div className="fixed top-4 right-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg z-50 font-['VT323']">
                    {apiMessage}
                </div>
            )}
            
            {/* Stop Match Modal */}
            {showStopMatchModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
                    <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md border border-red-500">
                        <h2 className="text-2xl font-bold text-white text-center mb-6 font-['Press_Start_2P']">
                            End Match?
                        </h2>
                        
                        <p className="text-center text-white mb-6 font-['VT323'] text-xl">
                            Are you sure you want to end this match early?
                        </p>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowStopMatchModal(false)}
                                className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 transition-all font-['VT323']"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={stopMatch}
                                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all font-['VT323']"
                            >
                                End Match
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Results Modal */}
            {showResultModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/90">
                    <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md border border-purple-500 shadow-2xl">
                        <h2 className="text-3xl font-bold text-white text-center mb-6 font-['Press_Start_2P']">
                            Match Results
                        </h2>
                        
                        <div className="bg-gray-800/70 rounded-lg p-6 mb-6">
                            <div className="flex justify-between items-center">
                                <div className="text-center">
                                    <p className="text-lg text-white/70 font-['VT323'] mb-1">You</p>
                                    <p className={`text-4xl font-bold ${userAuraScore > enemyAuraScore ? 'text-green-400' : 'text-purple-400'} font-['Press_Start_2P']`}>
                                        {userAuraScore}
                                    </p>
                                </div>
                                
                                <div className="text-2xl text-white font-['Press_Start_2P']">VS</div>
                                
                                <div className="text-center">
                                    <p className="text-lg text-white/70 font-['VT323'] mb-1">{enemyName}</p>
                                    <p className={`text-4xl font-bold ${enemyAuraScore > userAuraScore ? 'text-green-400' : 'text-blue-400'} font-['Press_Start_2P']`}>
                                        {enemyAuraScore}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-800/70 rounded-lg p-6 mb-8">
                            <h3 className="text-xl text-white text-center font-['VT323'] mb-2">
                                {userAuraScore > enemyAuraScore ? '🏆 Victory! 🏆' : userAuraScore < enemyAuraScore ? '😢 Defeat 😢' : '🤝 Draw 🤝'}
                            </h3>
                            <p className="text-lg text-center text-white/70 font-['VT323']">
                                {userAuraScore > enemyAuraScore 
                                    ? 'Your coding aura outshined your opponent!' 
                                    : userAuraScore < enemyAuraScore 
                                    ? "Your opponent's coding skills were too strong this time." 
                                    : 'A perfect match of coding skills!'}
                            </p>
                        </div>
                        
                        <div className="text-center space-y-4">
                            <button
                                onClick={resetMatch}
                                className="px-6 py-3 bg-purple-600 text-white rounded-full font-bold hover:bg-purple-700 transition-all transform hover:scale-105 font-['VT323'] w-full text-xl"
                            >
                                Back to Lobby
                            </button>
                            
                            <Link
                                href="/dashboard"
                                className="block px-6 py-3 bg-gray-700/50 text-white rounded-full font-bold hover:bg-gray-600/50 transition-all transform hover:scale-105 font-['VT323'] text-xl"
                            >
                                Exit to Dashboard
                            </Link>
                        </div>
                        
                        {/* Background effects */}
                        <div className="absolute -z-10 top-0 left-0 w-full h-full overflow-hidden rounded-xl pointer-events-none">
                            <div className={`absolute -inset-10 ${userAuraScore > enemyAuraScore ? 'bg-green-500/10' : userAuraScore < enemyAuraScore ? 'bg-red-500/10' : 'bg-blue-500/10'} blur-3xl animate-pulse`}></div>
                            {userAuraScore > enemyAuraScore && (
                                <>
                                    <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-300/20 rounded-full blur-xl animate-ping"></div>
                                    <div className="absolute bottom-10 right-10 w-20 h-20 bg-yellow-300/20 rounded-full blur-xl animate-ping delay-300"></div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Countdown Modal */}
            {showCountdownModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/90">
                    <div className="relative">
                        <div className="text-[15rem] font-bold text-white font-['Press_Start_2P'] flex items-center justify-center animate-countdown-enter">
                            <div className="relative">
                                <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 opacity-30 blur-xl animate-pulse"></div>
                                <span className="relative animate-countdown-pulse">{countdownValue}</span>
                                
                                {/* Sparkles */}
                                <div className="absolute -top-10 -left-10 w-8 h-8 bg-yellow-300 rounded-full blur-sm animate-sparkle opacity-60"></div>
                                <div className="absolute top-10 -right-10 w-6 h-6 bg-blue-300 rounded-full blur-sm animate-sparkle opacity-70 delay-300"></div>
                                <div className="absolute -bottom-5 left-10 w-4 h-4 bg-pink-300 rounded-full blur-sm animate-sparkle opacity-60"></div>
                                <div className="absolute bottom-20 right-5 w-5 h-5 bg-green-300 rounded-full blur-sm animate-sparkle opacity-70"></div>
                            </div>
                        </div>
                        <div className="absolute inset-0">
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="w-full h-1 bg-white/30 absolute">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-500 via-white to-blue-500 transition-all duration-1000" 
                                        style={{ width: `${(countdownValue / 3) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-xl text-white mt-10 font-['VT323'] animate-pulse">
                            Prepare your coding aura!
                        </p>
                        
                        {/* Background effects */}
                        <div className="fixed inset-0 -z-10 pointer-events-none">
                            <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-purple-600/20 to-blue-500/20 blur-3xl animate-pulse rounded-full"></div>
                            <div className="absolute top-0 left-0 w-full h-full">
                                <div className="absolute top-1/3 left-1/5 w-8 h-8 bg-white rounded-full blur-md opacity-20 animate-ping"></div>
                                <div className="absolute top-2/3 left-3/4 w-6 h-6 bg-white rounded-full blur-md opacity-20 animate-ping delay-300"></div>
                                <div className="absolute top-1/2 left-1/3 w-4 h-4 bg-white rounded-full blur-md opacity-20 animate-ping"></div>
                                <div className="absolute top-1/4 left-2/3 w-5 h-5 bg-white rounded-full blur-md opacity-20 animate-ping delay-300"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Search Modal */}
            {showSearchModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
                    <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md border border-purple-500">
                        <h2 className="text-2xl font-bold text-white text-center mb-6 font-['VT323']">
                            Finding Opponent...
                        </h2>
                        
                        <div className="text-center mb-6">
                            <span className="text-lg text-white font-['VT323']">
                                Elapsed Time: {formatSearchTime(searchTime)}
                            </span>
                        </div>
                        
                        <div className="relative h-20 mb-6">
                            {/* Left side aura */}
                            <div className="absolute top-0 left-0 w-1/3 h-full">
                                <div className="absolute inset-0 bg-purple-600 rounded-full blur-md animate-pulse"></div>
                                <div className="absolute inset-0 bg-purple-400 rounded-full scale-75 animate-ping"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white font-['VT323'] text-xl">YOU</span>
                                </div>
                            </div>
                            
                            {/* VS */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-2xl font-bold z-10 font-['Press_Start_2P'] animate-pulse">
                                VS
                            </div>
                            
                            {/* Middle lightning */}
                            <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full h-1 flex items-center">
                                <div className="w-full h-0.5 bg-gradient-to-r from-purple-500 via-white to-blue-500 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-300 via-yellow-300 to-blue-300 animate-pulse"></div>
                                    <div className="absolute top-0 left-1/4 w-1/2 h-full bg-white opacity-75 animate-ping"></div>
                                </div>
                            </div>
                            
                            {/* Right side aura */}
                            <div className="absolute top-0 right-0 w-1/3 h-full">
                                <div className="absolute inset-0 bg-blue-600 rounded-full blur-md animate-pulse"></div>
                                <div className="absolute inset-0 bg-blue-400 rounded-full scale-75 animate-ping"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white font-['VT323'] text-xl">THEM</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-center text-white/70 font-['VT323']">
                            <p className="mb-2">Matching based on your developer profile...</p>
                            <p>Finding someone with similar aura levels</p>
                        </div>
                        
                        <button 
                            onClick={() => {
                                if (searchTimer) {
                                    clearInterval(searchTimer);
                                    setSearchTimer(null);
                                }
                                setSearchingForMatch(false);
                                setShowSearchModal(false);
                            }}
                            className="mt-6 w-full py-2 bg-red-600/70 text-white rounded font-['VT323'] hover:bg-red-700/70"
                        >
                            Cancel Search
                        </button>
                    </div>
                </div>
            )}
            
            <div className="max-w-7xl w-full mx-auto mb-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white font-['Press_Start_2P']">Ranked Aura</h1>
                <div className="flex gap-4 items-center">
                    {matchStarted && (
                        <>
                            <div className="text-white text-sm bg-black/30 px-3 py-1 rounded-full font-['VT323']">
                                Images Sent: {imagesSent}
                            </div>
                            <button
                                onClick={() => setShowStopMatchModal(true)}
                                className="px-4 py-2 bg-red-600/80 text-white rounded-full text-lg font-bold hover:bg-red-700/80 transition-all transform hover:scale-105 font-['VT323']"
                            >
                                Stop Match
                            </button>
                        </>
                    )}
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 bg-white/20 text-white rounded-full text-lg font-bold hover:bg-white/30 transition-all transform hover:scale-105 font-['VT323']"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            {!matchFound ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl w-full mx-auto">
                    {/* Left Side - Recent Matches */}
                    <div className="bg-gray-900/70 p-6 rounded-lg shadow-xl">
                        <h2 className="text-2xl font-bold text-white mb-4 font-['VT323']">Recent Matches</h2>
                        <div className="space-y-4">
                            {RECENT_MATCHES.map(match => (
                                <div key={match.id} className="bg-gray-800/70 p-4 rounded-lg hover:bg-gray-700/80 transition-colors border border-gray-700/50 hover:border-purple-500/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg text-purple-400 font-['VT323']"># {match.id}</span>
                                            <span className="text-xs text-gray-400 font-['VT323']">{match.timestamp}</span>
                                        </div>
                                        <span className="text-xs text-gray-400 font-['VT323'] bg-gray-700/70 px-2 py-1 rounded">
                                            Duration: {match.duration}
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1 text-center border-r border-gray-700 pr-2">
                                            <div className="text-lg text-white font-['VT323'] truncate">{match.user1}</div>
                                            <div className={`text-xl font-bold ${match.user1Score > match.user2Score ? "text-green-400" : "text-white"} font-['VT323']`}>
                                                {match.user1Score}
                                            </div>
                                        </div>
                                        
                                        <div className="px-2 py-1 bg-gray-900/50 rounded mx-2 text-gray-400 font-['VT323']">
                                            VS
                                        </div>
                                        
                                        <div className="flex-1 text-center border-l border-gray-700 pl-2">
                                            <div className="text-lg text-white font-['VT323'] truncate">{match.user2}</div>
                                            <div className={`text-xl font-bold ${match.user2Score > match.user1Score ? "text-green-400" : "text-white"} font-['VT323']`}>
                                                {match.user2Score}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side - Matchmaking */}
                    <div className="bg-gray-900/70 p-6 rounded-lg shadow-xl">
                        <h2 className="text-2xl font-bold text-white mb-4 font-['VT323']">Find Opponent</h2>
                        
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-white text-lg font-['VT323']">Online Developers:</span>
                                <span className="text-green-400 text-lg font-bold font-['VT323']">{onlineUsers}</span>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-white text-lg font-['VT323']">Match Duration:</label>
                                <select 
                                    value={matchDuration} 
                                    onChange={(e) => setMatchDuration(parseInt(e.target.value))}
                                    className="w-full p-2 bg-gray-800 text-white rounded-lg font-['VT323'] border border-gray-700 focus:border-purple-500 focus:outline-none"
                                >
                                    <option value={10}>10 Minutes</option>
                                    <option value={30}>30 Minutes</option>
                                    <option value={60}>1 Hour</option>
                                    <option value={120}>2 Hours</option>
                                </select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-white text-lg font-['VT323']">Capture Interval (seconds):</label>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="15" 
                                    value={captureInterval} 
                                    onChange={(e) => setCaptureInterval(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="text-right text-white font-['VT323']">{captureInterval} seconds</div>
                            </div>
                            
                            <button
                                onClick={startMatchmaking}
                                disabled={searchingForMatch}
                                className={`w-full py-3 rounded-lg text-xl font-bold transition-all transform hover:scale-105 font-['VT323'] ${
                                    searchingForMatch 
                                        ? "bg-gray-500 text-gray-300" 
                                        : "bg-purple-600 text-white hover:bg-purple-700"
                                }`}
                            >
                                {searchingForMatch ? "Searching..." : "Find a Match"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-7xl w-full mx-auto bg-gray-900/70 p-6 rounded-lg shadow-xl">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center font-['VT323']">
                        {matchStarted ? `Match in Progress - ${formatTimer(roundTimer)}` : userReady ? `Starting in ${countdownValue}...` : "Match Found!"}
                    </h2>
                    
                    {matchStarted && (
                        <div className="flex justify-center mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-3xl">
                                {/* User Aura Circle */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-40 h-40 rounded-full bg-gradient-to-br ${getUserAuraColor()} flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(255,255,255,0.2)] relative overflow-hidden`}
                                    >
                                        <div className="absolute inset-0 bg-black/10"></div>
                                        <div className="relative text-white text-center z-10">
                                            <div className="text-4xl font-bold font-['Press_Start_2P']">
                                                {userAuraScore}
                                            </div>
                                            <div className="text-sm mt-1 font-['VT323']">Your Aura</div>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="animate-ping absolute w-full h-full rounded-full bg-white/10 opacity-50"></div>
                                        </div>
                                    </div>
                                    <div className="text-xl text-white font-['VT323'] text-center">{getUserAuraLevel()}</div>
                                </div>

                                {/* Enemy Aura Circle */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-40 h-40 rounded-full bg-gradient-to-br ${getEnemyAuraColor()} flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(255,255,255,0.2)] relative overflow-hidden`}
                                    >
                                        <div className="absolute inset-0 bg-black/10"></div>
                                        <div className="relative text-white text-center z-10">
                                            <div className="text-4xl font-bold font-['Press_Start_2P']">
                                                {enemyAuraScore}
                                            </div>
                                            <div className="text-sm mt-1 font-['VT323']">{enemyName}'s Aura</div>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="animate-ping absolute w-full h-full rounded-full bg-white/10 opacity-50"></div>
                                        </div>
                                    </div>
                                    <div className="text-xl text-white font-['VT323'] text-center">{getEnemyAuraLevel()}</div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* User Side */}
                        <div className="bg-gray-800/70 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white font-['VT323']">You</h3>
                                <div className="text-green-400 text-lg font-['VT323']">
                                    {webcamPermission && screenPermission ? "Ready" : "Setup Required"}
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-black/50 rounded-lg p-2 aspect-video relative">
                                    {/* Label for webcam */}
                                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded font-['VT323'] z-10">
                                        Webcam
                                    </div>
                                    {webcamPermission ? (
                                        <video 
                                            ref={videoRef} 
                                            autoPlay 
                                            playsInline 
                                            muted 
                                            className="w-full h-full object-cover rounded"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <p className="text-white mb-2 font-['VT323']">Webcam Access Required</p>
                                            <button 
                                                onClick={requestWebcam}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-['VT323']"
                                            >
                                                Enable Webcam
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="bg-black/50 rounded-lg p-2 aspect-video relative">
                                    {/* Label for screen */}
                                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded font-['VT323'] z-10">
                                        Screen
                                    </div>
                                    {screenPermission ? (
                                        <video 
                                            ref={screenRef} 
                                            autoPlay 
                                            playsInline 
                                            muted 
                                            className="w-full h-full object-cover rounded"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <p className="text-white mb-2 font-['VT323']">Screen Sharing Required</p>
                                            <button 
                                                onClick={requestScreen}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-['VT323']"
                                            >
                                                Share Screen
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {!matchStarted && (
                                    <button
                                        onClick={handleReadyClick}
                                        disabled={!webcamPermission || !screenPermission || userReady}
                                        className={`w-full py-3 rounded-lg text-xl font-bold transition-all transform hover:scale-105 font-['VT323'] ${
                                            !webcamPermission || !screenPermission || userReady
                                                ? "bg-gray-500 text-gray-300" 
                                                : "bg-green-600 text-white hover:bg-green-700"
                                        }`}
                                    >
                                        {userReady ? "Ready!" : "I'm Ready"}
                                    </button>
                                )}
                                
                                {matchStarted && (
                                    <div className="mt-4">
                                        <h4 className="text-lg text-white font-['VT323'] mb-2">Aura Changes</h4>
                                        <div className="bg-gray-900/50 rounded-lg p-3 max-h-[150px] overflow-y-auto space-y-2">
                                            {userScoreHistory.length ? (
                                                userScoreHistory.map((entry, index) => (
                                                    <div key={index} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center">
                                                            <span className={`font-mono font-bold ${entry.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {entry.change > 0 ? '+' : ''}{entry.change}
                                                            </span>
                                                            <span className="text-gray-400 text-xs ml-2">{entry.timestamp}</span>
                                                        </div>
                                                        <span className="text-white font-['VT323'] truncate ml-2 text-xs max-w-[150px]">
                                                            {entry.reason}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-gray-400 text-center font-['VT323']">No aura changes yet...</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Enemy Side */}
                        <div className="bg-gray-800/70 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white font-['VT323']">{enemyName}</h3>
                                <div className="text-green-400 text-lg font-['VT323']">Ready</div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-black/50 rounded-lg p-2 aspect-video relative">
                                    {/* Label for webcam */}
                                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded font-['VT323'] z-10">
                                        Webcam
                                    </div>
                                    <div className="flex items-center justify-center h-full">
                                        <div className="flex items-center text-green-400 font-['VT323']">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Webcam Enabled
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-black/50 rounded-lg p-2 aspect-video relative">
                                    {/* Label for screen */}
                                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded font-['VT323'] z-10">
                                        Screen
                                    </div>
                                    <div className="flex items-center justify-center h-full">
                                        <div className="flex items-center text-green-400 font-['VT323']">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Screen Sharing Enabled
                                        </div>
                                    </div>
                                </div>
                                
                                {!matchStarted && (
                                    <div className="w-full py-3 rounded-lg text-xl font-bold bg-green-600 text-center text-white font-['VT323']">
                                        Ready!
                                    </div>
                                )}
                                
                                {matchStarted && (
                                    <div className="mt-4">
                                        <h4 className="text-lg text-white font-['VT323'] mb-2">Aura Changes</h4>
                                        <div className="bg-gray-900/50 rounded-lg p-3 max-h-[150px] overflow-y-auto space-y-2">
                                            {enemyScoreHistory.length ? (
                                                enemyScoreHistory.map((entry, index) => (
                                                    <div key={index} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center">
                                                            <span className={`font-mono font-bold ${entry.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {entry.change > 0 ? '+' : ''}{entry.change}
                                                            </span>
                                                            <span className="text-gray-400 text-xs ml-2">{entry.timestamp}</span>
                                                        </div>
                                                        <span className="text-white font-['VT323'] truncate ml-2 text-xs max-w-[150px]">
                                                            {entry.reason}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-gray-400 text-center font-['VT323']">No aura changes yet...</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {matchFound && matchStarted && (
                <div className="fixed bottom-4 right-4 bg-gray-800/80 text-white px-3 py-2 rounded-lg shadow-lg z-10 font-['VT323']">
                    Debug Info: {imagesSent} images sent
                </div>
            )}
        </main>
    );
} 