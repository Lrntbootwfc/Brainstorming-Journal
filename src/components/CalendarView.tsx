import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  Check, 
  X, 
  BookOpen,
  Image as ImageIcon,
  Sparkles,
  Loader2
} from 'lucide-react';
import { JournalSession, PersonalGoal, VisionCard, PaperThemePreference } from '../types';
import { StreakCard } from './StreakCard';
import { GoalsCard } from './GoalsCard';
import { getThemeConfig } from '../utils/theme';
import { 
  saveDailyMood, 
  fetchDailyMoods, 
  DailyMoodRecord,
  fetchVisionCards,
  saveVisionCard,
  deleteVisionCard
} from '../utils/firestore';

export interface CalendarViewProps {
  user?: User | null;
  sessions?: JournalSession[];
  goals?: PersonalGoal[];
  onNewSession?: (category?: any) => void;
  onSelectSession?: (sessionId: string) => void;
  onViewAllGoals?: () => void;
  onAddGoal?: (goal: PersonalGoal) => void;
  className?: string;
  theme?: PaperThemePreference;
}

type MoodType = 'Happy' | 'Calm' | 'Neutral' | 'Low';

interface DayCellData {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  mood?: MoodType;
  sessionCount: number;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  user,
  sessions = [],
  goals = [],
  onNewSession,
  onSelectSession,
  onViewAllGoals,
  onAddGoal,
  className = '',
  theme,
}) => {
  const themeConfig = getThemeConfig(theme);

  // Current viewed month and year (Default to September 2026 to match design reference)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Check if we should default to current local date or September 2026
    const now = new Date();
    // Default to September 2026 as shown in screenshot
    return new Date(2026, 8, 1);
  });

  // Selected date defaults to September 5, 2026 as in the screenshot
  const [selectedDateString, setSelectedDateString] = useState<string>('2026-09-05');

  // Daily Mood check-ins state
  const [dailyMoods, setDailyMoods] = useState<Record<string, DailyMoodRecord>>({
    '2026-09-01': { mood: 'Calm', date: '2026-09-01', timestamp: '' },
    '2026-09-02': { mood: 'Happy', date: '2026-09-02', timestamp: '' },
    '2026-09-03': { mood: 'Happy', date: '2026-09-03', timestamp: '' },
    '2026-09-04': { mood: 'Calm', date: '2026-09-04', timestamp: '' },
  });

  // Vision Board items
  const [visionCards, setVisionCards] = useState<VisionCard[]>([
    {
      id: 'default-vision-1',
      userId: user?.uid || '',
      prompt: 'A quiet morning routine with sunlight through sheer curtains and freshly brewed coffee',
      title: 'A quiet morning routine',
      reflection: 'A serene start to the day surrounded by soft morning light and calm focus.',
      category: 'Lifestyle',
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
      status: 'done',
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'default-vision-2',
      userId: user?.uid || '',
      prompt: 'The work I want to be proud of, focused deep work in a woodcrafted studio',
      title: 'The work I want to be proud of',
      reflection: 'Deep craft and intentional focus on creating meaningful work that endures.',
      category: 'Career',
      imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80',
      status: 'done',
      createdAt: '2026-09-02T09:00:00.000Z',
    },
  ]);

  const [newVisionPrompt, setNewVisionPrompt] = useState('');
  const [isGeneratingVision, setIsGeneratingVision] = useState(false);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [activeDropdownDate, setActiveDropdownDate] = useState<string | null>(null);

  // Load daily moods from Firestore if user logged in
  useEffect(() => {
    if (!user?.uid) return;
    fetchDailyMoods(user.uid).then((savedMoods) => {
      if (savedMoods && Object.keys(savedMoods).length > 0) {
        setDailyMoods((prev) => ({ ...prev, ...savedMoods }));
      }
    });

    fetchVisionCards(user.uid).then((cards) => {
      if (cards && cards.length > 0) {
        setVisionCards(cards);
      }
    });
  }, [user?.uid]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Month & Year string
  const monthYearLabel = useMemo(() => {
    return currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Format date helper (YYYY-MM-DD)
  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Build Calendar Matrix
  const calendarDays = useMemo<DayCellData[]>(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of current month
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...

    // Days in current month
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

    // Days in previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: DayCellData[] = [];
    const todayKey = formatDateKey(new Date());

    // 1. Previous month padded days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const dateString = formatDateKey(d);
      cells.push({
        date: d,
        dateString,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateString === todayKey,
        mood: dailyMoods[dateString]?.mood,
        sessionCount: sessions.filter((s) => s.createdAt.startsWith(dateString)).length,
      });
    }

    // 2. Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const dateString = formatDateKey(d);
      cells.push({
        date: d,
        dateString,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateString === todayKey,
        mood: dailyMoods[dateString]?.mood,
        sessionCount: sessions.filter((s) => s.createdAt.startsWith(dateString)).length,
      });
    }

    // 3. Next month padded days to complete 35 or 42 grid
    const totalSlots = cells.length <= 35 ? 35 : 42;
    const remaining = totalSlots - cells.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      const dateString = formatDateKey(d);
      cells.push({
        date: d,
        dateString,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateString === todayKey,
        mood: dailyMoods[dateString]?.mood,
        sessionCount: sessions.filter((s) => s.createdAt.startsWith(dateString)).length,
      });
    }

    return cells;
  }, [currentDate, dailyMoods, sessions]);

  // Selected date info
  const selectedDateObj = useMemo(() => {
    const parts = selectedDateString.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  }, [selectedDateString]);

  const selectedDateFormatted = useMemo(() => {
    return selectedDateObj.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDateObj]);

  const currentSelectedMood = dailyMoods[selectedDateString]?.mood;

  // Handle setting mood for selected date or any specific cell date
  const handleSelectMood = async (mood: MoodType, dateStr?: string) => {
    const targetDate = dateStr || selectedDateString;
    setDailyMoods((prev) => ({
      ...prev,
      [targetDate]: {
        mood,
        date: targetDate,
        timestamp: new Date().toISOString(),
      },
    }));
    setIsMoodPickerOpen(false);
    setActiveDropdownDate(null);

    if (user?.uid) {
      await saveDailyMood(user.uid, targetDate, mood);
    }
  };

  // Handle clearing mood for a date
  const handleClearMood = async (dateStr?: string) => {
    const targetDate = dateStr || selectedDateString;
    setDailyMoods((prev) => {
      const next = { ...prev };
      delete next[targetDate];
      return next;
    });
    setActiveDropdownDate(null);

    if (user?.uid) {
      await saveDailyMood(user.uid, targetDate, '' as any);
    }
  };

  // Add Vision Card
  const handleAddVision = async () => {
    if (!newVisionPrompt.trim() || isGeneratingVision) return;
    setIsGeneratingVision(true);

    try {
      const res = await fetch('/api/gemini/generate-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: newVisionPrompt.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        const newCard: VisionCard = {
          id: 'vision-' + Date.now(),
          userId: user?.uid || '',
          prompt: newVisionPrompt.trim(),
          title: data.title || 'Personal Vision',
          reflection: data.sceneDescription || data.reflection || 'A vision of intentional life and focus.',
          category: data.category || 'Aspiration',
          imageUrl: data.curatedImageUrl || data.imageUrl || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
          status: 'done',
          createdAt: new Date().toISOString(),
        };

        setVisionCards((prev) => [newCard, ...prev]);
        if (user?.uid) {
          await saveVisionCard(user.uid, newCard);
        }
        setNewVisionPrompt('');
      }
    } catch (err) {
      console.warn('Could not generate vision card via AI:', err);
    } finally {
      setIsGeneratingVision(false);
    }
  };

  // Delete Vision Card
  const handleDeleteVision = async (cardId: string) => {
    setVisionCards((prev) => prev.filter((c) => c.id !== cardId));
    if (user?.uid) {
      await deleteVisionCard(user.uid, cardId);
    }
  };

  // Total check-ins count
  const totalMoodCheckins = Object.keys(dailyMoods).length;

  const moodEmojis: Record<MoodType, string> = {
    Happy: '😄',
    Calm: '😌',
    Neutral: '😐',
    Low: '😔',
  };

  return (
    <div 
      id="calendar-page-root"
      className={`min-h-screen py-8 px-4 sm:px-8 max-w-7xl mx-auto space-y-8 transition-colors ${className}`}
      style={{
        backgroundColor: themeConfig.paperBg,
        color: themeConfig.inkColor,
      }}
    >
      {/* Main Two-Column Row: Calendar (Left) & Streak + Goals (Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Calendar Card (approx 68% width on desktop) */}
        <div 
          id="calendar-main-card"
          className="lg:col-span-8 rounded-3xl border p-6 sm:p-7 shadow-xs flex flex-col justify-between"
          style={{
            backgroundColor: themeConfig.paperCardBg,
            borderColor: themeConfig.border,
          }}
        >
          <div>
            {/* Header: Title, Month Picker & New Entry Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div>
                <p 
                  className="text-[10px] uppercase font-bold tracking-widest opacity-70"
                  style={{ color: themeConfig.primary }}
                >
                  DAILY MOOD CHECK-IN
                </p>
                <h2 
                  className="text-2xl font-serif font-bold tracking-tight mt-0.5"
                  style={{ color: themeConfig.inkColor }}
                >
                  Calendar
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Month Navigation Pill */}
                <div 
                  className="flex items-center gap-1 border rounded-xl px-1.5 py-1"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    borderColor: themeConfig.border,
                  }}
                >
                  <button
                    id="calendar-prev-month-btn"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg transition-colors cursor-pointer hover:opacity-80"
                    style={{ color: themeConfig.inkColor }}
                    title="Previous Month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span 
                    className="text-xs font-bold px-2 min-w-[110px] text-center select-none"
                    style={{ color: themeConfig.inkColor }}
                  >
                    {monthYearLabel}
                  </span>
                  <button
                    id="calendar-next-month-btn"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg transition-colors cursor-pointer hover:opacity-80"
                    style={{ color: themeConfig.inkColor }}
                    title="Next Month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Subtitle */}
            <p 
              className="text-xs mb-5 opacity-70"
              style={{ color: themeConfig.inkColor }}
            >
              Choose a mood while writing, or add one here later if you missed the day.
            </p>

            {/* Weekday Names Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((dayName) => (
                <div 
                  key={dayName} 
                  className="text-[11px] font-bold text-center tracking-wider py-1 select-none opacity-60"
                  style={{ color: themeConfig.inkColor }}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((cell, idx) => {
                const isSelected = cell.dateString === selectedDateString;
                return (
                  <div
                    key={`${cell.dateString}-${idx}`}
                    id={`calendar-cell-${cell.dateString}`}
                    onClick={() => {
                      setSelectedDateString(cell.dateString);
                    }}
                    className={`min-h-[64px] sm:min-h-[72px] rounded-2xl border p-2 flex flex-col justify-between transition-all relative cursor-pointer select-none ${
                      isSelected
                        ? 'border-2 shadow-2xs'
                        : cell.isCurrentMonth
                        ? 'hover:opacity-90'
                        : 'opacity-40 hover:opacity-75'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: themeConfig.primary,
                            backgroundColor: themeConfig.chipBg,
                            color: themeConfig.inkColor,
                          }
                        : cell.isCurrentMonth
                        ? {
                            borderColor: themeConfig.border,
                            backgroundColor: themeConfig.paperCardBg,
                            color: themeConfig.inkColor,
                          }
                        : {
                            borderColor: themeConfig.border,
                            backgroundColor: themeConfig.paperBg,
                            color: themeConfig.inkColor,
                          }
                    }
                  >
                    {/* Top Row inside cell: Day number and plus icon */}
                    <div className="flex items-center justify-between">
                      <span 
                        className={`text-xs ${
                          isSelected 
                            ? 'font-bold' 
                            : cell.isCurrentMonth 
                            ? 'font-semibold' 
                            : 'opacity-60'
                        }`}
                        style={isSelected ? { color: themeConfig.primary } : { color: themeConfig.inkColor }}
                      >
                        {cell.dayNumber}
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateString(cell.dateString);
                          setIsMoodPickerOpen(true);
                        }}
                        className="p-0.5 rounded transition-opacity opacity-50 hover:opacity-100"
                        style={{ color: themeConfig.inkColor }}
                        title="Log mood"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Middle: Mood Indicator / Emoji */}
                    <div className="flex items-center justify-center my-0.5">
                      {cell.mood && (
                        <span className="text-base sm:text-lg animate-fade-in" title={cell.mood}>
                          {moodEmojis[cell.mood]}
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Selected Chevron Down indicator button */}
                    <div className="flex items-center justify-end h-3 relative">
                      <button
                        type="button"
                        id={`date-dropdown-btn-${cell.dateString}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateString(cell.dateString);
                          setActiveDropdownDate(activeDropdownDate === cell.dateString ? null : cell.dateString);
                        }}
                        className={`p-0.5 rounded transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'opacity-100'
                            : 'opacity-0 hover:opacity-100'
                        } ${activeDropdownDate === cell.dateString ? '!opacity-100' : ''}`}
                        style={isSelected ? { color: themeConfig.primary } : { color: themeConfig.inkColor }}
                        title="Day details, mood & entries"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Floating Day Options Popover */}
                    {activeDropdownDate === cell.dateString && (
                      <>
                        {/* Backdrop to close on click outside */}
                        <div 
                          className="fixed inset-0 z-30 cursor-default"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownDate(null);
                          }}
                        />

                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute z-40 w-64 sm:w-72 rounded-2xl border shadow-xl p-3.5 text-left cursor-default animate-fade-in ${
                            (idx % 7) >= 4 ? 'right-0' : 'left-0'
                          } ${
                            Math.floor(idx / 7) >= 3 ? 'bottom-full mb-2' : 'top-full mt-2'
                          }`}
                          style={{
                            backgroundColor: themeConfig.paperCardBg,
                            borderColor: themeConfig.border,
                            color: themeConfig.inkColor,
                          }}
                        >
                          {/* Popover Header */}
                          <div 
                            className="flex items-center justify-between pb-2 mb-2.5 border-b"
                            style={{ borderColor: themeConfig.border }}
                          >
                            <div>
                              <p 
                                className="text-[10px] uppercase font-bold tracking-wider opacity-70"
                                style={{ color: themeConfig.primary }}
                              >
                                DATE DETAILS
                              </p>
                              <h4 
                                className="text-xs font-bold"
                                style={{ color: themeConfig.inkColor }}
                              >
                                {cell.date.toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </h4>
                            </div>
                            <button
                              onClick={() => setActiveDropdownDate(null)}
                              className="p-1 rounded-lg transition-colors cursor-pointer hover:opacity-80"
                              style={{ color: themeConfig.inkColor }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Mood Quick Selector */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span 
                                className="text-[10px] uppercase font-bold tracking-wider opacity-70"
                                style={{ color: themeConfig.primary }}
                              >
                                Daily Mood
                              </span>
                              {cell.mood && (
                                <button
                                  onClick={() => handleClearMood(cell.dateString)}
                                  className="text-[10px] font-semibold text-rose-500 hover:underline cursor-pointer"
                                >
                                  Clear mood
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {(['Happy', 'Calm', 'Neutral', 'Low'] as MoodType[]).map((m) => {
                                const isCurrent = cell.mood === m;
                                return (
                                  <button
                                    key={m}
                                    onClick={() => handleSelectMood(m, cell.dateString)}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between border transition-all cursor-pointer ${
                                      isCurrent
                                        ? 'font-bold shadow-2xs'
                                        : 'hover:opacity-80'
                                    }`}
                                    style={
                                      isCurrent
                                        ? {
                                            borderColor: themeConfig.primary,
                                            backgroundColor: themeConfig.chipBg,
                                            color: themeConfig.primary,
                                          }
                                        : {
                                            borderColor: themeConfig.border,
                                            backgroundColor: themeConfig.paperBg,
                                            color: themeConfig.inkColor,
                                          }
                                    }
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <span>{moodEmojis[m]}</span>
                                      <span>{m}</span>
                                    </span>
                                    {isCurrent && <Check className="h-3 w-3" style={{ color: themeConfig.primary }} />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Journal Entries for this date */}
                          <div 
                            className="pt-2 border-t"
                            style={{ borderColor: themeConfig.border }}
                          >
                            <p 
                              className="text-[10px] uppercase font-bold mb-1.5 opacity-70"
                              style={{ color: themeConfig.primary }}
                            >
                              Journal Entries ({cell.sessionCount})
                            </p>
                            {cell.sessionCount > 0 ? (
                              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                                {sessions
                                  .filter((s) => s.createdAt.startsWith(cell.dateString))
                                  .map((sess) => (
                                    <div
                                      key={sess.id}
                                      onClick={() => {
                                        setActiveDropdownDate(null);
                                        if (onSelectSession) onSelectSession(sess.id);
                                      }}
                                      className="p-2 rounded-xl border text-xs transition-colors cursor-pointer flex items-start gap-2 hover:opacity-80"
                                      style={{
                                        backgroundColor: themeConfig.chipBg,
                                        borderColor: themeConfig.border,
                                        color: themeConfig.inkColor,
                                      }}
                                    >
                                      <BookOpen className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: themeConfig.primary }} />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold truncate" style={{ color: themeConfig.inkColor }}>
                                          {sess.title || 'Untitled Entry'}
                                        </p>
                                        <p className="text-[10px] opacity-70 truncate" style={{ color: themeConfig.inkColor }}>
                                          {sess.summary || (sess.messages?.[0]?.content ? sess.messages[0].content.slice(0, 45) : 'No preview')}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-[11px] opacity-70 italic mb-1.5" style={{ color: themeConfig.inkColor }}>
                                No entries recorded for this date yet.
                              </p>
                            )}

                            {/* Write Journal Action */}
                            <button
                              onClick={() => {
                                setActiveDropdownDate(null);
                                if (onNewSession) onNewSession('Journal');
                              }}
                              className="w-full mt-2 py-1.5 px-3 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs hover:opacity-90"
                              style={{ backgroundColor: themeConfig.primary }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Write journal for this day</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer of Calendar Card: Mood Legend and Check-ins Count */}
          <div 
            className="mt-8 pt-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ borderColor: themeConfig.border }}
          >
            {/* Mood Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: themeConfig.inkColor }}>
              {(['Happy', 'Calm', 'Neutral', 'Low'] as MoodType[]).map((mood) => (
                <button
                  key={mood}
                  onClick={() => handleSelectMood(mood)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: themeConfig.chipBg }}
                >
                  <span>{moodEmojis[mood]}</span>
                  <span className="font-medium" style={{ color: themeConfig.inkColor }}>{mood}</span>
                </button>
              ))}
            </div>

            {/* Check-ins Stat */}
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: themeConfig.inkColor }}>
              <CalendarIcon className="h-4 w-4 opacity-70" style={{ color: themeConfig.primary }} />
              <span className="opacity-80">{totalMoodCheckins} mood check-ins</span>
            </div>
          </div>
        </div>

        {/* Right Column: StreakCard & GoalsCard (approx 32% width on desktop) */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Streak Card */}
          <StreakCard 
            streakDays={12}
            message="Keep showing up for yourself."
            weeklyActivity={[true, true, true, true, true, false, false]}
            theme={theme}
          />

          {/* 2. Goals Card */}
          <GoalsCard 
            goals={goals}
            onAddGoal={onAddGoal}
            onViewAllGoals={onViewAllGoals}
            theme={theme}
          />
        </div>
      </section>

      {/* 3. Middle Full-Width Card: Vision Board Section */}
      <section 
        id="calendar-vision-board-section"
        className="rounded-3xl border p-6 sm:p-7 shadow-xs"
        style={{
          backgroundColor: themeConfig.paperCardBg,
          borderColor: themeConfig.border,
          color: themeConfig.inkColor,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <p 
              className="text-[10px] uppercase font-bold tracking-widest opacity-70"
              style={{ color: themeConfig.primary }}
            >
              MAKE IT VISIBLE
            </p>
            <h2 
              className="text-2xl font-serif font-bold tracking-tight mt-0.5"
              style={{ color: themeConfig.inkColor }}
            >
              Vision board
            </h2>
          </div>

          <span 
            className="text-xs font-semibold px-3 py-1 rounded-full border"
            style={{
              backgroundColor: themeConfig.chipBg,
              borderColor: themeConfig.border,
              color: themeConfig.primary,
            }}
          >
            {visionCards.length} visuals
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-xs mb-5 max-w-2xl opacity-75" style={{ color: themeConfig.inkColor }}>
          Write what you want to see in your life. Turn the words into a visual prompt and keep your newest inspiration close. Articulate the moments, milestones, or aesthetic futures you wish to cultivate. Gemini transforms your words into vivid visual anchor points that guide your daily journaling.
        </p>

        {/* Prompt Input Form */}
        <div className="space-y-3 mb-6">
          <textarea
            id="vision-board-prompt-textarea"
            rows={3}
            value={newVisionPrompt}
            onChange={(e) => setNewVisionPrompt(e.target.value)}
            placeholder="Describe the image or future moment you want to create..."
            className="w-full p-4 rounded-2xl border text-sm placeholder:opacity-50 focus:outline-none transition-all resize-y"
            style={{
              backgroundColor: themeConfig.paperBg,
              borderColor: themeConfig.border,
              color: themeConfig.inkColor,
            }}
          />

          <div className="flex justify-end">
            <button
              id="vision-board-submit-btn"
              onClick={handleAddVision}
              disabled={!newVisionPrompt.trim() || isGeneratingVision}
              className="px-5 py-2.5 rounded-xl disabled:opacity-40 text-white font-semibold text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer hover:opacity-90"
              style={{ backgroundColor: themeConfig.primary }}
            >
              {isGeneratingVision ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating visual...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add visual</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Visual Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {/* Render Vision Cards */}
          {visionCards.map((card, index) => {
            const isTeal = index % 2 === 0;
            return (
              <div
                key={card.id}
                className="group relative rounded-2xl p-5 text-white flex flex-col justify-between min-h-[160px] overflow-hidden shadow-xs border border-black/10 transition-all hover:scale-[1.01]"
                style={{
                  backgroundImage: card.imageUrl 
                    ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.65)), url(${card.imageUrl})`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: isTeal ? themeConfig.primary : '#8c5738',
                }}
              >
                {/* Delete Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDeleteVision(card.id)}
                    className="p-1 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white transition-colors cursor-pointer"
                    title="Remove visual"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Card Bottom Text */}
                <div className="mt-auto pt-4">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">
                    VISUAL PROMPT
                  </p>
                  <h4 className="text-base font-bold font-serif text-white tracking-tight leading-snug">
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5">
                    {card.reflection || 'Your newest inspiration'}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Add Another Visual Dashed Container */}
          <div 
            onClick={() => {
              const textarea = document.getElementById('vision-board-prompt-textarea');
              textarea?.focus();
            }}
            className="rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[160px] hover:opacity-90"
            style={{
              borderColor: themeConfig.border,
              backgroundColor: themeConfig.chipBg,
            }}
          >
            <div 
              className="h-10 w-10 rounded-full flex items-center justify-center mb-2 shadow-2xs"
              style={{
                backgroundColor: themeConfig.paperCardBg,
                color: themeConfig.primary,
              }}
            >
              <ImageIcon className="h-5 w-5" style={{ color: themeConfig.primary }} />
            </div>
            <h4 className="text-xs font-bold" style={{ color: themeConfig.inkColor }}>
              Add another visual
            </h4>
            <p className="text-[11px] opacity-70 mt-0.5" style={{ color: themeConfig.inkColor }}>
              Use the prompt above
            </p>
          </div>
        </div>
      </section>

      {/* 4. Bottom Selected Day Mood Bar (Sticky or anchored at bottom) */}
      <section 
        id="calendar-bottom-mood-bar"
        className="rounded-2xl border p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 relative"
        style={{
          backgroundColor: themeConfig.paperCardBg,
          borderColor: themeConfig.border,
          color: themeConfig.inkColor,
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="h-9 w-9 rounded-full border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: themeConfig.chipBg,
              borderColor: themeConfig.border,
              color: themeConfig.primary,
            }}
          >
            <Plus className="h-4 w-4" style={{ color: themeConfig.primary }} />
          </div>
          <div>
            <h4 className="text-sm font-serif font-bold" style={{ color: themeConfig.inkColor }}>
              {selectedDateFormatted}
            </h4>
            <p className="text-xs opacity-75" style={{ color: themeConfig.inkColor }}>
              {currentSelectedMood ? (
                <span className="font-semibold" style={{ color: themeConfig.primary }}>
                  Mood recorded: {moodEmojis[currentSelectedMood]} {currentSelectedMood}
                </span>
              ) : (
                'No mood added yet — choose one from the calendar cell.'
              )}
            </p>
          </div>
        </div>

        {/* Set Mood Button & Popover */}
        <div className="relative">
          <button
            id="set-mood-action-btn"
            onClick={() => setIsMoodPickerOpen(!isMoodPickerOpen)}
            className="px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer hover:opacity-90"
            style={{ backgroundColor: themeConfig.primary }}
          >
            <Check className="h-3.5 w-3.5" />
            <span>Set mood</span>
          </button>

          {/* Quick Mood Dropdown */}
          {isMoodPickerOpen && (
            <div 
              className="absolute right-0 bottom-full mb-2 w-48 rounded-2xl border shadow-lg p-2 z-30 space-y-1 animate-fade-in"
              style={{
                backgroundColor: themeConfig.paperCardBg,
                borderColor: themeConfig.border,
              }}
            >
              <p 
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 opacity-70"
                style={{ color: themeConfig.primary }}
              >
                Select Mood for {selectedDateFormatted}
              </p>
              {(['Happy', 'Calm', 'Neutral', 'Low'] as MoodType[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleSelectMood(m)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    currentSelectedMood === m ? 'font-bold' : 'hover:opacity-80'
                  }`}
                  style={
                    currentSelectedMood === m
                      ? {
                          backgroundColor: themeConfig.chipBg,
                          color: themeConfig.primary,
                        }
                      : {
                          color: themeConfig.inkColor,
                        }
                  }
                >
                  <span className="flex items-center gap-2">
                    <span>{moodEmojis[m]}</span>
                    <span>{m}</span>
                  </span>
                  {currentSelectedMood === m && <Check className="h-3.5 w-3.5" style={{ color: themeConfig.primary }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
