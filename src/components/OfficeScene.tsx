import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Environment, ContactShadows, Text } from '@react-three/drei';
import gsap from 'gsap';

function CameraController({ target, focus }: { target: THREE.Vector3, focus: boolean }) {
    const { camera } = useThree();
    const pivotRef = useRef(new THREE.Vector3(0, 0, 0));
    const isTweening = useRef(false);

    useEffect(() => {
        // Kill existing tweens to prevent conflicts
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(pivotRef.current);

        if (focus) {
            isTweening.current = true;
            const tl = gsap.timeline({
                onComplete: () => { isTweening.current = false; }
            });

            // Animate position
            tl.to(camera.position, {
                x: target.x + 3.5,
                y: target.y + 2.5,
                z: target.z + 3.5,
                duration: 1.8,
                ease: "power2.inOut"
            }, 0);

            // Animate focus pivot
            tl.to(pivotRef.current, {
                x: target.x,
                y: target.y + 1,
                z: target.z,
                duration: 1.5,
                ease: "power2.out"
            }, 0);
        } else {
            isTweening.current = true;
            const tl = gsap.timeline({
                onComplete: () => { isTweening.current = false; }
            });

            tl.to(camera.position, {
                x: 0,
                y: 8,
                z: 12,
                duration: 2.5,
                ease: "power3.inOut"
            }, 0);

            tl.to(pivotRef.current, {
                x: 0,
                y: 0,
                z: 0,
                duration: 2.0,
                ease: "power2.inOut"
            }, 0);
        }
    }, [target, focus, camera]);

    useFrame(() => {
        camera.lookAt(pivotRef.current);
    });

    return null;
}

type AgentAnimationState = 
  | "idle" | "walking" | "working" | "sitting" | "speaking" 
  | "listening" | "thinking" | "coffee" | "whiteboard" 
  | "agreeing" | "disagreeing" | "excited" | "concerned" | "pointing"
  | "typing";

interface AgentReaction {
  type: "NOD" | "SHAKE" | "POINT" | "THINK" | "EXCITED" | "TASK";
  startTime: number;
  duration: number;
}

interface Agent3DState {
  id: string;
  name: string;
  role: string;
  color: string;
  currentState: AgentAnimationState;
  currentZone: string;
  targetZone: string | null;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  lookAtTarget: THREE.Vector3 | null;
  isSpeaking: boolean;
  emotion: "HYPED" | "FOCUSED" | "SKEPTICAL";
  reaction: AgentReaction | null;
  lastActivityTime: number;
}

const officeZones = {
  pmDesk: new THREE.Vector3(-4, 0, -3),
  designDesk: new THREE.Vector3(-1.5, 0, -3),
  devDesk: new THREE.Vector3(1.5, 0, -3),
  qaDesk: new THREE.Vector3(4, 0, -3),
  marketingDesk: new THREE.Vector3(6.5, 0, -3),

  meetingTable: new THREE.Vector3(0, 0, 1.5),
  coffeeMachine: new THREE.Vector3(-5, 0, 3),
  whiteboard: new THREE.Vector3(5, 0, 2),
  chillArea: new THREE.Vector3(4, 0, 3),
};

const activityWeights = [
  { act: 'working', weight: 40 },
  { act: 'walking', weight: 10 },
  { act: 'coffee', weight: 10 },
  { act: 'whiteboard', weight: 5 },
  { act: 'thinking', weight: 5 },
  { act: 'idle', weight: 5 }
];

function chooseRandomActivity() {
    const total = activityWeights.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * total;
    for (const item of activityWeights) {
        if (rand < item.weight) return item.act;
        rand -= item.weight;
    }
    return 'idle';
}

function getZoneForActivity(act: string, baseZone: THREE.Vector3) {
    if (act === 'working') return new THREE.Vector3(baseZone.x, 0, baseZone.z + 0.8);
    if (act === 'coffee') return officeZones.coffeeMachine;
    if (act === 'whiteboard') return officeZones.whiteboard;
    if (act === 'thinking') return new THREE.Vector3(baseZone.x + (Math.random() * 2 - 1), 0, baseZone.z + 1);
    if (act === 'walking') {
        const keys = Object.keys(officeZones);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return (officeZones as any)[randomKey];
    }
    return baseZone; // fallback
}

