import { useState, useEffect } from 'react';
import {
    BarChart2, TrendingUp, Download,
    CheckCircle, Clock, AlertCircle, RefreshCw, Printer,
    Percent, Building, Users, Calendar, Filter
} from 'lucide-react';
import { formatThaiDate, formatThaiMonth } from '../../utils/dateUtils';
import './Reports.css';

const THAI_MONTHS = [
    { value: '1', label: 'มกราคม' },
    { value: '2', label: 'กุมภาพันธ์' },
    { value: '3', label: 'มีนาคม' },
    { value: '4', label: 'เมษายน' },
    { value: '5', label: 'พฤษภาคม' },
    { value: '6', label: 'มิถุนายน' },
    { value: '7', label: 'กรกฎาคม' },
    { value: '8', label: 'สิงหาคม' },
    { value: '9', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' },
];

const Reports = () => {
    const [summary, setSummary] = useState(null);
    const [buildingStats, setBuildingStats] = useState([]);
    const [techPerformance, setTechPerformance] = useState([]);
    const [monthlyTrends, setMonthlyTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [selectedYear, setSelectedYear] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [availableYears, setAvailableYears] = useState([]);

    useEffect(() => {
        fetchAvailableYears();
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [selectedYear, selectedMonth]);

    const fetchAvailableYears = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/admin/reports/available-years', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const years = await res.json();
                setAvailableYears(years);
            }
        } catch (err) {
            console.error('Error fetching years:', err);
        }
    };

    const buildQueryString = () => {
        const params = new URLSearchParams();
        if (selectedYear !== 'all') params.append('year', selectedYear);
        if (selectedMonth !== 'all') params.append('month', selectedMonth);
        return params.toString() ? `?${params.toString()}` : '';
    };

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const qs = buildQueryString();

            const [summaryRes, buildingRes, techRes, trendsRes] = await Promise.all([
                fetch(`http://localhost:5000/api/admin/reports/summary${qs}`, { headers }),
                fetch(`http://localhost:5000/api/admin/reports/by-building${qs}`, { headers }),
                fetch(`http://localhost:5000/api/admin/reports/technician-performance${qs}`, { headers }),
                fetch(`http://localhost:5000/api/admin/reports/monthly-trends${qs}`, { headers })
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

    const getFilterLabel = () => {
        if (selectedYear === 'all' && selectedMonth === 'all') return 'ทั้งหมด (ไม่กรองช่วงเวลา)';
        let label = '';
        if (selectedMonth !== 'all') {
            const m = THAI_MONTHS.find(m => m.value === selectedMonth);
            label += m ? m.label : '';
        }
        if (selectedYear !== 'all') {
            const thaiYear = parseInt(selectedYear) + 543;
            label += (label ? ' ' : '') + `พ.ศ. ${thaiYear}`;
        }
        return label;
    };

    const handleExport = () => {
        const filterLabel = getFilterLabel();
        const csvContent = [
            ['ประเภทรายงาน', 'สรุปรายงานการซ่อมบำรุง'],
            ['ช่วงเวลา', filterLabel],
            ['วันที่ออกรายงาน', formatThaiDate(new Date())],
            [''],
            ['สรุปสถิติรวม'],
            ['จำนวนงานทั้งหมด', summary?.total],
            ['รอดำเนินการ', summary?.status.pending],
            ['กำลังดำเนินการ', summary?.status.in_progress],
            ['เสร็จสมบูรณ์', summary?.status.completed],
            [''],
            ['สถิติแยกตามตึก (5 อันดับแรก)'],
            ['ตึก/อาคาร', 'จำนวนงาน'],
            ...buildingStats.map(b => [b.name, b.count]),
            [''],
            ['แนวโน้มรายเดือน'],
            ['เดือน', 'จำนวนงาน'],
            ...monthlyTrends.map(m => [m.month, m.count]),
            [''],
            ['ประสิทธิภาพทีมช่าง'],
            ['ชื่อช่าง', 'งานทั้งหมด', 'กำลังทำ', 'เสร็จสิ้น', 'อัตราสำเร็จ (%)'],
            ...techPerformance.map(t => {
                const total = parseInt(t.total_tasks) || 0;
                const completed = parseInt(t.completed_tasks) || 0;
                const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
                return [t.name, total, t.active_tasks, completed, rate];
            })
        ].map(e => e.join(',')).join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `รายงานการซ่อม_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
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

    // Calculated values
    const totalTasks = summary?.total || 0;
    const completedTasks = summary?.status.completed || 0;
    const pendingTasks = summary?.status.pending || 0;
    const inProgressTasks = summary?.status.in_progress || 0;
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

    const maxBuildingCount = Math.max(...buildingStats.map(b => parseInt(b.count)), 1);
    const maxTrendCount = Math.max(...monthlyTrends.map(m => parseInt(m.count)), 1);

    // Donut chart SVG values
    const donutRadius = 54;
    const donutCircumference = 2 * Math.PI * donutRadius;
    const donutOffset = donutCircumference - (completionRate / 100) * donutCircumference;

    const filterLabel = getFilterLabel();

    return (
        <div className="reports-container">
            {/* Hidden Print Wrapper */}
            <div className="print-only">
                <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>สรุปรายงานการซ่อมบำรุง</h2>
                <p style={{ textAlign: 'center', marginBottom: '5px' }}>
                    <strong>ช่วงเวลา:</strong> {filterLabel}
                </p>
                <p style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <strong>วันที่ออกรายงาน:</strong> {formatThaiDate(new Date())}
                </p>

                <h4>1. สรุปสถานะงานซ่อมทั้งหมด</h4>
                <table className="report-table-print">
                    <thead>
                        <tr>
                            <th>สถานะ</th>
                            <th className="text-right">จำนวนงาน</th>
                            <th>หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>รอดำเนินการ (Pending)</td>
                            <td className="text-right">{pendingTasks}</td>
                            <td>อยู่ระหว่างรอการจัดสรรช่าง</td>
                        </tr>
                        <tr>
                            <td>กำลังดำเนินการ (In Progress)</td>
                            <td className="text-right">{inProgressTasks}</td>
                            <td>ช่างกำลังรับดำเนินการหรือรออะไหล่</td>
                        </tr>
                        <tr>
                            <td>เสร็จสิ้น (Completed)</td>
                            <td className="text-right">{completedTasks}</td>
                            <td>ดำเนินการเสร็จสิ้นเรียบร้อยแล้ว</td>
                        </tr>
                        <tr className="row-total">
                            <td><strong>รวมทั้งสิ้น</strong></td>
                            <td className="text-right"><strong>{totalTasks}</strong></td>
                            <td><strong>รายการ</strong></td>
                        </tr>
                    </tbody>
                </table>

                <h4 style={{ marginTop: '30px' }}>2. ประสิทธิภาพการดำเนินงานของทีมช่าง</h4>
                <table className="report-table-print">
                    <thead>
                        <tr>
                            <th>ลำดับ</th>
                            <th>ชื่อ-นามสกุล</th>
                            <th className="text-center">งานทั้งหมด</th>
                            <th className="text-center">กำลังทำ</th>
                            <th className="text-center">เสร็จสิ้น</th>
                            <th className="text-center">อัตราสำเร็จ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {techPerformance.map((tech, idx) => {
                            const total = parseInt(tech.total_tasks) || 0;
                            const completed = parseInt(tech.completed_tasks) || 0;
                            const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
                            return (
                                <tr key={idx}>
                                    <td className="text-center">{idx + 1}</td>
                                    <td>{tech.name}</td>
                                    <td className="text-center">{total}</td>
                                    <td className="text-center">{tech.active_tasks}</td>
                                    <td className="text-center">{completed}</td>
                                    <td className="text-center">{rate}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ===== Filter Bar + Actions ===== */}
            <div className="reports-toolbar no-print">
                <div className="filter-group">
                    <Filter size={16} />
                    <span className="filter-label">กรองข้อมูล:</span>
                    <select
                        className="filter-select"
                        value={selectedYear}
                        onChange={(e) => {
                            setSelectedYear(e.target.value);
                            if (e.target.value === 'all') setSelectedMonth('all');
                        }}
                    >
                        <option value="all">ทุกปี</option>
                        {availableYears.map(year => (
                            <option key={year} value={year}>
                                พ.ศ. {year + 543}
                            </option>
                        ))}
                    </select>
                    <select
                        className="filter-select"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        disabled={selectedYear === 'all'}
                    >
                        <option value="all">ทุกเดือน</option>
                        {THAI_MONTHS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    {(selectedYear !== 'all' || selectedMonth !== 'all') && (
                        <button
                            className="filter-reset-btn"
                            onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); }}
                        >
                            ล้างตัวกรอง
                        </button>
                    )}
                </div>
                <div className="action-group">
                    <button className="export-btn" onClick={handleExport}>
                        <Download size={16} className="icon-gap" /> ส่งออก CSV
                    </button>
                    <button className="print-btn" onClick={handlePrint}>
                        <Printer size={16} className="icon-gap" /> พิมพ์สรุปรายงาน
                    </button>
                </div>
            </div>

            {/* Filter active indicator */}
            {(selectedYear !== 'all' || selectedMonth !== 'all') && (
                <div className="filter-active-badge no-print">
                    <Calendar size={14} />
                    <span>แสดงข้อมูล: <strong>{filterLabel}</strong></span>
                </div>
            )}

            {/* ===== Dashboard Content ===== */}
            <div className="dashboard-content no-print">

                {/* Row 1: Summary Cards (4 cards) */}
                <div className="summary-cards">
                    <div className="summary-card total">
                        <div className="card-icon"><BarChart2 size={24} /></div>
                        <div className="card-data">
                            <h3>{totalTasks}</h3>
                            <p>งานทั้งหมด</p>
                        </div>
                    </div>
                    <div className="summary-card pending">
                        <div className="card-icon"><Clock size={24} /></div>
                        <div className="card-data">
                            <h3>{pendingTasks}</h3>
                            <p>รอดำเนินการ</p>
                        </div>
                    </div>
                    <div className="summary-card ongoing">
                        <div className="card-icon"><RefreshCw size={24} /></div>
                        <div className="card-data">
                            <h3>{inProgressTasks}</h3>
                            <p>กำลังซ่อม</p>
                        </div>
                    </div>
                    <div className="summary-card completed">
                        <div className="card-icon"><CheckCircle size={24} /></div>
                        <div className="card-data">
                            <h3>{completedTasks}</h3>
                            <p>เสร็จสิ้น</p>
                        </div>
                    </div>
                </div>

                {/* Row 2: Completion Rate Donut + Status Breakdown */}
                <div className="charts-grid two-columns">
                    {/* Donut Chart: อัตราสำเร็จ */}
                    <div className="chart-card highlight-card">
                        <div className="chart-header">
                            <h3><Percent size={18} /> อัตราความสำเร็จ</h3>
                        </div>
                        <div className="chart-body center-content">
                            <div className="donut-wrapper">
                                <svg width="140" height="140" viewBox="0 0 140 140">
                                    <circle
                                        cx="70" cy="70" r={donutRadius}
                                        fill="none" stroke="#e5e7eb" strokeWidth="12"
                                    />
                                    <circle
                                        cx="70" cy="70" r={donutRadius}
                                        fill="none"
                                        stroke={completionRate >= 70 ? '#10b981' : completionRate >= 40 ? '#f59e0b' : '#ef4444'}
                                        strokeWidth="12"
                                        strokeDasharray={donutCircumference}
                                        strokeDashoffset={donutOffset}
                                        strokeLinecap="round"
                                        transform="rotate(-90 70 70)"
                                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                                    />
                                    <text x="70" y="65" textAnchor="middle" className="donut-percent">{completionRate}%</text>
                                    <text x="70" y="85" textAnchor="middle" className="donut-label">สำเร็จ</text>
                                </svg>
                            </div>
                            <p className="donut-detail">{completedTasks} จาก {totalTasks} รายการ</p>
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="chart-card highlight-card">
                        <div className="chart-header">
                            <h3><BarChart2 size={18} /> สัดส่วนสถานะ</h3>
                        </div>
                        <div className="chart-body">
                            <div className="status-breakdown">
                                {[
                                    { label: 'รอดำเนินการ', value: pendingTasks, color: '#f59e0b' },
                                    { label: 'กำลังซ่อม', value: inProgressTasks, color: '#3b82f6' },
                                    { label: 'เสร็จสิ้น', value: completedTasks, color: '#10b981' },
                                ].map((item, i) => (
                                    <div key={i} className="status-row">
                                        <div className="status-row-left">
                                            <span className="status-dot" style={{ background: item.color }}></span>
                                            <span className="status-name">{item.label}</span>
                                        </div>
                                        <div className="status-row-right">
                                            <div className="status-bar-track">
                                                <div className="status-bar-fill" style={{
                                                    width: totalTasks > 0 ? `${(item.value / totalTasks) * 100}%` : '0%',
                                                    background: item.color
                                                }}></div>
                                            </div>
                                            <span className="status-count">{item.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 3: Building Stats + Monthly Trends */}
                <div className="charts-grid two-columns">
                    {/* Building Stats */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3><Building size={18} /> สถิติการแจ้งซ่อมตามอาคาร (5 อันดับ)</h3>
                        </div>
                        <div className="chart-body">
                            {buildingStats.length === 0 ? <p className="no-data">ไม่มีข้อมูล</p> : (
                                <div className="simple-bar-chart">
                                    {buildingStats.map((item, index) => (
                                        <div key={index} className="bar-row">
                                            <span className="bar-label" title={item.name}>{item.name}</span>
                                            <div className="bar-track">
                                                <div
                                                    className="bar-fill"
                                                    style={{
                                                        width: `${(item.count / maxBuildingCount) * 100}%`,
                                                        animationDelay: `${index * 0.1}s`
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="bar-value">{item.count} งาน</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Monthly Trends */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3><TrendingUp size={18} /> แนวโน้มงานซ่อมรายเดือน</h3>
                        </div>
                        <div className="chart-body">
                            {monthlyTrends.length === 0 ? <p className="no-data">ไม่มีข้อมูล</p> : (
                                <div className="simple-column-chart">
                                    {monthlyTrends.map((item, index) => (
                                        <div key={index} className="column-item">
                                            <span className="column-value">{item.count}</span>
                                            <div className="column-track">
                                                <div
                                                    className="column-fill"
                                                    style={{
                                                        height: `${(item.count / maxTrendCount) * 100}%`,
                                                        animationDelay: `${index * 0.1}s`
                                                    }}
                                                    title={`${item.count} งาน`}
                                                ></div>
                                            </div>
                                            <span className="column-label">{formatThaiMonth(item.month)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Row 4: Technician Performance Table */}
                <div className="charts-grid full-width">
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3><Users size={18} /> ประสิทธิภาพทีมช่าง</h3>
                        </div>
                        <div className="chart-body">
                            <div className="table-responsive">
                                <table className="tech-table">
                                    <thead>
                                        <tr>
                                            <th>ลำดับ</th>
                                            <th>ชื่อช่าง</th>
                                            <th className="text-center">งานทั้งหมด</th>
                                            <th className="text-center">กำลังทำ</th>
                                            <th className="text-center">เสร็จสิ้น</th>
                                            <th className="text-center" style={{ minWidth: 160 }}>อัตราสำเร็จ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {techPerformance.length === 0 ? (
                                            <tr><td colSpan="6" className="text-center">ไม่มีข้อมูล</td></tr>
                                        ) : techPerformance.map((tech, idx) => {
                                            const total = parseInt(tech.total_tasks) || 0;
                                            const completed = parseInt(tech.completed_tasks) || 0;
                                            const successRate = total > 0 ? ((completed / total) * 100).toFixed(0) : 0;

                                            return (
                                                <tr key={idx}>
                                                    <td className="text-center">{idx + 1}</td>
                                                    <td>
                                                        <div className="tech-name-cell">
                                                            <div className="tech-avatar">{tech.name?.charAt(0)}</div>
                                                            <span>{tech.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center"><strong>{total}</strong></td>
                                                    <td className="text-center">
                                                        <span className="badge-active">{tech.active_tasks}</span>
                                                    </td>
                                                    <td className="text-center success-text">{completed}</td>
                                                    <td className="text-center">
                                                        <div className="progress-mini">
                                                            <div className="progress-bar-mini" style={{
                                                                width: `${successRate}%`,
                                                                background: successRate >= 70 ? '#10b981' : successRate >= 40 ? '#f59e0b' : '#ef4444'
                                                            }}></div>
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
        </div>
    );
};

export default Reports;
