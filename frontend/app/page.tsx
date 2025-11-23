/**
 * Main Application Entry Point
 * Manages the 4-stage flow: Landing -> Setup -> Call -> Summary
 */
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LandingPage from "./components/LandingPage";
import SetupPage from "./components/SetupPage";
import CallInterface from "./components/CallInterface";
import SummaryPage from "./components/SummaryPage";

type ViewState = "landing" | "setup" | "call" | "summary";

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewState>("landing");
  const [selectedBg, setSelectedBg] = useState("bg1"); // Default background ID
  const [selectedAvatar, setSelectedAvatar] = useState("doctorm");
  const [selectedVoice, setSelectedVoice] = useState("Sq93GQT4X1lKDXsQcixO"); // Default to Felix (Doctor M)
  const [conversationData, setConversationData] = useState<any[]>([]); // Store conversation for summary

  const renderView = () => {
    switch (currentView) {
      case "landing":
        return <LandingPage onGetStarted={() => setCurrentView("setup")} />;
      case "setup":
        return (
          <SetupPage
            onConnect={() => setCurrentView("call")}
            selectedBg={selectedBg}
            setSelectedBg={setSelectedBg}
            onBack={() => setCurrentView("landing")}
            selectedAvatar={selectedAvatar}
            setSelectedAvatar={setSelectedAvatar}
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
          />
        );
      case "call":
        return (
          <CallInterface
            onEndCall={(messages) => {
              setConversationData(messages);
              setCurrentView("summary");
            }}
            selectedBg={selectedBg}
            avatarId={selectedAvatar}
            selectedAvatar={selectedAvatar}
            selectedVoice={selectedVoice}
          />
        );
      case "summary":
        return (
          <SummaryPage
            onBackToMain={() => setCurrentView("landing")}
            conversationData={conversationData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen w-full overflow-hidden bg-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
