// "use client";

// import {
//   CSSProperties,
//   FormEvent,
//   KeyboardEvent,
//   useCallback,
//   useEffect,
//   useRef,
//   useState,
// } from "react";
// import {
//   GladiaClient,
//   type LiveV2Session,
//   type LiveV2WebSocketMessage,
// } from "@gladiaio/sdk";

// type MessageRole = "system" | "user";

// type StepId =
//   | "conference"
//   | "name"
//   | "role"
//   | "social"
//   | "objective"
//   | "density"
//   | "diversity"
//   | "topics"
//   | "extra";

// type StepType = "freeText" | "options" | "multiSelect";

// interface StepConfig {
//   id: StepId;
//   prompt: string;
//   type: StepType;
//   placeholder?: string;
//   helper?: string;
//   options?: string[];
//   optional?: boolean;
//   allowCustom?: boolean;
//   skipCopy?: string;
// }

// interface Message {
//   id: string;
//   role: MessageRole;
//   content: string;
// }

// type ProfileAnswers = Partial<Record<StepId, string | string[]>>;

// const STEP_CONFIG: StepConfig[] = [
//   {
//     id: "conference",
//     prompt: "To get started, tell me which conference you're going to next.",
//     type: "freeText",
//     placeholder: "e.g. TechCrunch Disrupt 2025",
//   },
//   {
//     id: "name",
//     prompt: "Great. What's your name?",
//     type: "freeText",
//     placeholder: "Your name",
//   },
//   {
//     id: "role",
//     prompt: "What role and company should I keep in mind?",
//     type: "freeText",
//     placeholder: "e.g. Head of Product at Powwow",
//   },
//   {
//     id: "social",
//     prompt: "Any social links you'd like me to reference?",
//     type: "freeText",
//     placeholder: "LinkedIn or X profile (optional)",
//     optional: true,
//     skipCopy: "Skip for now",
//   },
//   {
//     id: "objective",
//     prompt: "What's your primary objective for this conference?",
//     type: "options",
//     helper: "Choose one or add your own",
//     options: [
//       "Make high-value connections",
//       "Discover emerging technology",
//       "Raise visibility for my team",
//       "Find partners or investors",
//       "Stay on top of industry trends",
//     ],
//     allowCustom: true,
//   },
//   {
//     id: "density",
//     prompt: "How full should each day feel?",
//     type: "options",
//     options: [
//       "Light with breathing room",
//       "Balanced mix",
//       "Packed and fast-paced",
//     ],
//   },
//   {
//     id: "diversity",
//     prompt: "How should we balance your topics?",
//     type: "options",
//     options: [
//       "Focused on one theme",
//       "Balanced variety",
//       "Exploratory across many tracks",
//     ],
//   },
//   {
//     id: "topics",
//     prompt: "Which topics or themes excite you right now?",
//     type: "multiSelect",
//     helper: "Select a few and add your own",
//     options: [
//       "AI infrastructure",
//       "Product strategy",
//       "Go-to-market motions",
//       "Fundraising",
//       "Developer tooling",
//       "Enterprise adoption",
//       "Partnerships",
//       "Customer stories",
//     ],
//   },
//   {
//     id: "extra",
//     prompt: "Any must-meet people, companies, or sessions?",
//     type: "freeText",
//     placeholder: "Optional notes",
//     optional: true,
//     skipCopy: "Nothing specific",
//   },
// ];

// const INITIAL_MESSAGES: Message[] = [
//   {
//     id: `system-${STEP_CONFIG[0].id}`,
//     role: "system",
//     content: STEP_CONFIG[0].prompt,
//   },
// ];

// const formatList = (items: string[]) => items.join(", ");

// const isNonEmptyString = (value: unknown): value is string =>
//   typeof value === "string" && value.trim().length > 0;

// const floatToPCM16 = (buffer: Float32Array) => {
//   const pcmBuffer = new ArrayBuffer(buffer.length * 2);
//   const view = new DataView(pcmBuffer);

