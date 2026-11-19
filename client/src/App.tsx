import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  Command,
  CreditCard,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router';
import { TransactionEntryForm } from './features/transactions/TransactionEntryForm';
import { TransactionsPage as ApiTransactionsPage } from './features/transactions/TransactionsPage';
import { BudgetsPage as ApiBudgetsPage } from './features/budgets/BudgetsPage';
import { AnalyticsPage as ApiAnalyticsPage } from './features/analytics/AnalyticsPage';
import { AssistantChatPage } from './features/assistant/AssistantChatPage';
import { financeApi, type Category } from './lib/finance-api';
import { formatMoney } from './lib/money';
import { AuthPage } from './features/auth/AuthPage';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import { LoadingState } from './components/RequestState';

type IconComponent = typeof LayoutDashboard;

const navItems: Array<{ label: string; to: string; icon: IconComponent }> = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Transactions', to: '/transactions', icon: ArrowDownLeft },
  { label: 'Budgets', to: '/budgets', icon: Wallet },
  { label: 'Analytics', to: '/analytics', icon: ChartNoAxesCombined },
  { label: 'AI assistant', to: '/assistant', icon: Bot },
];

const pageTitles: Record<string, string> = {
  '/': 'Overview',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/analytics': 'Analytics',
  '/assistant': 'AI assistant',
};

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="FinPilot home">
      <span className="brand-mark">f</span>
      <span className="brand-word">finpilot<span>.</span></span>
    </Link>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="nav-list" aria-label="Main navigation">
      <p className="nav-caption">Workspace</p>
      {navItems.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          aria-label={label}
          onClick={onNavigate}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
          {label === 'AI assistant' && <span className="nav-new">NEW</span>}
        </NavLink>
      ))}
    </nav>
  );
}

function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const displayName = typeof user?.user_metadata?.display_name === 'string'
    ? user.user_metadata.display_name
    : 'Personal space';
  return (
    <>
      <aside className="sidebar">
        <Brand />
        <Navigation />
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <span className="privacy-icon"><ShieldCheck size={16} /></span>
            <div>
              <strong>Private by design</strong>
              <span>Your finances stay yours.</span>
            </div>
          </div>
          <button className="profile-button" type="button" aria-label="Sign out" onClick={() => { void signOut(); }}>
            <span className="avatar">F</span>
            <span className="profile-copy"><strong>{displayName}</strong><small>{user?.email ?? 'Signed in'}</small></span>
            <ChevronDown size={16} className="profile-chevron" aria-hidden="true" />
          </button>
        </div>
      </aside>
      <button
        className="mobile-menu-button"
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
        type="button"
      >
        {mobileOpen ? <X size={21} /> : <Menu size={21} />}
      </button>
      {mobileOpen && <div className="mobile-nav-overlay" onClick={() => setMobileOpen(false)}>
        <aside className="mobile-sidebar" onClick={(event) => event.stopPropagation()}>
          <div className="mobile-sidebar-top"><Brand /><button aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
          <Navigation onNavigate={() => setMobileOpen(false)} />
          <div className="privacy-note"><span className="privacy-icon"><ShieldCheck size={16} /></span><div><strong>Private by design</strong><span>Your finances stay yours.</span></div></div>
        </aside>
      </div>}
    </>
  );
}

function Topbar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'FinPilot';
  return (
    <header className="topbar">
      <div className="breadcrumb"><span>FinPilot</span><span className="breadcrumb-slash">/</span><strong>{title}</strong></div>
      <div className="topbar-actions">
        <span className="environment-pill"><span className="status-dot" /> Workspace setup</span>
        <button className="icon-button help-button" aria-label="Help" type="button"><CircleHelp size={19} /></button>
      </div>
    </header>
  );
}

