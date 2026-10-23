import React from 'react';
import { getOfficerComplaints } from '@/lib/actions/officerActions';
import styles from './complaints.module.css';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  AlertCircle,
  MoreVertical,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';

export default async function ComplaintsManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sParams = await searchParams;
  const params = {
    status: sParams.status as any,
    priority: sParams.priority as any,
    department: sParams.department,
    search: sParams.search,
    page: sParams.page ? parseInt(sParams.page) : 1,
  };

  const result = await getOfficerComplaints(params);
  const complaints = (result.success && result.complaints) ? result.complaints : [];
  const pagination = result.pagination || { total: 0, pages: 1, currentPage: 1 };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return { bg: '#eff6ff', color: '#3b82f6' };
      case 'UNDER_REVIEW': return { bg: '#fff7ed', color: '#f97316' };
      case 'IN_PROGRESS': return { bg: '#f5f3ff', color: '#8b5cf6' };
      case 'RESOLVED': return { bg: '#ecfdf5', color: '#10b981' };
      case 'REJECTED': return { bg: '#fef2f2', color: '#ef4444' };
      default: return { bg: '#f8fafc', color: '#64748b' };
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT': return { border: '2px solid #ef4444', color: '#ef4444' };
      case 'HIGH': return { border: '1px solid #f97316', color: '#f97316' };
      case 'MEDIUM': return { border: '1px solid #3b82f6', color: '#3b82f6' };
      case 'LOW': return { border: '1px solid #10b981', color: '#10b981' };
      default: return { border: '1px solid #64748b', color: '#64748b' };
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Complaint Management</h1>
          <p style={{ color: '#64748b' }}>Search and process citizen grievances in real-time.</p>
        </div>
      </header>

      <form className={styles.controls} method="GET">
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={18} />
          <input 
            name="search"
            type="text" 
            placeholder="Search by Tracking ID or Title..." 
            className={styles.searchInput}
            defaultValue={params.search}
          />
        </div>
        
        <div className={styles.filters}>
          <select className={styles.select} name="status" defaultValue={params.status || ''}>
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select className={styles.select} name="priority" defaultValue={params.priority || ''}>
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select className={styles.select} name="department" defaultValue={params.department || ''}>
            <option value="">All Departments</option>
            <option value="PUBLIC_WORKS">Public Works</option>
            <option value="SANITATION">Sanitation</option>
            <option value="LAW_ENFORCEMENT">Law Enforcement</option>
            <option value="HEALTHCARE">Healthcare</option>
            <option value="TRANSPORT">Transport</option>
          </select>

          <button type="submit" className={styles.searchBtn}>
            <Filter size={16} /> Filter
          </button>
        </div>
      </form>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Tracking ID</th>
              <th className={styles.th}>Complaint</th>
              <th className={styles.th}>Citizen</th>
              <th className={styles.th}>Priority</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Filed Date</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {complaints.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '4rem', textAlign: 'center' }}>
                  <Briefcase size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                  <p style={{ color: '#94a3b8' }}>No complaints match your current filter criteria.</p>
                </td>
              </tr>
            ) : (
              complaints.map((complaint: any) => {
                const statusStyle = getStatusStyle(complaint.status);
                const priorityStyle = getPriorityStyle(complaint.priority);
                return (
                  <tr key={complaint.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.trackingId}>#{complaint.trackingId.split('-').pop()}</span>
                    </td>
                    <td className={styles.td}>
                      <div style={{ fontWeight: 600 }}>{complaint.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{complaint.department}</div>
                    </td>
                    <td className={styles.td}>
                      <div>{complaint.citizen?.name || 'Anonymous'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{complaint.citizen?.phone || 'No Phone'}</div>
                    </td>
                    <td className={styles.td}>
                      <span 
                        className={styles.priorityBadge} 
                        style={priorityStyle}
                      >
                        {complaint.priority}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span 
                        className={styles.statusBadge}
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                      >
                        {complaint.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className={styles.td}>
                      <Link 
                        href={`/dashboard/officer/complaints/${complaint.id}`}
                        className={styles.viewBtn}
                      >
                        View Details <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {pagination.pages > 1 && (
          <div className={styles.pagination}>
            <div className={styles.pageInfo}>
              Showing <strong>{(pagination.currentPage - 1) * 10 + 1}</strong> to <strong>{Math.min(pagination.currentPage * 10, pagination.total)}</strong> of <strong>{pagination.total}</strong> results
            </div>
            <div className={styles.pageButtons}>
              <button 
                className={styles.pageBtn}
                disabled={pagination.currentPage === 1}
              >
                Previous
              </button>
              {[...Array(pagination.pages)].map((_, i) => (
                <button 
                  key={i} 
                  className={`${styles.pageBtn} ${pagination.currentPage === i + 1 ? styles.pageBtnActive : ''}`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                className={styles.pageBtn}
                disabled={pagination.currentPage === pagination.pages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