//   for (let index = 0; index < buffer.length; index += 1) {
//     const sample = Math.max(-1, Math.min(1, buffer[index]));
//     view.setInt16(
//       index * 2,
//       sample < 0 ? sample * 0x8000 : sample * 0x7fff,
//       true,
//     );
//   }

//   return pcmBuffer;
// };

// const buildSummary = (profile: ProfileAnswers) => {
//   const conference = isNonEmptyString(profile.conference)
//     ? profile.conference
//     : "TBD";
//   const name = isNonEmptyString(profile.name)
//     ? profile.name
//     : "Unknown attendee";
//   const role = isNonEmptyString(profile.role)
//     ? profile.role
//     : "Role still open";
//   const social = isNonEmptyString(profile.social)
//     ? profile.social
//     : "No social links shared";
//   const objective = isNonEmptyString(profile.objective)
//     ? profile.objective
//     : "We will refine your goals together.";
//   const density = isNonEmptyString(profile.density)
//     ? profile.density
//     : "We will pace each day together.";
//   const diversity = isNonEmptyString(profile.diversity)
//     ? profile.diversity
//     : "We will balance your topics on the fly.";
//   const topics =
//     Array.isArray(profile.topics) && profile.topics.length > 0
//       ? formatList(profile.topics)
//       : "We will keep the agenda flexible.";
//   const extra = isNonEmptyString(profile.extra) ? profile.extra : "";

//   const lines = [
//     "Perfect. That's everything I need.",
//     "",
//     `Conference: ${conference}`,
//     `Name: ${name}`,
//     `Role and company: ${role}`,
//     `Social: ${social}`,
//     `Primary objective: ${objective}`,
//     `Schedule pace: ${density}`,
//     `Topic approach: ${diversity}`,
//     `Priority topics: ${topics}`,
//   ];

//   if (extra) {
//     lines.push(`Extra notes: ${extra}`);
//   }

//   lines.push(
//     "",
//     "Next I'll translate this into a personalized conference playbook for you.",
//   );

//   return lines.join("\n");
// };

// const HookArrow = ({
//   className,
//   style,
// }: {
//   className?: string;
//   style?: CSSProperties;
// }) => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     viewBox="0 0 20 20"
//     fill="none"
//     className={className}
//     style={style}
//   >
//     <path
//       d="M6 5h8v6H9"
//       stroke="currentColor"
//       strokeWidth="1.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     />
//     <path
//       d="M9 11 6 8m3 3L6 14"
//       stroke="currentColor"
//       strokeWidth="1.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     />
//   </svg>
// );

// const OptionRow = ({
//   label,
//   selected,
//   onClick,
// }: {
//   label: string;
//   selected: boolean;
//   onClick: () => void;
// }) => (
//   <button
//     type="button"
//     onClick={onClick}
//     className={`group flex w-full items-center gap-3 rounded-full px-3 py-2 text-left text-sm transition-colors ${
//       selected
//         ? "bg-neutral-200 text-neutral-900"
//         : "text-neutral-600 hover:bg-neutral-100"
//     }`}
//   >
//     <span className="flex h-8 w-8 items-center justify-center text-neutral-400 group-hover:text-neutral-600">
//       <HookArrow className="h-4 w-4" />
//     </span>
//     <span className="flex-1 text-sm font-medium leading-snug">{label}</span>
//   </button>
// );

// export default function Home() {
//   const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
//   const [profile, setProfile] = useState<ProfileAnswers>({});
//   const [stepIndex, setStepIndex] = useState(0);
//   const [textInput, setTextInput] = useState("");
//   const [optionChoice, setOptionChoice] = useState("");
//   const [customOption, setCustomOption] = useState("");
//   const [multiSelections, setMultiSelections] = useState<string[]>([]);
//   const [multiDraft, setMultiDraft] = useState("");
//   const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [isConnecting, setIsConnecting] = useState(false);

//   const attachmentRef = useRef<HTMLDivElement | null>(null);
//   const sessionRef = useRef<LiveV2Session | null>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const audioContextRef = useRef<AudioContext | null>(null);
//   const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
//   const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
//   const muteNodeRef = useRef<GainNode | null>(null);
//   const messagesEndRef = useRef<HTMLDivElement | null>(null);

