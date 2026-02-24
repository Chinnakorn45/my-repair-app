import { useState } from 'react';
import {
    BookOpen, FileText, ClipboardList, MapPin, Wrench, Bell, User,
    BarChart2, Settings, Users, Building, Printer, CheckCircle
} from 'lucide-react';
import './UserGuide.css';

const UserGuide = ({ userRole }) => {
    const [activeRole, setActiveRole] = useState(userRole || 'user');

    const roleTabs = [
        { id: 'user', label: 'ผู้ใช้งาน', icon: <User size={16} /> },
        { id: 'technician', label: 'ช่างเทคนิค', icon: <Wrench size={16} /> },
        { id: 'supervisor', label: 'หัวหน้างาน', icon: <BarChart2 size={16} /> },
        { id: 'admin', label: 'ผู้ดูแลระบบ', icon: <Settings size={16} /> }
    ];

    const guideContent = {
        user: [
            {
                title: 'การแจ้งซ่อมใหม่',
                icon: <FileText size={20} />,
                iconColor: 'blue',
                steps: [
                    { title: 'เข้าเมนู "แจ้งซ่อมใหม่"', desc: 'เลือกจากเมนูด้านซ้าย หรือจากหน้าหลัก' },
                    { title: 'กรอกรายละเอียดปัญหา', desc: 'ระบุรายละเอียดความเสียหายให้ชัดเจน เช่น แอร์เสีย, ไฟไม่ติด' },
                    { title: 'เลือกอาคาร/ตำแหน่ง', desc: 'เลือกอาคารจากรายการ หรือปักหมุดบนแผนที่เพื่อระบุตำแหน่ง' },
                    { title: 'แนบรูปภาพ (ถ้ามี)', desc: 'ถ่ายรูปความเสียหายเพื่อให้ช่างเข้าใจปัญหาได้เร็วขึ้น' },
                    { title: 'กดส่งแจ้งซ่อม', desc: 'ระบบจะส่งข้อมูลไปยังหัวหน้างานเพื่อมอบหมายงานให้ช่างต่อไป' }
                ],
                tip: 'การแนบรูปภาพที่ชัดเจนจะช่วยให้ช่างเข้าใจปัญหาและเตรียมอุปกรณ์ได้ถูกต้อง'
            },
            {
                title: 'การติดตามสถานะ',
                icon: <ClipboardList size={20} />,
                iconColor: 'green',
                steps: [
                    { title: 'เข้าเมนู "รายการแจ้งซ่อม"', desc: 'ดูรายการแจ้งซ่อมทั้งหมดของคุณ' },
                    { title: 'ตรวจสอบสถานะ', desc: 'สถานะงาน: รอดำเนินการ → กำลังดำเนินการ → เสร็จสิ้น' },
                    { title: 'แก้ไขหรือลบรายการ', desc: 'สามารถแก้ไขหรือลบรายการที่สถานะ "รอดำเนินการ" ได้' }
                ],
                tip: 'คุณจะได้รับการแจ้งเตือนเมื่อสถานะงานเปลี่ยนแปลง'
            },
            {
                title: 'การดูแผนที่',
                icon: <MapPin size={20} />,
                iconColor: 'orange',
                steps: [
                    { title: 'เปิดหน้าแผนที่', desc: 'ดูตำแหน่งจุดแจ้งซ่อมทั้งหมดที่กำลังดำเนินการบนแผนที่' },
                    { title: 'คลิกที่หมุด', desc: 'ดูรายละเอียดของแต่ละจุดแจ้งซ่อมได้จากหมุดบนแผนที่' }
                ]
            }
        ],
        technician: [
            {
                title: 'การดูงานที่ได้รับมอบหมาย',
                icon: <Wrench size={20} />,
                iconColor: 'blue',
                steps: [
                    { title: 'เข้าเมนู "งานของฉัน"', desc: 'ดูรายการงานทั้งหมดที่ได้รับมอบหมายจากหัวหน้างาน' },
                    { title: 'ดูรายละเอียดงาน', desc: 'คลิกที่งานเพื่อดูรายละเอียด ตำแหน่ง และรูปภาพความเสียหาย' },
                    { title: 'ดูตำแหน่งบนแผนที่', desc: 'ใช้เมนู "แผนที่งานซ่อม" เพื่อดูตำแหน่งงานบนแผนที่' }
                ]
            },
            {
                title: 'การอัปเดตสถานะงาน',
                icon: <CheckCircle size={20} />,
                iconColor: 'green',
                steps: [
                    { title: 'เลือกงานที่ต้องการอัปเดต', desc: 'เข้าไปที่รายละเอียดงานที่กำลังทำ' },
                    { title: 'เปลี่ยนสถานะ', desc: 'อัปเดตสถานะเป็น "กำลังดำเนินการ" เมื่อเริ่มทำงาน' },
                    { title: 'บันทึกผลเมื่อเสร็จสิ้น', desc: 'กรอกรายละเอียดการซ่อม แนบรูปภาพหลังซ่อม แล้วกดบันทึก' },
                    { title: 'รอการอนุมัติ', desc: 'หลังบันทึกผล หัวหน้างานจะตรวจสอบและอนุมัติปิดงาน' }
                ],
                tip: 'อย่าลืมถ่ายรูปหลังซ่อมเสร็จเพื่อเป็นหลักฐานในการปิดงาน'
            },
            {
                title: 'การดูสถิติงาน',
                icon: <BarChart2 size={20} />,
                iconColor: 'purple',
                steps: [
                    { title: 'เข้าหน้า Dashboard', desc: 'ดูสรุปจำนวนงานที่ได้รับมอบหมาย กำลังทำ และเสร็จแล้ว' },
                    { title: 'ดูประวัติงาน', desc: 'เข้าเมนู "ประวัติงาน" เพื่อดูรายการงานที่ดำเนินการเสร็จแล้วทั้งหมด' }
                ]
            }
        ],
        supervisor: [
            {
                title: 'การจัดการงานซ่อม',
                icon: <ClipboardList size={20} />,
                iconColor: 'blue',
                steps: [
                    { title: 'เข้าเมนู "จัดการงานซ่อม"', desc: 'ดูรายการแจ้งซ่อมทั้งหมด กรองตามสถานะ หรือค้นหา' },
                    { title: 'มอบหมายงานให้ช่าง', desc: 'เลือกงาน → กดมอบหมาย → เลือกช่างที่ต้องการ' },
                    { title: 'มอบหมายให้หน่วยงานภายนอก', desc: 'สำหรับงานที่ต้องใช้ผู้เชี่ยวชาญภายนอก สามารถระบุหน่วยงานภายนอกได้' },
                    { title: 'ตรวจสอบและอนุมัติผลงาน', desc: 'เมื่อช่างส่งผลการซ่อม สามารถตรวจสอบและอนุมัติ/ไม่อนุมัติได้' }
                ],
                tip: 'ดูภาระงานของช่างแต่ละคนก่อนมอบหมายเพื่อกระจายงานอย่างเหมาะสม'
            },
            {
                title: 'การดูรายงาน',
                icon: <BarChart2 size={20} />,
                iconColor: 'green',
                steps: [
                    { title: 'เข้าเมนู "รายงาน"', desc: 'ดูสถิติงานซ่อม จำนวนงานแยกตามอาคาร ผลงานช่าง แนวโน้มรายเดือน' },
                    { title: 'ส่งออก CSV', desc: 'กดปุ่ม "ส่งออก CSV" เพื่อดาวน์โหลดข้อมูลรายงาน' }
                ]
            },
            {
                title: 'การพิมพ์รายงานราชการ',
                icon: <Printer size={20} />,
                iconColor: 'purple',
                steps: [
                    { title: 'เข้าเมนู "พิมพ์รายงาน"', desc: 'สร้างเอกสารบันทึกข้อความรูปแบบราชการ' },
                    { title: 'เลือกช่วงเวลา', desc: 'กำหนดวันที่เริ่มต้นและสิ้นสุดสำหรับการออกรายงาน' },
                    { title: 'กดพิมพ์', desc: 'ระบบจะสร้างเอกสารพร้อมตราครุฑในรูปแบบพิมพ์ได้' }
                ]
            }
        ],
        admin: [
            {
                title: 'การจัดการผู้ใช้งาน',
                icon: <Users size={20} />,
                iconColor: 'blue',
                steps: [
                    { title: 'เข้าเมนู "จัดการผู้ใช้"', desc: 'ดูรายชื่อผู้ใช้ทั้งหมด ค้นหาและกรองตามบทบาท' },
                    { title: 'เพิ่มผู้ใช้ใหม่', desc: 'กดปุ่ม + เพื่อเพิ่มผู้ใช้ กรอกข้อมูลและกำหนดบทบาท (ผู้ใช้/ช่าง/หัวหน้า/แอดมิน)' },
                    { title: 'แก้ไขข้อมูลผู้ใช้', desc: 'กดปุ่มแก้ไขเพื่อเปลี่ยนข้อมูล บทบาท หรือรีเซ็ตรหัสผ่าน' },
                    { title: 'ลบผู้ใช้', desc: 'กดปุ่มลบ (ระวัง: การลบจะลบข้อมูลที่เกี่ยวข้องทั้งหมด)' }
                ]
            },
            {
                title: 'การจัดการอาคาร',
                icon: <Building size={20} />,
                iconColor: 'green',
                steps: [
                    { title: 'เข้าเมนู "จัดการอาคาร"', desc: 'ดูรายชื่ออาคารทั้งหมดในระบบ' },
                    { title: 'เพิ่มอาคาร', desc: 'กดเพิ่มอาคาร กรอกชื่อ คณะ/หน่วยงาน และปักหมุดบนแผนที่' },
                    { title: 'แก้ไขหรือลบ', desc: 'แก้ไขข้อมูลอาคารหรือลบอาคารที่ไม่ใช้แล้ว' }
                ]
            },
            {
                title: 'การตั้งค่าระบบ',
                icon: <Settings size={20} />,
                iconColor: 'orange',
                steps: [
                    { title: 'เข้าเมนู "ตั้งค่า"', desc: 'จัดการการตั้งค่าทั่วไปของระบบ' },
                    { title: 'อัปโหลดโลโก้', desc: 'เปลี่ยนโลโก้องค์กรที่แสดงในระบบ' },
                    { title: 'จัดการ Popup ประกาศ', desc: 'เปิด/ปิด และกำหนดข้อความ Popup ที่จะแสดงเมื่อผู้ใช้เข้าระบบ' }
                ]
            },
            {
                title: 'การจัดการข่าวสาร/ประกาศ',
                icon: <Bell size={20} />,
                iconColor: 'purple',
                steps: [
                    { title: 'เข้าเมนู "จัดการข่าวสาร/ประกาศ"', desc: 'สร้างประกาศข่าวสารให้ผู้ใช้งานทุกคนเห็น' },
                    { title: 'เพิ่มประกาศ', desc: 'กรอกหัวข้อและเนื้อหาประกาศ แล้วกดบันทึก' },
                    { title: 'ลบประกาศ', desc: 'ลบประกาศที่หมดอายุหรือไม่ต้องการแล้ว' }
                ]
            }
        ]
    };

    const currentGuide = guideContent[activeRole] || guideContent.user;

    return (
        <div className="user-guide">
            <div className="guide-header">
                <h2>📖 คู่มือการใช้งานระบบแจ้งซ่อม</h2>
                <p>เลือกบทบาทเพื่อดูคำแนะนำการใช้งานตามหน้าที่ของคุณ</p>
            </div>

            {/* Role Tabs */}
            <div className="guide-role-tabs">
                {roleTabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`guide-role-tab ${activeRole === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveRole(tab.id)}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Guide Sections */}
            {currentGuide.map((section, idx) => (
                <div key={idx} className="guide-section">
                    <div className="guide-section-header">
                        <div className={`guide-section-icon ${section.iconColor}`}>
                            {section.icon}
                        </div>
                        <h3>{section.title}</h3>
                    </div>

                    <ol className="guide-steps">
                        {section.steps.map((step, stepIdx) => (
                            <li key={stepIdx} className="guide-step">
                                <span className="step-number">{stepIdx + 1}</span>
                                <div className="step-content">
                                    <strong>{step.title}</strong>
                                    <p>{step.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    {section.tip && (
                        <div className="guide-tip">
                            <span className="guide-tip-icon">💡</span>
                            <p><strong>เคล็ดลับ:</strong> {section.tip}</p>
                        </div>
                    )}
                </div>
            ))}

            {/* Footer */}
            <div className="guide-footer">
                <h3>ต้องการความช่วยเหลือเพิ่มเติม?</h3>
                <p>ติดต่อฝ่ายสนับสนุนระบบได้ที่ผู้ดูแลระบบ</p>
            </div>
        </div>
    );
};

export default UserGuide;
