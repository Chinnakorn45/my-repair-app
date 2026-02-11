import { useState, useEffect } from 'react';
import {
    BarChart2, TrendingUp, Download,
    CheckCircle, Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import './Reports.css';

const Reports = () => {
    const [summary, setSummary] = useState(null);
    const [buildingStats, setBuildingStats] = useState([]);
    const [techPerformance, setTechPerformance] = useState([]);
    const [monthlyTrends, setMonthlyTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [summaryRes, buildingRes, techRes, trendsRes] = await Promise.all([
                fetch('http://localhost:5000/api/admin/reports/summary', { headers }),
                fetch('http://localhost:5000/api/admin/reports/by-building', { headers }),
                fetch('http://localhost:5000/api/admin/reports/technician-performance', { headers }),
                fetch('http://localhost:5000/api/admin/reports/monthly-trends', { headers })
            ]);

            if (!summaryRes.ok || !buildingRes.ok || !techRes.ok || !trendsRes.ok) {
                throw new Error('Failed to fetch report data');
            }

            const summaryData = await summaryRes.json();
            const buildingData = await buildingRes.json();
            const techData = await techRes.json();
            const trendsData = await trendsRes.json();

            setSummary(summaryData);
            setBuildingStats(buildingData);
            setTechPerformance(techData);
            setMonthlyTrends(trendsData);

        } catch (err) {
            console.error('Error fetching reports:', err);
            setError('ไม่สามารถโหลดข้อมูลรายงานได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        // Simple CSV Export implementation
        const csvContent = [
            ['Report Type', 'Date', new Date().toLocaleDateString()],
            [''],
            ['Summary Stats'],
            ['Total Requests', summary?.total],
            ['Pending', summary?.status.pending],
            ['In Progress', summary?.status.in_progress],
            ['Completed', summary?.status.completed],
            [''],
            ['Technician Performance'],
            ['Name', 'Total Tasks', 'Completed', 'Active'],
            ...techPerformance.map(t => [t.name, t.total_tasks, t.completed_tasks, t.active_tasks])
        ].map(e => e.join(',')).join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `repair_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="reports-loading">
                <div className="spinner"></div>
                <p>กำลังประมวลผลข้อมูล...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="reports-error">
                <AlertCircle size={48} color="red" />
                <p>{error}</p>
                <button onClick={fetchAllData} className="retry-btn">ลองใหม่</button>
            </div>
        );
    }

    // Calculate max values for charts scaling
    const maxBuildingCount = Math.max(...buildingStats.map(b => parseInt(b.count)), 1);
    const maxTrendCount = Math.max(...monthlyTrends.map(m => parseInt(m.count)), 1);

    return (
        <div className="reports-container">
            <div className="reports-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <button className="export-btn" onClick={handleExport}>
                    <Download size={16} className="icon-gap" /> ส่งออก CSV
                </button>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card total">
                    <div className="card-icon"><BarChart2 size={24} /></div>
                    <div className="card-data">
                        <h3>{summary?.total || 0}</h3>
                        <p>งานทั้งหมด</p>
                    </div>
                </div>
                <div className="summary-card pending">
                    <div className="card-icon"><Clock size={24} /></div>
                    <div className="card-data">
                        <h3>{summary?.status.pending || 0}</h3>
                        <p>รอดำเนินการ</p>
                    </div>
                </div>
                <div className="summary-card ongoing">
                    <div className="card-icon"><RefreshCw size={24} /></div>
                    <div className="card-data">
                        <h3>{summary?.status.in_progress || 0}</h3>
                        <p>กำลังซ่อม</p>
                    </div>
                </div>
                <div className="summary-card completed">
                    <div className="card-icon"><CheckCircle size={24} /></div>
                    <div className="card-data">
                        <h3>{summary?.status.completed || 0}</h3>
                        <p>เสร็จสิ้น</p>
                    </div>
                </div>
            </div>

            <div className="charts-grid two-columns">
                {/* Building Stats (Simple Bar Chart) */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>📍 สถิติการแจ้งซ่อมตามตึก (5 อันดับแรก)</h3>
                    </div>
                    <div className="chart-body">
                        {buildingStats.length === 0 ? <p className="no-data">ไม่มีข้อมูล</p> : (
                            <div className="simple-bar-chart">
                                {buildingStats.map((item, index) => (
                                    <div key={index} className="bar-row">
                                        <span className="bar-label">{item.name}</span>
                                        <div className="bar-track">
                                            <div
                                                className="bar-fill"
                                                style={{ width: `${(item.count / maxBuildingCount) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="bar-value">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Monthly Trends (Simple Column Chart) */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>📅 แนวโน้มงานซ่อมรายเดือน</h3>
                    </div>
                    <div className="chart-body">
                        {monthlyTrends.length === 0 ? <p className="no-data">ไม่มีข้อมูล</p> : (
                            <div className="simple-column-chart">
                                {monthlyTrends.map((item, index) => (
                                    <div key={index} className="column-item">
                                        <div className="column-track">
                                            <div
                                                className="column-fill"
                                                style={{ height: `${(item.count / maxTrendCount) * 100}%` }}
                                                title={`${item.count} งาน`}
                                            ></div>
                                        </div>
                                        <span className="column-label">{item.month}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="charts-grid full-width">
                {/* Technician Performance Table */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>👷 ประสิทธิภาพทีมช่าง</h3>
                    </div>
                    <div className="chart-body">
                        <div className="table-responsive">
                            <table className="tech-table">
                                <thead>
                                    <tr>
                                        <th>ชื่อช่าง</th>
                                        <th className="text-center">งานทั้งหมด</th>
                                        <th className="text-center">กำลังทำ</th>
                                        <th className="text-center">เสร็จสิ้น</th>
                                        <th className="text-center">อัตราสำเร็จ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {techPerformance.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center">ไม่มีข้อมูล</td></tr>
                                    ) : techPerformance.map((tech, idx) => {
                                        const total = parseInt(tech.total_tasks) || 0;
                                        const completed = parseInt(tech.completed_tasks) || 0;
                                        const successRate = total > 0 ? ((completed / total) * 100).toFixed(0) : 0;

                                        return (
                                            <tr key={idx}>
                                                <td>{tech.name}</td>
                                                <td className="text-center">{total}</td>
                                                <td className="text-center">{tech.active_tasks}</td>
                                                <td className="text-center success-text">{completed}</td>
                                                <td className="text-center">
                                                    <div className="progress-mini">
                                                        <div className="progress-bar-mini" style={{ width: `${successRate}%` }}></div>
                                                    </div>
                                                    <span className="progress-text">{successRate}%</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