//   const currentStep =
//     stepIndex < STEP_CONFIG.length ? STEP_CONFIG[stepIndex] : undefined;
//   const displayMessages = messages;

//   const stopRecording = useCallback(() => {
//     const liveSession = sessionRef.current;
//     if (liveSession) {
//       try {
//         liveSession.stopRecording();
//       } catch (error) {
//         console.error("Error stopping transcription:", error);
//       }
//       try {
//         liveSession.endSession();
//       } catch (error) {
//         console.error("Error ending transcription session:", error);
//       }
//       try {
//         liveSession.removeAllListeners();
//       } catch (error) {
//         console.error("Error removing session listeners:", error);
//       }
//       sessionRef.current = null;
//     }

//     const processorNode = processorNodeRef.current;
//     if (processorNode) {
//       processorNode.onaudioprocess = null;
//       processorNode.disconnect();
//     }
//     processorNodeRef.current = null;

//     muteNodeRef.current?.disconnect();
//     muteNodeRef.current = null;

//     sourceNodeRef.current?.disconnect();
//     sourceNodeRef.current = null;

//     const activeContext = audioContextRef.current;
//     if (activeContext) {
//       activeContext.close().catch((error) => {
//         console.error("Error closing audio context:", error);
//       });
//       audioContextRef.current = null;
//     }

//     streamRef.current?.getTracks().forEach((track) => track.stop());
//     streamRef.current = null;

//     setIsRecording(false);
//     setIsConnecting(false);
//   }, []);

//   const startRecording = useCallback(async () => {
//     if (isRecording || isConnecting) {
//       return;
//     }

//     setIsConnecting(true);

//     try {
//       if (!navigator.mediaDevices?.getUserMedia) {
//         alert("Live transcription needs microphone access in this browser.");
//         setIsConnecting(false);
//         return;
//       }

//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       streamRef.current = stream;

//       const apiKey = process.env.NEXT_PUBLIC_GLADIA_API_KEY;
//       if (!apiKey) {
//         alert(
//           "Gladia API key is required. Please add NEXT_PUBLIC_GLADIA_API_KEY to your .env.local file.",
//         );
//         setIsConnecting(false);
//         return;
//       }

//       const audioContext = new AudioContext();
//       audioContextRef.current = audioContext;
//       await audioContext.resume();

//       const inputSource = audioContext.createMediaStreamSource(stream);
//       sourceNodeRef.current = inputSource;

//       const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
//       processorNodeRef.current = processorNode;

//       const muteNode = audioContext.createGain();
//       muteNode.gain.value = 0;
//       muteNodeRef.current = muteNode;

//       const gladia = new GladiaClient({ apiKey });
//       const liveClient = gladia.liveV2();

//       const session = liveClient.startSession({
//         encoding: "wav/pcm",
//         bit_depth: 16,
//         sample_rate: Math.round(audioContext.sampleRate),
//         channels: 1,
//         model: "solaria-1",
//         endpointing: 300,
//         language_config: {
//           languages: ["en"],
//           code_switching: true,
//         },
//         messages_config: {
//           receive_partial_transcripts: true,
//           receive_final_transcripts: true,
//         },
//       });

//       sessionRef.current = session;

//       const handleMessage = (message: LiveV2WebSocketMessage) => {
//         if (message.type === "transcript") {
//           const utterance = message.data?.utterance?.text;
//           if (message.data?.is_final && utterance) {
//             setTextInput((prev) => prev + (prev ? " " : "") + utterance);
//           }
//         }
//       };

//       const handleError = (error: unknown) => {
//         console.error("Transcription error:", error);
//         stopRecording();
//       };

//       session.on("message", handleMessage);
//       session.on("error", handleError);
//       session.on("connected", () => {
//         setIsConnecting(false);
//         setIsRecording(true);
//       });
//       session.once("ended", () => {
//         setIsConnecting(false);
//         setIsRecording(false);
//       });

