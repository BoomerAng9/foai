'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Users, MessageSquare, GraduationCap,
  ClipboardCheck, BarChart3, Globe, Send,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Assignment {
  title: string;
  due: string;
  status: 'graded' | 'pending' | 'overdue';
  submitted: number;
  total: number;
}

interface Student {
  name: string;
  score: number;
}

interface ClassroomData {
  language: string;
  flag: string;
  studentCount: number;
  currentLesson: string;
  assignments: Assignment[];
  quizScores: { label: string; score: number }[];
  students: Student[];
  twinGreeting: string;
  twinMessages: { role: 'twin' | 'user'; text: string }[];
}

// ─── Synthetic Data ──────────────────────────────────────────────────────────

const CLASSROOMS: Record<string, ClassroomData> = {
  english: {
    language: 'English',
    flag: '🇬🇧',
    studentCount: 75,
    currentLesson: 'Unit 12: Climate Change & Persuasive Writing',
    assignments: [
      { title: 'Persuasive Essay Draft', due: 'Apr 3', status: 'pending', submitted: 58, total: 75 },
      { title: 'Vocabulary Quiz Ch.11', due: 'Mar 29', status: 'graded', submitted: 75, total: 75 },
      { title: 'Group Debate Prep', due: 'Apr 1', status: 'pending', submitted: 42, total: 75 },
      { title: 'Reading Response #9', due: 'Mar 25', status: 'graded', submitted: 71, total: 75 },
    ],
    quizScores: [
      { label: 'Quiz 7', score: 78 },
      { label: 'Quiz 8', score: 82 },
      { label: 'Quiz 9', score: 74 },
      { label: 'Quiz 10', score: 88 },
      { label: 'Quiz 11', score: 85 },
    ],
    students: [
      { name: 'Emma Richardson', score: 94 },
      { name: 'James Okonkwo', score: 91 },
      { name: 'Sophie Chen', score: 89 },
      { name: 'Liam Patel', score: 87 },
      { name: 'Olivia Martinez', score: 86 },
      { name: 'Noah Williams', score: 84 },
      { name: 'Ava Thompson', score: 82 },
      { name: 'Ethan Brown', score: 80 },
    ],
    twinGreeting: 'Good morning! I noticed Quiz 11 scores are up 11 points from Quiz 9. The vocabulary drills are paying off. Shall I generate a review sheet for the persuasive essay unit?',
    twinMessages: [
      { role: 'twin', text: 'Good morning! I noticed Quiz 11 scores are up 11 points from Quiz 9. The vocabulary drills are paying off. Shall I generate a review sheet for the persuasive essay unit?' },
      { role: 'user', text: 'Yes, focus on counterargument structure.' },
      { role: 'twin', text: 'Done. I\'ve created a 2-page handout on counterargument frameworks with examples from the climate change readings. I also flagged 4 students who haven\'t submitted the essay draft yet -- want me to send them a reminder?' },
    ],
  },
  arabic: {
    language: 'Arabic',
    flag: '🇸🇦',
    studentCount: 75,
    currentLesson: 'الوحدة ١٢: الكتابة الإبداعية والتعبير',
    assignments: [
      { title: 'مقال إبداعي', due: 'Apr 3', status: 'pending', submitted: 61, total: 75 },
      { title: 'اختبار المفردات ١١', due: 'Mar 29', status: 'graded', submitted: 74, total: 75 },
      { title: 'تحليل النص الأدبي', due: 'Apr 1', status: 'pending', submitted: 38, total: 75 },
      { title: 'واجب القراءة ٩', due: 'Mar 25', status: 'overdue', submitted: 68, total: 75 },
    ],
    quizScores: [
      { label: 'اختبار ٧', score: 72 },
      { label: 'اختبار ٨', score: 79 },
      { label: 'اختبار ٩', score: 81 },
      { label: 'اختبار ١٠', score: 76 },
      { label: 'اختبار ١١', score: 83 },
    ],
    students: [
      { name: 'فاطمة الزهراء', score: 96 },
      { name: 'أحمد محمد', score: 93 },
      { name: 'نورة السعيد', score: 90 },
      { name: 'يوسف الحربي', score: 88 },
      { name: 'ليلى إبراهيم', score: 86 },
      { name: 'عمر الشريف', score: 84 },
      { name: 'سارة القحطاني', score: 81 },
      { name: 'خالد الدوسري', score: 79 },
    ],
    twinGreeting: 'صباح الخير! لاحظت تحسناً ملحوظاً في درجات اختبار المفردات. هل تريد أن أعد ورقة مراجعة للوحدة القادمة؟',
    twinMessages: [
      { role: 'twin', text: 'صباح الخير! لاحظت تحسناً ملحوظاً في درجات اختبار المفردات. هل تريد أن أعد ورقة مراجعة للوحدة القادمة؟' },
      { role: 'user', text: 'نعم، ركز على أساليب التعبير الإبداعي' },
      { role: 'twin', text: 'تم! أعددت ملخصاً من صفحتين عن أساليب التعبير الإبداعي مع أمثلة من النصوص المقررة. كما لاحظت أن ٧ طلاب لم يسلموا واجب القراءة بعد -- هل تريد إرسال تذكير لهم؟' },
    ],
  },
  russian: {
    language: 'Russian',
    flag: '🇷🇺',
    studentCount: 75,
    currentLesson: 'Блок 12: Русская литература XIX века — Толстой',
    assignments: [
      { title: 'Сочинение по "Войне и миру"', due: 'Apr 3', status: 'pending', submitted: 52, total: 75 },
      { title: 'Тест по лексике гл.11', due: 'Mar 29', status: 'graded', submitted: 73, total: 75 },
      { title: 'Анализ персонажей', due: 'Apr 1', status: 'pending', submitted: 45, total: 75 },
      { title: 'Дневник чтения №9', due: 'Mar 25', status: 'graded', submitted: 70, total: 75 },
    ],
    quizScores: [
      { label: 'Тест 7', score: 69 },
      { label: 'Тест 8', score: 75 },
      { label: 'Тест 9', score: 80 },
      { label: 'Тест 10', score: 77 },
      { label: 'Тест 11', score: 84 },
    ],
    students: [
      { name: 'Анастасия Иванова', score: 95 },
      { name: 'Дмитрий Петров', score: 92 },
      { name: 'Екатерина Смирнова', score: 89 },
      { name: 'Алексей Козлов', score: 87 },
      { name: 'Мария Новикова', score: 85 },
      { name: 'Сергей Морозов', score: 83 },
      { name: 'Ольга Волкова', score: 81 },
      { name: 'Иван Соколов', score: 78 },
    ],
    twinGreeting: 'Доброе утро! Результаты теста 11 показали рост на 15 пунктов по сравнению с тестом 7. Подготовить обзорный лист по анализу персонажей Толстого?',
    twinMessages: [
      { role: 'twin', text: 'Доброе утро! Результаты теста 11 показали рост на 15 пунктов по сравнению с тестом 7. Подготовить обзорный лист по анализу персонажей Толстого?' },
      { role: 'user', text: 'Да, сосредоточься на мотивации Пьера Безухова.' },
      { role: 'twin', text: 'Готово! Создан раздаточный материал на 2 страницы о трансформации Пьера Безухова с цитатами из текста. Также обнаружено, что 23 студента ещё не сдали сочинение — отправить им напоминание?' },
    ],
  },
};

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    graded: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    overdue: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${colors[status] || 'text-white/40'}`}>
      {status}
    </span>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function TeacherDigitalTwinPage() {
  const [activeTab, setActiveTab] = useState<'english' | 'arabic' | 'russian'>('english');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(CLASSROOMS.english.twinMessages);

  const classroom = CLASSROOMS[activeTab];
  const maxScore = 100;

  function switchTab(tab: 'english' | 'arabic' | 'russian') {
    setActiveTab(tab);
    setMessages(CLASSROOMS[tab].twinMessages);
    setChatInput('');
  }

  function handleSend() {
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: chatInput },
      { role: 'twin', text: `[${classroom.language} Twin] Processing your request...` },
    ]);
    setChatInput('');
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/deploy-landing" className="text-white/40 hover:text-[#E8A020] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <GraduationCap className="w-6 h-6 text-[#E8A020]" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Teacher&apos;s Digital Twin</h1>
            <p className="text-xs text-white/40 font-mono">Multilingual Classroom LMS</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Classroom Tabs */}
        <div className="flex gap-2">
          {(['english', 'arabic', 'russian'] as const).map((tab) => {
            const data = CLASSROOMS[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                  isActive
                    ? 'border-[#E8A020] bg-[#E8A020]/10 text-[#E8A020]'
                    : 'border-white/10 text-white/40 hover:text-white hover:border-white/20'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>{data.flag} {data.language}</span>
                <span className="text-xs opacity-60">{data.studentCount}</span>
              </button>
            );
          })}
        </div>

        {/* Current Lesson */}
        <div className="border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-[#E8A020]" />
            <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Current Lesson</span>
          </div>
          <p className="text-lg font-semibold">{classroom.currentLesson}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assignments */}
          <div className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Recent Assignments</span>
            </div>
            <div className="space-y-3">
              {classroom.assignments.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-white/40 font-mono">Due: {a.due}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/40 font-mono">{a.submitted}/{a.total}</span>
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quiz Scores Chart */}
          <div className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Quiz Score Trends</span>
            </div>
            <div className="flex items-end gap-3 h-40">
              {classroom.quizScores.map((q, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-mono text-[#E8A020]">{q.score}%</span>
                  <div
                    className="w-full bg-[#E8A020]/80 rounded-t"
                    style={{ height: `${(q.score / maxScore) * 120}px` }}
                  />
                  <span className="text-[10px] text-white/40 font-mono text-center leading-tight">{q.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Student Roster */}
          <div className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Top Students</span>
              <span className="ml-auto text-xs text-white/40 font-mono">{classroom.studentCount} total</span>
            </div>
            <div className="space-y-2">
              {classroom.students.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/20 font-mono w-4">{i + 1}</span>
                    <span className="text-sm">{s.name}</span>
                  </div>
                  <span className="text-sm font-mono text-[#E8A020]">{s.score}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Digital Twin Chat */}
          <div className="border border-white/10 rounded-lg p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">
                Digital Twin Chat · {classroom.language}
              </span>
            </div>
            <div className="flex-1 space-y-3 mb-4 max-h-64 overflow-y-auto">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm p-3 rounded-lg ${
                    m.role === 'twin'
                      ? 'bg-white/5 border border-white/10'
                      : 'bg-[#E8A020]/10 border border-[#E8A020]/20 ml-8'
                  }`}
                >
                  {m.role === 'twin' && (
                    <span className="text-[10px] font-mono text-[#E8A020] uppercase block mb-1">
                      {classroom.language} Twin
                    </span>
                  )}
                  {m.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Message your ${classroom.language} twin...`}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none focus:border-[#E8A020]/50"
              />
              <button
                onClick={handleSend}
                className="px-3 py-2 bg-[#E8A020] text-black rounded-lg hover:bg-[#E8A020]/80 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-4 mt-8">
        <p className="text-center text-xs text-white/30 font-mono">
          Powered by Tutor_Ang &middot; Edu_Ang &middot; ACHEEVY
        </p>
      </footer>
    </div>
  );
}
