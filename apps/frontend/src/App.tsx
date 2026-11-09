import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  GitCommit,
  Calendar,
  Layers,
  Plus,
  CheckSquare,
  AlertCircle,
  Filter,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Trash2,
  Flame,
  GitBranch,
  Video,
  ExternalLink,
  Settings,
  X
} from 'lucide-react';

// ==========================================
// DATA TYPES
// ==========================================
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// Trello / Jira Task Model
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignee: string;
  project: string;
}

// GitHub Commit Model
export interface GitCommitItem {
  id: string;
  hash: string;
  message: string;
  author: string;
  branch: string;
  timestamp: string;
}

// Google Calendar Event Model
export interface CalendarEventItem {
  id: string;
  title: string;
  time: string;
  day: number;
  category: 'STANDUP' | 'REVIEW' | 'DEADLINE' | 'SYNC';
  location: string;
}

export const App: React.FC = () => {
  // 3-Screen Flow: 'welcome' -> 'auth' -> 'dashboard'
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'auth' | 'dashboard'>('welcome');
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');

  // Authenticated User State (Populated dynamically on sign-in)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // User's Connected GitHub Repository
  const [connectedRepo, setConnectedRepo] = useState<string>('organization/main-repo');
  const [activeBranch, setActiveBranch] = useState<string>('main');
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [inputRepoName, setInputRepoName] = useState('');

  // Trello / Jira Tasks Filter
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL' | 'OVERDUE'>('ALL');

  // Modals State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Dynamic Workspace Data (Starts clean for user input)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [commits, setCommits] = useState<GitCommitItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);

  // Real-time Calendar Date State
  const currentDate = new Date();
  const todayDay = currentDate.getDate();
  const currentMonthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const [selectedDay, setSelectedDay] = useState<number>(todayDay);

  // Form Inputs: Task
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [newProject, setNewProject] = useState('Core Project');

  // Form Inputs: Git Commit
  const [commitMessage, setCommitMessage] = useState('');

  // Form Inputs: Calendar Event
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('10:00 AM');
  const [eventDay, setEventDay] = useState<number>(todayDay);
  const [eventCategory, setEventCategory] = useState<'STANDUP' | 'REVIEW' | 'DEADLINE' | 'SYNC'>('REVIEW');
  const [eventLocation, setEventLocation] = useState('Google Meet');

  const todayStr = new Date().toISOString().split('T')[0];

  // Dynamic Telemetry Calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const overdueTasks = tasks.filter(t => t.status !== 'DONE' && t.dueDate < todayStr);
  const overdueCount = overdueTasks.length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const healthScore = totalTasks === 0 
    ? 100 
    : Math.max(0, Math.min(100, Math.round(completionRate * 0.7 + Math.max(0, 100 - overdueCount * 25) * 0.3)));

  const filteredTasks = tasks.filter(t => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OVERDUE') return t.status !== 'DONE' && t.dueDate < todayStr;
    return t.status === statusFilter;
  });

  // Calendar calculations
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const calendarDaysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const selectedDayEvents = calendarEvents.filter(ev => ev.day === selectedDay);

  // Authentication Handler
  const handleAuthAction = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!inputName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }

    if (!inputEmail.trim()) {
      setAuthError('Please enter your work email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inputEmail.trim())) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    const user = {
      name: inputName.trim(),
      email: inputEmail.trim()
    };

    setCurrentUser(user);
    setCurrentScreen('dashboard');

    // Default connected repository based on user's name
    const sanitizedRepoName = user.name.toLowerCase().replace(/\s+/g, '-') + '/project';
    setConnectedRepo(sanitizedRepoName);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('welcome');
    setInputName('');
    setInputEmail('');
    setAuthError(null);
  };

  // Task Handlers
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentUser) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim() || 'No description provided.',
      status: 'TODO',
      priority: newPriority,
      dueDate: newDueDate || todayStr,
      assignee: currentUser.name,
      project: newProject.trim() || 'General'
    };

    setTasks(prev => [newTask, ...prev]);
    setNewTitle('');
    setNewDesc('');
    setNewPriority('MEDIUM');
    setIsTaskModalOpen(false);
  };

  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // GitHub Commit Logger
  const handleLogCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim() || !currentUser) return;

    const newCommit: GitCommitItem = {
      id: `c-${Date.now()}`,
      hash: Math.random().toString(36).substring(2, 9),
      message: commitMessage.trim(),
      author: currentUser.name,
      branch: activeBranch,
      timestamp: 'Just now'
    };

    setCommits(prev => [newCommit, ...prev]);
    setCommitMessage('');
    setIsCommitModalOpen(false);
  };

  // Repository Connect Handler
  const handleUpdateRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRepoName.trim()) return;
    setConnectedRepo(inputRepoName.trim());
    setIsRepoModalOpen(false);
  };

  // Calendar Event Scheduler
  const handleScheduleEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const newEvent: CalendarEventItem = {
      id: `ev-${Date.now()}`,
      title: eventTitle.trim(),
      time: eventTime.trim() || '10:00 AM',
      day: eventDay,
      category: eventCategory,
      location: eventLocation.trim() || 'Google Meet'
    };

    setCalendarEvents(prev => [...prev, newEvent]);
    setSelectedDay(eventDay);
    setEventTitle('');
    setIsEventModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 font-sans antialiased selection:bg-zinc-800 selection:text-white">

      {/* KEYFRAME ANIMATIONS */}
      <style>{`
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float-icon {
          animation: gentleFloat 4s ease-in-out infinite;
        }

        @keyframes letterSweep {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .letter-shimmer {
          background: linear-gradient(
            90deg,
            #64748b 0%,
            #94a3b8 20%,
            #ffffff 50%,
            #94a3b8 80%,
            #64748b 100%
          );
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: letterSweep 4s linear infinite;
        }
      `}</style>

      {/* ========================================================================= */}
      {/* SCREEN 1: CLEAN PRODUCT LANDING */}
      {/* ========================================================================= */}
      {currentScreen === 'welcome' && (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
          
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#12141c] border border-zinc-800 text-white shadow-lg animate-float-icon">
            <Layers className="h-8 w-8 text-white" />
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight max-w-4xl mb-4 leading-tight">
            <span className="letter-shimmer">
              Connected Workspace
            </span>
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base max-w-lg mb-8 leading-relaxed font-normal">
            A unified engineering platform connecting your sprint tasks, Git repositories, and team calendar schedules into one real-time dashboard.
          </p>

          <button
            onClick={() => setCurrentScreen('auth')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm text-zinc-950 bg-white hover:bg-zinc-200 transition duration-150 shadow-sm active:scale-[0.98]"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 text-zinc-950" />
          </button>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: AUTHENTICATION SCREEN */}
      {/* ========================================================================= */}
      {currentScreen === 'auth' && (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
          
          <button
            onClick={() => {
              setAuthError(null);
              setCurrentScreen('welcome');
            }}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-6 group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to home</span>
          </button>

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#13151f] border border-zinc-800 text-white shadow-md">
            <Layers className="h-7 w-7 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight mb-1 text-center">
            Connected Workspace
          </h2>
          <p className="text-xs text-zinc-400 mb-6 text-center">
            {authMode === 'SIGN_IN' ? 'Sign in to access your dashboard' : 'Create an account to access your dashboard'}
          </p>

          <div className="w-full max-w-sm rounded-2xl p-6 sm:p-7 bg-[#13151d] border border-zinc-800/80 shadow-xl">
            
            {authError && (
              <div className="mb-4 p-2.5 rounded-lg bg-zinc-900 border border-red-900/40 text-red-300 flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthAction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => {
                    setInputName(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2.5 bg-[#0a0b10] border border-zinc-800 focus:border-zinc-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition duration-150"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={inputEmail}
                  onChange={(e) => {
                    setInputEmail(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Enter your email"
                  className="w-full px-3.5 py-2.5 bg-[#0a0b10] border border-zinc-800 focus:border-zinc-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition duration-150"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-zinc-950 bg-white hover:bg-zinc-200 transition duration-150 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                >
                  <span>{authMode === 'SIGN_IN' ? 'Sign In' : 'Sign Up'}</span>
                  <ArrowRight className="w-4 h-4 text-zinc-950" />
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setAuthMode(authMode === 'SIGN_IN' ? 'SIGN_UP' : 'SIGN_IN');
                  }}
                  className="text-[11px] text-zinc-400 hover:text-white transition-colors"
                >
                  {authMode === 'SIGN_IN'
                    ? "Don't have an account? Sign Up"
                    : 'Already have an account? Sign In'}
                </button>
              </div>
            </form>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: DASHBOARD SCREEN (GENERIC REUSABLE PRODUCT) */}
      {/* ========================================================================= */}
      {currentScreen === 'dashboard' && currentUser && (
        <div className="min-h-screen flex flex-col">
          
          {/* Top Navbar */}
          <header className="sticky top-0 z-30 border-b border-zinc-800 bg-[#0c0d13]/95 px-6 py-3 backdrop-blur-md">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              <div className="flex items-center flex-wrap gap-2.5">
                <div className="h-7 w-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-sm">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="font-semibold text-sm text-white mr-2">
                  Connected Workspace
                </span>

                {/* Integration Indicators */}
                <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Task Tracker: Active
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Git Stream: Connected
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Calendar: Synced
                  </span>
                </div>
              </div>

              {/* User Account Details */}
              <div className="flex items-center gap-3 self-end md:self-auto">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-200">
                  <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold">{currentUser.name}</span>
                    <span className="text-[10px] text-zinc-500 ml-1.5 hidden lg:inline">({currentUser.email})</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition duration-150"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>
          </header>

          {/* Main Dashboard Container */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
            
            {/* ALL 5 LIVE KPI METRICS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              
              <div className="rounded-xl p-4 bg-[#12141d] border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium">Total Tasks</span>
                  <CheckSquare className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="text-2xl font-bold text-white">{totalTasks}</div>
                <div className="text-[11px] text-zinc-500 mt-1">In project backlog</div>
              </div>

              <div className="rounded-xl p-4 bg-[#12141d] border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium">In Progress</span>
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="text-2xl font-bold text-zinc-200">{inProgressTasks}</div>
                <div className="text-[11px] text-zinc-500 mt-1">Active execution</div>
              </div>

              <div className="rounded-xl p-4 bg-[#12141d] border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium">Completed</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="text-2xl font-bold text-zinc-200">{completedTasks}</div>
                <div className="text-[11px] text-zinc-500 mt-1">{completionRate}% finished</div>
              </div>

              <div className="rounded-xl p-4 bg-[#12141d] border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium">Overdue</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="text-2xl font-bold text-zinc-200">{overdueCount}</div>
                <div className="text-[11px] text-zinc-500 mt-1">Missed deadline</div>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-xl p-4 bg-[#12141d] border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium">Sprint Health</span>
                  <Flame className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="text-2xl font-bold text-white">{healthScore}%</div>
                
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-zinc-300 rounded-full transition-all duration-300"
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </div>

            </div>

            {/* ========================================================================= */}
            {/* THE UNIFIED 3-PILLAR COCKPIT */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* PILLAR 1: SPRINT TASK BOARD (7 OF 12 COLS) */}
              <div className="lg:col-span-7 space-y-4">
                
                <div className="rounded-xl p-4 bg-[#12141d] border border-zinc-800 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-white" />
                      <h3 className="text-sm font-semibold text-white">Sprint Deliverables</h3>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Track deliverables, priorities, and assignees</p>
                  </div>

                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-950" />
                    <span>Add Task</span>
                  </button>
                </div>

                {/* Filter Bar */}
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-400">Filter:</span>
                    {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE', 'OVERDUE'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setStatusFilter(filter)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                          statusFilter === filter
                            ? 'bg-zinc-800 text-white font-semibold'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {filter.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <span className="text-zinc-500">
                    {filteredTasks.length} tasks
                  </span>
                </div>

                {/* Tasks List */}
                <div className="space-y-3">
                  {filteredTasks.length === 0 ? (
                    <div className="rounded-xl p-10 text-center border border-zinc-800 bg-[#12141d]">
                      <CheckSquare className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                      <h4 className="text-xs font-semibold text-zinc-300 mb-1">No tasks in this view</h4>
                      <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-3">
                        {tasks.length === 0
                          ? "Your sprint board is empty. Click 'Add Task' to assign your first deliverable."
                          : "No tasks match the active filter."}
                      </p>
                      {tasks.length === 0 && (
                        <button
                          onClick={() => setIsTaskModalOpen(true)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-950 bg-white hover:bg-zinc-200 transition"
                        >
                          Create first task
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredTasks.map(task => {
                      const isOverdue = task.status !== 'DONE' && task.dueDate < todayStr;
                      return (
                        <div
                          key={task.id}
                          className="rounded-xl p-4 bg-[#12141d] border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                                {task.project}
                              </span>
                              
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                                  {task.priority}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-zinc-600 hover:text-zinc-300 p-0.5"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <h4 className="text-xs font-semibold text-zinc-100">{task.title}</h4>
                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{task.description}</p>
                          </div>

                          <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                              <span>Assignee: <span className="text-zinc-300 font-medium">{task.assignee}</span></span>
                              <span>•</span>
                              <span className={isOverdue ? 'text-zinc-200 font-semibold' : ''}>
                                Due: {task.dueDate} {isOverdue && '(Overdue)'}
                              </span>
                            </div>

                            <select
                              value={task.status}
                              onChange={(e) => handleUpdateStatus(task.id, e.target.value as TaskStatus)}
                              className="text-[11px] font-medium px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 cursor-pointer focus:outline-none"
                            >
                              <option value="TODO">TODO</option>
                              <option value="IN_PROGRESS">IN PROGRESS</option>
                              <option value="DONE">DONE</option>
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

              {/* PILLARS 2 & 3: GITHUB STREAM & GOOGLE CALENDAR (5 OF 12 COLS) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* PILLAR 2: CONNECTED GITHUB REPOSITORY */}
                <div className="rounded-xl p-5 bg-[#12141d] border border-zinc-800 space-y-3">
                  
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-white" />
                      <div>
                        <h3 className="text-xs font-semibold text-white">GitHub Repository Feed</h3>
                        <p className="text-[10px] text-zinc-400 font-mono">{connectedRepo} ({activeBranch})</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setInputRepoName(connectedRepo);
                          setIsRepoModalOpen(true);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                        title="Configure repository"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setIsCommitModalOpen(true)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
                      >
                        + Push Commit
                      </button>
                    </div>
                  </div>

                  {/* Commits Feed */}
                  <div className="space-y-2">
                    {commits.length === 0 ? (
                      <div className="p-4 rounded-lg bg-[#0a0b10] border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                        No commits recorded yet. Click '+ Push Commit' to log repository code activity.
                      </div>
                    ) : (
                      commits.map(commit => (
                        <div key={commit.id} className="p-2.5 rounded-lg bg-[#0a0b10] border border-zinc-800/80 text-xs">
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                            <span className="font-mono text-zinc-300 font-semibold">{commit.hash}</span>
                            <span>{commit.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-zinc-200 line-clamp-1">{commit.message}</p>
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                            <span>Author: {commit.author}</span>
                            <span className="font-mono bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">{commit.branch}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>

                {/* PILLAR 3: REAL-TIME INTERACTIVE CALENDAR GRID */}
                <div className="rounded-xl p-5 bg-[#12141d] border border-zinc-800 space-y-4">
                  
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-white" />
                      <div>
                        <h3 className="text-xs font-semibold text-white">Google Calendar Widget</h3>
                        <p className="text-[10px] text-zinc-400 font-medium">{currentMonthName}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsEventModalOpen(true)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
                    >
                      + Add Event
                    </button>
                  </div>

                  {/* Monthly Calendar Grid */}
                  <div className="bg-[#0a0b10] p-3 rounded-xl border border-zinc-800/80">
                    
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-500 font-semibold mb-2">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <div key={`blank-${i}`} className="h-7 w-7" />
                      ))}

                      {calendarDaysArray.map(dayNum => {
                        const isToday = dayNum === todayDay;
                        const isSelected = dayNum === selectedDay;
                        const hasEvent = calendarEvents.some(ev => ev.day === dayNum);

                        return (
                          <button
                            key={dayNum}
                            onClick={() => setSelectedDay(dayNum)}
                            className={`h-7 w-7 mx-auto rounded-lg text-[11px] flex flex-col items-center justify-center relative transition ${
                              isSelected
                                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                                : isToday
                                ? 'border border-zinc-500 text-white font-semibold'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                            }`}
                          >
                            <span>{dayNum}</span>
                            {hasEvent && (
                              <span
                                className={`w-1 h-1 rounded-full absolute bottom-0.5 ${
                                  isSelected ? 'bg-zinc-950' : 'bg-white'
                                }`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scheduled Events for Selected Date */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium px-1">
                      <span>Schedule for Day {selectedDay}</span>
                      <span className="text-[10px] text-zinc-500">{selectedDayEvents.length} event(s)</span>
                    </div>

                    {selectedDayEvents.length === 0 ? (
                      <div className="p-3 rounded-lg bg-[#0a0b10] border border-dashed border-zinc-800 text-center text-[11px] text-zinc-500">
                        No events on day {selectedDay}. Click '+ Add Event' to schedule.
                      </div>
                    ) : (
                      selectedDayEvents.map(ev => (
                        <div key={ev.id} className="p-2.5 rounded-lg bg-[#0a0b10] border border-zinc-800 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium">
                              {ev.category}
                            </span>
                            <span className="text-zinc-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ev.time}
                            </span>
                          </div>
                          <h4 className="text-[11px] font-semibold text-zinc-100">{ev.title}</h4>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                            <span className="flex items-center gap-1 text-zinc-500">
                              <Video className="w-3 h-3" />
                              {ev.location}
                            </span>
                            <span className="text-[10px] text-zinc-300 flex items-center gap-0.5 hover:text-white cursor-pointer">
                              <span>Join</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>

              </div>

            </div>

          </main>

          {/* ========================================================================= */}
          {/* MODAL 1: ADD TASK */}
          {/* ========================================================================= */}
          {isTaskModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
              <div className="rounded-xl p-5 bg-[#13151f] border border-zinc-800 max-w-sm w-full shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <h3 className="text-xs font-semibold text-white">Create Sprint Task</h3>
                  <button onClick={() => setIsTaskModalOpen(false)} className="text-zinc-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateTask} className="mt-3.5 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Task Title *</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Implement user authentication"
                      className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Description</label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Acceptance criteria and deliverables..."
                      rows={2}
                      className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">Priority</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                        className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-white">
                      Cancel
                    </button>
                    <button type="submit" className="px-3 py-1.5 rounded text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 transition">
                      Save Task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL 2: LOG GITHUB COMMIT */}
          {/* ========================================================================= */}
          {isCommitModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
              <div className="rounded-xl p-5 bg-[#13151f] border border-zinc-800 max-w-sm w-full shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-white" />
                    <h3 className="text-xs font-semibold text-white">Record Git Commit</h3>
                  </div>
                  <button onClick={() => setIsCommitModalOpen(false)} className="text-zinc-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleLogCommit} className="mt-3.5 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Commit Message *</label>
                    <input
                      type="text"
                      required
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="e.g. fix: resolve session expiration bug"
                      className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setIsCommitModalOpen(false)} className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-white">
                      Cancel
                    </button>
                    <button type="submit" className="px-3 py-1.5 rounded text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 transition">
                      Push Commit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL 3: CONFIGURE REPOSITORY */}
          {/* ========================================================================= */}
          {isRepoModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
              <div className="rounded-xl p-5 bg-[#13151f] border border-zinc-800 max-w-sm w-full shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-white" />
                    <h3 className="text-xs font-semibold text-white">Connect Your Repository</h3>
                  </div>
                  <button onClick={() => setIsRepoModalOpen(false)} className="text-zinc-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleUpdateRepo} className="mt-3.5 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Repository Name (owner/repo)</label>
                    <input
                      type="text"
                      required
                      value={inputRepoName}
                      onChange={(e) => setInputRepoName(e.target.value)}
                      placeholder="e.g. facebook/react or your-username/project"
                      className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Active Branch</label>
                    <input
                      type="text"
                      value={activeBranch}
                      onChange={(e) => setActiveBranch(e.target.value)}
                      placeholder="main"
                      className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 font-mono"
                    />
                  </div>
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setIsRepoModalOpen(false)} className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-white">
                      Cancel
                    </button>
                    <button type="submit" className="px-3 py-1.5 rounded text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 transition">
                      Save Repository
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL 4: SCHEDULE CALENDAR EVENT */}
          {/* ========================================================================= */}
          {isEventModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
              <div className="rounded-xl p-5 bg-[#13151f] border border-zinc-800 max-w-sm w-full shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-white" />
                    <h3 className="text-xs font-semibold text-white">Schedule Calendar Event</h3>
                  </div>
                  <button onClick={() => setIsEventModalOpen(false)} className="text-zinc-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleScheduleEvent} className="mt-3.5 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Event Title *</label>
                    <input
                      type="text"
                      required
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g. Sprint Retrospective"
                      className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">Category</label>
                      <select
                        value={eventCategory}
                        onChange={(e) => setEventCategory(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                      >
                        <option value="STANDUP">STANDUP</option>
                        <option value="REVIEW">REVIEW</option>
                        <option value="DEADLINE">DEADLINE</option>
                        <option value="SYNC">SYNC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">Day of Month</label>
                      <input
                        type="number"
                        min={1}
                        max={daysInMonth}
                        value={eventDay}
                        onChange={(e) => setEventDay(parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">Time</label>
                      <input
                        type="text"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        placeholder="10:00 AM - 11:00 AM"
                        className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">Location</label>
                      <input
                        type="text"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="Google Meet"
                        className="w-full px-2.5 py-1.5 bg-[#090a0f] border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setIsEventModalOpen(false)} className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-white">
                      Cancel
                    </button>
                    <button type="submit" className="px-3 py-1.5 rounded text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 transition">
                      Schedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

// Required default export for main.tsx
export default App;