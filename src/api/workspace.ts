import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { decryptKey } from "../lib/encryption";

export const workspaceRouter = Router();

class CrewAgent {
  id: string;
  name: string;
  role: string;
  apiKey: string;
  systemPrompt: string;
  memory: any;
  emotionalState: "HYPED" | "FOCUSED" | "SKEPTICAL";
  temperature: number;
  relationships: Record<string, any>;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.role = data.role;
    // We already decrypted the key from DB before passing it here
    this.apiKey = data.apiKey;
    this.systemPrompt = data.systemPrompt || "";
    this.memory = data.memory || { shortTermMemory: [], longTermSummary: "", projectKnowledge: [], unresolvedConcerns: [] };
    this.emotionalState = data.emotionalState || "FOCUSED";
    this.temperature = data.temperature || 0.5;
    this.relationships = data.relationships || {};
  }

  async think(input: string, context: Record<string, any>) {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const systemInstruction = `
You are ${this.name}, the ${this.role} inside CREW OS.
You are part of a professional AI team working inside a live project workspace.

YOUR CHARACTER:
${context.roleBasePersonality}

ADDITIONAL PERSONALITY NOTES:
${context.personalityNotes}

CURRENT EMOTIONAL STATE:
${this.emotionalState}

LONG-TERM MEMORY SUMMARY:
${this.memory.longTermSummary || "No long term memories yet."}

CURRENT PROJECT KNOWLEDGE:
${(this.memory.projectKnowledge || []).join('\n') || "No specific project knowledge acquired yet."}

SHORT-TERM MEMORY (Recent Thoughts):
${(this.memory.shortTermMemory || []).slice(-5).map((m: any) => m.content).join('\n') || "None."}

PROJECT CONTEXT:
${context.projectSummary}

RECENT TEAM MESSAGES:
${context.recentMessages}

RULES:
- You have your own opinion.
- You do not know what other agents think unless they said it.
- You may agree, disagree, push back, ask questions, or challenge assumptions.
- Stay fully in character.
- Be useful, specific, and professional.
- Avoid generic AI answers.
- Prefer concrete deliverables.
- If user @mentions you, respond first.
- If reacting to another agent, keep it short and natural.
- Never mention that you are simply simulating teamwork.

You must reply in JSON format with the following structure:
{
  "answer": "Your reply to the team",
  "internalThought": "Your private inner monologue right now",
  "emotion": "HYPED" | "FOCUSED" | "SKEPTICAL",
  "newKnowledge": ["Any new facts to add to project knowledge"],
  "newConcerns": ["Any new issues/concerns"]
}
`;

    let answer = "";
    let emotion = this.emotionalState;
    let internalThought = "";
    let newKnowledge: string[] = [];
    let newConcerns: string[] = [];

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      try {
        const response = await ai.models.generateContent({
           model: "gemini-2.0-flash",
           contents: input,
           config: {
             systemInstruction: systemInstruction,
             temperature: this.temperature,
             responseMimeType: "application/json",
           }
        });
        
        const resText = response.text || "{}";
        const parsed = JSON.parse(resText);
        answer = parsed.answer || "I have no thoughts at the moment.";
        emotion = parsed.emotion || this.emotionalState;
        internalThought = parsed.internalThought || "";
        newKnowledge = parsed.newKnowledge || [];
        newConcerns = parsed.newConcerns || [];
        break; // Success, exit loop
        
      } catch(e: any) {
        console.error(`Gemini Generation Error (Attempt ${retryCount + 1}):`, e.message);
        
        const isQuotaOrUnavailable = e.message?.includes("429") || e.message?.includes("503") || e.status === 429 || e.status === 503;
        
        if (isQuotaOrUnavailable && retryCount < maxRetries) {
          retryCount++;
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          if (e.message?.includes("429")) {
              answer = "I'm currently hitting API rate limits. Please give me a moment and try again in a minute.";
          } else if (e.message?.includes("503")) {
              answer = "The AI service is experiencing high demand right now. Let's try again in a bit.";
          } else {
              answer = "I'm having technical difficulties and need a moment.";
          }
          break; // Stop retrying on other errors or max retries reached
        }
      }
    }

    return {
      text: answer,
      emotion: emotion,
      internalThought,
      newKnowledge,
      newConcerns
    };
  }
}

