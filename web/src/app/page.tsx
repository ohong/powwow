"use client";

import {
  CSSProperties,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { GladiaClient, type LiveV2Session, type LiveV2WebSocketMessage } from "@gladiaio/sdk";

type MessageRole = "system" | "user";

type StepId =
  | "conference"
  | "name"
  | "role"
  | "social"
  | "objective"
  | "density"
  | "diversity"
  | "topics"
  | "extra";

type StepType = "freeText" | "options" | "multiSelect";

interface StepConfig {
  id: StepId;
  prompt: string;
  type: StepType;
  placeholder?: string;
  helper?: string;
  options?: string[];
  optional?: boolean;
  allowCustom?: boolean;
  skipCopy?: string;
}

interface Message {
  id: string;
  role: MessageRole;
  content: string;
}

type ProfileAnswers = Partial<Record<StepId, string | string[]>>;

type SessionOutline = {
  sessionId: string;
  track: string;
  speaker: string;
  speakerTitle?: string;
  company?: string;
  room?: string;
  time?: string;
  sessionTitle: string;
  description: string;
};

type SessionPrepBrief = {
  session_summary: {
    headline: string;
    why_it_matters: string;
    attendee_fit: string;
  };
  key_takeaways: string[];
  company_brief: {
    positioning: string;
    recent_moves: string;
    competitive_angle: string;
  };
  speaker_brief: {
    bio: string;
    conference_goal: string;
    conversation_starter: string;
  };
  smart_questions: string[];
  sources: Array<{ title: string; url: string }>;
};

type SessionPrepResult = {
  session: SessionOutline;
  brief: SessionPrepBrief;
  research: {
    conferenceContext: string;
    companyResearch: Array<{
      title: string;
      summary: string;
      url?: string;
      source: string;
    }>;
    topicResearch: Array<{
      title: string;
      summary: string;
      url?: string;
      source: string;
    }>;
    speakerResearch: Array<{
      title: string;
      summary: string;
      url?: string;
      source: string;
    }>;
    relatedLinks: string[];
    cacheInfo: "cache:hit" | "cache:miss";
  };
  generatedAt: string;
};

const STEP_CONFIG: StepConfig[] = [
  {
    id: "conference",
    prompt: "To get started, tell me which conference you're going to next.",
    type: "freeText",
    placeholder: "e.g. TechCrunch Disrupt 2025",
  },
  {
    id: "name",
    prompt: "Great. What's your name?",
    type: "freeText",
    placeholder: "Your name",
  },
  {
    id: "role",
    prompt: "What role and company should I keep in mind?",
    type: "freeText",
    placeholder: "e.g. Head of Product at Powwow",
  },
  {
    id: "social",
    prompt: "Any social links you'd like me to reference?",
    type: "freeText",
    placeholder: "LinkedIn or X profile (optional)",
    optional: true,
    skipCopy: "Skip for now",
  },
  {
    id: "objective",
    prompt: "What's your primary objective for this conference?",
    type: "options",
    helper: "Choose one or add your own",
    options: [
      "Make high-value connections",
      "Discover emerging technology",
      "Raise visibility for my team",
      "Find partners or investors",
      "Stay on top of industry trends",
    ],
    allowCustom: true,
  },
  {
    id: "density",
    prompt: "How full should each day feel?",
    type: "options",
    options: ["Light with breathing room", "Balanced mix", "Packed and fast-paced"],
  },
  {
    id: "diversity",
    prompt: "How should we balance your topics?",
    type: "options",
    options: ["Focused on one theme", "Balanced variety", "Exploratory across many tracks"],
  },
  {
    id: "topics",
    prompt: "Which topics or themes excite you right now?",
    type: "multiSelect",
    helper: "Select a few and add your own",
    options: [
      "AI infrastructure",
      "Product strategy",
      "Go-to-market motions",
      "Fundraising",
      "Developer tooling",
      "Enterprise adoption",
      "Partnerships",
      "Customer stories",
    ],
  },
  {
    id: "extra",
    prompt: "Any must-meet people, companies, or sessions?",
    type: "freeText",
    placeholder: "Optional notes",
    optional: true,
    skipCopy: "Nothing specific",
  },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: `system-${STEP_CONFIG[0].id}`,
    role: "system",
    content: STEP_CONFIG[0].prompt,
  },
];