//       processorNode.onaudioprocess = (event) => {
//         const channelData = event.inputBuffer.getChannelData(0);
//         if (!sessionRef.current) {
//           return;
//         }
//         const pcmChunk = floatToPCM16(channelData);
//         if (pcmChunk.byteLength === 0) {
//           return;
//         }
//         sessionRef.current.sendAudio(pcmChunk);
//       };

//       inputSource.connect(processorNode);
//       processorNode.connect(muteNode);
//       muteNode.connect(audioContext.destination);
//     } catch (error) {
//       console.error("Error starting recording:", error);
//       setIsConnecting(false);
//       alert(
//         "Could not access microphone. Please check permissions and ensure you have a valid Gladia API key.",
//       );
//       stopRecording();
//     }
//   }, [isConnecting, isRecording, stopRecording]);

//   const toggleRecording = useCallback(() => {
//     if (isRecording || isConnecting) {
//       stopRecording();
//     } else {
//       startRecording();
//     }
//   }, [isConnecting, isRecording, startRecording, stopRecording]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   useEffect(() => {
//     setTextInput("");
//     setOptionChoice("");
//     setCustomOption("");
//     setMultiSelections([]);
//     setMultiDraft("");
//     setIsAttachmentOpen(false);
//     stopRecording();
//   }, [stepIndex, stopRecording]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (!attachmentRef.current) {
//         return;
//       }
//       if (attachmentRef.current.contains(event.target as Node)) {
//         return;
//       }
//       setIsAttachmentOpen(false);
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, []);

//   useEffect(
//     () => () => {
//       stopRecording();
//     },
//     [stopRecording],
//   );

//   const advanceConversation = (
//     value: string | string[] | null,
//     displayText?: string,
//     skip?: boolean,
//   ) => {
//     if (!currentStep) {
//       return;
//     }

//     const normalizedValue = Array.isArray(value)
//       ? value.map((item) => item.trim()).filter(Boolean)
//       : typeof value === "string"
//         ? value.trim()
//         : null;

//     const userDisplay =
//       displayText ??
//       (Array.isArray(normalizedValue)
//         ? formatList(normalizedValue)
//         : (normalizedValue ?? ""));

//     if (!skip) {
//       const isEmptyArray =
//         Array.isArray(normalizedValue) && normalizedValue.length === 0;
//       const isEmptyString =
//         typeof normalizedValue === "string" && normalizedValue.length === 0;
//       const isNull = normalizedValue === null;
//       if (isEmptyArray || isEmptyString || isNull) {
//         return;
//       }
//     }

//     if (skip && (!userDisplay || userDisplay.trim().length === 0)) {
//       return;
//     }

//     const nextProfile = skip
//       ? profile
//       : (() => {
//           if (normalizedValue === null) {
//             return profile;
//           }
//           return {
//             ...profile,
//             [currentStep.id]: normalizedValue,
//           };
//         })();

//     setProfile(nextProfile);
//     setMessages((prev) => {
//       const nextMessages: Message[] = [
//         ...prev,
//         {
//           id: `user-${currentStep.id}-${Date.now()}`,
//           role: "user",
//           content: userDisplay,
//         },
//       ];

//       const upcomingStep = STEP_CONFIG[stepIndex + 1];
//       if (upcomingStep) {
//         nextMessages.push({
//           id: `system-${upcomingStep.id}-${Date.now()}`,
//           role: "system",
//           content: upcomingStep.prompt,
//         });
//       } else {
//         nextMessages.push({
//           id: "system-summary",
//           role: "system",
//           content: buildSummary(nextProfile),
//         });
//       }

//       return nextMessages;
//     });

//     setStepIndex((prev) => prev + 1);
//   };

//   const handleTextSubmit = (event: FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     setIsAttachmentOpen(false);
//     if (!textInput.trim()) {
//       return;
//     }
//     advanceConversation(textInput.trim());
//   };

//   const handleOptionsContinue = () => {
//     const customAnswer = customOption.trim();
//     setIsAttachmentOpen(false);
//     const answer = optionChoice || customAnswer;
//     if (!answer) {
//       return;
//     }
//     advanceConversation(answer);
//   };

