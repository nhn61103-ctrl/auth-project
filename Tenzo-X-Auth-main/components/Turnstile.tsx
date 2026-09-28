
import React, { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY } from '../constants';

interface TurnstileProps {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
}

declare global {
    interface Window {
        turnstile: any;
    }
}

const Turnstile: React.FC<TurnstileProps> = ({ onVerify, onExpire, onError }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const onVerifyRef = useRef(onVerify);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onVerifyRef.current = onVerify;
        onExpireRef.current = onExpire;
        onErrorRef.current = onError;
    }, [onVerify, onExpire, onError]);

    useEffect(() => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn("Turnstile Dev Bypass Active");
            setTimeout(() => {
                onVerifyRef.current("dev-bypass-token");
            }, 500);
            return;
        }

        let isMounted = true;

        const renderWidget = () => {
            if (window.turnstile && containerRef.current && !widgetIdRef.current && isMounted) {
                widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: TURNSTILE_SITE_KEY,
                    callback: (token: string) => onVerifyRef.current(token),
                    'expired-callback': () => {
                        if (onExpireRef.current) onExpireRef.current();
                    },
                    'error-callback': () => {
                        if (onErrorRef.current) onErrorRef.current();
                    },
                });
            }
        };

        if (window.turnstile) {
            renderWidget();
        } else {
            const interval = setInterval(() => {
                if (window.turnstile) {
                    renderWidget();
                    clearInterval(interval);
                }
            }, 500);
            return () => {
                isMounted = false;
                clearInterval(interval);
            };
        }

        return () => {
            isMounted = false;
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch (e) {
                    console.error("Turnstile remove error:", e);
                }
                widgetIdRef.current = null;
            }
        };
    }, []); 

    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return (
            <div className="flex justify-center my-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <span className="text-yellow-500 text-xs font-bold uppercase tracking-wider">Turnstile Bypassed (Dev)</span>
            </div>
        );
    }

    return <div ref={containerRef} className="flex justify-center my-4" style={{ minHeight: '65px' }} />;
};

export default Turnstile;
