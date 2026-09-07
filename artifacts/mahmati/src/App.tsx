import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronDown, Circle, ClipboardList, Edit3, FolderPlus, ListFilter, Menu, Plus, Search, Settings, Sparkles, Trash2, X } from 'lucide-react';
import { Link, Route, Switch, useLocation } from 'wouter';

type Priority = 'low' | 'medium' | 'high';
type Status = 'todo' | 'completed';
type Task = {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string;
  priority: Priority;
  status: Status;
  projectId?: string;
  createdAt: string;
};
type Project = { id: string; name: string; color: string };

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const dateLabel = (date?: string) => {
  if (!date) return '';
  if (date === today()) return 'اليوم';
  if (date === addDays(1)) return 'غداً';
  return new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));
};
const fullDate = new Intl.DateTimeFormat('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' });
const seedProjects: Project[] = [
  { id: 'personal', name: 'شخصي', color: '#d99a3d' },
  { id: 'work', name: 'العمل', color: '#5d9a91' },
  { id: 'home', name: 'البيت', color: '#bc6c55' },
];
const seedTasks: Task[] = [
  { id: 'seed-1', title: 'مراجعة عرض المشروع قبل الاجتماع', notes: 'أريد أن أصل للاجتماع وأنا مطمئن لكل التفاصيل.', dueDate: today(), priority: 'high', status: 'todo', projectId: 'work', createdAt: new Date().toISOString() },
  { id: 'seed-2', title: 'حجز موعد الفحص السنوي', dueDate: today(), priority: 'medium', status: 'todo', projectId: 'personal', createdAt: new Date().toISOString() },
  { id: 'seed-3', title: 'شراء نبتة جديدة للشرفة', dueDate: addDays(1), priority: 'low', status: 'todo', projectId: 'home', createdAt: new Date().toISOString() },
  { id: 'seed-4', title: 'إرسال رسالة شكر لفريق الأسبوع الماضي', priority: 'low', status: 'completed', projectId: 'work', createdAt: new Date().toISOString() },
];

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  return (
    <Switch>
      <Route path="/completed"><TaskWorkspace initialView="completed" /></Route>
      <Route path="/"><TaskWorkspace initialView="today" /></Route>
      <Route><NotFound /></Route>
    </Switch>
  );
}

function NotFound() {
  return <main className="min-h-[100dvh] grid place-items-center bg-[#f6f2e9] p-6 text-center"><div><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#193e45] text-[#f5c46b]"><ClipboardList /></div><h1 className="font-serif text-3xl font-bold">هذه الصفحة ليست هنا</h1><Link href="/" className="mt-5 inline-block rounded-full bg-[#193e45] px-5 py-3 text-sm font-semibold text-[#fffaf0]">العودة لمهمتي</Link></div></main>;
}

