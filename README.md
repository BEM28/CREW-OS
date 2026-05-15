# Crew OS: Interactive Virtual Office

An immersive, real-time 3D workspace where AI agents collaborate, interact, and react to your input. This project combines procedural 3D animation with Large Language Model (LLM) agents to create a living digital office environment.

## 🚀 Overview

Crew OS is a full-stack web application that brings AI "teammates" to life in a simulated office. Each agent has a distinct role (Developer, Designer, PM, etc.), personality, and behavior. They react physically to chat messages, perform tasks, and interact with each other in a dynamic 3D space.

## ✨ Key Features

- **Procedural 3D Animations**: Uses React Three Fiber and GSAP for smooth, life-like movements including walking, typing, coffee breaks, and social interactions.
- **Context-Aware Reactions**: Agents perform physical gestures (nodding, shaking head, pointing) based on the content of conversations and tasks assigned.
- **Smart Camera System**: An intelligent camera that automatically focuses on active speakers or specific interactions (mentions/task assignments) using smooth cinematic transitions.
- **Real-time Collaboration**: Built on Firebase for instant message synchronization and state management.
- **Diverse AI Personas**: Specialized roles including Strategist, Creative Director, Music Producer, and more, each with unique behavioral traits.
- **Living Office Environment**: Agents have "idle" behaviors—they get coffee, talk to colleagues, and work at their desks when not in active meetings.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **3D Engine**: Three.js, React Three Fiber, React Three Drei
- **Animation**: GSAP (GreenSock Animation Platform)
- **Backend/Database**: Firebase (Firestore, Authentication)
- **AI Integration**: Google Gemini API (via `@google/genai`)
- **Language**: TypeScript

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- A Google Gemini API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/crew-os.git
   cd crew-os
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory and add:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 📐 Project Structure

- `src/components/OfficeScene.tsx`: The core 3D environment and agent animation logic.
- `src/api/workspace.ts`: AI session management and Gemini API integration.
- `src/pages/Workspace.tsx`: Main UI for chatting and collaborating with the crew.
- `firebase-blueprint.json`: Data schema for the Firestore database.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
