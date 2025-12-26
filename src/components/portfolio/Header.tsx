import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, History, PieChart } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const tabs = [
    { id: 'dashboard', label: 'ภาพรวม', icon: TrendingUp },
    { id: 'transaction', label: 'บันทึกรายการ', icon: History },
    { id: 'holdings', label: 'หุ้นถือครอง', icon: PieChart },
    { id: 'charts', label: 'กราฟวิเคราะห์', icon: BarChart3 },
  ];

  return (
    <header className="border-b-4 border-foreground bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight">
              Stock Portfolio
            </h1>
            <p className="text-muted-foreground font-mono mt-1">
              ระบบจัดการพอร์ตหุ้น
            </p>
          </div>
          
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => onTabChange(tab.id)}
                className={`border-2 border-foreground font-bold uppercase ${
                  activeTab === tab.id 
                    ? 'shadow-xs' 
                    : 'hover:shadow-xs'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
