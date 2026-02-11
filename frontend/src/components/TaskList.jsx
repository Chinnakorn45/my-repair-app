
import { Droplets, Zap, Thermometer, Hammer, Wrench, Clock, User, UserCheck } from 'lucide-react';

function TaskList({ tasks, onSelectTask, onSaveResult }) {
  const getPriorityBadge = (priority) => {
    const colors = {
      'urgent': { bg: '#fee2e2', text: '#991b1b', label: 'เร่งด่วน' },
      'high': { bg: '#fed7aa', text: '#92400e', label: 'สูง' },
      'medium': { bg: '#fef3c7', text: '#92400e', label: 'ปานกลาง' },
      'low': { bg: '#dbeafe', text: '#0c4a6e', label: 'ต่ำ' }
    };
    return colors[priority] || colors.low;
  };

  const getTaskTypeIcon = (type) => {
    const icons = {
      'plumbing': <Droplets size={24} color="#3b82f6" />,
      'electrical': <Zap size={24} color="#eab308" />,
      'hvac': <Thermometer size={24} color="#ef4444" />,
      'other': <Hammer size={24} color="#64748b" />
    };
    return icons[type] || <Wrench size={24} color="#64748b" />;
  };

  const formatTime = (date) => {
    if (!date) return 'เมื่อไม่นาน';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'เมื่อไม่นาน';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    return `${days} วันที่แล้ว`;
  };

  if (tasks.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>ยังไม่มีงานในสถานะนี้</p>
      </div>
    );
  }

  return (
    <div>
      {tasks.map((task) => {
        const priority = getPriorityBadge(task.priority || 'medium');
        const icon = getTaskTypeIcon(task.type || 'other');

        return (
          <div key={task.request_id} style={styles.taskCard} onClick={() => onSelectTask(task)}>
            <div style={styles.cardHeader}>
              <div style={styles.headerLeft}>
                <span style={{ ...styles.priorityBadge, backgroundColor: priority.bg, color: priority.text }}>
                  {priority.label}
                </span>
                <span style={styles.taskId}>#{task.request_id}</span>
              </div>
              <div style={styles.taskIcon}>{icon}</div>
            </div>

            <div style={styles.cardBody}>
              <h4 style={styles.taskTitle}>{task.description || 'งานซ่อม'}</h4>
              <p style={styles.taskLocation}>{task.location || 'ตึก 1'}</p>
            </div>

            <div style={styles.cardFooter}>
              <div style={styles.footerItem}>
                <Clock size={16} color="#64748b" />
                <span style={styles.footerText}>{formatTime(task.created_at)}</span>
              </div>
              {task.technician_name ? (
                <div style={styles.footerItem}>
                  <UserCheck size={16} color="#0284c7" />
                  <span style={{ ...styles.footerText, fontWeight: 'bold', color: '#0284c7' }}>
                    {task.technician_name}
                  </span>
                </div>
              ) : (
                <div style={styles.footerItem}>
                  <User size={16} color="#64748b" />
                  <span style={styles.footerText}>{task.reporter || 'ผู้ใช้'}</span>
                </div>
              )}
            </div>

            <div style={styles.cardActions}>
              {task.status === 'pending' && (
                <button
                  style={{
                    ...styles.actionBtn,
                    backgroundColor: task.technician_name ? '#10b981' : '#0284c7'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTask(task);
                  }}
                >
                  {task.technician_name ? `✓ มอบหมายให้ ${task.technician_name}` : '👤 มอบหมายช่าง'}
                </button>
              )}

              {task.status === 'in_progress' && (
                <button
                  style={{
                    ...styles.actionBtn,
                    backgroundColor: '#10b981' // Green for save
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSaveResult) onSaveResult(task);
                  }}
                >
                  💾 บันทึกผลการซ่อม
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  emptyText: {
    margin: '0',
    color: '#64748b',
    fontSize: '14px'
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    borderLeft: '4px solid #0284c7'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  priorityBadge: {
    padding: '4px 8px',
    borderRadius: '9999px',
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  taskId: {
    fontSize: '12px',
    color: '#64748b'
  },
  taskIcon: {
    fontSize: '24px'
  },
  cardBody: {
    paddingY: '8px'
  },
  taskTitle: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  taskLocation: {
    margin: '0',
    fontSize: '12px',
    color: '#64748b'
  },
  cardFooter: {
    display: 'flex',
    gap: '16px',
    padding: '8px 0',
    borderTop: '1px solid #f0f4f8',
    borderBottom: '1px solid #f0f4f8'
  },
  footerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  icon: {
    fontSize: '12px'
  },
  footerText: {
    fontSize: '12px',
    color: '#64748b'
  },
  footerText: {
    fontSize: '12px',
    color: '#64748b'
  },
  cardActions: {
    marginTop: '12px'
  },
  actionBtn: {
    width: '100%',
    padding: '12px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  }
}


export default TaskList;