const formatList = (items: string[]) => items.join(", ");

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const floatToPCM16 = (buffer: Float32Array) => {
  const pcmBuffer = new ArrayBuffer(buffer.length * 2);
  const view = new DataView(pcmBuffer);

  for (let index = 0; index < buffer.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, buffer[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return pcmBuffer;
};

const buildSummary = (profile: ProfileAnswers) => {
  const conference = isNonEmptyString(profile.conference) ? profile.conference : "TBD";
  const name = isNonEmptyString(profile.name) ? profile.name : "Unknown attendee";
  const role = isNonEmptyString(profile.role) ? profile.role : "Role still open";
  const social = isNonEmptyString(profile.social) ? profile.social : "No social links shared";
  const objective = isNonEmptyString(profile.objective)
    ? profile.objective
    : "We will refine your goals together.";
  const density = isNonEmptyString(profile.density)
    ? profile.density
    : "We will pace each day together.";
  const diversity = isNonEmptyString(profile.diversity)
    ? profile.diversity
    : "We will balance your topics on the fly.";
  const topics =
    Array.isArray(profile.topics) && profile.topics.length > 0
      ? formatList(profile.topics)
      : "We will keep the agenda flexible.";
  const extra = isNonEmptyString(profile.extra) ? profile.extra : "";

  const lines = [
    "Perfect. That's everything I need.",
    "",
    `Conference: ${conference}`,
    `Name: ${name}`,
    `Role and company: ${role}`,
    `Social: ${social}`,
    `Primary objective: ${objective}`,
    `Schedule pace: ${density}`,
    `Topic approach: ${diversity}`,
    `Priority topics: ${topics}`,
  ];

  if (extra) {
    lines.push(`Extra notes: ${extra}`);
  }

  lines.push("", "Next I'll translate this into a personalized conference playbook for you.");

  return lines.join("\n");
};

const HookArrow = ({ className, style }: { className?: string; style?: CSSProperties }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    className={className}
    style={style}
  >
    <path
      d="M6 5h8v6H9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 11 6 8m3 3L6 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const OptionRow = ({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex w-full items-center gap-3 rounded-full px-3 py-2 text-left text-sm transition-colors ${
      selected ? "bg-neutral-200 text-neutral-900" : "text-neutral-600 hover:bg-neutral-100"
    }`}
  >
    <span className="flex h-8 w-8 items-center justify-center text-neutral-400 group-hover:text-neutral-600">
      <HookArrow className="h-4 w-4" />
    </span>
    <span className="flex-1 text-sm font-medium leading-snug">{label}</span>
  </button>
);

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [profile, setProfile] = useState<ProfileAnswers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [optionChoice, setOptionChoice] = useState("");
  const [customOption, setCustomOption] = useState("");
  const [multiSelections, setMultiSelections] = useState<string[]>([]);
  const [multiDraft, setMultiDraft] = useState("");
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionOutline[]>([]);
  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [prepResult, setPrepResult] = useState<SessionPrepResult | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [scheduleText, setScheduleText] = useState<string | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const attachmentRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<LiveV2Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const muteNodeRef = useRef<GainNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sessionsRequestedRef = useRef(false);

  const currentStep = stepIndex < STEP_CONFIG.length ? STEP_CONFIG[stepIndex] : undefined;
  const displayMessages = messages;
  const onboardingComplete = !currentStep;
  const selectedSession =
    selectedSessionId !== null
      ? sessions.find((session) => session.sessionId === selectedSessionId) ?? null
      : null;
  const normalizedSearch = sessionSearch.trim().toLowerCase();
  const filteredSessions = normalizedSearch
    ? sessions.filter((session) => {
        const haystack =
          `${session.sessionTitle} ${session.speaker} ${session.track}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : sessions;

  const loadSessions = useCallback(async (force = false) => {
    if (!force && sessionsRequestedRef.current) {
      return;
    }

    sessionsRequestedRef.current = true;
    setSessionsLoading(true);
    setSessionsError(null);

    try {
      const response = await fetch("/api/research/sessions");
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Request failed");
      }
      const payload = (await response.json()) as { sessions: SessionOutline[] };
      setSessions(payload.sessions ?? []);
    } catch (error) {
      console.error("Failed to load sessions", error);
      setSessionsError(error instanceof Error ? error.message : "Unable to load sessions");
      sessionsRequestedRef.current = false;
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    const liveSession = sessionRef.current;
    if (liveSession) {
      try {
        liveSession.stopRecording();
      } catch (error) {
        console.error("Error stopping transcription:", error);
      }
      try {
        liveSession.endSession();
      } catch (error) {
        console.error("Error ending transcription session:", error);
      }
      try {
        liveSession.removeAllListeners();
      } catch (error) {
        console.error("Error removing session listeners:", error);
      }
      sessionRef.current = null;
    }

    const processorNode = processorNodeRef.current;
    if (processorNode) {
      processorNode.onaudioprocess = null;
      processorNode.disconnect();
    }
    processorNodeRef.current = null;

    muteNodeRef.current?.disconnect();
    muteNodeRef.current = null;

    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;

    const activeContext = audioContextRef.current;
    if (activeContext) {
      activeContext.close().catch((error) => {
        console.error("Error closing audio context:", error);
      });
      audioContextRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    setIsRecording(false);
    setIsConnecting(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording || isConnecting) {
      return;
    }

    setIsConnecting(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Live transcription needs microphone access in this browser.");
        setIsConnecting(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const apiKey = process.env.NEXT_PUBLIC_GLADIA_API_KEY;
      if (!apiKey) {
        alert(
          "Gladia API key is required. Please add NEXT_PUBLIC_GLADIA_API_KEY to your .env.local file."
        );
        setIsConnecting(false);
        return;
      }

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const inputSource = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = inputSource;

      const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processorNode;

      const muteNode = audioContext.createGain();
      muteNode.gain.value = 0;
      muteNodeRef.current = muteNode;

      const gladia = new GladiaClient({ apiKey });
      const liveClient = gladia.liveV2();

      const session = liveClient.startSession({
        encoding: "wav/pcm",
        bit_depth: 16,
        sample_rate: Math.round(audioContext.sampleRate),
        channels: 1,
        model: "solaria-1",
        endpointing: 300,
        language_config: {
          languages: ["en"],
          code_switching: true,
        },
        messages_config: {
          receive_partial_transcripts: true,
          receive_final_transcripts: true,
        },
      });

      sessionRef.current = session;

      const handleMessage = (message: LiveV2WebSocketMessage) => {
        if (message.type === "transcript") {
          const utterance = message.data?.utterance?.text;
          if (message.data?.is_final && utterance) {
            setTextInput((prev) => prev + (prev ? " " : "") + utterance);
          }
        }
      };

      const handleError = (error: unknown) => {
        console.error("Transcription error:", error);
        stopRecording();
      };

      session.on("message", handleMessage);
      session.on("error", handleError);
      session.on("connected", () => {
        setIsConnecting(false);
        setIsRecording(true);
      });
      session.once("ended", () => {
        setIsConnecting(false);
        setIsRecording(false);
      });

      processorNode.onaudioprocess = (event) => {
        const channelData = event.inputBuffer.getChannelData(0);
        if (!sessionRef.current) {
          return;
        }
        const pcmChunk = floatToPCM16(channelData);
        if (pcmChunk.byteLength === 0) {
          return;
        }
        sessionRef.current.sendAudio(pcmChunk);
      };

      inputSource.connect(processorNode);
      processorNode.connect(muteNode);
      muteNode.connect(audioContext.destination);
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsConnecting(false);
      alert(
        "Could not access microphone. Please check permissions and ensure you have a valid Gladia API key."
      );
      stopRecording();
    }
  }, [isConnecting, isRecording, stopRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording || isConnecting) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isConnecting, isRecording, startRecording, stopRecording]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setTextInput("");
    setOptionChoice("");
    setCustomOption("");
    setMultiSelections([]);
    setMultiDraft("");
    setIsAttachmentOpen(false);
    stopRecording();
  }, [stepIndex, stopRecording]);

  useEffect(() => {
    if (!onboardingComplete) {
      return;
    }
    loadSessions();
  }, [onboardingComplete, loadSessions]);

  useEffect(() => {
    if (sessions.length > 0 && selectedSessionId === null) {
      setSelectedSessionId(sessions[0].sessionId);
    }
  }, [sessions, selectedSessionId]);

  const buildScheduleProfile = (answers: ProfileAnswers) => {
    const parts: string[] = [];
    if (isNonEmptyString(answers.name)) {
      parts.push(`Name: ${answers.name}`);
    }
    if (isNonEmptyString(answers.role)) {
      parts.push(`Role: ${answers.role}`);
    }
    if (isNonEmptyString(answers.conference)) {
      parts.push(`Conference: ${answers.conference}`);
    }
    if (isNonEmptyString(answers.objective)) {
      parts.push(`Objective: ${answers.objective}`);
    }
    if (isNonEmptyString(answers.density)) {
      parts.push(`Schedule density: ${answers.density}`);
    }
    if (isNonEmptyString(answers.diversity)) {
      parts.push(`Topic diversity: ${answers.diversity}`);
    }
    if (Array.isArray(answers.topics) && answers.topics.length > 0) {
      parts.push(`Topics: ${answers.topics.join(", ")}`);
    }
    if (isNonEmptyString(answers.extra)) {
      parts.push(`Extras: ${answers.extra}`);
    }
    return parts.join("\n");
  };

  const generateSchedule = useCallback(async () => {
    setScheduleLoading(true);
    setScheduleError(null);
    setScheduleText(null);

    try {
      const profileText = buildScheduleProfile(profile);
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conferenceId: "conf_1758322878655_toq4rxx5w",
          userProfile: profileText,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Schedule request failed");
      }

      const payload = await response.json();
      const text: string | undefined = payload.schedule ?? payload.result ?? payload.text;
      if (!text) {
        throw new Error("Schedule response empty");
      }
      setScheduleText(text);
    } catch (error) {
      console.error("Failed to generate schedule", error);
      setScheduleError(error instanceof Error ? error.message : "Unable to generate schedule");
    } finally {
      setScheduleLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!onboardingComplete) {
      return;
    }
    generateSchedule();
  }, [onboardingComplete, generateSchedule]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!attachmentRef.current) {
        return;
      }
      if (attachmentRef.current.contains(event.target as Node)) {
        return;
      }
      setIsAttachmentOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(
    () => () => {
      stopRecording();
    },
    [stopRecording]
  );

  const advanceConversation = (
    value: string | string[] | null,
    displayText?: string,
    skip?: boolean
  ) => {
    if (!currentStep) {
      return;
    }

    const normalizedValue = Array.isArray(value)
      ? value.map((item) => item.trim()).filter(Boolean)
      : typeof value === "string"
      ? value.trim()
      : null;

    const userDisplay =
      displayText ??
      (Array.isArray(normalizedValue) ? formatList(normalizedValue) : normalizedValue ?? "");

    if (!skip) {
      const isEmptyArray = Array.isArray(normalizedValue) && normalizedValue.length === 0;
      const isEmptyString = typeof normalizedValue === "string" && normalizedValue.length === 0;
      const isNull = normalizedValue === null;
      if (isEmptyArray || isEmptyString || isNull) {
        return;
      }
    }

    if (skip && (!userDisplay || userDisplay.trim().length === 0)) {
      return;
    }

    const nextProfile = skip
      ? profile
      : (() => {
          if (normalizedValue === null) {
            return profile;
          }
          return {
            ...profile,
            [currentStep.id]: normalizedValue,
          };
        })();

    setProfile(nextProfile);
    setMessages((prev) => {
      const nextMessages: Message[] = [
        ...prev,
        {
          id: `user-${currentStep.id}-${Date.now()}`,
          role: "user",
          content: userDisplay,
        },
      ];

      const upcomingStep = STEP_CONFIG[stepIndex + 1];
      if (upcomingStep) {
        nextMessages.push({
          id: `system-${upcomingStep.id}-${Date.now()}`,
          role: "system",
          content: upcomingStep.prompt,
        });
      } else {
        nextMessages.push({
          id: "system-summary",
          role: "system",
          content: buildSummary(nextProfile),
        });
      }

      return nextMessages;
    });

    setStepIndex((prev) => prev + 1);
  };

  const handleTextSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAttachmentOpen(false);
    if (!textInput.trim()) {
      return;
    }
    advanceConversation(textInput.trim());
  };

  const handleOptionsContinue = () => {
    const customAnswer = customOption.trim();
    setIsAttachmentOpen(false);
    const answer = optionChoice || customAnswer;
    if (!answer) {
      return;
    }
    advanceConversation(answer);
  };

  const toggleSelection = (value: string) => {
    setOptionChoice((prev) => (prev === value ? "" : value));
  };

  const toggleMultiSelection = (value: string) => {
    setMultiSelections((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  const handleSelectSession = (session: SessionOutline) => {
    setSelectedSessionId(session.sessionId);
    setPrepResult(null);
    setPrepError(null);
  };

  const handleSessionPrep = async () => {
    if (!selectedSession) {
      return;
    }

    setPrepLoading(true);
    setPrepError(null);

    try {
      const response = await fetch("/api/research/session-prep", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: selectedSession.sessionId,
          forceRefresh,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Request failed");
      }

      const payload = (await response.json()) as { result: SessionPrepResult };
      setPrepResult(payload.result);
      setMessages((prev) => [
        ...prev,
        {
          id: `system-session-prep-${Date.now()}`,
          role: "system",
          content: `Here's your prep for "${selectedSession.sessionTitle}" — see the details on the right`,
        },
      ]);
    } catch (error) {
      console.error("Failed to prepare session", error);
      setPrepError(error instanceof Error ? error.message : "Unable to generate session prep");
    } finally {
      setPrepLoading(false);
    }
  };

  const handleAddTopic = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = multiDraft.trim();
    if (!value) {
      return;
    }
    setMultiSelections((prev) => {
      if (prev.some((item) => item.toLowerCase() === value.toLowerCase())) {
        return prev;
      }
      return [...prev, value];
    });
    setMultiDraft("");
  };

  const handleTopicKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const value = multiDraft.trim();
      if (!value) {
        return;
      }
      setMultiSelections((prev) => {
        if (prev.some((item) => item.toLowerCase() === value.toLowerCase())) {
          return prev;
        }
        return [...prev, value];
      });
      setMultiDraft("");
    }
  };

  const handleMultiSubmit = () => {
    if (multiSelections.length === 0) {
      return;
    }
    setIsAttachmentOpen(false);
    advanceConversation(multiSelections);
  };

  const handleSkip = () => {
    if (!currentStep?.optional) {
      return;
    }
    const skipCopy = currentStep.skipCopy ?? "Skip for now";
    advanceConversation(null, skipCopy, true);
  };

  const renderOptions = (options?: string[], selectedValue?: string) => (
    <div className="flex flex-col gap-2">
      {options?.map((option) => (
        <OptionRow
          key={option}
          label={option}
          selected={selectedValue === option}
          onClick={() => toggleSelection(option)}
        />
      ))}
    </div>
  );

  const renderMultiOptions = (options?: string[]) => (
    <div className="flex flex-col gap-2">
      {options?.map((option) => (
        <OptionRow
          key={option}
          label={option}
          selected={multiSelections.includes(option)}
          onClick={() => toggleMultiSelection(option)}
        />
      ))}
    </div>
  );

  const renderInput = () => {
    if (!currentStep) {
      return (
        <div className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm text-neutral-600 shadow-sm">
          Hang tight. Your personalized Powwow schedule is on the way.
        </div>
      );
    }

    if (currentStep.type === "freeText") {
      const attachmentOptions = [
        {
          value: "take-photo",
          label: "Take photo",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="none"
              className="h-5 w-5"
            >
              <path
                d="M6.5 5H8l1-1.5h2L12 5h1.5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          ),
        },
        {
          value: "transcribe",
          label: "Transcribe",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="none"
              className="h-5 w-5"
            >
              <path
                d="M10 3.5a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 1 1-5 0v-4A2.5 2.5 0 0 1 10 3.5Z"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M6.75 9.5v.75a3.25 3.25 0 0 0 6.5 0V9.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path
                d="M10 15.5v1.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          ),
        },
        {
          value: "upload",
          label: "Upload files",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="none"
              className="h-5 w-5"
            >
              <path d="M10 4v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path
                d="M7.5 6.5 10 4l2.5 2.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4.5 12.5v2a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-2"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          ),
        },
      ];

      return (
        <div className="relative">
          <form
            onSubmit={handleTextSubmit}
            className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-5 py-3 shadow-sm"
          >
            <input
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              placeholder={currentStep.placeholder ?? "Ask Powwow"}
              className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              aria-label={currentStep.prompt}
            />
            <div className="flex items-center gap-2">
              <div className="group relative flex items-center">
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={isConnecting}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                    isRecording
                      ? "border-red-400 bg-red-50 text-red-600 hover:bg-red-100"
                      : isConnecting
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isConnecting ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-4 w-4"
                    >
                      <path
                        d="M10 3.5a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 1 1-5 0v-4A2.5 2.5 0 0 1 10 3.5Z"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        fill={isRecording ? "currentColor" : "none"}
                      />
                      <path
                        d="M6.75 9.5v.75a3.25 3.25 0 0 0 6.5 0V9.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M10 15.5v1.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
                <span className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white group-hover:flex">
                  {isRecording ? "Recording" : isConnecting ? "Connecting" : "Record"}
                </span>
              </div>

              <div ref={attachmentRef} className="group relative flex items-center">
                <button
                  type="button"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsAttachmentOpen((prev) => !prev);
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                    isAttachmentOpen
                      ? "border-neutral-400 text-neutral-700"
                      : "border-neutral-200 text-neutral-500"
                  } transition-colors hover:border-neutral-300`}
                  aria-label="Attach"
                >
                  +
                </button>
                <span className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white group-hover:flex">
                  Attach
                </span>
                {isAttachmentOpen ? (
                  <div
                    onMouseDown={(event) => event.stopPropagation()}
                    className="absolute bottom-12 left-1/2 z-20 w-48 -translate-x-1/2 rounded-2xl border border-neutral-300 bg-white p-2 shadow-xl"
                  >
                    <div className="flex flex-col gap-1">
                      {attachmentOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setIsAttachmentOpen(false);
                          }}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-900 hover:text-white"
                        >
                          <span className="flex h-6 w-6 items-center justify-center">
                            {option.icon}
                          </span>
                          <span className="truncate text-left">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="group relative flex items-center">
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-800"
                aria-label="Send"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M4 10h9m0 0-3.5-3.5M13 10l-3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white group-hover:flex">
                Send
              </span>
            </div>
          </form>
        </div>
      );
    }

    if (currentStep.type === "options") {
      const hasAnswer = Boolean(optionChoice || customOption.trim());
      return (
        <div className="space-y-5">
          {currentStep.helper ? (
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
              {currentStep.helper}
            </p>
          ) : null}
          {renderOptions(currentStep.options, optionChoice)}
          {currentStep.allowCustom ? (
            <div className="rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm">
              <input
                value={customOption}
                onChange={(event) => setCustomOption(event.target.value)}
                placeholder="Or type your own"
                className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                aria-label="Custom answer"
              />
            </div>
          ) : null}
          <div className="flex items-center gap-4">
            {currentStep.optional ? (
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700"
              >
                {currentStep.skipCopy ?? "Skip"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleOptionsContinue}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                hasAnswer
                  ? "bg-neutral-900 text-white hover:bg-neutral-800"
                  : "bg-neutral-200 text-neutral-500"
              }`}
              disabled={!hasAnswer}
            >
              Continue
            </button>
          </div>
        </div>
      );
    }

    const hasTopics = multiSelections.length > 0;
    return (
      <div className="space-y-5">
        {currentStep.helper ? (
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
            {currentStep.helper}
          </p>
        ) : null}
        {renderMultiOptions(currentStep.options)}
        <form
          onSubmit={handleAddTopic}
          className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm"
        >
          <input
            value={multiDraft}
            onChange={(event) => setMultiDraft(event.target.value)}
            onKeyDown={handleTopicKeyDown}
            placeholder="Add another topic and press enter"
            className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            aria-label="Add topic"
          />
          <button
            type="submit"
            className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white transition-colors hover:bg-neutral-800"
          >
            Add
          </button>
        </form>
        {hasTopics ? (
          <div className="flex flex-col gap-2">
            {multiSelections.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => toggleMultiSelection(topic)}
                className="group flex w-full items-center gap-3 rounded-full bg-neutral-100 px-4 py-2 text-left text-sm text-neutral-700"
              >
                <span className="flex h-8 w-8 items-center justify-center text-neutral-400 group-hover:text-neutral-600">
                  <HookArrow className="h-4 w-4" style={{ transform: "rotate(90deg)" }} />
                </span>
                <span className="flex-1 leading-snug">{topic}</span>
                <span className="text-xs font-medium text-neutral-500">Remove</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-4">
          {currentStep.optional ? (
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700"
            >
              {currentStep.skipCopy ?? "Skip"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleMultiSubmit}
            className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
              hasTopics
                ? "bg-neutral-900 text-white hover:bg-neutral-800"
                : "bg-neutral-200 text-neutral-500"
            }`}
            disabled={!hasTopics}
          >
            Save topics
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-200 text-neutral-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-20 flex-col justify-between border-r border-neutral-300 bg-white px-4 py-6 lg:flex">
          <div className="space-y-4">
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Expand sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M4 5h12M4 10h12M4 15h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Home"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M4 9.5 10 4l6 5.5V16a1 1 0 0 1-1 1h-4v-4H9v4H5a1 1 0 0 1-1-1V9.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="New conference"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="none"
                className="h-6 w-6"
              >
                <path
                  d="M10 4v12M4 10h12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-sm text-neutral-500">
            0
          </div>
        </aside>

        <section className="flex w-full flex-col border-r border-neutral-300 bg-white px-6 py-10 sm:px-12 lg:max-w-2xl">
          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between pb-6">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900"
                aria-label="Current conversation"
              >
                <span>New Conference</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M6 8l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="hidden text-sm text-neutral-400 sm:block">
                Step {Math.min(stepIndex + 1, STEP_CONFIG.length)} of {STEP_CONFIG.length}
              </div>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto pr-2">
              {displayMessages.map((message) => {
                const isSystem = message.role === "system";
                return (
                  <div key={message.id} className="text-left">
                    {isSystem ? (
                      <p className="max-w-xl text-base leading-relaxed text-neutral-700">
                        {message.content}
                      </p>
                    ) : (
                      <div className="inline-flex max-w-xl rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-800">
                        <span className="leading-relaxed">{message.content}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="mt-6">{renderInput()}</div>
          </div>
        </section>

        <div className="hidden flex-1 bg-neutral-100 lg:flex">
          <div className="flex h-full w-full flex-col gap-6 overflow-y-auto px-8 py-10">
            {onboardingComplete ? (
              <div className="flex flex-1 flex-col gap-6">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">Session research prep</h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Choose a session to generate a five-minute briefing before you head in.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900">
                        Personalized schedule
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Generated from your onboarding preferences.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={generateSchedule}
                      disabled={scheduleLoading}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        scheduleLoading
                          ? "bg-neutral-200 text-neutral-500"
                          : "border border-neutral-300 text-neutral-600 hover:border-neutral-400 hover:text-neutral-800"
                      }`}
                    >
                      {scheduleLoading ? "Generating…" : "Regenerate"}
                    </button>
                  </div>
                  <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                    {scheduleLoading ? (
                      <p>Building your schedule…</p>
                    ) : scheduleError ? (
                      <p className="text-red-600">{scheduleError}</p>
                    ) : scheduleText ? (
                      <pre className="whitespace-pre-wrap text-sm text-neutral-800">
                        {scheduleText}
                      </pre>
                    ) : (
                      <p className="text-neutral-500">
                        Your schedule will appear here once generated.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900">
                        Conference sessions
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Pulled from the latest conference rundown.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sessionsRequestedRef.current = false;
                        loadSessions(true);
                      }}
                      className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-800"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="mt-4">
                    <input
                      value={sessionSearch}
                      onChange={(event) => setSessionSearch(event.target.value)}
                      placeholder="Search by title, speaker, or track"
                      className="w-full rounded-full border border-neutral-200 px-4 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                    />
                  </div>

                  <div className="mt-4 max-h-72 overflow-y-auto rounded-2xl border border-neutral-200">
                    {sessionsLoading ? (
                      <div className="p-4 text-sm text-neutral-500">Loading sessions…</div>
                    ) : sessionsError ? (
                      <div className="space-y-3 p-4 text-sm">
                        <p className="text-neutral-600">{sessionsError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            sessionsRequestedRef.current = false;
                            loadSessions(true);
                          }}
                          className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800"
                        >
                          Try again
                        </button>
                      </div>
                    ) : filteredSessions.length === 0 ? (
                      <div className="p-4 text-sm text-neutral-500">
                        No sessions match your search yet.
                      </div>
                    ) : (
                      <ul className="divide-y divide-neutral-200">
                        {filteredSessions.map((session, index) => {
                          const isSelected = selectedSessionId === session.sessionId;
                          return (
                            <li key={`${session.sessionId}-${index}`}>
                              <button
                                type="button"
                                onClick={() => handleSelectSession(session)}
                                className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                                  isSelected ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                                  <span>{session.sessionTitle}</span>
                                  {session.time ? (
                                    <span
                                      className={`${
                                        isSelected ? "text-neutral-200" : "text-neutral-500"
                                      } text-xs uppercase tracking-wide`}
                                    >
                                      {session.time}
                                    </span>
                                  ) : null}
                                </div>
                                <div
                                  className={`text-xs ${
                                    isSelected ? "text-neutral-200" : "text-neutral-600"
                                  }`}
                                >
                                  {session.speaker}
                                  {session.speakerTitle ? ` · ${session.speakerTitle}` : ""}
                                  {session.company ? ` — ${session.company}` : ""}
                                </div>
                                <div
                                  className={`text-xs ${
                                    isSelected ? "text-neutral-300" : "text-neutral-500"
                                  }`}
                                >
                                  {session.track}
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {selectedSession ? (
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-neutral-900">
                            {selectedSession.sessionTitle}
                          </h3>
                          <p className="mt-1 text-sm text-neutral-600">
                            {selectedSession.speaker}
                            {selectedSession.speakerTitle
                              ? ` · ${selectedSession.speakerTitle}`
                              : ""}
                            {selectedSession.company ? ` — ${selectedSession.company}` : ""}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">
                            {selectedSession.time ?? "Time TBD"} ·{" "}
                            {selectedSession.room ?? "Room TBD"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSessionPrep}
                          disabled={prepLoading}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                            prepLoading
                              ? "bg-neutral-300 text-neutral-600"
                              : "bg-neutral-900 text-white hover:bg-neutral-800"
                          }`}
                        >
                          {prepLoading ? "Preparing…" : "Generate prep"}
                        </button>
                      </div>

                      <p className="mt-4 text-sm text-neutral-600">{selectedSession.description}</p>

                      <label className="mt-4 flex items-center gap-2 text-xs text-neutral-600">
                        <input
                          type="checkbox"
                          checked={forceRefresh}
                          onChange={(event) => setForceRefresh(event.target.checked)}
                          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                        />
                        Force fresh research
                      </label>

                      {prepError ? (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                          {prepError}
                        </div>
                      ) : null}
                    </div>

                    {prepResult ? (
                      <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold text-neutral-900">
                              Prep briefing
                            </h3>
                            <p className="text-xs text-neutral-500">
                              Generated {new Date(prepResult.generatedAt).toLocaleString()} ·{" "}
                              {prepResult.research.cacheInfo}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4 text-sm text-neutral-700">
                          <div>
                            <h4 className="text-sm font-semibold text-neutral-900">
                              Session summary
                            </h4>
                            <p className="mt-1 font-medium text-neutral-800">
                              {prepResult.brief.session_summary.headline}
                            </p>
                            <p className="mt-1">
                              {prepResult.brief.session_summary.why_it_matters}
                            </p>
                            <p className="mt-1 text-neutral-600">
                              Fit: {prepResult.brief.session_summary.attendee_fit}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold text-neutral-900">
                              Key takeaways
                            </h4>
                            <ul className="mt-1 list-disc space-y-1 pl-4">
                              {prepResult.brief.key_takeaways.map((item, index) => (
                                <li key={`takeaway-${index}`}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold text-neutral-900">
                              Company focus
                            </h4>
                            <ul className="mt-1 space-y-1 text-neutral-700">
                              <li>{prepResult.brief.company_brief.positioning}</li>
                              <li>{prepResult.brief.company_brief.recent_moves}</li>
                              <li>{prepResult.brief.company_brief.competitive_angle}</li>
                            </ul>
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold text-neutral-900">
                              Speaker intel
                            </h4>
                            <ul className="mt-1 space-y-1 text-neutral-700">
                              <li>{prepResult.brief.speaker_brief.bio}</li>
                              <li>{prepResult.brief.speaker_brief.conference_goal}</li>
                              <li>{prepResult.brief.speaker_brief.conversation_starter}</li>
                            </ul>
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold text-neutral-900">
                              Smart questions
                            </h4>
                            <ul className="mt-1 list-disc space-y-1 pl-4">
                              {prepResult.brief.smart_questions.map((item, index) => (
                                <li key={`question-${index}`}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold text-neutral-900">Sources</h4>
                            <ul className="mt-1 space-y-2">
                              {prepResult.brief.sources.map((source, index) => (
                                <li key={`source-${index}`}>
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
                                  >
                                    {source.title}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-5 text-sm text-neutral-600 shadow-sm">
                    Select a session from the list to build your prep briefing.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 text-center text-sm text-neutral-500">
                Complete the onboarding conversation to unlock session prep tools.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
