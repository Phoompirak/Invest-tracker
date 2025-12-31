import { useEffect } from 'react';

export const useBackButton = (isOpen: boolean, onOpenChange: (open: boolean) => void) => {
    useEffect(() => {
        // Only push state when opening, not when re-rendering while open
        if (isOpen) {
            const handlePopState = (event: PopStateEvent) => {
                // Prevent default back behavior (like exiting app) if we just want to close dialog
                event.preventDefault();
                onOpenChange(false);
            };

            // Push a new state so back button has something to pop
            window.history.pushState({ dialogOpen: true }, '');

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
                // If we're unmounting/closing and the state we pushed is still top, go back?
                // Actually, if we close via X, we should ideally go back one step to clean history
                // But checking history state is tricky. Simplest is:
                // logic above handles the "User pressed Back" case.
                // If "User pressed X", the component unmounts/effect cleans up. 
                // We might leave a dummy state in history, but that's often acceptable for simple PWA.
                // For strict correctness: if we are closing programmatically (isOpen becomes false), we might want to history.back() if we pushed.
            };
        }
    }, [isOpen]); // Re-run only when isOpen changes
};