function ConnectionNotice() {
  return (
    <div className="connection-notice" role="status">
      <span className="connection-icon"><ShieldCheck size={17} /></span>
      <div><strong>You’re signed in to your private workspace</strong><span>Transactions and live account totals will appear when the API is connected.</span></div>
      <span className="connection-tag">SECURE</span>
    </div>
  );
}

function AppShell() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-column">
        <Topbar />
        <main className="main-content">
          <ConnectionNotice />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<ApiTransactionsPage />} />
            <Route path="/budgets" element={<ApiBudgetsPage />} />
            <Route path="/analytics" element={<ApiAnalyticsPage />} />
            <Route path="/assistant" element={<AssistantChatPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <footer className="app-footer"><span>FinPilot</span><span>Thoughtful money management</span><span className="footer-version"><Command size={13} /> Built for clarity</span></footer>
        </main>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="section-description">{description}</p></div>
      {action}
    </div>
  );
}

function MetricCard({ label, icon: Icon, tone }: { label: string; icon: IconComponent; tone: string }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17} strokeWidth={1.9} /></span></div>
      <p className="metric-value" aria-label={`${label}: no data yet`}>—</p>
      <p className="metric-footnote">Connect account to view</p>
    </article>
  );
}

function EmptyPanel({ icon: Icon, title, description, action }: { icon: IconComponent; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="empty-panel">
      <div className="empty-icon"><Icon size={21} strokeWidth={1.8} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const month = `${new Date().toISOString().slice(0, 7)}-01`;
  const summaryQuery = useQuery({ queryKey: ['dashboard-summary', month], queryFn: () => financeApi.getDashboardSummary(month) });
  const transactionsQuery = useQuery({ queryKey: ['transactions', 'dashboard'], queryFn: () => financeApi.listTransactions('?limit=5&offset=0') });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: financeApi.listCategories });
  const budgetsQuery = useQuery({ queryKey: ['budgets', month], queryFn: () => financeApi.listBudgets(month) });
  const insightsQuery = useQuery({ queryKey: ['financial-insights', month], queryFn: financeApi.getFinancialInsights });
  const currencySummaries = summaryQuery.data?.data.currencies ?? [];
  const categories = categoriesQuery.data?.data ?? [];
  const recentTransactions = transactionsQuery.data?.data ?? [];
  const budgets = budgetsQuery.data?.data ?? [];
  const insightData = insightsQuery.data?.data;

  const amountForCurrency = (amountMinor: number, currency: string) => {
    const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
    return formatMoney(amountMinor / (10 ** digits), currency);
  };

  return (
    <>
      <SectionHeading
        eyebrow="YOUR MONEY, IN PERSPECTIVE"
        title="A clearer view of your money."
        description="Your financial picture, thoughtfully organized in one place."
        action={<button className="button button-primary" type="button" onClick={() => navigate('/transactions')}><Plus size={17} /> Add transaction</button>}
      />
      {summaryQuery.isError ? <p role="alert" className="dashboard-api-error">Could not load your monthly totals: {(summaryQuery.error as Error).message}</p> : summaryQuery.isLoading ? <p className="dashboard-loading">Loading your monthly totals…</p> : currencySummaries.length === 0 ? <EmptyPanel icon={Activity} title="No transactions this month" description="Add an income or expense to see your real totals here." action={<button className="button button-soft" type="button" onClick={() => navigate('/transactions')}>Add a transaction</button>} /> : currencySummaries.map((totals) => (
        <section className="metric-grid live-metric-grid" key={totals.currency} aria-label={`${totals.currency} monthly totals`}>
          {[
            { label: 'Income', value: amountForCurrency(totals.income_minor, totals.currency), icon: ArrowDownLeft, tone: 'green' },
            { label: 'Expenses', value: amountForCurrency(totals.expenses_minor, totals.currency), icon: ArrowUpRight, tone: 'amber' },
            { label: 'Net cashflow', value: amountForCurrency(totals.net_cashflow_minor, totals.currency), icon: Activity, tone: 'blue' },
            { label: 'Savings rate', value: totals.savings_rate === null ? '—' : `${(totals.savings_rate * 100).toFixed(1)}%`, icon: ChartNoAxesCombined, tone: 'violet' }
          ].map(({ label, value, icon: Icon, tone }) => <article className="surface live-metric-card" key={label}><div className="live-metric-heading"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17} /></span></div><strong>{value}</strong><small>{totals.currency} · This month</small></article>)}
        </section>
      ))}
      <div className="dashboard-grid">
        <section className="surface trend-card">
          <div className="surface-heading"><div><h2>Cashflow</h2><p>Income and spending over time</p></div><button className="select-button" type="button" disabled><CalendarDays size={15} /> This month <ChevronDown size={14} /></button></div>
          {summaryQuery.isError ? <EmptyPanel icon={ChartNoAxesCombined} title="Cashflow unavailable" description="Your monthly cashflow could not be loaded. Please try again." /> : summaryQuery.isLoading ? <p className="dashboard-loading">Loading this month’s cashflow…</p> : currencySummaries.length === 0 ? <EmptyPanel icon={ChartNoAxesCombined} title="No cashflow yet" description="Add real transactions to see this month’s income and spending." /> : <div className="cashflow-summary-list">{currencySummaries.map((totals) => <div className="cashflow-summary-row" key={totals.currency}><span>{totals.currency}</span><span>Income <strong>{amountForCurrency(totals.income_minor, totals.currency)}</strong></span><span>Expenses <strong>{amountForCurrency(totals.expenses_minor, totals.currency)}</strong></span><span>Net <strong>{amountForCurrency(totals.net_cashflow_minor, totals.currency)}</strong></span></div>)}</div>}
        </section>
        <section className="surface insight-card">
          <div className="surface-heading"><div className="heading-with-icon"><span className="sparkle-icon"><Sparkles size={16} /></span><div><h2>FinPilot insight</h2><p>Personalized, grounded in your data</p></div></div></div>
          <div className="insight-body"><div className="insight-orbit"><Sparkles size={25} /></div>
            {insightsQuery.isLoading ? <><h3>Looking at this month’s activity</h3><p>Calculating insights from your saved transactions and budgets…</p></> : insightsQuery.isError ? <><h3>Insights unavailable</h3><p>{(insightsQuery.error as Error).message}</p></> : !insightData ? <><h3>Insights unavailable</h3><p>Your financial insights could not be loaded.</p></> : insightData.insights.length > 0 ? <div className="dashboard-insights">{insightData.insights.slice(0, 2).map((insight) => <article className="dashboard-insight-item" key={insight.id}><h3>{insight.title}</h3><p>{insight.message}</p></article>)}</div> : <><h3>{insightData.transaction_count === 0 ? 'Good insights start with your activity.' : 'You’re building a clear picture.'}</h3><p>{insightData.transaction_count === 0 ? 'Add transactions and a monthly budget to see personalized spending insights here.' : 'Your saved activity is up to date. Add a budget to unlock more planning insights.'}</p></>}
            <Link to="/assistant" className="text-link">Ask your assistant <ArrowRight size={15} /></Link></div>
        </section>
        <section className="surface transactions-card">
          <div className="surface-heading"><div><h2>Recent transactions</h2><p>Your latest income and spending</p></div><Link className="text-link" to="/transactions">View all <ArrowRight size={15} /></Link></div>
          {transactionsQuery.isError ? <EmptyPanel icon={CreditCard} title="Transactions unavailable" description="Your recent transactions could not be loaded." action={<Link className="button button-soft" to="/transactions">Open transactions</Link>} /> : transactionsQuery.isLoading ? <p className="dashboard-loading">Loading recent transactions…</p> : recentTransactions.length === 0 ? <EmptyPanel icon={CreditCard} title="No activity this month yet" description="Your recent income and spending will appear here." action={<Link className="button button-soft" to="/transactions">Go to transactions</Link>} /> : <div className="dashboard-record-list">{recentTransactions.map((transaction) => { const category = categories.find((item: Category) => item.id === transaction.category_id); return <article className="dashboard-record-row" key={transaction.id}><div><strong>{transaction.merchant || category?.name || (transaction.type === 'income' ? 'Income' : 'Expense')}</strong><small>{transaction.occurred_on} · {category?.name ?? transaction.type}</small></div><strong className={transaction.type === 'income' ? 'amount-positive' : ''}>{transaction.type === 'income' ? '+' : '−'}{amountForCurrency(transaction.amount_minor, transaction.currency)}</strong></article>; })}</div>}
        </section>
        <section className="surface budget-card">
          <div className="surface-heading"><div><h2>Budget check-in</h2><p>Monthly plans at a glance</p></div><Link className="text-link" to="/budgets">All budgets <ArrowRight size={15} /></Link></div>
          {budgetsQuery.isError ? <EmptyPanel icon={Wallet} title="Budgets unavailable" description="Your budgets could not be loaded right now." action={<Link className="button button-soft" to="/budgets">Open budgets</Link>} /> : budgetsQuery.isLoading ? <p className="dashboard-loading">Loading budgets…</p> : budgets.length === 0 ? <EmptyPanel icon={Wallet} title="No budgets set for this month" description="Set a monthly target and track it against actual spending." action={<Link className="button button-soft" to="/budgets">Explore budgets</Link>} /> : <div className="dashboard-record-list">{budgets.map((budget) => { const spent = currencySummaries.find((item) => item.currency === budget.currency)?.expenses_minor ?? 0; const ratio = Math.min(100, Math.round((spent / budget.amount_minor) * 100)); return <article className="budget-progress-row" key={budget.id}><div className="budget-progress-heading"><strong>{budget.category_id ? categories.find((item: Category) => item.id === budget.category_id)?.name ?? 'Category budget' : 'Overall spending'}</strong><span>{amountForCurrency(spent, budget.currency)} / {amountForCurrency(budget.amount_minor, budget.currency)}</span></div><div className="budget-progress-track"><span style={{ width: `${ratio}%` }} /></div><small>{ratio}% used this month</small></article>; })}</div>}
        </section>
      </div>
    </>
  );
}

