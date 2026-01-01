import { useParams, useNavigate } from "react-router-dom";
import { usePortfolio } from "@/hooks/usePortfolio";
import { CategoryDetailView } from "@/components/portfolio/CategoryDetailView";
import { HoldingDetailView } from "@/components/portfolio/HoldingDetailView";
import { useState } from "react";
import { Loader2, Briefcase, TrendingUp, Landmark, LineChart, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Holding } from "@/types/portfolio";
import { Navbar } from "@/components/portfolio/Navbar";
import { BottomNav } from "@/components/portfolio/BottomNav";

export default function CategoryPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        holdings,
        transactions,
        exchangeRate,
        isLoading,
        summary,
        updateTransaction,
        currency,
        setCurrency
    } = usePortfolio();

    // Local state for holding overlay
    const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat(currency === 'THB' ? 'th-TH' : 'en-US', {
            style: 'currency',
            currency: currency,
        }).format(value);
    };

    const formatPercent = (value: number) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Determine category name from ID
    // IDs: long-term, speculation, securities, or custom
    const categoryId = id || '';

    // Filter holdings
    const categoryHoldings = holdings.filter(h => h.category === categoryId);

    // Helper for category label/icon (duplicated logic from DimeLayout, could be shared)
    const getCategoryLabel = (cat: string) => {
        switch (cat) {
            case 'long-term': return 'ระยะยาว (Long Term)';
            case 'speculation': return 'เก็งกำไร (Speculation)';
            case 'securities': return 'บัญชีหลักทรัพย์ (Securities)';
            default: return cat;
        }
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'long-term': return Wallet;
            case 'speculation': return TrendingUp;
            case 'securities': return Landmark;
            default: return Briefcase;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar currency={currency} setCurrency={setCurrency} />

            <div className="pt-14 pb-20">
                <CategoryDetailView
                    category={categoryId}
                    categoryLabel={getCategoryLabel(categoryId)}
                    holdings={categoryHoldings}
                    summary={summary}
                    showValue={true}
                    formatCurrency={formatCurrency}
                    formatPercent={formatPercent}
                    onBack={() => navigate('/')}
                    onHoldingClick={setSelectedHolding}
                    CategoryIcon={getCategoryIcon(categoryId)}
                    exchangeRate={exchangeRate}
                    currency={currency}
                />

                {/* Holding Detail Overlay */}
                {selectedHolding && (
                    <HoldingDetailView
                        holding={selectedHolding}
                        transactions={transactions}
                        exchangeRate={exchangeRate}
                        currency={currency}
                        onBack={() => setSelectedHolding(null)}
                        showValue={true}
                        onUpdateTransaction={updateTransaction}
                    />
                )}
            </div>

            <BottomNav
                activeTab="dashboard"
                onTabChange={(tab) => navigate('/', { state: { initialTab: tab } })}
            />
        </div>
    );
}
