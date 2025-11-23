"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { generatePDF } from "../utils/pdfGenerator";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SummaryPageProps {
  onBackToMain: () => void;
  conversationData: Message[];
}

interface SummaryData {
  overview: string;
  recommendations: string[];
}

export default function SummaryPage({
  onBackToMain,
  conversationData,
}: SummaryPageProps) {
  const [summary, setSummary] = useState<SummaryData>({
    overview: "",
    recommendations: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false); // Prevent double fetch in React Strict Mode

  useEffect(() => {
    // Only fetch once, even in React Strict Mode
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchInsights();
    }
  }, []);

  const fetchInsights = async () => {
    console.log("📊 Fetching insights from API...");
    try {
      setIsLoading(true);
      setError(null);

      // Format conversation data for API
      const formattedConversation = conversationData.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        emotion: "neutral", // TODO: Add real emotion tracking
      }));

      // For now, use neutral emotions (Person 2 will add real emotion detection)
      const emotions = conversationData.map(() => "neutral");
      const timestamps = conversationData.map((msg) =>
        msg.timestamp.toISOString()
      );

      const response = await fetch("http://localhost:8000/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation: formattedConversation,
          emotions: emotions,
          timestamps: timestamps,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch insights");
      }

      const data = await response.json();
      console.log("✓ Insights received:", data.summary);
      setSummary(data.summary);
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError("Failed to generate summary. Please try again.");
      // Fallback to a basic summary
      setSummary(generateBasicSummary());
    } finally {
      setIsLoading(false);
    }
  };

  const generateBasicSummary = (): SummaryData => {
    if (conversationData.length === 0) {
      return {
        overview: "No conversation data available.",
        recommendations: [],
      };
    }

    const userMessages = conversationData.filter((msg) => msg.role === "user");
    return {
      overview: `Consultation completed with ${userMessages.length} patient responses. The conversation covered various health concerns and symptoms.`,
      recommendations: [
        "Follow up with a healthcare provider if needed",
        "Monitor your symptoms",
        "Maintain a healthy lifestyle",
      ],
    };
  };

  const handleDownload = () => {
    generatePDF(summary);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
      >
        <div className="p-8 md:p-12">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">
              Consultation Summary
            </h2>
            <button
              onClick={onBackToMain}
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              Back to Home
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Conversation Summary */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-lg font-semibold mb-6 text-gray-800 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Conversation Insights
              </h3>

              {isLoading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse" />
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {summary.overview}
                  </p>
                </div>
              )}
            </div>

            {/* Going Forward */}
            <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100">
              <h3 className="text-lg font-semibold mb-6 text-gray-800 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                Going Forward
              </h3>
              {isLoading ? (
                <ul className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold mt-0.5 mr-3">
                        {i}
                      </div>
                      <div className="h-4 bg-blue-200/50 rounded w-full mt-1 animate-pulse" />
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-4">
                  {summary.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold mt-0.5 mr-3">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-700 flex-1 mt-0.5">
                        {rec}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
                >
                  Download Report
                </button>
                <button className="flex-1 py-3 bg-white text-blue-600 border border-blue-200 rounded-xl font-medium hover:bg-blue-50 transition-colors">
                  Copy Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
