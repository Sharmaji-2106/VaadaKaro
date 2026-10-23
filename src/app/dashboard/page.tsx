import styles from "./dashboard.module.css";
import { PlusCircle, Clock, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { auth } from "@/auth";
import { getUserComplaints } from "@/lib/actions/complaintActions";
import { getChatHistory } from "@/lib/actions/ai-actions";
import Link from "next/link";
import ComplaintsTable from "./ComplaintsTable";
interface ComplaintData {
  id: string;
  trackingId: string;
  category: string;
  status: string;
  createdAt: Date | string;
}

export default async function Dashboard() {
  const session = await auth();
  const { complaints = [] } = await getUserComplaints() as { complaints: ComplaintData[] };

  const chatHistory = await getChatHistory();
  const activeCount = complaints.filter((c: ComplaintData) => ['SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS'].includes(c.status)).length;
  const resolvedCount = complaints.filter((c: ComplaintData) => c.status === 'RESOLVED').length;
  const aiInsightsCount = chatHistory.length;

  const stats = [
    { label: "Active Grievances", value: activeCount, icon: <Clock size={20} />, color: "#1e3a8a" },
    { label: "Resolved Cases", value: resolvedCount, icon: <CheckCircle2 size={20} />, color: "#166534" },
    { label: "Legal Insights", value: aiInsightsCount, icon: <FileText size={20} />, color: "#ca8a04" },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Citizen Dashboard: {session?.user?.name || 'Authorized Citizen'}</h1>
          <p className={styles.subtitle}>Welcome to the Citizen Grievance Redressal Portal. Manage your filings below.</p>
        </div>
        <Link href="/file-complaint" className={styles.newBtn}>
          <PlusCircle size={20} /> Lodge New Grievance
        </Link>
      </header>

      <div className={styles.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: stat.color }}>{stat.icon}</div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>{stat.label}</p>
              <h3 className={styles.statValue}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <section className={styles.recentSection}>
        <ComplaintsTable complaints={complaints} />
      </section>
    </div>
  );
}
