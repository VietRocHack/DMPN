"use client";

import { useState, useRef, useEffect } from "react";

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
    // These are used in the capture process but not displayed directly in UI
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [webcamImage, setWebcamImage] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [screenImage, setScreenImage] = useState<string | null>(null);

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
                
                // Also update enemy with random data
                updateEnemyAuraScore();
            } catch (error) {
                console.error("Error sending data to backend:", error);
                
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
        if (!webcamPermission || !screenPermission) {
            return;
        }
        
        // Mark user as ready
        setUserReady(true);
        
        // Log readiness to help with debugging
        console.log("User ready! Checking stream readiness...");
        console.log("WebcamStream:", webcamStreamRef.current ? "Available" : "Missing");
        console.log("ScreenStream:", screenStreamRef.current ? "Available" : "Missing");
        
        // Verify video elements are ready
        if (!videoRef.current?.srcObject || !screenRef.current?.srcObject) {
            console.log("Video elements not set up properly, reconnecting streams...");
            
            // Reconnect webcam if needed
            if (webcamStreamRef.current && videoRef.current) {
                console.log("Reconnecting webcam stream");
                videoRef.current.srcObject = webcamStreamRef.current;
                videoRef.current.play().catch(err => console.error("Error playing webcam:", err));
            }
            
            // Reconnect screen if needed
            if (screenStreamRef.current && screenRef.current) {
                console.log("Reconnecting screen stream");
                screenRef.current.srcObject = screenStreamRef.current;
                screenRef.current.play().catch(err => console.error("Error playing screen:", err));
            }
        }
        
        // Show countdown
        setShowCountdownModal(true);
        
        // Start countdown
        let count = 3;
        setCountdownValue(count);
        
        countdownTimerRef.current = setInterval(() => {
            count--;
            setCountdownValue(count);
            
            if (count <= 0) {
                // Cleanup interval
                if (countdownTimerRef.current) {
                    clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                }
                
                // Hide countdown modal
                setShowCountdownModal(false);
                
                // Start match
                setMatchStarted(true);
                
                // Double check stream connections one more time
                setTimeout(() => {
                    console.log("Starting match, final stream check...");
                    
                    // Force reconnect webcam stream
                    if (webcamStreamRef.current && videoRef.current) {
                        videoRef.current.srcObject = null;
                        setTimeout(() => {
                            if (videoRef.current && webcamStreamRef.current) {
                                videoRef.current.srcObject = webcamStreamRef.current;
                                videoRef.current.play().catch(err => console.error("Error starting webcam:", err));
                            }
                        }, 100);
                    }
                    
                    // Force reconnect screen stream
                    if (screenStreamRef.current && screenRef.current) {
                        screenRef.current.srcObject = null;
                        setTimeout(() => {
                            if (screenRef.current && screenStreamRef.current) {
                                screenRef.current.srcObject = screenStreamRef.current;
                                screenRef.current.play().catch(err => console.error("Error starting screen:", err));
                            }
                        }, 100);
                    }
                    
                    // Set up round timer
                    const matchDurationSecs = matchDuration * 60;
                    setRoundTimer(matchDurationSecs);
                    
                    matchTimerRef.current = setInterval(() => {
                        setRoundTimer((prev) => {
                            if (prev <= 1) {
                                // Match is ending
                                if (matchTimerRef.current) {
                                    clearInterval(matchTimerRef.current);
                                    matchTimerRef.current = null;
                                }
                                handleMatchEnd();
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                    
                    // Start aura capture process
                    startAuraUpdates();
                }, 500);
            }
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
        <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-900 to-gray-800 text-gray-200 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-blue-400 mb-2 font-['Press_Start_2P']">Ranked Aura</h1>
                    <p className="text-lg text-gray-300 font-['VT323']">
                        Battle against other developers to determine who has the superior aura
                    </p>
                </header>

                {!matchFound && !matchStarted && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Matches Section */}
                        <div className="bg-slate-800 rounded-lg shadow-md p-6">
                            <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">Recent Matches</h2>
                            <div className="space-y-4">
                                {RECENT_MATCHES.map((match) => (
                                    <div 
                                        key={match.id}
                                        className="bg-slate-900 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4"
                                    >
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center text-xl font-['VT323']">
                                                <span className="font-semibold text-blue-300">{match.user1}</span>
                                                <span className="text-gray-400">vs</span>
                                                <span className="font-semibold text-blue-300">{match.user2}</span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center mt-2">
                                                <span className={`text-lg ${match.user1Score > match.user2Score ? "text-green-400" : "text-gray-300"}`}>
                                                    {match.user1Score}
                                                </span>
                                                <span className="text-gray-400 text-sm">
                                                    {match.duration} duration
                                                </span>
                                                <span className={`text-lg ${match.user2Score > match.user1Score ? "text-green-400" : "text-gray-300"}`}>
                                                    {match.user2Score}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-gray-400 text-sm font-['VT323']">
                                            {match.timestamp}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Matchmaking Section */}
                        <div className="bg-slate-800 rounded-lg shadow-md p-6">
                            <h2 className="text-2xl font-bold mb-6 text-blue-300 font-['VT323']">Find a Match</h2>

                            <div className="grid grid-cols-1 gap-6">
                                {/* Online Users */}
                                <div className="bg-slate-900 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl text-gray-300 font-['VT323']">Online Developers</h3>
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                            <span className="text-2xl text-green-400 font-['VT323']">{onlineUsers}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Match Settings */}
                                <div className="space-y-4">
                                    {/* Match Duration */}
                                    <div>
                                        <label className="block mb-2 text-gray-300 font-['VT323']">
                                            Match Duration: {matchDuration} minutes
                                        </label>
                                        <input
                                            type="range"
                                            min="2"
                                            max="30"
                                            value={matchDuration}
                                            onChange={(e) => setMatchDuration(parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    {/* Capture Interval */}
                                    <div>
                                        <label className="block mb-2 text-gray-300 font-['VT323']">
                                            Capture Interval: {captureInterval} seconds
                                        </label>
                                        <input
                                            type="range"
                                            min="2"
                                            max="30"
                                            value={captureInterval}
                                            onChange={(e) => setCaptureInterval(parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* Find Match Button */}
                                <button
                                    onClick={startMatchmaking}
                                    className="w-full py-4 bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors font-['VT323'] text-xl"
                                >
                                    {searchingForMatch
                                        ? `Searching for opponent... (${formatSearchTime(searchTime)})`
                                        : "Find an Opponent"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Match Found but not started */}
                {matchFound && !matchStarted && (
                    <div className="bg-slate-800 rounded-lg shadow-md p-8 max-w-4xl mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-blue-300 mb-2 font-['VT323']">
                                Match Found!
                            </h2>
                            <p className="text-xl text-gray-300 font-['VT323']">
                                You've been matched with <span className="text-blue-300 font-semibold">{enemyName}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* User Side */}
                            <div className="bg-slate-900 rounded-lg p-6 border-2 border-blue-700">
                                <h3 className="text-2xl font-bold text-center mb-4 text-blue-300 font-['VT323']">
                                    You
                                </h3>

                                <div className="space-y-6">
                                    {/* Webcam */}
                                    <div>
                                        <div className="relative bg-slate-950 rounded-lg overflow-hidden aspect-video mb-3">
                                            {webcamPermission ? (
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    muted
                                                    className="w-full h-full object-cover"
                                                ></video>
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <button
                                                        onClick={requestWebcam}
                                                        className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors font-['VT323']"
                                                    >
                                                        Enable Webcam
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Screen */}
                                        <div className="relative bg-slate-950 rounded-lg overflow-hidden aspect-video">
                                            {screenPermission ? (
                                                <video
                                                    ref={screenRef}
                                                    autoPlay
                                                    playsInline
                                                    muted
                                                    className="w-full h-full object-cover"
                                                ></video>
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <button
                                                        onClick={requestScreen}
                                                        className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors font-['VT323']"
                                                    >
                                                        Share Screen
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ready Button */}
                                    <button
                                        onClick={handleReadyClick}
                                        disabled={!webcamPermission || !screenPermission || userReady}
                                        className={`w-full py-3 rounded-lg text-xl font-['VT323'] ${
                                            userReady
                                                ? "bg-green-600 text-white cursor-not-allowed"
                                                : webcamPermission && screenPermission
                                                ? "bg-blue-700 text-white hover:bg-blue-600 transition-colors"
                                                : "bg-slate-700 text-gray-400 cursor-not-allowed"
                                        }`}
                                    >
                                        {userReady ? "Ready!" : "Ready Up"}
                                    </button>
                                </div>
                            </div>

                            {/* Enemy Side */}
                            <div className="bg-slate-900 rounded-lg p-6">
                                <h3 className="text-2xl font-bold text-center mb-4 text-blue-300 font-['VT323']">
                                    {enemyName}
                                </h3>

                                <div className="space-y-6">
                                    {/* Fake Webcam */}
                                    <div className="relative bg-slate-950 rounded-lg overflow-hidden aspect-video mb-3">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-green-700/30 rounded-lg px-3 py-1 flex items-center">
                                                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                                <span className="text-green-400 font-['VT323']">
                                                    Webcam Enabled
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fake Screen */}
                                    <div className="relative bg-slate-950 rounded-lg overflow-hidden aspect-video">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-green-700/30 rounded-lg px-3 py-1 flex items-center">
                                                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                                <span className="text-green-400 font-['VT323']">
                                                    Screen Shared
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ready Status */}
                                    <div className="w-full py-3 bg-green-600 text-white rounded-lg text-center text-xl font-['VT323']">
                                        Ready!
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Match Info */}
                        <div className="bg-slate-900 rounded-lg p-4 text-center">
                            <p className="text-lg text-gray-300 font-['VT323']">
                                Match Duration: {matchDuration} minutes &bull; Interval: {captureInterval} seconds
                            </p>
                        </div>
                    </div>
                )}

                {/* Match Started - Full Match Interface */}
                {matchStarted && (
                    <div className="bg-slate-800 rounded-lg shadow-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-blue-300 font-['VT323']">
                                Ranked Match
                            </h2>
                            <div className="bg-slate-900 rounded-lg px-4 py-2 text-xl font-['VT323'] text-blue-300">
                                {formatTimer(roundTimer)}
                            </div>
                            <button
                                onClick={() => setShowStopMatchModal(true)}
                                className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors font-['VT323']"
                            >
                                Forfeit Match
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* User Side */}
                            <div className="space-y-6">
                                <div className="bg-slate-900 rounded-lg p-4">
                                    <h3 className="text-xl font-bold text-center mb-2 text-blue-300 font-['VT323']">
                                        Your Aura: {userAuraScore}
                                    </h3>

                                    <div className="w-full bg-slate-950 h-4 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-500 ease-out"
                                            style={{
                                                width: `${Math.min(userAuraScore, 100)}%`,
                                                backgroundColor: getUserAuraColor(),
                                            }}
                                        ></div>
                                    </div>

                                    <div className="mt-2 text-center">
                                        <span className="text-lg font-['VT323']" style={{ color: getUserAuraColor() }}>
                                            {getUserAuraLevel()}
                                        </span>
                                    </div>
                                </div>

                                {/* User Webcam */}
                                <div className="relative bg-slate-950 rounded-lg overflow-hidden aspect-video">
                                    {webcamStreamRef.current ? (
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                            style={{transform: "scaleX(-1)"}} // Mirror webcam for natural viewing
                                        ></video>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80">
                                            <div className="text-red-400 text-xl font-['VT323'] mb-2">Webcam disconnected</div>
                                            <button
                                                onClick={requestWebcam}
                                                className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors font-['VT323']"
                                            >
                                                Reconnect
                                            </button>
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-slate-900/70 px-2 py-1 rounded text-xs text-blue-300">
                                        Your Webcam
                                    </div>
                                    <div className="absolute bottom-2 right-2 bg-slate-900/70 px-2 py-1 rounded text-xs text-gray-300">
                                        Images Sent: {imagesSent}
                                    </div>
                                </div>

                                {/* User Screen */}
                                <div className="relative bg-slate-950 rounded-lg overflow-hidden aspect-video">
                                    {screenStreamRef.current ? (
                                        <video
                                            ref={screenRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                        ></video>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80">
                                            <div className="text-red-400 text-xl font-['VT323'] mb-2">Screen disconnected</div>
                                            <button
                                                onClick={requestScreen}
                                                className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors font-['VT323']"
                                            >
                                                Reconnect
                                            </button>
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-slate-900/70 px-2 py-1 rounded text-xs text-blue-300">
                                        Your Screen
                                    </div>
                                </div>

                                {/* User History */}
                                <div className="bg-slate-900 rounded-lg p-4">
                                    <h3 className="text-lg font-bold mb-2 text-blue-300 font-['VT323']">
                                        Your Aura Changes
                                    </h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                        {userScoreHistory.length > 0 ? (
                                            userScoreHistory.map((item, index) => (
                                                <div key={index} className="flex items-center text-sm">
                                                    <span
                                                        className={`font-bold mr-2 ${
                                                            item.change > 0
                                                                ? "text-green-400"
                                                                : "text-red-400"
                                                        }`}
                                                    >
                                                        {item.change > 0
                                                            ? `+${item.change}`
                                                            : item.change}
                                                    </span>
                                                    <span className="text-gray-300 flex-1">{item.reason}</span>
                                                    <span className="text-gray-400 text-xs">{item.timestamp}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-gray-400 text-center">No changes yet</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Enemy Side */}
                            <div className="space-y-6">
                                <div className="bg-slate-900 rounded-lg p-4">
                                    <h3 className="text-xl font-bold text-center mb-2 text-blue-300 font-['VT323']">
                                        {enemyName}'s Aura: {enemyAuraScore}
                                    </h3>

                                    <div className="w-full bg-slate-950 h-4 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-500 ease-out"
                                            style={{
                                                width: `${Math.min(enemyAuraScore, 100)}%`,
                                                backgroundColor: getEnemyAuraColor(),
                                            }}
                                        ></div>
                                    </div>

                                    <div className="mt-2 text-center">
                                        <span className="text-lg font-['VT323']" style={{ color: getEnemyAuraColor() }}>
                                            {getEnemyAuraLevel()}
                                        </span>
                                    </div>
                                </div>

                                {/* Enemy Webcam Placeholder */}
                                <div className="relative bg-slate-950 rounded-lg overflow-hidden aspect-video">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-slate-800/70 px-4 py-2 rounded-lg text-center">
                                            <div className="text-blue-300 text-lg font-['VT323']">
                                                {enemyName}'s Webcam
                                            </div>
                                            <div className="text-gray-400 text-sm font-['VT323']">
                                                Privacy protected
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Enemy Screen Placeholder */}
                                <div className="relative bg-slate-950 rounded-lg overflow-hidden aspect-video">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-slate-800/70 px-4 py-2 rounded-lg text-center">
                                            <div className="text-blue-300 text-lg font-['VT323']">
                                                {enemyName}'s Screen
                                            </div>
                                            <div className="text-gray-400 text-sm font-['VT323']">
                                                Privacy protected
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Enemy History */}
                                <div className="bg-slate-900 rounded-lg p-4">
                                    <h3 className="text-lg font-bold mb-2 text-blue-300 font-['VT323']">
                                        {enemyName}'s Aura Changes
                                    </h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                        {enemyScoreHistory.length > 0 ? (
                                            enemyScoreHistory.map((item, index) => (
                                                <div key={index} className="flex items-center text-sm">
                                                    <span
                                                        className={`font-bold mr-2 ${
                                                            item.change > 0
                                                                ? "text-green-400"
                                                                : "text-red-400"
                                                        }`}
                                                    >
                                                        {item.change > 0
                                                            ? `+${item.change}`
                                                            : item.change}
                                                    </span>
                                                    <span className="text-gray-300 flex-1">{item.reason}</span>
                                                    <span className="text-gray-400 text-xs">{item.timestamp}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-gray-400 text-center">No changes yet</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Modal */}
                {showSearchModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
                        <div className="relative bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-[0_0_50px_rgba(59,130,246,0.3)] border border-blue-500/30">
                            {/* Animated glow effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-30 animate-pulse"></div>
                            
                            <div className="relative">
                                <h2 className="text-3xl font-bold mb-6 text-center text-blue-400 font-['VT323']">
                                    Searching for Opponent
                                </h2>
                                
                                {/* Pulsing radar animation */}
                                <div className="flex justify-center mb-8 relative">
                                    <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center">
                                        <div className="absolute w-32 h-32 rounded-full border-4 border-blue-500/50 animate-ping"></div>
                                        <div className="absolute w-24 h-24 rounded-full border-4 border-blue-400/40 animate-ping animation-delay-300"></div>
                                        <div className="absolute w-16 h-16 rounded-full border-4 border-blue-300/30 animate-ping animation-delay-600"></div>
                                        
                                        {/* Developer icon */}
                                        <div className="text-blue-300 text-4xl z-10">👨‍💻</div>
                                    </div>
                                </div>
                                
                                {/* Searching animation dots */}
                                <p className="text-center text-gray-300 mb-4 font-['VT323'] text-2xl flex items-center justify-center">
                                    Searching
                                    <span className="inline-block w-1 h-1 bg-blue-400 rounded-full ml-1 animate-bounce"></span>
                                    <span className="inline-block w-1 h-1 bg-blue-400 rounded-full ml-1 animate-bounce animation-delay-150"></span>
                                    <span className="inline-block w-1 h-1 bg-blue-400 rounded-full ml-1 animate-bounce animation-delay-300"></span>
                                </p>
                                
                                {/* Time elapsed */}
                                <div className="bg-slate-900 rounded-lg py-3 px-4 text-center mb-6">
                                    <div className="text-sm text-gray-400 font-['VT323'] mb-1">TIME ELAPSED</div>
                                    <div className="text-2xl text-blue-300 font-['Press_Start_2P'] tracking-wider">
                                        {formatSearchTime(searchTime)}
                                    </div>
                                </div>

                                {/* Status messages */}
                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center text-gray-300 font-['VT323']">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                        <span>Scanning for developers with similar skill...</span>
                                    </div>
                                    <div className="flex items-center text-gray-300 font-['VT323']">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                        <span>Analyzing aura compatibility...</span>
                                    </div>
                                    <div className="flex items-center text-gray-300 font-['VT323']">
                                        <div className="w-2 h-2 bg-blue-500 animate-pulse rounded-full mr-2"></div>
                                        <span>Establishing connection...</span>
                                    </div>
                                </div>

                                {/* Online users indicator */}
                                <div className="text-center text-gray-400 font-['VT323'] mb-6">
                                    <span className="text-green-400">{onlineUsers}</span> developers currently online
                                </div>
                                
                                <button
                                    onClick={() => {
                                        setSearchingForMatch(false);
                                        setShowSearchModal(false);
                                        if (searchTimer) clearInterval(searchTimer);
                                    }}
                                    className="w-full py-3 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors font-['VT323'] text-xl relative overflow-hidden group"
                                >
                                    <span className="relative z-10">Cancel Search</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-800 to-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Countdown Modal */}
                {showCountdownModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
                        <div className="bg-slate-800 rounded-lg p-8">
                            <div className="text-center">
                                <h2 className="text-4xl font-bold mb-8 text-blue-300 font-['VT323']">
                                    Match Starting in
                                </h2>
                                <div className="text-8xl font-bold text-white mb-8 font-['Press_Start_2P']">
                                    {countdownValue}
                                </div>
                                <p className="text-xl text-gray-300 font-['VT323']">
                                    Prepare for the aura battle!
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Modal */}
                {showResultModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
                        <div className="bg-slate-800 rounded-lg p-8 max-w-lg w-full mx-4">
                            <h2 className="text-3xl font-bold mb-6 text-center text-blue-300 font-['VT323']">
                                Match Results
                            </h2>

                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="text-center">
                                    <div className="text-xl text-gray-300 font-['VT323']">Your Score</div>
                                    <div className="text-4xl font-bold font-['VT323']" style={{ color: getUserAuraColor() }}>
                                        {userAuraScore}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl text-gray-300 font-['VT323']">{enemyName}'s Score</div>
                                    <div className="text-4xl font-bold font-['VT323']" style={{ color: getEnemyAuraColor() }}>
                                        {enemyAuraScore}
                                    </div>
                                </div>
                            </div>

                            <div className="text-center mb-8">
                                <div className="text-2xl font-bold mb-2 font-['VT323']">
                                    {userAuraScore > enemyAuraScore ? (
                                        <span className="text-green-400">Victory!</span>
                                    ) : userAuraScore < enemyAuraScore ? (
                                        <span className="text-red-400">Defeat!</span>
                                    ) : (
                                        <span className="text-yellow-400">Draw!</span>
                                    )}
                                </div>
                                <p className="text-gray-300 font-['VT323']">
                                    {userAuraScore > enemyAuraScore
                                        ? "Your developer aura outshined your opponent!"
                                        : userAuraScore < enemyAuraScore
                                        ? "Your opponent's aura was stronger this time."
                                        : "Both of you have equally powerful auras!"}
                                </p>
                            </div>

                            <button
                                onClick={resetMatch}
                                className="w-full py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors font-['VT323'] text-xl"
                            >
                                Return to Lobby
                            </button>
                        </div>
                    </div>
                )}

                {/* Stop Match Confirmation Modal */}
                {showStopMatchModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
                        <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
                            <h2 className="text-2xl font-bold mb-4 text-blue-300 font-['VT323']">
                                Forfeit Match?
                            </h2>
                            <p className="text-gray-300 mb-6 font-['VT323']">
                                Are you sure you want to forfeit this match? This will count as a loss.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowStopMatchModal(false)}
                                    className="flex-1 py-3 bg-slate-700 text-gray-200 rounded-lg hover:bg-slate-600 transition-colors font-['VT323']"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={stopMatch}
                                    className="flex-1 py-3 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors font-['VT323']"
                                >
                                    Forfeit
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hidden canvas elements */}
                <canvas ref={webcamCanvasRef} style={{ display: "none" }}></canvas>
                <canvas ref={screenCanvasRef} style={{ display: "none" }}></canvas>
            </div>
        </div>
    );
} 