//   const toggleSelection = (value: string) => {
//     setOptionChoice((prev) => (prev === value ? "" : value));
//   };

//   const toggleMultiSelection = (value: string) => {
//     setMultiSelections((prev) => {
//       if (prev.includes(value)) {
//         return prev.filter((item) => item !== value);
//       }
//       return [...prev, value];
//     });
//   };

//   const handleAddTopic = (event: FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     const value = multiDraft.trim();
//     if (!value) {
//       return;
//     }
//     setMultiSelections((prev) => {
//       if (prev.some((item) => item.toLowerCase() === value.toLowerCase())) {
//         return prev;
//       }
//       return [...prev, value];
//     });
//     setMultiDraft("");
//   };

//   const handleTopicKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
//     if (event.key === "Enter") {
//       event.preventDefault();
//       const value = multiDraft.trim();
//       if (!value) {
//         return;
//       }
//       setMultiSelections((prev) => {
//         if (prev.some((item) => item.toLowerCase() === value.toLowerCase())) {
//           return prev;
//         }
//         return [...prev, value];
//       });
//       setMultiDraft("");
//     }
//   };

//   const handleMultiSubmit = () => {
//     if (multiSelections.length === 0) {
//       return;
//     }
//     setIsAttachmentOpen(false);
//     advanceConversation(multiSelections);
//   };

//   const handleSkip = () => {
//     if (!currentStep?.optional) {
//       return;
//     }
//     const skipCopy = currentStep.skipCopy ?? "Skip for now";
//     advanceConversation(null, skipCopy, true);
//   };

//   const renderOptions = (options?: string[], selectedValue?: string) => (
//     <div className="flex flex-col gap-2">
//       {options?.map((option) => (
//         <OptionRow
//           key={option}
//           label={option}
//           selected={selectedValue === option}
//           onClick={() => toggleSelection(option)}
//         />
//       ))}
//     </div>
//   );

//   const renderMultiOptions = (options?: string[]) => (
//     <div className="flex flex-col gap-2">
//       {options?.map((option) => (
//         <OptionRow
//           key={option}
//           label={option}
//           selected={multiSelections.includes(option)}
//           onClick={() => toggleMultiSelection(option)}
//         />
//       ))}
//     </div>
//   );

//   const renderInput = () => {
//     if (!currentStep) {
//       return (
//         <div className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm text-neutral-600 shadow-sm">
//           Hang tight. Your personalized Powwow schedule is on the way.
//         </div>
//       );
//     }

//     if (currentStep.type === "freeText") {
//       const attachmentOptions = [
//         {
//           value: "take-photo",
//           label: "Take photo",
//           icon: (
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               viewBox="0 0 20 20"
//               fill="none"
//               className="h-5 w-5"
//             >
//               <path
//                 d="M6.5 5H8l1-1.5h2L12 5h1.5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
//                 stroke="currentColor"
//                 strokeWidth="1.4"
//                 strokeLinejoin="round"
//               />
//               <circle
//                 cx="10"
//                 cy="10"
//                 r="2.5"
//                 stroke="currentColor"
//                 strokeWidth="1.4"
//               />
//             </svg>
//           ),
//         },
//         {
//           value: "transcribe",
//           label: "Transcribe",
//           icon: (
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               viewBox="0 0 20 20"
//               fill="none"
//               className="h-5 w-5"
//             >
//               <path
//                 d="M10 3.5a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 1 1-5 0v-4A2.5 2.5 0 0 1 10 3.5Z"
//                 stroke="currentColor"
//                 strokeWidth="1.4"
//               />
//               <path
//                 d="M6.75 9.5v.75a3.25 3.25 0 0 0 6.5 0V9.5"
//                 stroke="currentColor"
//                 strokeWidth="1.4"
//                 strokeLinecap="round"
//               />
//               <path
//                 d="M10 15.5v1.5"
//                 stroke="currentColor"
//                 strokeWidth="1.4"
//                 strokeLinecap="round"
//               />
//             </svg>
//           ),
//         },
//         {
//           value: "upload",
//           label: "Upload files",
//           icon: (
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               viewBox="0 0 20 20"
//               fill="none"
//               className="h-5 w-5"
//             >
//               <path
//                 d="M10 4v8"
//                 stroke="currentColor"
//                 strokeWidth="1.4"
//                 strokeLinecap="round"
//               />
//               <path
//                 d="M7.5 6.5 10 4l2.5 2.5"
//                 stroke="currentColor"
//                 strokeWidth="1.4"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               />
//               <path
//                 d="M4.5 12.5v2a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-2"
//                 stroke="currentColor"
//                 strokeWidth="1.4"
//                 strokeLinecap="round"
//               />
//             </svg>
//           ),
//         },
//       ];