export function TransactionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  return (
    <>
      <SectionHeading eyebrow="EVERYTHING IN ONE LEDGER" title="Transactions" description="Keep your income and spending organized, with the details that matter." action={<button className="button button-primary" type="button" onClick={() => setFormOpen(true)}><Plus size={17} /> New transaction</button>} />
      <div className="filter-row"><div className="search-field"><Search size={17} /><input aria-label="Search transactions" placeholder="Search merchant or note" disabled /></div><button className="filter-button" type="button" disabled>All activity <ChevronDown size={15} /></button><button className="filter-button" type="button" disabled><CalendarDays size={15} /> This month <ChevronDown size={15} /></button></div>
      <section className="surface table-surface"><div className="table-head"><span>TRANSACTION</span><span>CATEGORY</span><span>DATE</span><span>AMOUNT</span></div><EmptyPanel icon={CreditCard} title="Your ledger is ready for your first entry" description="Once sign-in and the API are connected, you can add and manage real transactions here. No sample activity is shown." /></section>
      <div className="phase-hint"><ShieldCheck size={16} /><span>The entry form validates your input. Saving is enabled after secure sign-in and the API are connected.</span></div>
      {formOpen && <TransactionEntryForm onClose={() => setFormOpen(false)} />}
    </>
  );
}

