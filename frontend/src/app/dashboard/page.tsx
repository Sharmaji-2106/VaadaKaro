import styles from "./dashboard.module.css";
import { Plus, Clock, CheckCircle2, MessageSquare, Search, FileText, Scale, ChevronRight, PenLine, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getUserComplaints, getChatHistory } from "@/services/server";
import Link from "next/link";
import ComplaintsTable from "./ComplaintsTable";
interface ComplaintData {
  id: string;
  trackingId: string;
  category: string;
  status: string;
  createdAt: Date | string;
}

const quickLinks = [
  { href: "/draft-letter", icon: <PenLine size={18} />, label: "Draft a complaint letter" },
  { href: "/track-complaint", icon: <Search size={18} />, label: "Track by ID" },
  { href: "/ai-assistant", icon: <MessageSquare size={18} />, label: "Ask the legal assistant" },
  { href: "/generate-docs", icon: <FileText size={18} />, label: "Draft a legal document" },
  { href: "/find-lawyer", icon: <Scale size={18} />, label: "Find a lawyer" },
];

export default async function Dashboard() {
  const [user, { complaints }, chatHistory] = await Promise.all([
    getCurrentUser(),
    getUserComplaints() as Promise<{ complaints: ComplaintData[] }>,
    getChatHistory(),
  ]);
  const activeCount = complaints.filter((c: ComplaintData) => ['SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS'].includes(c.status)).length;
  const resolvedCount = complaints.filter((c: ComplaintData) => c.status === 'RESOLVED').length;
  const aiInsightsCount = chatHistory.length;

  const stats = [
    { label: "Active complaints", value: activeCount, icon: <Clock size={20} />, tone: styles.toneSaffron },
    { label: "Resolved", value: resolvedCount, icon: <CheckCircle2 size={20} />, tone: styles.toneGreen },
    { label: "Legal assistant chats", value: aiInsightsCount, icon: <MessageSquare size={20} />, tone: styles.toneNavy },
  ];

  return (
    <>
      <div className="page-band">
        <div className={`page-band-inner ${styles.bandRow}`}>
          <div>
            <span className="eyebrow">Your dashboard</span>
            <h1>Hello, {user?.name?.split(' ')[0] || 'there'}</h1>
            <p className="lead">Follow your complaints and pick up where you left off.</p>
          </div>
          <Link href="/file-complaint" className={styles.newBtn}>
            <Plus size={18} strokeWidth={2.5} /> New complaint
          </Link>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.label} className={`${styles.statCard} ${stat.tone}`}>
              <div className={styles.statIcon}>{stat.icon}</div>
              <div>
                <h3 className={styles.statValue}>{stat.value}</h3>
                <p className={styles.statLabel}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.layout}>
          <section className={styles.recentSection}>
            <ComplaintsTable complaints={complaints} />
          </section>

          <aside className={styles.quickPanel}>
            <h2>Quick actions</h2>
            <nav>
              {(user?.role === "OFFICER" || user?.role === "ADMIN") && (
                <Link href="/dashboard/officer" className={styles.quickLink}>
                  <span className={styles.quickIcon}><ShieldCheck size={18} /></span>
                  <span>{user.role === "ADMIN" ? "Officer & admin panel" : "Officer panel"}</span>
                  <ChevronRight size={16} className={styles.quickChevron} />
                </Link>
              )}
              {quickLinks.map((q) => (
                <Link key={q.href} href={q.href} className={styles.quickLink}>
                  <span className={styles.quickIcon}>{q.icon}</span>
                  <span>{q.label}</span>
                  <ChevronRight size={16} className={styles.quickChevron} />
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      </div>
    </>
  );
}