//       return (
//         <div className="relative">
//           <form
//             onSubmit={handleTextSubmit}
//             className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-5 py-3 shadow-sm"
//           >
//             <input
//               value={textInput}
//               onChange={(event) => setTextInput(event.target.value)}
//               placeholder={currentStep.placeholder ?? "Ask Powwow"}
//               className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
//               aria-label={currentStep.prompt}
//             />
//             <div className="flex items-center gap-2">
//               <div className="group relative flex items-center">
//                 <button
//                   type="button"
//                   onClick={toggleRecording}
//                   disabled={isConnecting}
//                   className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
//                     isRecording
//                       ? "border-red-400 bg-red-50 text-red-600 hover:bg-red-100"
//                       : isConnecting
//                         ? "border-orange-400 bg-orange-50 text-orange-600"
//                         : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
//                   }`}
//                   aria-label={
//                     isRecording ? "Stop recording" : "Start recording"
//                   }
//                 >
//                   {isConnecting ? (
//                     <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
//                       <circle
//                         className="opacity-25"
//                         cx="12"
//                         cy="12"
//                         r="10"
//                         stroke="currentColor"
//                         strokeWidth="4"
//                         fill="none"
//                       />
//                       <path
//                         className="opacity-75"
//                         fill="currentColor"
//                         d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                       />
//                     </svg>
//                   ) : (
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       viewBox="0 0 20 20"
//                       fill="none"
//                       className="h-4 w-4"
//                     >
//                       <path
//                         d="M10 3.5a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 1 1-5 0v-4A2.5 2.5 0 0 1 10 3.5Z"
//                         stroke="currentColor"
//                         strokeWidth="1.4"
//                         fill={isRecording ? "currentColor" : "none"}
//                       />
//                       <path
//                         d="M6.75 9.5v.75a3.25 3.25 0 0 0 6.5 0V9.5"
//                         stroke="currentColor"
//                         strokeWidth="1.4"
//                         strokeLinecap="round"
//                       />
//                       <path
//                         d="M10 15.5v1.5"
//                         stroke="currentColor"
//                         strokeWidth="1.4"
//                         strokeLinecap="round"
//                       />
//                     </svg>
//                   )}
//                 </button>
//                 <span className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white group-hover:flex">
//                   {isRecording
//                     ? "Recording"
//                     : isConnecting
//                       ? "Connecting"
//                       : "Record"}
//                 </span>
//               </div>

