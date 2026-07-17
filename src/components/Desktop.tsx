import React, { useState, useEffect } from 'react';
import Taskbar from './Taskbar';
import Window from './Window';
import AboutMe from './apps/AboutMe';
import Pacman from './apps/Pacman';
import PopupMessage from './apps/PopupMessage';
import Solitaire from './apps/Solitaire';



export interface AppConfig {
    id: string;
    title: string;
    icon: string;
    component: 'AboutMe' | 'Pacman' | 'PopupMessage' | 'Solitaire';
    width?: number;
    height?: number;
}

interface WindowState {
    id: string;
    appId: string;
    title: string;
    isActive: boolean;
    x: number;
    y: number;
    width?: number;
    height?: number;
    focusSignal?: number; // Add a signal to force un-minimize
}

const apps: AppConfig[] = [
    {
        id: 'about-me',
        title: 'About Me',
        icon: '/icon.webp',
        component: 'AboutMe'
    },
    {
        id: 'pacman',
        title: 'Pac-Man',
        icon: '/icons/pacman.webp',
        component: 'Pacman',
        width: 420,
        height: 470
    },
    {
        id: 'solitaire',
        title: 'Solitaire',
        icon: '/icons/solitaire.webp',
        component: 'Solitaire',
        width: 560,
        height: 520
    },
    {
        id: 'popup-message',
        title: 'Important Message',
        icon: '/icons/phone.png',
        component: 'PopupMessage'
    }
    // Add more apps here
];

const Desktop: React.FC = () => {
    const [windows, setWindows] = useState<WindowState[]>(() => {
        const width = 600;
        const height = 500;
        const winWidth = window.innerWidth > 0 ? window.innerWidth : 1024;
        const winHeight = window.innerHeight > 0 ? window.innerHeight : 768;

        return [{
            id: 'about-me-auto',
            appId: 'about-me',
            title: 'About Me',
            isActive: true,
            x: (winWidth - width) / 2,
            y: (winHeight - height) / 2
        }];
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mobile')) {
            const newWindow: WindowState = {
                id: `popup-${Date.now()}`,
                appId: 'popup-message',
                title: 'Important Message',
                isActive: true,
                x: (window.innerWidth - 300) / 2,
                y: (window.innerHeight - 200) / 2,
                width: 300,
                height: 180
            };
            setWindows(prev => {
                // Prevent duplicate windows in React strict mode
                if (prev.some(w => w.appId === 'popup-message')) {
                    return prev;
                }
                return [...prev.map(w => ({ ...w, isActive: false })), newWindow];
            });
        }
    }, []);

    const handleWindowFocus = (id: string) => {
        setWindows(prevWindows => prevWindows.map(w => ({
            ...w,
            isActive: w.id === id,
            focusSignal: w.id === id ? Date.now() : w.focusSignal
        })));
    };

    const handleWindowClose = (id: string) => {
        setWindows(prev => prev.filter(w => w.id !== id));
    };

    const handleIconDoubleClick = (appId: string) => {
        const app = apps.find(a => a.id === appId);
        if (!app) return;

        const appWidth = app.width ?? 600;
        const appHeight = app.height ?? 500;

        const newWindow: WindowState = {
            id: `${appId}-${Date.now()}`,
            appId: app.id,
            title: app.title,
            isActive: true,
            x: Math.random() * Math.max(1, window.innerWidth - appWidth),
            y: Math.random() * Math.max(1, window.innerHeight - appHeight),
            width: appWidth,
            height: appHeight
        };

        setWindows(prevWindows => [...prevWindows.map(w => ({ ...w, isActive: false })), newWindow]);
    };

    const renderWindowContent = (window: WindowState) => {
        const app = apps.find(a => a.id === window.appId);
        if (!app) return <div>Window content not found</div>;

        switch (app.component) {
            case 'AboutMe':
                return <AboutMe />;
            case 'Pacman':
                return <Pacman />;
            case 'PopupMessage':
                return <PopupMessage />;
            case 'Solitaire':
                return <Solitaire />;
            default:
                return <div>Window content not found</div>;
        }
    };

    return (
        <div className="desktop">
            <div className="desktop-image" />
            <div className="desktop-content">
                {apps.filter(a => a.id !== 'popup-message').map(app => (
                    <div
                        key={app.id}
                        className="desktop-icon"
                        onDoubleClick={() => handleIconDoubleClick(app.id)}
                        onTouchEnd={(e) => {
                            e.preventDefault(); // Prevent simulated mouse events
                            handleIconDoubleClick(app.id);
                        }}
                    >
                        <img className="desktop-icon-image" src={app.icon} alt={app.title} />
                        <span className="desktop-icon-text">{app.title}</span>
                    </div>
                ))}

                {windows.map(window => (
                    <Window
                        key={window.id}
                        id={window.id}
                        title={window.title}
                        icon={apps.find(a => a.id === window.appId)?.icon}
                        isActive={window.isActive}
                        x={window.x}
                        y={window.y}
                        width={window.width}
                        height={window.height}
                        focusSignal={window.focusSignal}
                        type={apps.find(a => a.id === window.appId)?.component} // Add this line
                        onFocus={() => handleWindowFocus(window.id)}
                        onClose={() => handleWindowClose(window.id)}
                    >
                        {renderWindowContent(window)}
                    </Window>
                ))}
            </div>
            <Taskbar
                activeWindows={windows}
                onWindowClick={handleWindowFocus}
                apps={apps.filter(a => a.id !== 'popup-message')}
                onStartApp={handleIconDoubleClick}
            />
        </div>
    );
};

export default Desktop;