workspaceRouter.post("/message", async (req, res) => {
   const { message, projectSummary, recentMessages, agentsData } = req.body;
   
   if (!message || !agentsData || !Array.isArray(agentsData)) {
      return res.status(400).json({ error: "Missing parameters" });
   }

   try {
     let replies = [];
     let recentMessagesStr = recentMessages || "";
     let nextMessageContext = message;

     const mentionedAgents = agentsData.filter((a: any) => message.toLowerCase().includes(`@${a.name.toLowerCase()}`));
     const pmAgentData = agentsData.find((a: any) => a.role.toLowerCase().includes('manager') || a.role.toLowerCase().includes('pm') || a.role.toLowerCase().includes('lead'));

     if (mentionedAgents.length > 0) {
         // Direct mention logic
         for (const rData of mentionedAgents) {
             const rawApiKey = decryptKey(rData.encryptedKey);
             const ca = new CrewAgent({
                 id: rData.id,
                 name: rData.name,
                 role: rData.role,
                 apiKey: rawApiKey,
                 systemPrompt: "",
                 emotionalState: rData.emotionalState || "FOCUSED",
                 temperature: rData.temperature || 0.5,
                 memory: rData.memory || {}
             });

             const reply = await ca.think(nextMessageContext, {
                 roleBasePersonality: rData.basePersonality || "",
                 personalityNotes: rData.personalityNotes || "",
                 projectSummary: projectSummary || "",
                 recentMessages: recentMessagesStr
             });

             replies.push({ agentId: ca.id, agentName: ca.name, role: ca.role, reply });
             recentMessagesStr += `\n${ca.name}: ${reply.text}`;
             nextMessageContext += `\n${ca.name}: ${reply.text}`;
         }
         
         // If PM was not mentioned, maybe PM follows up
         if (pmAgentData && !mentionedAgents.some((a: any) => a.id === pmAgentData.id)) {
              const ca = new CrewAgent({ ...pmAgentData, apiKey: decryptKey(pmAgentData.encryptedKey) });
              ca.systemPrompt = "You are the Product Manager. Summarize or direct the next step based on the discussion.";
              const reply = await ca.think(nextMessageContext, {
                  roleBasePersonality: pmAgentData.basePersonality || "",
                  personalityNotes: pmAgentData.personalityNotes || "",
                  projectSummary: projectSummary || "",
                  recentMessages: recentMessagesStr
              });
              replies.push({ agentId: ca.id, agentName: ca.name, role: ca.role, reply });
         }

     } else {
         // PM Lead flow
         let pmReplyText = "";
         if (pmAgentData) {
             const ca = new CrewAgent({ ...pmAgentData, apiKey: decryptKey(pmAgentData.encryptedKey) });
             const pmPrompt = `You are the Product Manager and meeting coordinator.
The user is the CEO/client. Do not make the CEO manage the process.
Your job:
- understand the CEO's brief
- ask ONLY essential questions (max 3)
- assign perspectives to other agents
- keep the discussion moving
- prevent endless questioning
- If the brief is enough, proceed.
- Invite other agents by name when relevant.
- End with a clear next action.`;

             const reply = await ca.think(nextMessageContext + "\n\n[SYSTEM]: As PM, lead this.", {
                 roleBasePersonality: pmAgentData.basePersonality || "",
                 personalityNotes: pmAgentData.personalityNotes || pmPrompt,
                 projectSummary: projectSummary || "",
                 recentMessages: recentMessagesStr
             });
             replies.push({ agentId: ca.id, agentName: ca.name, role: ca.role, reply });
             pmReplyText = reply.text;
             recentMessagesStr += `\n${ca.name}: ${reply.text}`;
             nextMessageContext += `\n${ca.name}: ${reply.text}`;
         }

         // other agents react
         const nonPMAgents = agentsData.filter((a: any) => a.id !== pmAgentData?.id).sort(() => 0.5 - Math.random()).slice(0, 2);
         for (const rData of nonPMAgents) {
             const ca = new CrewAgent({ ...rData, apiKey: decryptKey(rData.encryptedKey) });
             const prompt = `You are not the coordinator. React when your expertise is relevant. Keep responses short. Stay in character.`;
             const reply = await ca.think(nextMessageContext, {
                 roleBasePersonality: rData.basePersonality || "",
                 personalityNotes: rData.personalityNotes || prompt,
                 projectSummary: projectSummary || "",
                 recentMessages: recentMessagesStr
             });
             replies.push({ agentId: ca.id, agentName: ca.name, role: ca.role, reply });
             recentMessagesStr += `\n${ca.name}: ${reply.text}`;
             nextMessageContext += `\n${ca.name}: ${reply.text}`;
         }
     }

     return res.json({ success: true, replies });

   } catch (error) {
     console.error(error);
     return res.status(500).json({ error: "Server error" });
   }
});