export function BudgetsPage() {
  return (
    <>
      <SectionHeading eyebrow="PLAN WITH INTENTION" title="Budgets" description="Give your priorities room to grow with simple monthly targets." action={<button className="button button-primary" type="button" disabled title="Available after secure sign-in is connected"><Plus size={17} /> Create budget</button>} />
      <div className="budget-summary-grid"><div className="summary-tile"><span>Monthly budget</span><strong>—</strong><small>Connect account to view</small></div><div className="summary-tile"><span>Spent so far</span><strong>—</strong><small>Connect account to view</small></div><div className="summary-tile"><span>Remaining</span><strong>—</strong><small>Connect account to view</small></div></div>
      <section className="surface large-empty"><EmptyPanel icon={Wallet} title="A budget that fits your life" description="Create monthly category targets and FinPilot will compare them with your actual transactions." action={<button className="button button-soft" disabled type="button">Create your first budget</button>} /></section>
    </>
  );
}

export function AnalyticsPage() {
  return (
    <>
      <SectionHeading eyebrow="SEE THE FULL PICTURE" title="Analytics" description="Understand how your money moves and where it may be headed." action={<button className="filter-button" type="button" disabled><CalendarDays size={15} /> Last 6 months <ChevronDown size={15} /></button>} />
      <div className="metric-grid analytics-metrics"><MetricCard label="Average monthly spend" icon={Activity} tone="amber" /><MetricCard label="Largest category" icon={ChartNoAxesCombined} tone="violet" /><MetricCard label="Next month forecast" icon={ArrowUpRight} tone="blue" /><MetricCard label="Months of history" icon={CalendarDays} tone="green" /></div>
      <section className="surface analytics-chart"><div className="surface-heading"><div><h2>Spending forecast</h2><p>A transparent estimate based on your actual history</p></div><span className="forecast-badge">History-based</span></div><EmptyPanel icon={ChartNoAxesCombined} title="Your forecast needs a little history" description="FinPilot will show a forecast when there is enough real transaction history to make the estimate useful." /></section>
    </>
  );
}

