import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { encryptKey } from "../lib/encryption";

export const agentsRouter = Router();

const ROLE_PRESETS: Record<string, any> = {
  "Product Manager": { emoji: "📦", accent: "#3b82f6", temp: 0.4, defaultEmotion: "FOCUSED", base: "Structured, deadline-driven, uses frameworks, challenges scope, pushes for clarity, and keeps the team aligned." },
  "UI/UX Designer": { emoji: "✨", accent: "#a855f7", temp: 0.9, defaultEmotion: "HYPED", base: "Visual-first, aesthetic-driven, references design systems, cares deeply about usability, user emotion, and product feel." },
  "Lead Developer": { emoji: "💻", accent: "#22c55e", temp: 0.3, defaultEmotion: "SKEPTICAL", base: "Technical, realistic, scalability-focused, asks about edge cases, challenges vague ideas, and protects engineering quality." },
  "Marketing & Growth": { emoji: "🚀", accent: "#f97316", temp: 0.85, defaultEmotion: "HYPED", base: "Growth-focused, trend-aware, thinks in channels, positioning, virality, distribution, and market timing." },
  "QA Engineer": { emoji: "🐛", accent: "#ef4444", temp: 0.2, defaultEmotion: "SKEPTICAL", base: "Methodical, careful, documents everything, catches hidden bugs, edge cases, and product risks." },
  "Strategist": { emoji: "🎯", accent: "#10b981", temp: 0.5, defaultEmotion: "FOCUSED", base: "Long-term thinker, market-aware, looks at unit economics, competitive landscape, and high-level mission." },
  "Copywriter": { emoji: "✍️", accent: "#f59e0b", temp: 0.8, defaultEmotion: "HYPED", base: "Word-smith, cares about tone of voice, narrative arc, persuasion, and clarity in messaging." },
  "Producer": { emoji: "🎬", accent: "#6366f1", temp: 0.4, defaultEmotion: "FOCUSED", base: "Relentless coordinator, timeline-obsessed, removes blockers, and ensures everyone has what they need to execute." },
  "Creative Director": { emoji: "🎨", accent: "#ec4899", temp: 0.95, defaultEmotion: "HYPED", base: "Visionary, mood-setter, pushes for original ideas, protects the brand soul, and ignores technical limits." },
  "Social Media Manager": { emoji: "📱", accent: "#06b6d4", temp: 0.8, defaultEmotion: "HYPED", base: "Engagement-focused, meme-literate, understands platform algorithms, virality, and community building." },
  "Director of Photography": { emoji: "📹", accent: "#84cc16", temp: 0.7, defaultEmotion: "FOCUSED", base: "Visual storyteller, cares about lighting, framing, texture, and the subconscious impact of an image." },
  "Music Producer": { emoji: "🎹", accent: "#fb7185", temp: 0.85, defaultEmotion: "HYPED", base: "Sensitive to rhythm, tone, and soundscapes. Thinks in layers, frequency, and emotional resonance." },
  "PR Manager": { emoji: "📢", accent: "#14b8a6", temp: 0.5, defaultEmotion: "FOCUSED", base: "Reputation-focused, media-savvy, prepares for crises, and builds relationships with journalists and influencers." },
  "Buyer": { emoji: "🛍️", accent: "#f43f5e", temp: 0.6, defaultEmotion: "FOCUSED", base: "Trend-calculator, sources best materials, knows market value, and predicts what people will want next season." },
  "Custom": { emoji: "🤖", accent: "#64748b", temp: 0.7, defaultEmotion: "FOCUSED", base: "Highly capable specialist bringing unique perspective to the team." }
};

agentsRouter.post("/test-key", async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ valid: false, message: "Missing key" });

  try {
    const ai = new GoogleGenAI({ apiKey });
    // simplest possible call to verify it works
    await ai.models.generateContent({
      model: "gemini-2.0-flash", // Use latest gemini model
      contents: "say hi"
    });
    return res.json({ valid: true });
  } catch (error) {
    return res.json({ valid: false, message: error instanceof Error ? error.message : "Key check failed" });
  }
});

agentsRouter.post("/create", async (req, res) => {
  try {
    const { uid, name, role, apiKey, personalityNotes, accentColor } = req.body;

    // Simplistic auth check for now
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader.split(" ")[1] !== uid) {
       return res.status(401).json({ error: "Unauthorized" });
    }

    const encryptedKey = encryptKey(apiKey);
    const keyPreview = `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`;
    
    let preset = ROLE_PRESETS[role];
    if (!preset) preset = ROLE_PRESETS["Custom"];

    // Return the built agent entity so the frontend can securely commit it to the database
    return res.json({ 
        success: true, 
        agentData: {
            name,
            role,
            roleEmoji: preset.emoji,
            encryptedKey,
            keyPreview,
            personalityNotes: personalityNotes || "",
            basePersonality: preset.base,
            accentColor: accentColor || preset.accent,
            temperature: preset.temp,
            defaultEmotion: preset.defaultEmotion,
            isActive: true
        } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate encrypted agent data" });
  }
});