function TaskWorkspace({ initialView }: { initialView: 'today' | 'completed' }) {
  const [location, setLocation] = useLocation();
  const [tasks, setTasks] = useState<Task[]>(() => readStored('mahmati-tasks', seedTasks));
  const [projects, setProjects] = useState<Project[]>(() => readStored('mahmati-projects', seedProjects));
  const [view, setView] = useState<'today' | 'all' | 'completed'>(initialView);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => localStorage.setItem('mahmati-tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('mahmati-projects', JSON.stringify(projects)), [projects]);
  useEffect(() => { if (initialView === 'completed') setView('completed'); }, [initialView]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const todayCount = tasks.filter((task) => task.status === 'todo' && task.dueDate === today()).length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const visibleTasks = useMemo(() => tasks
    .filter((task) => view === 'completed' ? task.status === 'completed' : task.status === 'todo')
    .filter((task) => view === 'today' ? task.dueDate === today() : true)
    .filter((task) => activeProject ? task.projectId === activeProject : true)
    .filter((task) => priorityFilter === 'all' ? true : task.priority === priorityFilter)
    .filter((task) => `${task.title} ${task.notes ?? ''}`.toLowerCase().includes(query.toLowerCase().trim()))
    .sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return (priority[a.priority] - priority[b.priority]) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    }), [tasks, view, activeProject, priorityFilter, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Task[]>();
    visibleTasks.forEach((task) => {
      const key = task.projectId ?? 'without-project';
      groups.set(key, [...(groups.get(key) ?? []), task]);
    });
    return [...groups.entries()];
  }, [visibleTasks]);

  const showToast = (message: string) => setToast(message);
  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (task: Task) => { setEditing(task); setEditorOpen(true); };
  const saveTask = (draft: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => {
    if (draft.id) {
      setTasks((current) => current.map((task) => task.id === draft.id ? { ...task, ...draft } as Task : task));
      showToast('تم حفظ التعديلات');
    } else {
      setTasks((current) => [{ ...draft, id: uid(), createdAt: new Date().toISOString() } as Task, ...current]);
      showToast('أضيفت المهمة إلى يومك');
    }
    setEditorOpen(false);
  };
  const toggleTask = (task: Task) => {
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: item.status === 'todo' ? 'completed' : 'todo' } : item));
    showToast(task.status === 'todo' ? 'أحسنت، خطوة أخرى انتهت' : 'عادت المهمة إلى القائمة');
  };
  const deleteTask = (task: Task) => {
    if (!window.confirm(`هل تريد حذف «${task.title}»؟`)) return;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    showToast('حُذفت المهمة');
  };
  const clearAllData = () => {
    if (!window.confirm('سيتم حذف جميع المهام والمجلدات نهائياً من هذا الجهاز. هل تريد المتابعة؟')) return;
    setTasks([]);
    setProjects([]);
    setActiveProject(null);
    setView('today');
    setSettingsOpen(false);
    if (location === '/completed') setLocation('/');
    showToast('تم مسح جميع البيانات');
  };
  const createProject = (name: string, color: string) => {
    const project = { id: uid(), name, color };
    setProjects((current) => [...current, project]);
    setProjectOpen(false);
    setActiveProject(project.id);
    showToast('أضيف مجلد جديد');
  };
  const selectView = (next: 'today' | 'all' | 'completed') => {
    setView(next);
    setMobileMenu(false);
    setActiveProject(null);
    if (next === 'completed') setLocation('/completed');
    else if (location === '/completed') setLocation('/');
  };

  const heading = view === 'completed' ? 'ما أنجزته' : view === 'all' ? 'كل المهام' : 'مهمات اليوم';
  const subheading = view === 'completed' ? 'الأشياء التي تركتها خلفك بسلام.' : view === 'all' ? 'كل ما ينتظر منك خطوة صغيرة.' : fullDate.format(new Date());

  return (
    <div className="paper-grain min-h-[100dvh] bg-[#f6f2e9]">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1500px]">
        <aside className={`${mobileMenu ? 'translate-x-0' : 'translate-x-full'} fixed inset-y-0 right-0 z-40 flex w-[286px] flex-col bg-[#193e45] px-5 py-6 text-[#f8f2e5] shadow-2xl transition-transform duration-300 lg:relative lg:inset-auto lg:translate-x-0 lg:shadow-none`}>
          <div className="flex items-center justify-between px-2">
            <Link href="/" className="flex items-center gap-3" data-testid="link-logo">
              <div className="grid size-11 place-items-center rounded-[15px] bg-[#f5c46b] text-[#193e45] shadow-[4px_4px_0_#102f35]"><Check size={25} strokeWidth={3} /></div>
              <div><div className="font-serif text-xl font-bold tracking-tight">مهمتي</div><div className="text-[11px] text-[#b8ceca]">مكانك الهادئ</div></div>
            </Link>
            <button className="icon-button rounded-lg p-2 text-[#b8ceca] hover:bg-[#28535a] lg:hidden" onClick={() => setMobileMenu(false)} data-testid="button-close-menu"><X size={19} /></button>
          </div>
          <div className="mt-12">
            <p className="mb-3 px-3 text-[11px] font-bold tracking-[.16em] text-[#8eadab]">مساحتي</p>
            <nav className="space-y-1">
              <NavButton active={view === 'today'} icon={<Sparkles size={18} />} label="اليوم" count={todayCount} onClick={() => selectView('today')} testId="nav-today" />
              <NavButton active={view === 'all'} icon={<ClipboardList size={18} />} label="كل المهام" count={tasks.filter((task) => task.status === 'todo').length} onClick={() => selectView('all')} testId="nav-all" />
              <NavButton active={view === 'completed'} icon={<Check size={18} />} label="مكتمل" count={completedCount} onClick={() => selectView('completed')} testId="nav-completed" />
            </nav>
          </div>
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between px-3">
              <p className="text-[11px] font-bold tracking-[.16em] text-[#8eadab]">مجلداتي</p>
              <button onClick={() => setProjectOpen(true)} className="rounded-md p-1 text-[#f5c46b] hover:bg-[#28535a]" data-testid="button-add-project" aria-label="إضافة مجلد"><Plus size={17} /></button>
            </div>
            <div className="space-y-1">
              {projects.map((project) => <button key={project.id} onClick={() => { setActiveProject(activeProject === project.id ? null : project.id); setView('all'); setMobileMenu(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm transition-colors ${activeProject === project.id ? 'bg-[#28535a] text-[#fff8ec]' : 'text-[#c1d4d0] hover:bg-[#244c53]'}`} data-testid={`button-project-${project.id}`}><span className="size-2.5 rounded-full" style={{ backgroundColor: project.color }} /><span className="flex-1">{project.name}</span><span className="text-xs text-[#86a8a3]">{tasks.filter((task) => task.projectId === project.id && task.status === 'todo').length}</span></button>)}
            </div>
          </div>
          <button onClick={() => { setSettingsOpen(true); setMobileMenu(false); }} className="mt-8 flex items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-semibold text-[#c1d4d0] transition-colors hover:bg-[#244c53] hover:text-[#fff8ec]" data-testid="button-settings"><Settings size={18} /><span className="flex-1">الإعدادات</span></button>
          <div className="mt-auto rounded-2xl border border-[#3c6265] bg-[#214b52] p-4">
            <div className="mb-2 flex items-center gap-2 text-[#f5c46b]"><Sparkles size={15} /><span className="text-xs font-bold">إيقاع صغير، فرق كبير</span></div>
            <p className="text-xs leading-6 text-[#c5d7d2]">لا تحتاج لإنهاء كل شيء اليوم. اختر ما يستحق انتباهك الآن.</p>
          </div>
        </aside>
        {mobileMenu && <button className="fixed inset-0 z-30 bg-[#102f35]/50 lg:hidden" onClick={() => setMobileMenu(false)} aria-label="إغلاق القائمة" data-testid="button-overlay" />}
        <main className="min-w-0 flex-1">
          <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-14 lg:py-8">
            <button onClick={() => setMobileMenu(true)} className="icon-button rounded-xl bg-[#fffaf0] p-3 text-[#193e45] shadow-sm lg:hidden" data-testid="button-open-menu" aria-label="فتح القائمة"><Menu size={20} /></button>
            <div className="hidden text-sm text-[#65807e] sm:block">مساحتك الشخصية، كما تحبها</div>
            <div className="flex items-center gap-3 mr-auto sm:mr-0">
              <span className="hidden text-xs text-[#78918e] sm:inline">يوم هادئ يبدأ بخطوة</span>
              <div className="grid size-10 place-items-center rounded-full border-2 border-[#f0d08e] bg-[#f5c46b] font-serif font-bold text-[#193e45]" data-testid="avatar-initial">م</div>
            </div>
          </header>
          <div className="mx-auto max-w-[1020px] px-5 pb-16 sm:px-8 lg:px-14">
            <section className="animate-rise mb-9">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="mb-2 text-sm font-medium text-[#b17c31]">مرحباً بك من جديد</p><h1 className="font-serif text-[2.25rem] font-bold leading-tight tracking-[-.04em] text-[#193e45] sm:text-5xl" data-testid="text-page-heading">{heading}</h1><p className="mt-3 text-sm text-[#6d8580]" data-testid="text-page-subheading">{subheading}</p></div>
                <button onClick={openNew} className="group flex items-center justify-center gap-2 rounded-2xl bg-[#193e45] px-5 py-3.5 text-sm font-bold text-[#fff9ef] shadow-[4px_4px_0_#d9a44b] transition hover:-translate-y-0.5 hover:bg-[#28535a] active:translate-y-0" data-testid="button-add-task"><Plus size={18} className="transition-transform group-hover:rotate-90" /> مهمة جديدة</button>
              </div>
            </section>
            <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="لليوم" value={todayCount} detail="مهمة تنتظر لمستك" accent="gold" testId="stat-today" />
              <StatCard label="قيد الإنجاز" value={tasks.filter((task) => task.status === 'todo').length} detail="في كل المجلدات" accent="teal" testId="stat-active" />
              <StatCard label="أنجزت" value={completedCount} detail="خطوات خلفك" accent="coral" testId="stat-completed" />
              <div className="hidden rounded-2xl bg-[#e6eee8] p-4 sm:block"><div className="mb-3 flex items-center gap-2 text-[#437b72]"><span className="size-2 rounded-full bg-[#5d9a91]" /><span className="text-xs font-bold">تقدمك اليوم</span></div><div className="h-2 overflow-hidden rounded-full bg-[#cdded8]"><div className="h-full rounded-full bg-[#5d9a91] transition-all duration-500" style={{ width: `${Math.min(100, todayCount === 0 && tasks.filter((task) => task.dueDate === today() && task.status === 'completed').length === 0 ? 0 : (tasks.filter((task) => task.dueDate === today() && task.status === 'completed').length / Math.max(1, tasks.filter((task) => task.dueDate === today()).length)) * 100)}%` }} /></div><p className="mt-2 text-[11px] text-[#668d87]">كل خطوة تُحسب</p></div>
            </section>
            <section className="mb-7 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8da19d]" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في مهامك..." className="h-12 w-full rounded-2xl border border-[#e7ddcc] bg-[#fffaf0] pr-11 pl-4 text-sm text-[#193e45] outline-none transition focus:border-[#d3a150] focus:ring-4 focus:ring-[#f5c46b]/20" data-testid="input-search" /></div>
              <div className="relative"><ListFilter className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8da19d]" size={16} /><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'all' | Priority)} className="h-12 w-full appearance-none rounded-2xl border border-[#e7ddcc] bg-[#fffaf0] py-2 pl-10 pr-10 text-sm text-[#345754] outline-none focus:border-[#d3a150] sm:w-44" data-testid="select-priority"><option value="all">كل الأولويات</option><option value="high">أولوية عالية</option><option value="medium">أولوية متوسطة</option><option value="low">أولوية منخفضة</option></select><ChevronDown className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8da19d]" size={15} /></div>
            </section>
            <div className="mb-5 flex items-center justify-between border-b border-[#e5dac8] pb-4"><div className="flex items-center gap-2 text-sm font-semibold text-[#345754]"><span className="size-2 rounded-full bg-[#d99a3d]" />{activeProject ? projects.find((project) => project.id === activeProject)?.name : view === 'completed' ? 'الأرشيف الجميل' : view === 'today' ? 'تركيز اليوم' : 'كل المساحة'}<span className="mr-1 text-xs font-normal text-[#92a19e]">({visibleTasks.length})</span></div>{activeProject && <button onClick={() => setActiveProject(null)} className="text-xs font-semibold text-[#b17c31] hover:underline" data-testid="button-clear-project">عرض الكل</button>}</div>
            {grouped.length > 0 ? <div className="space-y-8">{grouped.map(([groupId, groupTasks], groupIndex) => <section key={groupId} className="animate-rise" style={{ animationDelay: `${groupIndex * 70}ms` }}><div className="mb-3 flex items-center gap-2">{groupId !== 'without-project' && <span className="size-2 rounded-full" style={{ backgroundColor: projects.find((project) => project.id === groupId)?.color }} />}<h2 className="text-xs font-bold text-[#78918e]">{groupId === 'without-project' ? 'بدون مجلد' : projects.find((project) => project.id === groupId)?.name}</h2><span className="h-px flex-1 bg-[#e9dfcf]" /></div><div className="space-y-2.5">{groupTasks.map((task) => <TaskRow key={task.id} task={task} project={projects.find((project) => project.id === task.projectId)} onToggle={() => toggleTask(task)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task)} />)}</div></section>)}</div> : <EmptyState view={view} hasFilters={Boolean(query || activeProject || priorityFilter !== 'all')} clearFilters={() => { setQuery(''); setActiveProject(null); setPriorityFilter('all'); }} onAdd={openNew} />}
          </div>
        </main>
      </div>
      {editorOpen && <TaskEditor task={editing} projects={projects} onSave={saveTask} onClose={() => setEditorOpen(false)} onCreateProject={() => setProjectOpen(true)} />}
      {projectOpen && <ProjectEditor onSave={createProject} onClose={() => setProjectOpen(false)} />}
      {settingsOpen && <SettingsModal taskCount={tasks.length} projectCount={projects.length} onClearAll={clearAllData} onClose={() => setSettingsOpen(false)} />}
      {toast && <div className="animate-pop fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#193e45] px-5 py-3 text-sm font-semibold text-[#fff9ef] shadow-lg" role="status" data-testid="toast-message"><Check size={16} className="text-[#f5c46b]" />{toast}</div>}
    </div>
  );
}

function NavButton({ active, icon, label, count, onClick, testId }: { active: boolean; icon: ReactNode; label: string; count: number; onClick: () => void; testId: string }) {
  return <button onClick={onClick} className={`nav-pill flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? 'bg-[#f5c46b] text-[#193e45] shadow-[3px_3px_0_#102f35]' : 'text-[#c1d4d0] hover:bg-[#244c53] hover:text-[#fff8ec]'}`} data-testid={testId}>{icon}<span className="flex-1 text-right">{label}</span><span className={`text-xs ${active ? 'text-[#59716a]' : 'text-[#86a8a3]'}`}>{count}</span></button>;
}

function StatCard({ label, value, detail, accent, testId }: { label: string; value: number; detail: string; accent: 'gold' | 'teal' | 'coral'; testId: string }) {
  const colors = { gold: 'bg-[#fff2cc] text-[#9c6b20]', teal: 'bg-[#e2efea] text-[#39796f]', coral: 'bg-[#f8e3d9] text-[#ae604a]' };
  return <div className={`rounded-2xl p-4 ${colors[accent]}`} data-testid={testId}><div className="flex items-end justify-between gap-2"><span className="text-xs font-semibold opacity-80">{label}</span><strong className="font-serif text-3xl leading-none">{value}</strong></div><p className="mt-2 text-[11px] opacity-70">{detail}</p></div>;
}

function TaskRow({ task, project, onToggle, onEdit, onDelete }: { task: Task; project?: Project; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const priority = { high: { label: 'مهم جداً', color: 'bg-[#f8e0d8] text-[#a95743]' }, medium: { label: 'مهم', color: 'bg-[#fff0ca] text-[#9c7029]' }, low: { label: 'هادئ', color: 'bg-[#e2efea] text-[#39796f]' } }[task.priority];
  return <article className={`task-row group relative flex gap-3 rounded-2xl border bg-[#fffaf0] p-4 sm:gap-4 ${task.status === 'completed' ? 'border-[#e0e0d1] opacity-70' : 'border-[#ebe1d1]'}`} data-testid={`task-card-${task.id}`}>
    <button onClick={onToggle} className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all ${task.status === 'completed' ? 'animate-check border-[#5d9a91] bg-[#5d9a91] text-white' : 'border-[#b5c4bd] text-transparent hover:border-[#5d9a91] hover:bg-[#e5f0eb]'}`} aria-label={task.status === 'completed' ? 'إعادة فتح المهمة' : 'إنهاء المهمة'} data-testid={`button-toggle-task-${task.id}`}>{task.status === 'completed' ? <Check size={15} strokeWidth={3} /> : <Circle size={11} />}</button>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start gap-2"><h3 className={`flex-1 text-[15px] font-semibold leading-7 text-[#244b50] ${task.status === 'completed' ? 'line-through' : ''}`} data-testid={`text-task-title-${task.id}`}>{task.title}</h3><span className={`rounded-md px-2 py-1 text-[10px] font-bold ${priority.color}`}>{priority.label}</span></div>{task.notes && <p className="mt-1 line-clamp-1 text-xs leading-6 text-[#839390]">{task.notes}</p>}<div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#82928e]">{task.dueDate && <span className={`flex items-center gap-1 ${task.dueDate < today() && task.status === 'todo' ? 'font-bold text-[#b85745]' : ''}`}><CalendarDays size={13} />{dateLabel(task.dueDate)}</span>}{project && <span className="flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ backgroundColor: project.color }} />{project.name}</span>}</div></div>
     <div className="flex shrink-0 items-start gap-1"><button onClick={onEdit} title="تعديل المهمة" className="icon-button rounded-lg p-2 text-[#66817d] hover:bg-[#eaf0e9] hover:text-[#39796f]" aria-label="تعديل المهمة" data-testid={`button-edit-task-${task.id}`}><Edit3 size={15} /></button><button onClick={onDelete} title="حذف المهمة" className="icon-button rounded-lg p-2 text-[#66817d] hover:bg-[#f8e3d9] hover:text-[#a95743]" aria-label="حذف المهمة" data-testid={`button-delete-task-${task.id}`}><Trash2 size={15} /></button></div>
  </article>;
}

function EmptyState({ view, hasFilters, clearFilters, onAdd }: { view: 'today' | 'all' | 'completed'; hasFilters: boolean; clearFilters: () => void; onAdd: () => void }) {
  return <div className="animate-pop rounded-3xl border border-dashed border-[#d9ccb8] bg-[#fbf7ee] px-6 py-16 text-center"><div className="mx-auto mb-5 grid size-16 place-items-center rounded-[22px] bg-[#e7efe9] text-[#5d9a91]"><Check size={30} /></div><h2 className="font-serif text-xl font-bold text-[#345754]">{hasFilters ? 'لم نجد ما تبحث عنه' : view === 'completed' ? 'لا شيء في الأرشيف بعد' : view === 'today' ? 'يومك مفتوح على الاحتمالات' : 'مساحتك جاهزة لمهمة جديدة'}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[#839390]">{hasFilters ? 'جرّب تغيير الكلمات أو إزالة أحد الفلاتر.' : view === 'completed' ? 'عندما تنهي أول مهمة، ستجدها هنا لتتذكر ما أنجزته.' : 'أخرج أول شيء يدور في رأسك، وضعه هنا. الباقي يأتي خطوة بخطوة.'}</p>{hasFilters ? <button onClick={clearFilters} className="mt-6 rounded-full bg-[#e9f0eb] px-5 py-2.5 text-xs font-bold text-[#39796f]" data-testid="button-clear-filters">إزالة الفلاتر</button> : view !== 'completed' && <button onClick={onAdd} className="mt-6 rounded-full bg-[#193e45] px-5 py-2.5 text-xs font-bold text-[#fff9ef]" data-testid="button-empty-add">أضف مهمة</button>}</div>;
}

function TaskEditor({ task, projects, onSave, onClose, onCreateProject }: { task: Task | null; projects: Project[]; onSave: (task: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => void; onClose: () => void; onCreateProject: () => void }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? today());
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [projectId, setProjectId] = useState(task?.projectId ?? '');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!title.trim()) return; onSave({ id: task?.id, title: title.trim(), notes: notes.trim(), dueDate, priority, status: task?.status ?? 'todo', projectId: projectId || undefined }); };
  return <Modal title={task ? 'تعديل المهمة' : 'ما الذي تريد إنجازه؟'} onClose={onClose}><form onSubmit={submit} className="space-y-5"><div><label className="mb-2 block text-xs font-bold text-[#52706c]">اسم المهمة</label><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثلاً: الاتصال بوالدتي" className="w-full rounded-xl border border-[#dfd3c0] bg-[#fffaf0] px-4 py-3 text-sm outline-none focus:border-[#d3a150] focus:ring-4 focus:ring-[#f5c46b]/20" data-testid="input-task-title" /></div><div><label className="mb-2 block text-xs font-bold text-[#52706c]">ملاحظة <span className="font-normal text-[#a8b2ad]">(اختياري)</span></label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="أي شيء يساعدك على البدء..." rows={3} className="w-full resize-none rounded-xl border border-[#dfd3c0] bg-[#fffaf0] px-4 py-3 text-sm leading-6 outline-none focus:border-[#d3a150] focus:ring-4 focus:ring-[#f5c46b]/20" data-testid="input-task-notes" /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-[#52706c]">متى؟</label><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-11 w-full rounded-xl border border-[#dfd3c0] bg-[#fffaf0] px-3 text-sm outline-none focus:border-[#d3a150]" data-testid="input-task-date" /></div><div><label className="mb-2 block text-xs font-bold text-[#52706c]">الأولوية</label><select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="h-11 w-full rounded-xl border border-[#dfd3c0] bg-[#fffaf0] px-3 text-sm outline-none focus:border-[#d3a150]" data-testid="select-task-priority"><option value="high">مهم جداً</option><option value="medium">مهم</option><option value="low">هادئ</option></select></div></div><div><label className="mb-2 block text-xs font-bold text-[#52706c]">المجلد</label><div className="flex gap-2"><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-[#dfd3c0] bg-[#fffaf0] px-3 text-sm outline-none focus:border-[#d3a150]" data-testid="select-task-project"><option value="">بدون مجلد</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button type="button" onClick={onCreateProject} className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#dfd3c0] bg-[#f4ead8] text-[#b17c31] hover:bg-[#f5dfb6]" aria-label="إنشاء مجلد" data-testid="button-task-new-project"><FolderPlus size={17} /></button></div></div><div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[#dfd3c0] py-3 text-sm font-semibold text-[#66817d] hover:bg-[#f4ead8]" data-testid="button-cancel-task">إلغاء</button><button type="submit" disabled={!title.trim()} className="flex-1 rounded-xl bg-[#193e45] py-3 text-sm font-bold text-[#fff9ef] shadow-[3px_3px_0_#d9a44b] transition hover:bg-[#28535a] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-save-task">{task ? 'حفظ التعديل' : 'أضف إلى يومي'}</button></div></form></Modal>;
}

function ProjectEditor({ onSave, onClose }: { onSave: (name: string, color: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#d99a3d');
  const colors = ['#d99a3d', '#5d9a91', '#bc6c55', '#7085af', '#9c78a7'];
  return <Modal title="مجلد جديد" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (name.trim()) onSave(name.trim(), color); }} className="space-y-5"><div><label className="mb-2 block text-xs font-bold text-[#52706c]">اسم المجلد</label><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="مثلاً: رحلة الصيف" className="w-full rounded-xl border border-[#dfd3c0] bg-[#fffaf0] px-4 py-3 text-sm outline-none focus:border-[#d3a150]" data-testid="input-project-name" /></div><div><label className="mb-2 block text-xs font-bold text-[#52706c]">لون المجلد</label><div className="flex gap-3">{colors.map((item) => <button type="button" key={item} onClick={() => setColor(item)} className={`size-8 rounded-full transition ${color === item ? 'ring-2 ring-[#193e45] ring-offset-2' : ''}`} style={{ backgroundColor: item }} aria-label="اختيار لون" data-testid={`button-project-color-${item.slice(1)}`} />)}</div></div><div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[#dfd3c0] py-3 text-sm font-semibold text-[#66817d]" data-testid="button-cancel-project">إلغاء</button><button type="submit" disabled={!name.trim()} className="flex-1 rounded-xl bg-[#193e45] py-3 text-sm font-bold text-[#fff9ef] disabled:opacity-50" data-testid="button-save-project">إنشاء المجلد</button></div></form></Modal>;
}

function SettingsModal({ taskCount, projectCount, onClearAll, onClose }: { taskCount: number; projectCount: number; onClearAll: () => void; onClose: () => void }) {
  return <Modal title="الإعدادات" onClose={onClose}>
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#e4d5bf] bg-[#fffaf0] p-4">
        <div className="mb-2 flex items-center gap-2 text-[#345754]"><Settings size={17} /><h3 className="text-sm font-bold">بيانات مهمتي</h3></div>
        <p className="text-xs leading-6 text-[#839390]">المهام والمجلدات محفوظة على هذا الجهاز فقط، ولا يتم إرسالها إلى أي مكان.</p>
        <div className="mt-4 flex gap-3 text-xs text-[#66817d]"><span>{taskCount} مهمة</span><span className="text-[#c6b8a3]">•</span><span>{projectCount} مجلد</span></div>
      </div>
      <div className="rounded-2xl border border-[#e8c9bc] bg-[#fff4ef] p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f8e0d8] text-[#a95743]"><Trash2 size={17} /></div>
          <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-[#8f4d3e]">مسح كافة البيانات</h3><p className="mt-1 text-xs leading-6 text-[#a96c5d]">يحذف جميع المهام والمجلدات من هذا الجهاز نهائيًا. لا يمكن التراجع عن هذه العملية.</p></div>
        </div>
        <button onClick={onClearAll} className="mt-4 w-full rounded-xl border border-[#d99b89] bg-[#fffaf0] py-3 text-sm font-bold text-[#a95743] transition hover:bg-[#f8e0d8]" data-testid="button-clear-all-data">مسح كافة البيانات</button>
      </div>
    </div>
  </Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center bg-[#102f35]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="animate-pop max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#f8f2e6] p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-label={title}><div className="mb-6 flex items-center justify-between"><h2 className="font-serif text-xl font-bold text-[#193e45]">{title}</h2><button onClick={onClose} className="icon-button rounded-full bg-[#eee3d1] p-2 text-[#65807e] hover:bg-[#e4d5bf]" aria-label="إغلاق" data-testid="button-close-modal"><X size={17} /></button></div>{children}</div></div>;
}

export default App;