export function AssistantPage() {
  return (
    <>
      <SectionHeading eyebrow="A THOUGHTFUL MONEY COMPANION" title="Your AI assistant" description="Ask questions about your spending, budgets, or financial patterns." />
      <section className="surface assistant-surface">
        <div className="assistant-header"><div className="assistant-avatar"><Sparkles size={19} /></div><div><strong>FinPilot assistant</strong><span>Grounded in your own financial data</span></div><span className="assistant-status"><span className="status-dot muted" /> Waiting for account data</span></div>
        <div className="assistant-welcome"><div className="welcome-sparkle"><Sparkles size={22} /></div><p className="eyebrow">A GOOD PLACE TO START</p><h2>Make sense of your money, one question at a time.</h2><p>When your account is connected, you can ask things like “What changed in my spending this month?” and get answers based on your real activity.</p><div className="prompt-chips"><span>Where did I spend the most?</span><span>Am I on track this month?</span><span>How does this month compare?</span></div></div>
        <form className="chat-composer" onSubmit={(event) => event.preventDefault()}><input aria-label="Ask FinPilot" placeholder="Connect your account to start a conversation" disabled /><button className="send-button" type="submit" aria-label="Send message" disabled><ArrowRight size={18} /></button></form>
        <p className="assistant-footnote"><ShieldCheck size={14} /> Your questions will be handled securely and answered using only the context you allow.</p>
      </section>
    </>
  );
}

function NotFoundPage() {
  return <section className="surface not-found"><p className="eyebrow">404 · PAGE NOT FOUND</p><h1>We couldn't find that page.</h1><p>Head back to your overview to continue.</p><Link className="button button-primary" to="/">Go to overview <ArrowRight size={16} /></Link></section>;
}

export function App() {
  return <AuthProvider><AuthenticatedApp /></AuthProvider>;
}

function AuthenticatedApp() {
  const { session, isLoading, isConfigured } = useAuth();

  if (isLoading) return <div className="auth-loading"><LoadingState label="Checking your secure session" /></div>;
  if (!isConfigured || !session) return <AuthPage />;
  return <AppShell />;
}
