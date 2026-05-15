import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { doc, getDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase/client';
import { Canvas } from '@react-three/fiber';
import { Edit2, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { OfficeScene } from '../components/OfficeScene';

export default function Workspace() {
  const { companyId, projectId } = useParams();
  const { user } = useUserStore();
  const [project, setProject] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentMemories, setAgentMemories] = useState<Record<string, any>>({});
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !companyId || !projectId) return;

    // Fetch Project details
    const fetchProject = async () => {
      try {
          const pRef = doc(db, 'users', user.uid, 'companies', companyId, 'projects', projectId);
          const snap = await getDoc(pRef);
          if (snap.exists()) {
            setProject({ id: snap.id, ...snap.data() });
          }
      } catch (e) {
          handleFirestoreError(e, OperationType.GET, 'projects');
      }
    };
    fetchProject();

    // Fetch Agents
    const fetchAgents = async () => {
        try {
            const agentsRef = collection(db, 'users', user.uid, 'agents');
            const unsub = onSnapshot(query(agentsRef), (snap) => {
                setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsub();
        } catch (e) {
            handleFirestoreError(e, OperationType.LIST, 'agents');
        }
    };
    fetchAgents();

    // Fetch Agent Memories for the project
    const fetchAgentMemories = async () => {
        try {
            const memoriesRef = collection(db, 'users', user.uid, 'companies', companyId, 'projects', projectId, 'agentMemory');
            const unsub = onSnapshot(query(memoriesRef), (snap) => {
                const memories: Record<string, any> = {};
                snap.docs.forEach(doc => {
                    memories[doc.id] = doc.data();
                });
                setAgentMemories(memories);
            });
            return () => unsub();
        } catch (e) {
            handleFirestoreError(e, OperationType.LIST, 'agentMemory');
        }
    };
    fetchAgentMemories();
  }, [user, companyId, projectId]);

  // Fetch and sync sessions list
  useEffect(() => {
     if (!user || !companyId || !projectId) return;
     const sessionsRef = collection(db, 'users', user.uid, 'companies', companyId, 'projects', projectId, 'sessions');
     const unsub = onSnapshot(query(sessionsRef, orderBy('createdAt', 'desc')), (snap) => {
         const fetchedSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
         setSessions(fetchedSessions);
         
         // Set initial active session if not selected yet
         if (fetchedSessions.length > 0) {
             setActiveSessionId(prev => {
                 if (!prev) return fetchedSessions[0].id;
                 // verify current still exists, else fallback
                 if (!fetchedSessions.find(s => s.id === prev)) return fetchedSessions[0].id;
                 return prev;
             });
         }
     }, error => handleFirestoreError(error, OperationType.LIST, 'sessions'));
     
     return () => unsub();
  }, [user, companyId, projectId]);

  // Listen to active session messages
  useEffect(() => {
     if (!user || !companyId || !projectId || !activeSessionId) {
         setMessages([]);
         return;
     }

     const messagesRef = collection(db, 'users', user.uid, 'companies', companyId, 'projects', projectId, 'sessions', activeSessionId, 'messages');
     const unsub = onSnapshot(query(messagesRef, orderBy('timestamp', 'asc')), (msgSnap) => {
         setMessages(msgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
     }, error => handleFirestoreError(error, OperationType.LIST, 'messages'));

     return () => unsub();
  }, [user, companyId, projectId, activeSessionId]);

  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, localMessages, isProcessing]);

  const sendMessage = async () => {
      if (!message.trim() || !user || !companyId || !projectId || !project) return;
      
      const currentLabel = message;
      setMessage('');
      setIsSending(true);
      setIsProcessing(true);
      
      const localId = `local-${Date.now()}`;
      setLocalMessages(prev => [...prev, {
         id: localId,
         senderType: 'user',
         senderName: user.name || "You",
         content: currentLabel,
         timestamp: { toMillis: () => Date.now() },
         isLocal: true
      }]);

      try {
          const sessionsRef = collection(db, 'users', user.uid, 'companies', companyId, 'projects', projectId, 'sessions');
          let sessionId = activeSessionId;
          
          if (!sessionId) {
              const newSession = await addDoc(sessionsRef, {
                  title: "New Session",
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  endedAt: null,
                  participants: project.selectedAgents || [],
                  workflowState: "idle",
                  messageCount: 1,
                  lastMessage: currentLabel,
                  lastMessageAt: serverTimestamp()
              });
              sessionId = newSession.id;
              setActiveSessionId(sessionId);
          }

          const sessionRef = doc(sessionsRef, sessionId);
          const messagesRef = collection(sessionRef, "messages");

          // 1. Add user message
          await Promise.all([
              setDoc(doc(messagesRef, localId), {
                  userId: user.uid,
                  senderType: "user",
                  senderId: user.uid,
                  senderName: user.name || "User",
                  content: currentLabel,
                  timestamp: serverTimestamp()
              }),
              updateDoc(sessionRef, {
                  lastMessage: currentLabel,
                  lastMessageAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
              })
          ]);

          // 2. Formulate context
          const recentMessagesStr = [...messages, ...localMessages].slice(-10).map((m: any) => `${m.senderName}: ${m.content}`).join("\\n");
          
          // Prepare agents data
          const agentsData: any[] = [];
          for (const aid of (project.selectedAgents || [])) {
              const agentDoc = agents.find(a => a.id === aid);
              if (agentDoc) {
                  const memData = agentMemories[aid] || { shortTermMemory: [], longTermSummary: "", projectKnowledge: [], unresolvedConcerns: [] };
                  agentsData.push({
                      ...agentDoc,
                      memory: memData,
                      emotionalState: memData.emotionalState || agentDoc.defaultEmotion || "FOCUSED"
                  });
              }
          }

          // 3. Call backend purely for LLM resolution
          const response = await fetch('/api/war-room/message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  message: currentLabel,
                  projectSummary: project.projectSummary || project.description || "",
                  recentMessages: recentMessagesStr,
                  agentsData
              })
          });
          
          const result = await response.json();
          if (result.success && result.replies) {
              const projectMemRef = collection(db, 'users', user.uid, 'companies', companyId, 'projects', projectId, 'agentMemory');

              for (let i = 0; i < result.replies.length; i++) {
                  const rep = result.replies[i];
                  // Add agent message
                  await addDoc(messagesRef, {
                      userId: user.uid,
                      senderType: "agent",
                      senderId: rep.agentId,
                      senderName: rep.agentName,
                      role: rep.role,
                      content: rep.reply.text,
                      emotion: rep.reply.emotion,
                      timestamp: serverTimestamp()
                  });

                  // Update Agent Memory using Web SDK
                  const memDocRef = doc(projectMemRef, rep.agentId);
                  const memData = agentMemories[rep.agentId] || {};
                  
                  const safeShortTermMemory = Array.isArray(memData.shortTermMemory) ? memData.shortTermMemory : [];
                  const updatedShortTerm = [...safeShortTermMemory, { role: "thought", content: rep.reply.internalThought }].slice(-10);
                  
                  const safeKnowledge = Array.isArray(memData.projectKnowledge) ? memData.projectKnowledge : [];
                  const newK = Array.isArray(rep.reply.newKnowledge) ? rep.reply.newKnowledge : [];
                  const updatedKnowledge = Array.from(new Set([...safeKnowledge, ...newK])).slice(0, 20);
                  
                  const safeConcerns = Array.isArray(memData.unresolvedConcerns) ? memData.unresolvedConcerns : [];
                  const newC = Array.isArray(rep.reply.newConcerns) ? rep.reply.newConcerns : [];
                  const updatedConcerns = Array.from(new Set([...safeConcerns, ...newC])).slice(0, 10);

                  await setDoc(memDocRef, {
                      shortTermMemory: updatedShortTerm,
                      longTermSummary: memData.longTermSummary || "",
                      emotionalState: ["HYPED", "FOCUSED", "SKEPTICAL"].includes(rep.reply.emotion) ? rep.reply.emotion : "FOCUSED",
                      relationshipState: memData.relationships || {},
                      projectKnowledge: updatedKnowledge,
                      unresolvedConcerns: updatedConcerns,
                      updatedAt: serverTimestamp()
                  }, { merge: true });

                  // If it's the last reply, update the session's last message
                  if (i === result.replies.length - 1) {
                      await updateDoc(sessionRef, {
                          lastMessage: rep.reply.text,
                          lastMessageAt: serverTimestamp(),
                          updatedAt: serverTimestamp()
                      });
                  }
              }
          }

      } catch (e) {
          console.error(e);
          // remove local message if failed
          setLocalMessages(prev => prev.filter(m => m.id !== localId));
      } finally {
          setIsSending(false);
          setIsProcessing(false);
          setLocalMessages(prev => prev.filter(m => m.id !== localId));
      }
  };

  const handleUpdateDescription = async () => {
      if (!user || !companyId || !projectId || !editDescription.trim()) return;
      try {
          const pRef = doc(db, 'users', user.uid, 'companies', companyId, 'projects', projectId);
          await updateDoc(pRef, {
              description: editDescription,
              projectSummary: editDescription
          });
          setProject((prev: any) => ({ ...prev, description: editDescription, projectSummary: editDescription }));
          setIsEditingDescription(false);
      } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, 'projects');
      }
  };

  return (
    <div className="flex h-screen w-full bg-[#05060A] overflow-hidden text-[#F8FAFC]">
      {/* Left Sidebar */}
      <aside className="w-[280px] bg-[#0B0D14] border-r border-white/10 flex flex-col hidden lg:flex shrink-0">
         <div className="p-4 border-b border-white/10 group relative">
           <h2 className="font-semibold">{project?.name || 'Loading...'}</h2>
           {isEditingDescription ? (
               <div className="mt-2 space-y-2">
                 <textarea 
                   value={editDescription}
                   onChange={(e) => setEditDescription(e.target.value)}
                   className="w-full h-20 bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-purple-500 resize-none"
                 />
                 <div className="flex gap-2 justify-end">
                   <button onClick={() => setIsEditingDescription(false)} className="p-1 text-[#94A3B8] hover:text-[#F8FAFC]"><X className="w-4 h-4" /></button>
                   <button onClick={handleUpdateDescription} className="p-1 text-purple-500 hover:text-purple-400"><Check className="w-4 h-4" /></button>
                 </div>
               </div>
           ) : (
               <div className="relative">
                 <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2 pr-6">{project?.description}</p>
                 <button 
                    onClick={() => {
                        setEditDescription(project?.description || '');
                        setIsEditingDescription(true);
                    }}
                    className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#94A3B8] hover:text-[#F8FAFC]"
                 >
                    <Edit2 className="w-3.5 h-3.5" />
                 </button>
               </div>
           )}
         </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Crew</h3>
              </div>
              {/* Agent list */}
              <div className="space-y-2">
                 {(!project?.selectedAgents || project.selectedAgents.length === 0) ? (
                    <div className="text-sm p-2 bg-[#111827] rounded-lg border border-white/10 text-center text-[#94A3B8]">No agents</div>
                 ) : (
                    project.selectedAgents.map((agentId: string) => {
                      const agent = agents.find(a => a.id === agentId);
                      const mem = agentMemories[agentId] || {};
                      const emotion = mem.emotionalState || agent?.defaultEmotion || 'FOCUSED';
                      
                      return (
                      <div key={agentId} className="flex items-center gap-3 p-3 bg-[#111827] rounded-xl border border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-[#0B0D14] border border-white/10 flex items-center justify-center text-sm">{agent?.roleEmoji || '🤖'}</div>
                        <div className="flex-1 min-w-0">
                           <div className="text-sm font-medium text-[#F8FAFC] truncate">{agent ? agent.name : `Agent ${agentId.substring(0, 4)}`}</div>
                           <div className="flex items-center gap-2 mt-0.5">
                             <span className={clsx(
                               "text-[10px] w-2 h-2 rounded-full",
                               emotion === 'HYPED' ? 'bg-purple-500' : emotion === 'SKEPTICAL' ? 'bg-error' : 'bg-success'
                             )} />
                             <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider truncate">{emotion}</span>
                           </div>
                        </div>
                      </div>
                    )})
                 )}
              </div>
            </div>
            
            <div className="mt-8 border-t border-white/10 pt-4">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Sessions</h3>
                  <button 
                     onClick={() => setActiveSessionId(null)}
                     className="text-[10px] bg-[#111827] border border-white/10 px-2 py-1 rounded text-[#F8FAFC] hover:bg-white/5 transition-colors"
                  >
                     + New
                  </button>
               </div>
               <div className="space-y-2">
                  {sessions.length === 0 && (
                     <div className="text-sm p-2 bg-[#111827] rounded-lg border border-white/10 text-center text-[#94A3B8]">No sessions</div>
                  )}
                  {sessions.map(s => (
                     <div 
                         key={s.id} 
                         onClick={() => setActiveSessionId(s.id)}
                         className={clsx(
                             "p-3 rounded-xl border cursor-pointer transition-all text-sm",
                             activeSessionId === s.id 
                                ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/50 text-[#F8FAFC] shadow-lg shadow-purple-500/10" 
                                : "bg-[#111827] border-white/10 text-[#94A3B8] hover:border-white/20"
                         )}
                     >
                         <div className="flex justify-between items-start gap-2 mb-1">
                            <div className="font-medium truncate flex-1">{s.title || "Session"}</div>
                            <div className="text-[10px] opacity-40 shrink-0 mt-0.5">
                                {(() => {
                                    const date = s.lastMessageAt?.toDate?.() || s.createdAt?.toDate?.();
                                    if (!date) return 'Just now';
                                    const now = new Date();
                                    const diff = now.getTime() - date.getTime();
                                    if (diff < 60000) return 'now';
                                    if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
                                    if (diff < 86400000) return `${Math.floor(diff/3600000)}h`;
                                    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                })()}
                            </div>
                         </div>
                         {s.lastMessage && (
                            <div className="text-xs opacity-50 line-clamp-1 italic">
                               "{s.lastMessage}"
                            </div>
                         )}
                         {!s.lastMessage && (
                            <div className="text-[10px] opacity-30 italic mt-1">
                               No messages yet
                            </div>
                         )}
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </aside>

      {/* Center Flexible Workspace */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col">
          {/* 3D Office Scene */}
          <div className="w-full min-h-[320px] sm:min-h-[520px] shrink-0 rounded-2xl border border-white/10 overflow-hidden relative bg-[#0B0D14] shadow-xl">
            <div className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium text-[#F8FAFC] border border-white/10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              Live Workspace
            </div>
            <Canvas shadows camera={{ position: [0, 6, 8], fov: 45 }}>
              <OfficeScene agents={agents} projectSelectedAgents={project?.selectedAgents || []} messages={messages} activeSessionId={activeSessionId} />
            </Canvas>
          </div>

          {/* Chat Timeline Output */}
          <div 
             ref={chatScrollRef}
             className="flex-1 overflow-y-auto mt-6 rounded-2xl bg-[#0B0D14] border border-white/10 p-4 mb-20 sm:mb-24 flex flex-col gap-6 shadow-xl scrollbar-thin scrollbar-thumb-white/10 scroll-smooth"
          >
             <div className="text-center text-xs text-[#94A3B8] border-b border-white/10 pb-4 mb-2">
               Session log
             </div>
             
             {messages.length === 0 && localMessages.length === 0 && !isProcessing && (
                <div className="text-sm text-center text-[#94A3B8] my-auto">
                   Your war room is ready. Tell your crew what you want to build.
                </div>
             )}

             {/* Combined Messages */}
             {(() => {
                const allMessagesMap = new Map();
                messages.forEach(m => allMessagesMap.set(m.id, m));
                localMessages.forEach(m => {
                   if (!allMessagesMap.has(m.id)) allMessagesMap.set(m.id, m);
                });
                return Array.from(allMessagesMap.values()).sort((a, b) => {
                    const at = a.timestamp?.toMillis ? a.timestamp.toMillis() : Date.now();
                    const bt = b.timestamp?.toMillis ? b.timestamp.toMillis() : Date.now();
                    return at - bt;
                });
             })().map(m => (
               <div key={m.id} className={clsx("flex w-full", m.senderType === 'user' ? "justify-end" : "justify-start")}>
                  {m.senderType === 'user' ? (
                     <div className="max-w-[80%] bg-gradient-to-br from-[#7C3AED] to-[#38bdf8] text-white p-4 rounded-2xl rounded-tr-sm shadow-md">
                       <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                     </div>
                  ) : (
                     <div className="flex gap-4 max-w-[85%]">
                       <div className="w-10 h-10 rounded-full bg-[#111827] border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                         🤖
                       </div>
                       <div>
                         <div className="flex items-center gap-2 mb-1.5">
                           <span className="text-sm font-semibold text-[#F8FAFC]">{m.senderName}</span>
                           <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider">{m.role}</span>
                           {m.emotion && <span className="text-[10px] bg-black/30 border border-white/5 px-1.5 py-0.5 rounded text-[#94A3B8]">{m.emotion}</span>}
                         </div>
                         <div className="bg-[#111827]/80 backdrop-blur-sm border border-white/10 p-4 rounded-2xl rounded-tl-sm text-sm text-[#F8FAFC] leading-relaxed shadow-sm whitespace-pre-wrap">
                           {m.content}
                         </div>
                       </div>
                     </div>
                  )}
               </div>
             ))}
             
             {isProcessing && (
                <div className="flex justify-start w-full">
                   <div className="flex gap-4 max-w-[85%]">
                       <div className="w-10 h-10 rounded-full bg-[#111827] border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                         🤖
                       </div>
                       <div>
                         <div className="bg-[#111827]/80 backdrop-blur-sm border border-white/10 p-4 rounded-2xl rounded-tl-sm text-sm text-[#94A3B8] shadow-sm flex items-center gap-2">
                           <span className="animate-pulse">●</span>
                           <span className="animate-pulse delay-75">●</span>
                           <span className="animate-pulse delay-150">●</span>
                           <span className="ml-2">Your crew is discussing...</span>
                         </div>
                       </div>
                   </div>
                </div>
             )}
          </div>
        </div>

        {/* Bottom Input Dock */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-4xl bg-[#111827]/90 backdrop-blur-xl border border-[#38bdf8]/20 rounded-2xl p-2 shadow-2xl flex items-center gap-3 z-20">
           <textarea 
             value={message}
             onChange={e => setMessage(e.target.value)}
             onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   sendMessage();
                }
             }}
             placeholder="Discuss the project or @mention your team..."
             className="flex-1 bg-transparent border-none text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none p-3 ml-2 resize-none max-h-32 min-h-[44px] scrollbar-none"
             rows={1}
             disabled={isSending}
           />
           <button 
             onClick={sendMessage}
             disabled={isSending || !message.trim()}
             className="bg-gradient-to-r from-[#7C3AED] to-[#38bdf8] text-white h-11 px-6 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
           >
             {isSending ? 'Sending...' : 'Send'}
           </button>
        </div>
      </main>

      {/* Right Panel */}
      <aside className="w-[320px] bg-[#0B0D14] border-l border-white/10 flex flex-col hidden xl:flex">
         <div className="p-5 border-b border-white/10 flex items-center justify-between">
           <h3 className="font-semibold text-[#F8FAFC]">Project State</h3>
         </div>
         <div className="p-5 space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Recent Knowledge</h4>
              {project?.selectedAgents?.map((aid: string) => {
                  const knowledge = agentMemories[aid]?.projectKnowledge || [];
                  if (knowledge.length === 0) return null;
                  const agent = agents.find(a => a.id === aid);
                  return (
                      <div key={aid} className="mb-4">
                          <span className="text-xs font-medium text-[#F8FAFC] block mb-2">{agent?.name || 'Agent'}</span>
                          <ul className="list-disc pl-4 space-y-1">
                              {knowledge.slice(0, 3).map((k: string, i: number) => (
                                  <li key={i} className="text-xs text-[#94A3B8]">{k}</li>
                              ))}
                          </ul>
                      </div>
                  );
              })}
              {(!project?.selectedAgents || !project.selectedAgents.some((aid: string) => agentMemories[aid]?.projectKnowledge?.length > 0)) && (
                 <p className="text-xs text-[#94A3B8]">No knowledge extracted yet.</p>
              )}
            </div>
         </div>
      </aside>
    </div>
  );
}
