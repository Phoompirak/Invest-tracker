import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface DateRangeFilterProps {
    startDate?: Date;
    endDate?: Date;
    onStartDateChange: (date: Date | undefined) => void;
    onEndDateChange: (date: Date | undefined) => void;
}

export function DateRangeFilter({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
}: DateRangeFilterProps) {
    // Generate year options (last 10 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    // Month options
    const months = [
        { value: 0, label: "ม.ค." },
        { value: 1, label: "ก.พ." },
        { value: 2, label: "มี.ค." },
        { value: 3, label: "เม.ย." },
        { value: 4, label: "พ.ค." },
        { value: 5, label: "มิ.ย." },
        { value: 6, label: "ก.ค." },
        { value: 7, label: "ส.ค." },
        { value: 8, label: "ก.ย." },
        { value: 9, label: "ต.ค." },
        { value: 10, label: "พ.ย." },
        { value: 11, label: "ธ.ค." },
    ];

    const handleStartChange = (month: number, year: number) => {
        onStartDateChange(new Date(year, month, 1));
    };

    const handleEndChange = (month: number, year: number) => {
        // End of month
        const lastDay = new Date(year, month + 1, 0);
        onEndDateChange(lastDay);
    };

    const clearFilter = () => {
        onStartDateChange(undefined);
        onEndDateChange(undefined);
    };

    // Quick filters
    const setThisYear = () => {
        onStartDateChange(new Date(currentYear, 0, 1));
        onEndDateChange(new Date(currentYear, 11, 31));
    };

    const setLastYear = () => {
        onStartDateChange(new Date(currentYear - 1, 0, 1));
        onEndDateChange(new Date(currentYear - 1, 11, 31));
    };

    const setLast12Months = () => {
        const now = new Date();
        const past = new Date();
        past.setMonth(past.getMonth() - 12);
        onStartDateChange(past);
        onEndDateChange(now);
    };

    return (
        <div className="space-y-3 sm:space-y-4">
            {/* Quick Filters - Horizontal scroll on mobile */}
            <div className="flex overflow-x-auto gap-2 pb-1 sm:pb-0 sm:flex-wrap">
                <Button variant="outline" size="sm" onClick={setThisYear} className="flex-shrink-0 text-xs sm:text-sm">
                    ปีนี้ ({currentYear})
                </Button>
                <Button variant="outline" size="sm" onClick={setLastYear} className="flex-shrink-0 text-xs sm:text-sm">
                    ปีที่แล้ว ({currentYear - 1})
                </Button>
                <Button variant="outline" size="sm" onClick={setLast12Months} className="flex-shrink-0 text-xs sm:text-sm">
                    12 เดือน
                </Button>
                {(startDate || endDate) && (
                    <Button variant="ghost" size="sm" onClick={clearFilter} className="flex-shrink-0 text-red-500 text-xs sm:text-sm">
                        ล้าง
                    </Button>
                )}
            </div>

            {/* Custom Range - Stack on small mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Start Date */}
                <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                        เริ่มต้น
                    </label>
                    <div className="flex gap-1 sm:gap-2">
                        <select
                            className="flex-1 h-8 sm:h-9 rounded-md border bg-background px-2 sm:px-3 text-xs sm:text-sm"
                            value={startDate?.getMonth() ?? ""}
                            onChange={(e) => {
                                const month = parseInt(e.target.value);
                                const year = startDate?.getFullYear() || currentYear;
                                if (!isNaN(month)) handleStartChange(month, year);
                            }}
                        >
                            <option value="">เดือน</option>
                            {months.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                        <select
                            className="w-[72px] sm:w-24 h-8 sm:h-9 rounded-md border bg-background px-2 sm:px-3 text-xs sm:text-sm"
                            value={startDate?.getFullYear() ?? ""}
                            onChange={(e) => {
                                const year = parseInt(e.target.value);
                                const month = startDate?.getMonth() ?? 0;
                                if (!isNaN(year)) handleStartChange(month, year);
                            }}
                        >
                            <option value="">ปี</option>
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* End Date */}
                <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                        สิ้นสุด
                    </label>
                    <div className="flex gap-1 sm:gap-2">
                        <select
                            className="flex-1 h-8 sm:h-9 rounded-md border bg-background px-2 sm:px-3 text-xs sm:text-sm"
                            value={endDate?.getMonth() ?? ""}
                            onChange={(e) => {
                                const month = parseInt(e.target.value);
                                const year = endDate?.getFullYear() || currentYear;
                                if (!isNaN(month)) handleEndChange(month, year);
                            }}
                        >
                            <option value="">เดือน</option>
                            {months.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                        <select
                            className="w-[72px] sm:w-24 h-8 sm:h-9 rounded-md border bg-background px-2 sm:px-3 text-xs sm:text-sm"
                            value={endDate?.getFullYear() ?? ""}
                            onChange={(e) => {
                                const year = parseInt(e.target.value);
                                const month = endDate?.getMonth() ?? 11;
                                if (!isNaN(year)) handleEndChange(month, year);
                            }}
                        >
                            <option value="">ปี</option>
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Selected Range Display */}
            {(startDate || endDate) && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                    กำลังดู: {startDate ? startDate.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }) : 'ตั้งแต่แรก'}
                    {' → '}
                    {endDate ? endDate.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }) : 'ปัจจุบัน'}
                </p>
            )}
        </div>
    );
}
