/**
 * InsightsDashboard Component
 * Displays conversation summary and emotion analytics
 */
"use client";

import { useState } from "react";

interface EmotionData {
  timestamp: string;
  emotion: string;
}

interface EmotionStats {
  total_samples: number;
  emotion_counts: Record<string, number>;
  emotion_percentages: Record<string, number>;
  dominant_emotion: string;
}

interface InsightsDashboardProps {
  summary?: string;
  emotionChart?: EmotionData[];
  emotionStats?: EmotionStats;
  onRequestInsights?: () => void;
}

export default function InsightsDashboard({
  summary,
  emotionChart,
  emotionStats,
  onRequestInsights,
}: InsightsDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getEmotionColor = (emotion: string): string => {
    const colors: Record<string, string> = {
      happy: "bg-yellow-400",
      sad: "bg-blue-400",
      angry: "bg-red-400",
      fearful: "bg-purple-400",
      surprised: "bg-pink-400",
      disgusted: "bg-green-400",
      neutral: "bg-gray-400",
    };
    return colors[emotion] || "bg-gray-400";
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Conversation Insights
          </h2>
          <button
            className="text-white hover:text-gray-200 transition-transform"
            style={{
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 py-4 space-y-6">
          {/* Generate insights button */}
          {!summary && (
            <button
              onClick={onRequestInsights}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Generate Insights
            </button>
          )}

          {/* Summary */}
          {summary && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Emotion Statistics */}
          {emotionStats && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Emotion Analysis
              </h3>

              {/* Dominant emotion */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Dominant Emotion</p>
                <p className="text-2xl font-bold text-gray-800 capitalize">
                  {emotionStats.dominant_emotion}
                </p>
              </div>

              {/* Emotion breakdown */}
              <div className="space-y-2">
                {Object.entries(emotionStats.emotion_percentages).map(
                  ([emotion, percentage]) => (
                    <div key={emotion}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-gray-700">
                          {emotion}
                        </span>
                        <span className="text-gray-600">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${getEmotionColor(
                            emotion
                          )} h-2 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Emotion timeline (placeholder for chart) */}
          {emotionChart && emotionChart.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Emotion Timeline
              </h3>
              <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 text-sm">
                  Chart visualization (TODO: integrate Chart.js)
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
