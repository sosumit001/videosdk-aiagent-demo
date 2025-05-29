import React, { useState, useEffect, useRef } from "react";
import { useMeeting, useParticipant } from "@videosdk.live/react-sdk";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentSettings, PROMPTS } from "./types";
import { AgentAudioPlayer } from "./AgentAudioPlayer";
import { VITE_VIDEOSDK_TOKEN, VITE_API_URL } from "./types";
import { MicrophoneWithWaves } from "./MicrophoneWithWaves";
import { RoomLayout } from "../layout/RoomLayout";
import { CustomButton } from "./CustomButton";

interface MeetingInterfaceProps {
  meetingId: string;
  onDisconnect: () => void;
  agentSettings: AgentSettings;
}

export const MeetingInterface: React.FC<MeetingInterfaceProps> = ({
  meetingId,
  onDisconnect,
  agentSettings,
}) => {
  const [agentInvited, setAgentInvited] = useState(false);
  const [agentJoined, setAgentJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
  const [agentParticipantId, setAgentParticipantId] = useState<string | null>(
    null
  );
  const joinAttempted = useRef(false);
  const agentInviteAttempted = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const maxRetries = 3;
  const retryDelay = 5000;

  const { join, leave, end, toggleMic, participants, localParticipant } =
    useMeeting({
      onMeetingJoined: () => {
        console.log("Meeting joined successfully");
        setIsJoined(true);
        setConnectionError(null);
        setRetryAttempts(0);
        setIsRetrying(false);
        joinAttempted.current = true;
      },
      onMeetingLeft: () => {
        console.log("Meeting left");
        setIsJoined(false);
        setRetryAttempts(0);
        setIsRetrying(false);
        joinAttempted.current = false;
        agentInviteAttempted.current = false;
        onDisconnect();
      },
      onParticipantJoined: (participant) => {
        console.log("Participant joined:", participant.displayName);
        if (
          participant.displayName?.includes("Agent") ||
          participant.displayName?.includes("Haley")
        ) {
          setAgentJoined(true);
          setAgentParticipantId(participant.id);
        }
      },
      onParticipantLeft: (participant) => {
        console.log("Participant left:", participant.displayName);
        if (
          participant.displayName?.includes("Agent") ||
          participant.displayName?.includes("Haley")
        ) {
          setAgentJoined(false);
          setAgentParticipantId(null);
        }
      },
      onError: (error) => {
        console.error("Meeting error:", error);

        if (error.message?.includes("Insufficient resources")) {
          setConnectionError(
            "Server is currently overloaded. Please try again in a few minutes."
          );

          if (retryAttempts < maxRetries && !isRetrying) {
            setIsRetrying(true);
            setTimeout(() => {
              handleRetryConnection();
            }, retryDelay);
          }
        } else {
          setConnectionError(error.message || "Connection failed");
        }
      },
    });

  // Use participant hook for agent if available
  const agentParticipant = useParticipant(agentParticipantId || "", {
    onStreamEnabled: (stream) => {
      console.log("Agent stream enabled:", stream);
      if (stream.kind === "audio") {
        // Convert VideoSDK Stream to MediaStream
        const mediaStream = new MediaStream([stream.track]);
        setupAudioAnalysis(mediaStream);
      }
    },
    onStreamDisabled: (stream) => {
      console.log("Agent stream disabled:", stream);
      if (stream.kind === "audio") {
        cleanupAudioAnalysis();
      }
    },
  });

  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const normalizedLevel = Math.min(average / 128, 1);

          // Set speaking state based on audio level
          setAgentIsSpeaking(normalizedLevel > 0.1);
        }
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (error) {
      console.error("Error setting up audio analysis:", error);
    }
  };

  const cleanupAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setAgentIsSpeaking(false);
    analyserRef.current = null;
  };

  useEffect(() => {
    if (agentParticipant?.micStream) {
      const mediaStream = new MediaStream([agentParticipant.micStream.track]);
      setupAudioAnalysis(mediaStream);
    } else {
      cleanupAudioAnalysis();
    }

    return () => {
      cleanupAudioAnalysis();
    };
  }, [agentParticipant?.micStream]);

  useEffect(() => {
    if (isJoined && !agentInvited && !agentInviteAttempted.current) {
      console.log("Auto-inviting agent after meeting join");
      agentInviteAttempted.current = true;
      inviteAgent();
    }
  }, [isJoined]);

  const handleRetryConnection = () => {
    if (retryAttempts >= maxRetries) {
      setIsRetrying(false);
      setConnectionError(
        "Maximum retry attempts reached. Please try creating a new meeting."
      );
      return;
    }

    console.log(`Retry attempt ${retryAttempts + 1}/${maxRetries}`);
    setRetryAttempts((prev) => prev + 1);

    try {
      setConnectionError(null);
      joinAttempted.current = false;

      setTimeout(() => {
        if (!isJoined && !joinAttempted.current) {
          join();
          joinAttempted.current = true;
        }
        setIsRetrying(false);
      }, 1000);
    } catch (error) {
      console.error("Error during retry:", error);
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    if (!joinAttempted.current && !isRetrying) {
      console.log("Attempting to join meeting:", meetingId);

      const timer = setTimeout(() => {
        if (!isJoined && !joinAttempted.current) {
          try {
            join();
            joinAttempted.current = true;
          } catch (error) {
            console.error("Error joining meeting:", error);
            setConnectionError("Failed to join meeting");
          }
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [join, meetingId, isRetrying]);

  const handleToggleMic = () => {
    if (isJoined) {
      toggleMic();
      setMicEnabled(!micEnabled);
    }
  };

  const leaveAgent = async () => {
    try {
      const response = await fetch(`${VITE_API_URL}/leave-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meeting_id: meetingId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Agent leave response:", data);

        if (data.status === "removed") {
          console.log("Agent successfully removed, ending meeting");
          end(); // Call the end method from useMeeting hook
        } else if (data.status === "not_found") {
          console.log("No agent session found");
        }
      } else {
        const errorData = await response.json();
        console.error("Error removing agent:", errorData);
      }
    } catch (error) {
      console.error("Error calling leave-agent API:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (agentInvited) {
        await leaveAgent();
      } else {
        leave();
      }
    } catch (error) {
      console.error("Error during disconnect:", error);
      leave();
    }
  };

  const handleManualRetry = () => {
    if (isRetrying) return;

    setRetryAttempts(0);
    setConnectionError(null);
    joinAttempted.current = false;
    handleRetryConnection();
  };

  const inviteAgent = async () => {
    try {
      console.log("Sending agent settings:", agentSettings);

      const systemPrompt =
        PROMPTS[agentSettings.personality as keyof typeof PROMPTS];

      const response = await fetch(`${VITE_API_URL}/join-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meeting_id: meetingId,
          token: VITE_VIDEOSDK_TOKEN,
          model: agentSettings.model,
          voice: agentSettings.voice,
          personality: agentSettings.personality,
          system_prompt: systemPrompt,
          temperature: agentSettings.temperature,
          topP: agentSettings.topP,
          topK: agentSettings.topK,
        }),
      });

      if (response.ok) {
        setAgentInvited(true);
      } else {
        throw new Error("Failed to invite agent");
      }
    } catch (error) {
      console.error("Error inviting agent:", error);
      agentInviteAttempted.current = false;
    }
  };

  const handleInviteAgent = () => {
    if (!agentInvited && isJoined) {
      inviteAgent();
    }
  };

  const participantsList = Array.from(participants.values());
  const agentParticipantFromList = participantsList.find(
    (p) => p.displayName?.includes("Agent") || p.displayName?.includes("Haley")
  );

  const renderMainButton = () => {
    if (!agentInvited) {
      // Step 1: Invite agent
      return (
        <CustomButton
          text="Give it a try!"
          thickBorder={true}
          onClick={handleInviteAgent}
          disabled={!isJoined}
          gradient={true}
          borderColor="#864059"
          borderWidth="6px"
          borderRadius="6px"
        />
      );
    } else if (agentInvited && !agentJoined) {
      // Step 2: Agent is joining
      return (
        <CustomButton
          text="Give it a sec..."
          disabled={true}
          gradient={true}
          customGradient="linear-gradient(90deg, #864059 0%, #7D3478 49%, #483D85 100%)"
          borderColor="#F96E8C"
          borderWidth="1.5px"
          borderRadius="1.5px"
        />
      );
    } else {
      // Step 3: Agent joined, show stop button
      return (
        <CustomButton
          text="Press to stop"
          thickBorder={true}
          onClick={handleDisconnect}
          gradient={true}
          borderColor="#864059"
          borderWidth="6px"
          borderRadius="6px"
        />
      );
    }
  };

  return (
    <RoomLayout agentSettings={agentSettings}>
      <div className="flex flex-col items-center justify-between h-[50%]">
        {/* Microphone with Wave Animation */}
        <MicrophoneWithWaves
          isConnected={isJoined}
          isSpeaking={agentIsSpeaking}
          className="mb-20"
        />

        {/* Main Button */}
        <div className="mb-6">{renderMainButton()}</div>

        {/* Control Panel - Only show retry button if needed */}
        <div className="flex items-center space-x-6">
          {/* Retry Button */}
          {connectionError && !isRetrying && retryAttempts < maxRetries && (
            <Button
              onClick={handleManualRetry}
              variant="outline"
              className="px-6 py-3"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Agent Audio Player */}
      {agentParticipantFromList && (
        <div className="mt-8 w-full max-w-md">
          <AgentAudioPlayer participantId={agentParticipantFromList.id} />
        </div>
      )}
    </RoomLayout>
  );
};
