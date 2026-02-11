export const formatThaiDate = (dateString, style = 'short') => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const options = {
        year: 'numeric',
        month: style === 'short' ? 'short' : 'long',
        day: 'numeric',
        timeZone: 'Asia/Bangkok'
    };
    // Force Buddhist Calendar if not automatic
    // Note: Most browsers supporting th-TH will use Buddhist year specific to locale
    return date.toLocaleDateString('th-TH', options);
};

export const formatThaiDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Bangkok'
    };
    return date.toLocaleString('th-TH', options) + ' น.';
};

export const formatTimeAgo = (dateString) => {
    if (!dateString) return 'เมื่อไม่นาน';
    const now = new Date();
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'เมื่อไม่นาน';

    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'เมื่อสักครู่';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    if (days < 7) return `${days} วันที่แล้ว`;
    return formatThaiDate(dateString);
};

export const formatThaiMonth = (yearMonth) => {
    if (!yearMonth) return '-';
    const [year, month] = yearMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
};