function getDefaultColorByRole(role: string) {
    const r = role.toLowerCase();
    if (r.includes('manager') || r.includes('pm') || r.includes('producer') || r.includes('strategist')) return '#3b82f6';
    if (r.includes('design') || r.includes('ui') || r.includes('creative') || r.includes('copywrite') || r.includes('photography') || r.includes('music')) return '#a855f7';
    if (r.includes('developer') || r.includes('engineer') || r.includes('dev')) return '#22c55e';
    if (r.includes('marketing') || r.includes('growth') || r.includes('social') || r.includes('pr') || r.includes('buyer')) return '#f97316';
    if (r.includes('qa') || r.includes('test')) return '#ef4444';
    return '#9ca3af'; // default gray
}

function getDefaultZoneByRole(role: string) {
    const r = role.toLowerCase();
    if (r.includes('manager') || r.includes('pm') || r.includes('producer') || r.includes('strategist')) return officeZones.pmDesk;
    if (r.includes('design') || r.includes('ui') || r.includes('creative') || r.includes('copywrite') || r.includes('photography') || r.includes('music')) return officeZones.designDesk;
    if (r.includes('developer') || r.includes('engineer') || r.includes('dev')) return officeZones.devDesk;
    if (r.includes('qa') || r.includes('test')) return officeZones.qaDesk;
    if (r.includes('marketing') || r.includes('growth') || r.includes('social') || r.includes('pr') || r.includes('buyer')) return officeZones.marketingDesk;
    
    // Fallback: random offset
    return new THREE.Vector3((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 5 - 2);
}

function ProceduralAgent({ state }: { state: Agent3DState }) {
    const group = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Mesh>(null);
    const headGroupRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Mesh>(null);
    const rightArmRef = useRef<THREE.Mesh>(null);
    const [greeting, setGreeting] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setGreeting(false), 2000);
        return () => clearTimeout(timer);
    }, []);
    
    useFrame((_, delta) => {
        if (!group.current) return;
        
        const time = performance.now();
        let targetPos = state.targetPosition || state.position;
        const direction = targetPos.clone().sub(group.current.position);
        direction.y = 0;
        const distance = direction.length();
        const isMoving = distance > 0.1;

        // --- Movement & Rotation ---
        if (isMoving) {
            direction.normalize();
            group.current.position.add(direction.multiplyScalar(delta * 2)); // speed 2
            const targetRotation = Math.atan2(direction.x, direction.z);
            let normalizedDiff = Math.atan2(Math.sin(targetRotation - group.current.rotation.y), Math.cos(targetRotation - group.current.rotation.y));
            group.current.rotation.y += normalizedDiff * delta * 6;
        } else if (state.lookAtTarget) {
            const directionToTarget = state.lookAtTarget.clone().sub(group.current.position);
            directionToTarget.y = 0;
            if (directionToTarget.lengthSq() > 0.001) {
                const lookRotation = Math.atan2(directionToTarget.x, directionToTarget.z);
                let normalizedDiff = Math.atan2(Math.sin(lookRotation - group.current.rotation.y), Math.cos(lookRotation - group.current.rotation.y));
                group.current.rotation.y += normalizedDiff * delta * 4;
            }
        }

        // --- Body Bobbing ---
        if (bodyRef.current) {
            if (greeting) {
                bodyRef.current.position.y = 0.5 + Math.abs(Math.sin(time * 0.01)) * 0.2;
            } else if (isMoving) {
                bodyRef.current.position.y = 0.5 + Math.sin(time * 0.012) * 0.08;
            } else {
                const idleFreq = state.currentState === "working" ? 0.02 : 0.003;
                bodyRef.current.position.y = 0.5 + Math.sin(time * idleFreq) * 0.02;
            }
        }

        // --- Head & Reaction Logic ---
        if (headGroupRef.current) {
            // Default look forward/down
            let targetHeadX = 0;
            let targetHeadY = 0;

            if (state.reaction && (time - state.reaction.startTime) < state.reaction.duration) {
                const { type } = state.reaction;
                const elapsed = time - state.reaction.startTime;
                
                if (type === "NOD") {
                    targetHeadX = 0.3 * Math.sin(elapsed * 0.01);
                } else if (type === "SHAKE") {
                    targetHeadY = 0.4 * Math.sin(elapsed * 0.01);
                } else if (type === "THINK") {
                    targetHeadX = -0.2;
                    targetHeadY = 0.2 * Math.sin(elapsed * 0.002);
                } else if (type === "EXCITED") {
                    targetHeadX = 0.1 * Math.sin(elapsed * 0.02);
                    targetHeadY = 0.2 * Math.sin(elapsed * 0.01);
                }
            } else {
                if (state.currentState === "working") {
                    targetHeadX = 0.2;
                    targetHeadY = 0.1 * Math.sin(time * 0.002);
                } else if (state.currentState === "speaking") {
                    targetHeadX = 0.1 * Math.sin(time * 0.01);
                    targetHeadY = 0.2 * Math.sin(time * 0.008);
                } else if (state.lookAtTarget) {
                    const directionToTarget = state.lookAtTarget.clone().sub(group.current.position);
                    directionToTarget.y = 0;
                    const lookRotation = Math.atan2(directionToTarget.x, directionToTarget.z);
                    targetHeadY = THREE.MathUtils.clamp(Math.atan2(Math.sin(lookRotation - group.current.rotation.y), Math.cos(lookRotation - group.current.rotation.y)), -1.2, 1.2);
                }
            }

            headGroupRef.current.rotation.x = THREE.MathUtils.lerp(headGroupRef.current.rotation.x, targetHeadX, delta * 5);
            headGroupRef.current.rotation.y = THREE.MathUtils.lerp(headGroupRef.current.rotation.y, targetHeadY, delta * 5);
        }

        // --- Arm Animations ---
        if (leftArmRef.current && rightArmRef.current) {
            let leftRotX = 0;
            let rightRotX = 0;
            let leftRotZ = 0.2;
            let rightRotZ = -0.2;

            if (isMoving) {
                leftRotX = Math.sin(time * 0.01) * 0.8;
                rightRotX = -Math.sin(time * 0.01) * 0.8;
            } else if (state.currentState === "working" || state.currentState === "typing") {
                leftRotX = -1.2 + Math.sin(time * 0.03) * 0.1;
                rightRotX = -1.2 + Math.cos(time * 0.03) * 0.1;
                leftRotZ = 0.4;
                rightRotZ = -0.4;
            } else if (state.currentState === "speaking" || state.isSpeaking) {
                leftRotX = -0.5 + Math.sin(time * 0.008) * 0.4;
                rightRotX = -0.5 + Math.cos(time * 0.008) * 0.4;
                leftRotZ = 0.8;
                rightRotZ = -0.8;
            } else if (state.reaction?.type === "POINT") {
                rightRotX = -1.5;
                rightRotZ = -0.2;
            } else if (state.reaction?.type === "TASK") {
                leftRotX = -1.0;
                rightRotX = -1.0;
                leftRotZ = 0.5;
                rightRotZ = -0.5;
            } else if (state.currentState === "coffee") {
                rightRotX = -1.1;
                rightRotZ = -0.3;
                rightArmRef.current.position.y = 0.8 + Math.sin(time * 0.002) * 0.05;
            }

            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, leftRotX, delta * 8);
            rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, rightRotX, delta * 8);
            leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, leftRotZ, delta * 8);
            rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, rightRotZ, delta * 8);
        }
    });

    return (
        <group ref={group} position={state.position} castShadow>
            <Text position={[0, 1.7, 0]} fontSize={0.15} color="white" anchorX="center" anchorY="bottom">
                {state.name}
            </Text>
            
            {/* Body */}
            <group ref={bodyRef} position={[0, 0.5, 0]}>
                <mesh castShadow>
                    <capsuleGeometry args={[0.2, 0.6, 4, 8]} />
                    <meshStandardMaterial color={state.color} />
                </mesh>

                {/* Arms */}
                <mesh ref={leftArmRef} position={[-0.25, 0.2, 0]} castShadow>
                    <boxGeometry args={[0.08, 0.4, 0.08]} />
                    <meshStandardMaterial color={state.color} />
                </mesh>
                <mesh ref={rightArmRef} position={[0.25, 0.2, 0]} castShadow>
                    <boxGeometry args={[0.08, 0.4, 0.08]} />
                    <meshStandardMaterial color={state.color} />
                </mesh>
            </group>

            {/* Head */}
            <group ref={headGroupRef} position={[0, 1.25, 0]}>
                <mesh castShadow>
                    <sphereGeometry args={[0.18, 16, 16]} />
                    <meshStandardMaterial color="#fcd34d" />
                </mesh>
                <mesh position={[0.08, 0.05, 0.15]} castShadow>
                    <sphereGeometry args={[0.03, 8, 8]} />
                    <meshStandardMaterial color="#000000" />
                </mesh>
                <mesh position={[-0.08, 0.05, 0.15]} castShadow>
                    <sphereGeometry args={[0.03, 8, 8]} />
                    <meshStandardMaterial color="#000000" />
                </mesh>
            </group>
            
            {/* Reaction Indicator */}
            {state.reaction && (performance.now() - state.reaction.startTime) < state.reaction.duration && (
                <group position={[0, 1.9, 0]}>
                    <Text fontSize={0.25} anchorX="center" anchorY="middle">
                        {state.reaction.type === "NOD" ? "✅" : 
                         state.reaction.type === "SHAKE" ? "❌" :
                         state.reaction.type === "THINK" ? "🤔" :
                         state.reaction.type === "EXCITED" ? "🔥" :
                         state.reaction.type === "POINT" ? "👉" : "📋"}
                    </Text>
                </group>
            )}

            {state.isSpeaking && (
                 <mesh position={[0, 1.5, 0.2]}>
                    <sphereGeometry args={[0.04, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
                 </mesh>
            )}

            {greeting && (
                <Text position={[0, 1.8, 0]} fontSize={0.2} color="#fbbf24" anchorX="center" anchorY="bottom">
                    Ready to work!
                </Text>
            )}
        </group>
    );
}

interface OfficeSceneProps {
    agents: any[];
    projectSelectedAgents: string[];
    messages: any[];
    activeSessionId: string | null;
}

export function OfficeScene({ agents, projectSelectedAgents, messages }: OfficeSceneProps) {
    const [agentStates, setAgentStates] = useState<Record<string, Agent3DState>>({});
    const [camFocusTarget, setCamFocusTarget] = useState<THREE.Vector3>(new THREE.Vector3(0,0,0));
    const [camFocusActive, setCamFocusActive] = useState(false);

    // Initialize agents
    useEffect(() => {
        if (!agents || !projectSelectedAgents) return;
        setAgentStates(prev => {
            const next = { ...prev };
            for (const aid of projectSelectedAgents) {
                if (!next[aid]) {
                    const agentDocs = agents.find(a => a.id === aid);
                    if (agentDocs) {
                        const baseZone = getDefaultZoneByRole(agentDocs.role);
                        next[aid] = {
                            id: aid,
                            name: agentDocs.name,
                            role: agentDocs.role,
                            color: agentDocs.accentColor || getDefaultColorByRole(agentDocs.role),
                            currentState: "idle",
                            currentZone: "desk",
                            targetZone: null,
                            position: baseZone.clone(),
                            targetPosition: baseZone.clone(),
                            lookAtTarget: null,
                            isSpeaking: false,
                            emotion: "FOCUSED",
                            reaction: null,
                            lastActivityTime: Date.now()
                        };
                    }
                }
            }
            return next;
        });
    }, [agents, projectSelectedAgents]);

    // Random idle activities scheduler
    useEffect(() => {
        const interval = setInterval(() => {
            setAgentStates(prev => {
                const next = { ...prev };
                const now = Date.now();
                const aids = Object.keys(next);
                
                // --- Social Clustering ---
                // Every cycle, 20% chance to form a small pair interaction
                if (Math.random() < 0.2 && aids.length >= 2) {
                    const a1 = aids[Math.floor(Math.random() * aids.length)];
                    const a2 = aids[Math.floor(Math.random() * aids.length)];
                    if (a1 !== a2) {
                        const spot = officeZones.chillArea.clone().add(new THREE.Vector3(Math.random() * 0.5, 0, Math.random() * 0.5));
                        next[a1].targetPosition = spot;
                        next[a1].currentState = "speaking";
                        next[a1].lookAtTarget = next[a2].position;
                        next[a1].lastActivityTime = now + 5000; // block for 5s

                        next[a2].targetPosition = spot.clone().add(new THREE.Vector3(0.8, 0, 0.8));
                        next[a2].currentState = "listening";
                        next[a2].lookAtTarget = next[a1].position;
                        next[a2].lastActivityTime = now + 5000;
                    }
                    return next;
                }

                for (const aid in next) {
                    const state = next[aid];
                    // don't interrupt meeting or active speaking
                    if (state.currentState !== 'speaking' && state.currentState !== 'listening' && (now - state.lastActivityTime > 8000)) {
                        if (!state.targetPosition || state.position.distanceTo(state.targetPosition) < 0.2) {
                            if (Math.random() < 0.3) { 
                                const baseZone = getDefaultZoneByRole(state.role);
                                const act = chooseRandomActivity();
                                state.targetPosition = getZoneForActivity(act, baseZone).clone();
                                state.currentState = act as any;
                                state.lastActivityTime = now;
                            }
                        }
                    }
                }
                return next;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Sync with messages (meeting mode + reactions)
    useEffect(() => {
        if (messages.length === 0) return;
        const lastMessage = messages[messages.length - 1];
        
        setAgentStates(prev => {
            const next = { ...prev };
            const TIMESTAMP_NOW = Date.now();
            const timestamp = lastMessage.timestamp?.toMillis ? lastMessage.timestamp.toMillis() : TIMESTAMP_NOW;
            const elapsed = TIMESTAMP_NOW - timestamp;
            const isVeryRecent = elapsed < 8000;
            const isFocusActive = elapsed < 15000;
            const isRecentMeeting = elapsed < 60000;

            if (isRecentMeeting) {
                const tableCenter = officeZones.meetingTable;
                const members = Object.keys(next);
                let speakerPosition: THREE.Vector3 | null = null;
                
                if (lastMessage.senderType === 'user') {
                    speakerPosition = new THREE.Vector3(tableCenter.x, 0, tableCenter.z + 2.5);
                }

                members.forEach((aid, i) => {
                    const isSpeaker = lastMessage.senderId === aid;
                    const thisState = next[aid];
                    const content = (lastMessage.content || "").toLowerCase();
                    const name = (thisState.name || "").toLowerCase();
                    
                    // Mention detection
                    const isMentioned = content.includes(name);
                    
                    // Intent detection
                    const isAgreement = content.includes("agree") || content.includes("yes") || content.includes("correct") || content.includes("good");
                    const isDisagreement = content.includes("disagree") || content.includes("no") || content.includes("wait") || content.includes("risk");
                    const isTask = content.includes("assign") || content.includes("task") || content.includes("check") || content.includes("build") || content.includes("fix");
                    const isAccomplished = content.includes("done") || content.includes("complete") || content.includes("finished") || content.includes("deliverable");

                    // Trigger reactions if very recent
                    if (isVeryRecent) {
                        if (isSpeaker) {
                           if (isAccomplished || isAgreement) thisState.reaction = { type: "EXCITED", startTime: performance.now(), duration: 3000 };
                           else if (isDisagreement) thisState.reaction = { type: "SHAKE", startTime: performance.now(), duration: 2500 };
                           else if (isTask) thisState.reaction = { type: "POINT", startTime: performance.now(), duration: 2000 };
                        } else if (isMentioned) {
                           if (isTask) thisState.reaction = { type: "TASK", startTime: performance.now(), duration: 3000 };
                           else thisState.reaction = { type: "NOD", startTime: performance.now(), duration: 2000 };
                           
                           // If mentioned, turn toward speaker IMMEDIATELY
                           thisState.currentState = "listening";
                        }
                    }

                    // Movement to table
                    let angle = Math.PI; 
                    const roleLower = thisState.role.toLowerCase();
                    if (roleLower.includes('pm') || roleLower.includes('manager') || roleLower.includes('producer')) angle = 0;
                    else if (roleLower.includes('design') || roleLower.includes('ui') || roleLower.includes('creative')) angle = Math.PI * 0.25; 
                    else if (roleLower.includes('dev') || roleLower.includes('engineer')) angle = -Math.PI * 0.25;
                    else if (roleLower.includes('qa') || roleLower.includes('test')) angle = -Math.PI * 0.75;
                    else if (roleLower.includes('marketing') || roleLower.includes('growth')) angle = Math.PI * 0.75;
                    else angle = Math.PI * 1.5 + (i * 0.2);

                    const radius = 1.6;
                    const spot = new THREE.Vector3(tableCenter.x + Math.sin(angle) * radius, 0, tableCenter.z + Math.cos(angle) * radius);
                    
                    thisState.targetPosition = spot;
                    thisState.currentState = isSpeaker ? "speaking" : "listening";
                    thisState.isSpeaking = isSpeaker;
                    thisState.lastActivityTime = Date.now();
                    
                    if (isSpeaker) {
                        speakerPosition = spot.clone();
                        // Primary focus if speaker
                        setCamFocusTarget(spot.clone());
                        setCamFocusActive(isFocusActive);
                    }

                    // Camera overrides for mentions/tasks
                    if (isVeryRecent || isFocusActive) {
                        if (isMentioned || isTask) {
                             setCamFocusTarget(spot.clone());
                             setCamFocusActive(isFocusActive);
                        }
                    }
                });

                // Final lookAt sync
                members.forEach(aid => {
                    const thisState = next[aid];
                    if (!thisState.isSpeaking) {
                         thisState.lookAtTarget = speakerPosition || tableCenter;
                    } else {
                         thisState.lookAtTarget = lastMessage.senderType === 'user' ? new THREE.Vector3(tableCenter.x, 0, tableCenter.z + 2.5) : tableCenter;
                    }
                });
            } else {
                 setCamFocusActive(false);
                 Object.keys(next).forEach(aid => {
                     next[aid].isSpeaking = false;
                     next[aid].lookAtTarget = null;
                 });
            }
            
            return next;
        });
    }, [messages]);

    return (
        <>
            <CameraController target={camFocusTarget} focus={camFocusActive} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
            <Environment preset="city" />
            
            {/* Floor */}
            <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[20, 15]} />
                <meshStandardMaterial color="#0B0D14" roughness={0.8} />
            </mesh>

            {/* Whiteboard with markers */}
            {Object.entries(officeZones).map(([key, pos]) => {
                if (key === 'whiteboard') {
                     return (
                         <group key={key} position={[pos.x, 0, pos.z]}>
                            <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
                                <boxGeometry args={[0.1, 1.5, 2]} />
                                <meshStandardMaterial color="#f8fafc" />
                            </mesh>
                            {/* Marker ledge */}
                            <mesh position={[0.08, 0.45, 0]}>
                                <boxGeometry args={[0.1, 0.05, 1.8]} />
                                <meshStandardMaterial color="#334155" />
                            </mesh>
                         </group>
                     );
                }
                if (key === 'coffeeMachine') {
                    return (
                        <group key={key} position={pos}>
                            <mesh position={[0, 0.5, 0]}>
                                <boxGeometry args={[0.6, 1.0, 0.6]} />
                                <meshStandardMaterial color="#1e293b" />
                            </mesh>
                            <mesh position={[0, 0.8, 0.35]}>
                                <boxGeometry args={[0.4, 0.1, 0.2]} />
                                <meshStandardMaterial color="#475569" />
                            </mesh>
                            <Text position={[0, 1.1, 0.31]} fontSize={0.1} color="white">COFFEE</Text>
                        </group>
                    )
                }
                if (key === 'meetingTable') {
                     return (
                         <mesh key={key} position={[pos.x, 0.4, pos.z]} castShadow receiveShadow>
                             <cylinderGeometry args={[1, 1, 0.8, 16]} />
                             <meshStandardMaterial color="#1f2937" />
                         </mesh>
                     );
                }
                if (key.includes('Desk')) {
                     return (
                         <group key={key} position={pos}>
                           <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
                               <boxGeometry args={[1.5, 0.8, 0.8]} />
                               <meshStandardMaterial color="#111827" />
                           </mesh>
                           <mesh position={[0, 1.0, 0.1]} rotation={[0, Math.PI, 0]} castShadow>
                               <boxGeometry args={[0.8, 0.5, 0.05]} />
                               <meshStandardMaterial color="#000000" />
                           </mesh>
                         </group>
                     );
                }
                return null;
            })}

            {Object.values(agentStates).map(state => (
                <ProceduralAgent key={state.id} state={state} />
            ))}

            <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.6} far={10} color="#000000" />
            <OrbitControls makeDefault enableDamping dampingFactor={0.05} maxPolarAngle={Math.PI / 2 - 0.05} autoRotate={false} />
        </>
    );
}
