'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { playClick, playShimmer } from '@/engine/sounds';
import { 
  BrainCircuit, Sparkles, CheckCircle2, AlertTriangle, XCircle, 
  HelpCircle, TrendingUp, Award, RefreshCw, BarChart2, BookOpen
} from 'lucide-react';

export interface DiagnosticTestResult {
  id: string;
  subject: string;
  topic: string;
  score: number; // percentage 0 - 100
  totalQuestions: number;
  correctCount: number;
  weakPoints: string[];
  dateTested: string;
}

export function TestResultCard({ result }: { result: DiagnosticTestResult }) {
  const isHighMastery = result.score >= 75;
  const isModerateMastery = result.score >= 50 && result.score < 75;
  const isWeak = result.score < 50;

  let badgeColor = 'bg-[#CCFF00] text-black border-2 border-black';
  let badgeIcon = CheckCircle2;
  let statusLabel = 'HIGH MASTERY';

  if (isModerateMastery) {
    badgeColor = 'bg-[#FFE600] text-black border-2 border-black';
    badgeIcon = AlertTriangle;
    statusLabel = 'NEEDS REVISION';
  } else if (isWeak) {
    badgeColor = 'bg-[#FF007F] text-white border-2 border-black';
    badgeIcon = XCircle;
    statusLabel = 'CRITICAL WEAKNESS';
  }

  const BadgeIconComp = badgeIcon;

  return (
    <div className="p-4 rounded-xl bg-white border-3 border-black shadow-[3px_3px_0px_#000] space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-[#00F0FF] text-black border-2 border-black">
              {result.subject}
            </span>
            <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border flex items-center gap-1 ${badgeColor}`}>
              <BadgeIconComp className="w-3 h-3 stroke-[3]" />
              {statusLabel}
            </span>
          </div>
          <h4 className="font-black text-sm text-black">{result.topic}</h4>
        </div>
        
        <div className="text-right">
          <div className="text-xl font-black font-mono text-black">
            {result.score}%
          </div>
          <div className="text-[10px] text-black font-mono font-bold">
            {result.correctCount}/{result.totalQuestions} Correct
          </div>
        </div>
      </div>

      {/* Accuracy Bar */}
      <div className="w-full bg-white rounded-full h-3 overflow-hidden border-2 border-black shadow-[1px_1px_0px_#000]">
        <div 
          className={`h-full transition-all duration-500 ${
            isHighMastery ? 'bg-[#CCFF00]' :
            isModerateMastery ? 'bg-[#FFE600]' :
            'bg-[#FF007F]'
          }`}
          style={{ width: `${result.score}%` }}
        />
      </div>

      {/* Weak Points List */}
      {result.weakPoints.length > 0 && (
        <div className="pt-1">
          <span className="text-[10px] font-black text-[#FF007F] uppercase block mb-1">Target Weak Areas for Timetable:</span>
          <div className="flex flex-wrap gap-1.5">
            {result.weakPoints.map((wp, idx) => (
              <span key={idx} className="text-[10px] font-mono font-bold text-black bg-[#FFE600] border-2 border-black px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#000]">
                • {wp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MasteryTracker() {
  const [showLogForm, setShowLogForm] = useState(false);
  const [subject, setSubject] = useState('NMCP');
  const [topic, setTopic] = useState('');
  const [score, setScore] = useState(60);
  const [weakPointsStr, setWeakPointsStr] = useState('');

  const [testResults, setTestResults] = useState<DiagnosticTestResult[]>([
    {
      id: 'test-1',
      subject: 'NMCP',
      topic: 'Gauss-Seidel Method',
      score: 40,
      totalQuestions: 10,
      correctCount: 4,
      weakPoints: ['Matrix Diagonal Dominance Check', 'Iteration Convergence'],
      dateTested: '2026-08-24',
    },
    {
      id: 'test-2',
      subject: 'AI & ML',
      topic: 'Backpropagation Calculus',
      score: 85,
      totalQuestions: 12,
      correctCount: 10,
      weakPoints: ['Vanishing Gradient Edge Case'],
      dateTested: '2026-08-23',
    },
    {
      id: 'test-3',
      subject: 'NMCP',
      topic: 'Newton-Raphson Method',
      score: 60,
      totalQuestions: 10,
      correctCount: 6,
      weakPoints: ['Derivative Near Zero Special Case'],
      dateTested: '2026-08-22',
    }
  ]);

  const handleAddTestResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const weakPoints = weakPointsStr.split(',').map(s => s.trim()).filter(Boolean);
    const newResult: DiagnosticTestResult = {
      id: `test-${Date.now()}`,
      subject,
      topic: topic.trim(),
      score: Number(score),
      totalQuestions: 10,
      correctCount: Math.round((Number(score) / 100) * 10),
      weakPoints: weakPoints.length > 0 ? weakPoints : ['Needs General Revision'],
      dateTested: new Date().toISOString().slice(0, 10),
    };

    setTestResults([newResult, ...testResults]);
    setTopic('');
    setWeakPointsStr('');
    setShowLogForm(false);
    playShimmer();
  };

  const avgMastery = Math.round(
    testResults.reduce((acc, r) => acc + r.score, 0) / (testResults.length || 1)
  );

  const criticalWeaknesses = testResults.filter(r => r.score < 60);

  return (
    <div className="clay-card rounded-2xl p-6 border-4 border-black bg-white text-black space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#00F0FF] text-black border-3 border-black shadow-[3px_3px_0px_#000]">
            <BrainCircuit className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <h3 className="font-black text-xl text-black flex items-center gap-2">
              NotebookLM Diagnostic Mastery Tracker
            </h3>
            <p className="text-xs font-bold text-black">
              Diagnostic test scores feed directly into OVERRUN predictive schedule priority.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono font-black text-black block">AVERAGE MASTERY</span>
          <span className={`text-xl font-black font-mono px-2 py-0.5 rounded border-2 border-black ${avgMastery >= 70 ? 'bg-[#CCFF00] text-black shadow-[2px_2px_0px_#000]' : 'bg-[#FFE600] text-black shadow-[2px_2px_0px_#000]'}`}>
            {avgMastery}%
          </span>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-white border-3 border-black shadow-[3px_3px_0px_#000] flex items-center gap-3">
          <BarChart2 className="w-5 h-5 text-black stroke-[3]" />
          <div>
            <div className="text-sm font-black text-black">{testResults.length} Tests Logged</div>
            <div className="text-[10px] font-mono font-bold text-black">From NotebookLM Quizzes</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#FF007F] text-white border-3 border-black shadow-[3px_3px_0px_#000] flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-white stroke-[3]" />
          <div>
            <div className="text-sm font-black text-white">{criticalWeaknesses.length} Priority Weak Areas</div>
            <div className="text-[10px] font-mono font-bold text-white">Auto-injected to timetable AI</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#CCFF00] text-black border-3 border-black shadow-[3px_3px_0px_#000] flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-black stroke-[3]" />
          <div>
            <div className="text-sm font-black text-black">Predictive Scheduling</div>
            <div className="text-[10px] font-mono font-bold text-black">Active in Timeline Prompt</div>
          </div>
        </div>
      </div>

      {/* Form toggle button */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-black flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-black stroke-[3]" />
          Recent NotebookLM Test Results
        </h4>
        <button
          onClick={() => { setShowLogForm(!showLogForm); playClick(); }}
          className="text-xs font-black text-black bg-[#CCFF00] px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FF007F] hover:text-white cursor-pointer transition-all"
        >
          {showLogForm ? 'Close Form' : '+ Log NotebookLM Test Result'}
        </button>
      </div>

      {/* Add Test Form */}
      {showLogForm && (
        <form onSubmit={handleAddTestResult} className="p-4 rounded-xl bg-white border-3 border-black shadow-[4px_4px_0px_#000] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Subject (e.g. NMCP)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-white border-2 border-black rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:bg-[#CCFF00]"
            />
            <input
              type="text"
              placeholder="Topic (e.g. Gauss-Seidel Method)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-white border-2 border-black rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:bg-[#CCFF00]"
            />
            <div className="flex items-center gap-2 font-bold text-xs">
              <span>Score: {score}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full accent-black cursor-pointer"
              />
            </div>
          </div>

          <input
            type="text"
            placeholder="Weak Points (comma-separated: Matrix Convergence, Pivot step)"
            value={weakPointsStr}
            onChange={(e) => setWeakPointsStr(e.target.value)}
            className="w-full bg-white border-2 border-black rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:bg-[#CCFF00]"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-[#CCFF00] hover:bg-[#FF007F] hover:text-white text-black font-black text-xs rounded-lg border-2 border-black shadow-[3px_3px_0px_#000] transition-all cursor-pointer"
            >
              Save Result to Vault & DB
            </button>
          </div>
        </form>
      )}

      {/* Cards List */}
      <div className="space-y-3">
        {testResults.map((res) => (
          <TestResultCard key={res.id} result={res} />
        ))}
      </div>
    </div>
  );
}