//               <div
//                 ref={attachmentRef}
//                 className="group relative flex items-center"
//               >
//                 <button
//                   type="button"
//                   onMouseDown={(event) => event.stopPropagation()}
//                   onClick={(event) => {
//                     event.stopPropagation();
//                     setIsAttachmentOpen((prev) => !prev);
//                   }}
//                   className={`flex h-9 w-9 items-center justify-center rounded-full border ${isAttachmentOpen ? "border-neutral-400 text-neutral-700" : "border-neutral-200 text-neutral-500"} transition-colors hover:border-neutral-300`}
//                   aria-label="Attach"
//                 >
//                   +
//                 </button>
//                 <span className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white group-hover:flex">
//                   Attach
//                 </span>
//                 {isAttachmentOpen ? (
//                   <div
//                     onMouseDown={(event) => event.stopPropagation()}
//                     className="absolute bottom-12 left-1/2 z-20 w-48 -translate-x-1/2 rounded-2xl border border-neutral-300 bg-white p-2 shadow-xl"
//                   >
//                     <div className="flex flex-col gap-1">
//                       {attachmentOptions.map((option) => (
//                         <button
//                           key={option.value}
//                           type="button"
//                           onClick={() => {
//                             setIsAttachmentOpen(false);
//                           }}
//                           className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-900 hover:text-white"
//                         >
//                           <span className="flex h-6 w-6 items-center justify-center">
//                             {option.icon}
//                           </span>
//                           <span className="truncate text-left">
//                             {option.label}
//                           </span>
//                         </button>
//                       ))}
//                     </div>
//                   </div>
//                 ) : null}
//               </div>
//             </div>
//             <div className="group relative flex items-center">
//               <button
//                 type="submit"
//                 className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-800"
//                 aria-label="Send"
//               >
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   viewBox="0 0 20 20"
//                   fill="none"
//                   className="h-4 w-4"
//                 >
//                   <path
//                     d="M4 10h9m0 0-3.5-3.5M13 10l-3.5 3.5"
//                     stroke="currentColor"
//                     strokeWidth="1.5"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                 </svg>
//               </button>
//               <span className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white group-hover:flex">
//                 Send
//               </span>
//             </div>
//           </form>
//         </div>
//       );
//     }

//     if (currentStep.type === "options") {
//       const hasAnswer = Boolean(optionChoice || customOption.trim());
//       return (
//         <div className="space-y-5">
//           {currentStep.helper ? (
//             <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
//               {currentStep.helper}
//             </p>
//           ) : null}
//           {renderOptions(currentStep.options, optionChoice)}
//           {currentStep.allowCustom ? (
//             <div className="rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm">
//               <input
//                 value={customOption}
//                 onChange={(event) => setCustomOption(event.target.value)}
//                 placeholder="Or type your own"
//                 className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
//                 aria-label="Custom answer"
//               />
//             </div>
//           ) : null}
//           <div className="flex items-center gap-4">
//             {currentStep.optional ? (
//               <button
//                 type="button"
//                 onClick={handleSkip}
//                 className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700"
//               >
//                 {currentStep.skipCopy ?? "Skip"}
//               </button>
//             ) : null}
//             <button
//               type="button"
//               onClick={handleOptionsContinue}
//               className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
//                 hasAnswer
//                   ? "bg-neutral-900 text-white hover:bg-neutral-800"
//                   : "bg-neutral-200 text-neutral-500"
//               }`}
//               disabled={!hasAnswer}
//             >
//               Continue
//             </button>
//           </div>
//         </div>
//       );
//     }

