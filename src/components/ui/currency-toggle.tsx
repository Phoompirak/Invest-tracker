import { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";
// Lucide react 0.462 has various icons. "Thai" might not be there. Let's use simple text "฿" and "$" if icons are issues, or use "Banknote" for general finance.
// For now let's stick to text labels B and $ with nice styling, or use available icons.
import { Coins } from "lucide-react";

interface CurrencyToggleProps {
    value: 'THB' | 'USD';
    onChange: (value: 'THB' | 'USD') => void;
}

export function CurrencyToggle({ value, onChange }: CurrencyToggleProps) {
    // We'll use a sliding pill design
    return (
        <div
            className="relative flex items-center bg-secondary/50 rounded-full p-1 cursor-pointer border border-border/50 w-24 h-9 shadow-inner"
            onClick={() => onChange(value === 'THB' ? 'USD' : 'THB')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    onChange(value === 'THB' ? 'USD' : 'THB');
                    e.preventDefault();
                }
            }}
        >
            {/* Sliding Background */}
            <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-background rounded-full shadow-sm transition-all duration-300 ease-spring ${value === 'USD' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                    }`}
            />

            <div className={`flex-1 flex items-center justify-center z-10 text-xs font-bold transition-colors duration-300 ${value === 'THB' ? 'text-primary' : 'text-muted-foreground'}`}>
                THB
            </div>
            <div className={`flex-1 flex items-center justify-center z-10 text-xs font-bold transition-colors duration-300 ${value === 'USD' ? 'text-primary' : 'text-muted-foreground'}`}>
                USD
            </div>
        </div>
    );
}
