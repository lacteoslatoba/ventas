import React from 'react';

// Banner de instalación PWA (aparece cuando el navegador emite beforeinstallprompt).
const InstallBanner = () => {
    const [prompt, setPrompt] = React.useState(null);
    const [dismissed, setDismissed] = React.useState(
        () => sessionStorage.getItem('pwa-install-dismissed') === '1'
    );

    React.useEffect(() => {
        const handler = (e) => { e.preventDefault(); setPrompt(e); };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    if (!prompt || dismissed) return null;

    const install = async () => {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') setPrompt(null);
    };

    const dismiss = () => {
        sessionStorage.setItem('pwa-install-dismissed', '1');
        setDismissed(true);
    };

    return (
        <div className="fixed bottom-[185px] left-3 right-3 z-[90] animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
                <img src="/pwa-logo.png" alt="icono" className="w-11 h-11 rounded-xl shrink-0 object-cover" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black leading-tight">Instalar App</p>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">Agrega al inicio para acceso rápido</p>
                </div>
                <button
                    onClick={dismiss}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 shrink-0"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
                <button
                    onClick={install}
                    className="bg-primary text-white text-xs font-black px-4 py-2 rounded-xl active:scale-95 transition-all shrink-0"
                >
                    Instalar
                </button>
            </div>
        </div>
    );
};

export default InstallBanner;