//     const hasTopics = multiSelections.length > 0;
//     return (
//       <div className="space-y-5">
//         {currentStep.helper ? (
//           <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
//             {currentStep.helper}
//           </p>
//         ) : null}
//         {renderMultiOptions(currentStep.options)}
//         <form
//           onSubmit={handleAddTopic}
//           className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm"
//         >
//           <input
//             value={multiDraft}
//             onChange={(event) => setMultiDraft(event.target.value)}
//             onKeyDown={handleTopicKeyDown}
//             placeholder="Add another topic and press enter"
//             className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
//             aria-label="Add topic"
//           />
//           <button
//             type="submit"
//             className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white transition-colors hover:bg-neutral-800"
//           >
//             Add
//           </button>
//         </form>
//         {hasTopics ? (
//           <div className="flex flex-col gap-2">
//             {multiSelections.map((topic) => (
//               <button
//                 key={topic}
//                 type="button"
//                 onClick={() => toggleMultiSelection(topic)}
//                 className="group flex w-full items-center gap-3 rounded-full bg-neutral-100 px-4 py-2 text-left text-sm text-neutral-700"
//               >
//                 <span className="flex h-8 w-8 items-center justify-center text-neutral-400 group-hover:text-neutral-600">
//                   <HookArrow
//                     className="h-4 w-4"
//                     style={{ transform: "rotate(90deg)" }}
//                   />
//                 </span>
//                 <span className="flex-1 leading-snug">{topic}</span>
//                 <span className="text-xs font-medium text-neutral-500">
//                   Remove
//                 </span>
//               </button>
//             ))}
//           </div>
//         ) : null}
//         <div className="flex items-center gap-4">
//           {currentStep.optional ? (
//             <button
//               type="button"
//               onClick={handleSkip}
//               className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700"
//             >
//               {currentStep.skipCopy ?? "Skip"}
//             </button>
//           ) : null}
//           <button
//             type="button"
//             onClick={handleMultiSubmit}
//             className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
//               hasTopics
//                 ? "bg-neutral-900 text-white hover:bg-neutral-800"
//                 : "bg-neutral-200 text-neutral-500"
//             }`}
//             disabled={!hasTopics}
//           >
//             Save topics
//           </button>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-neutral-200 text-neutral-900">
//       <div className="flex min-h-screen">
//         <aside className="hidden w-20 flex-col justify-between border-r border-neutral-300 bg-white px-4 py-6 lg:flex">
//           <div className="space-y-4">
//             <button
//               type="button"
//               className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
//               aria-label="Expand sidebar"
//             >
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 20 20"
//                 fill="none"
//                 className="h-5 w-5"
//               >
//                 <path
//                   d="M4 5h12M4 10h12M4 15h12"
//                   stroke="currentColor"
//                   strokeWidth="1.5"
//                   strokeLinecap="round"
//                 />
//               </svg>
//             </button>
//             <button
//               type="button"
//               className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
//               aria-label="Home"
//             >
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 20 20"
//                 fill="none"
//                 className="h-5 w-5"
//               >
//                 <path
//                   d="M4 9.5 10 4l6 5.5V16a1 1 0 0 1-1 1h-4v-4H9v4H5a1 1 0 0 1-1-1V9.5Z"
//                   stroke="currentColor"
//                   strokeWidth="1.5"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 />
//               </svg>
//             </button>
//             <button
//               type="button"
//               className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
//               aria-label="New conference"
//             >
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 20 20"
//                 fill="none"
//                 className="h-6 w-6"
//               >
//                 <path
//                   d="M10 4v12M4 10h12"
//                   stroke="currentColor"
//                   strokeWidth="1.6"
//                   strokeLinecap="round"
//                 />
//               </svg>
//             </button>
//           </div>
//           <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-sm text-neutral-500">
//             0
//           </div>
//         </aside>

//         <section className="flex w-full flex-col border-r border-neutral-300 bg-white px-6 py-10 sm:px-12 lg:max-w-2xl">
//           <div className="flex flex-1 flex-col">
//             <div className="flex items-center justify-between pb-6">
//               <button
//                 type="button"
//                 className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900"
//                 aria-label="Current conversation"
//               >
//                 <span>New Conference</span>
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   viewBox="0 0 20 20"
//                   fill="none"
//                   className="h-4 w-4"
//                 >
//                   <path
//                     d="M6 8l4 4 4-4"
//                     stroke="currentColor"
//                     strokeWidth="1.6"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                 </svg>
//               </button>
//               <div className="hidden text-sm text-neutral-400 sm:block">
//                 Step {Math.min(stepIndex + 1, STEP_CONFIG.length)} of{" "}
//                 {STEP_CONFIG.length}
//               </div>
//             </div>
//             <div className="flex-1 space-y-6 overflow-y-auto pr-2">
//               {displayMessages.map((message) => {
//                 const isSystem = message.role === "system";
//                 return (
//                   <div key={message.id} className="text-left">
//                     {isSystem ? (
//                       <p className="max-w-xl text-base leading-relaxed text-neutral-700">
//                         {message.content}
//                       </p>
//                     ) : (
//                       <div className="inline-flex max-w-xl rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-800">
//                         <span className="leading-relaxed">
//                           {message.content}
//                         </span>
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}
//               <div ref={messagesEndRef} />
//             </div>
//             <div className="mt-6">{renderInput()}</div>
//           </div>
//         </section>

//         <div className="hidden flex-1 bg-neutral-100 lg:block" />
//       </div>
//     </div>
//   );
// }
