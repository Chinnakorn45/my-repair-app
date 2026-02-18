import { useState, useEffect } from 'react';
import { Printer, Filter, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';
import { formatThaiDate } from '../../utils/dateUtils';
import './CustomReport.css';

const CustomReport = () => {
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [error, setError] = useState(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        let isMounted = true;

        const fetchTasks = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');

                const res = await fetch('http://localhost:5000/api/admin/tasks', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Failed to fetch tasks: ${res.status} ${res.statusText} - ${errorText}`);
                }

                const data = await res.json();

                if (isMounted) {
                    if (Array.isArray(data)) {
                        setTasks(data);
                        setFilteredTasks(data);
                    } else {
                        console.error("API Error: Data is not an array", data);
                        setTasks([]);
                        setFilteredTasks([]);
                        setError("ได้รับข้อมูลที่ไม่ถูกต้องจากเซิร์ฟเวอร์");
                    }
                }
            } catch (err) {
                console.error("CustomReport Error:", err);
                if (isMounted) {
                    setError(err.message || "ไม่สามารถโหลดข้อมูลได้");
                    setTasks([]);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchTasks();

        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        filterTasks();
    }, [tasks, statusFilter, dateFilter]);

    const filterTasks = () => {
        if (!Array.isArray(tasks)) return;

        let result = [...tasks];

        if (statusFilter !== 'all') {
            result = result.filter(t => t.status === statusFilter);
        }

        if (dateFilter) {
            try {
                const filterDate = new Date(dateFilter).toDateString();
                result = result.filter(t => {
                    if (!t.created_at) return false;
                    return new Date(t.created_at).toDateString() === filterDate;
                });
            } catch (e) {
                console.error("Date filter error:", e);
            }
        }

        setFilteredTasks(result);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedTasks(filteredTasks.map(t => t.request_id));
        } else {
            setSelectedTasks([]);
        }
    };

    const handleSelectTask = (id) => {
        if (selectedTasks.includes(id)) {
            setSelectedTasks(selectedTasks.filter(taskId => taskId !== id));
        } else {
            setSelectedTasks([...selectedTasks, id]);
        }
    };

    const handlePrint = () => {
        if (selectedTasks.length === 0) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกรายการที่ต้องการพิมพ์', 'warning');
            return;
        }
        window.print();
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'รอดำเนินการ';
            case 'in_progress': return 'กำลังดำเนินการ';
            case 'completed': return 'เสร็จสิ้น';
            default: return status || '-';
        }
    };

    const tasksToPrint = Array.isArray(tasks) ? tasks.filter(t => selectedTasks.includes(t.request_id)) : [];

    // Helper to generate empty rows if needed to fill the page or look like the form
    const minRows = 5;
    const emptyRows = Math.max(0, minRows - tasksToPrint.length);

    if (error) {
        return (
            <div className="custom-report-container error-state">
                <p>⚠️ เกิดข้อผิดพลาด: {error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="retry-btn"
                >
                    โหลดหน้าเว็บใหม่
                </button>
            </div>
        );
    }

    return (
        <div className="custom-report-container">
            {/* Screen View */}
            <div className="no-print">
                <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>รายงานแบบกำหนดเอง (Custom Report)</h2>
                <div className="report-controls">
                    <div className="filters">
                        <div className="filter-group">
                            <Filter size={16} color="#64748b" />
                            <select
                                className="filter-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">สถานะทั้งหมด</option>
                                <option value="pending">รอดำเนินการ</option>
                                <option value="in_progress">กำลังดำเนินการ</option>
                                <option value="completed">เสร็จสิ้น</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <Calendar size={16} color="#64748b" />
                            <input
                                type="date"
                                className="date-input"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            />
                        </div>
                    </div>
                    <button className="print-btn" onClick={handlePrint} disabled={selectedTasks.length === 0}>
                        <Printer size={16} /> พิมพ์รายการที่เลือก ({selectedTasks.length})
                    </button>
                </div>

                <div className="report-table-container">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={filteredTasks.length > 0 && selectedTasks.length === filteredTasks.length}
                                    />
                                </th>
                                <th>วันที่แจ้ง</th>
                                <th>อาคาร/สถานที่</th>
                                <th>รายละเอียด</th>
                                <th>สาเหตุ/ลักษณะการชำรุด</th>
                                <th>ผู้แจ้ง</th>
                                <th>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>กำลังโหลดข้อมูล...</td></tr>
                            ) : filteredTasks.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>ไม่พบข้อมูล</td></tr>
                            ) : (
                                filteredTasks.map(task => (
                                    <tr key={task.request_id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedTasks.includes(task.request_id)}
                                                onChange={() => handleSelectTask(task.request_id)}
                                            />
                                        </td>
                                        <td>{task.created_at ? formatThaiDate(task.created_at) : '-'}</td>
                                        <td>{task.location_name || '-'}</td>
                                        <td>{task.description || '-'}</td>
                                        <td>{task.repair_detail || '-'}</td>
                                        <td>{task.reporter || 'ไม่ระบุ'}</td>
                                        <td>
                                            <span className={`status-badge status-${task.status}`}>
                                                {getStatusLabel(task.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Print View - Table Based Layout for Robustness */}
            <div id="print-section">
                <div className="a4-page">
                    <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>รายการแจ้งซ่อม</h2>
                    <p style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <strong>วันที่ออกรายงาน:</strong> {formatThaiDate(new Date())}
                    </p>
                    <table className="form-table">
                        <thead>
                            <tr>
                                <th style={{ width: '5%' }}>ลำดับ</th>
                                <th style={{ width: '35%' }}>รายละเอียด/รายการแจ้งซ่อม</th>
                                <th style={{ width: '25%' }}>สาเหตุ/ลักษณะการชำรุด</th>
                                <th style={{ width: '10%' }}>จำนวน</th>
                                <th style={{ width: '10%' }}>หน่วย</th>
                                <th style={{ width: '15%' }}>สถานที่</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasksToPrint.map((task, index) => (
                                <tr key={task.request_id}>
                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                    <td>{task.description}</td>
                                    <td>{task.repair_detail || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>1</td>
                                    <td style={{ textAlign: 'center' }}>จุด</td>
                                    <td>{task.location_name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
export default CustomReport;
