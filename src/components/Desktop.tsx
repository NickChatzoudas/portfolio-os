import React, { useState } from 'react';
import Taskbar from './Taskbar';
import Window from './Window';
import AboutMe from './apps/AboutMe';
import DosBox from './apps/DosBox';



export interface AppConfig {
    id: string;
    title: string;
    icon: string;
    component: 'AboutMe' | 'DosBox';
    bundleUrl?: string;
}

interface WindowState {
    id: string;
    appId: string;
    title: string;
    isActive: boolean;
    x: number;
    y: number;
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
        title: 'PacMan',
        icon: '/icons/Pacman.webp',
        component: 'DosBox',
        bundleUrl: '/roms/pacman.jsdos'
    },
    // {
    //     id: 'solitaire',
    //     title: 'Solitaire',
    //     icon: '/icons/Solitaire.webp',
    //     component: 'DosBox',
    //     bundleUrl: '/roms/solitaire.jsdos'
    // }
    {
        id: 'doom',
        title: 'Doom',
        icon: '/icons/Doom.webp',
        component: 'DosBox',
        bundleUrl: '/roms/doom.jsdos'
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

    const handleWindowFocus = (id: string) => {
        setWindows(windows.map(w => ({ ...w, isActive: w.id === id })));
    };

    const handleWindowClose = (id: string) => {
        setWindows(prev => prev.filter(w => w.id !== id));
    };

    const handleIconDoubleClick = (appId: string) => {
        const app = apps.find(a => a.id === appId);
        if (!app) return;

        const newWindow: WindowState = {
            id: `${appId}-${Date.now()}`,
            appId: app.id,
            title: app.title,
            isActive: true,
            x: Math.random() * (window.innerWidth - 600),
            y: Math.random() * (window.innerHeight - 500)
        };

        setWindows([...windows.map(w => ({ ...w, isActive: false })), newWindow]);
    };

    const renderWindowContent = (window: WindowState) => {
        const app = apps.find(a => a.id === window.appId);
        if (!app) return <div>Window content not found</div>;

        switch (app.component) {
            case 'AboutMe':
                return <AboutMe />;
            case 'DosBox':
                if (!app.bundleUrl) {
                    return <div>Missing bundleUrl for {app.title}</div>;
                }
                return <DosBox bundleUrl={app.bundleUrl} />;
            default:
                return <div>Window content not found</div>;
        }
    };

    return (
        <div className="desktop">
            <div className="desktop-image" />
            <div className="desktop-content">
                {apps.map(app => (
                    <div
                        key={app.id}
                        className="desktop-icon"
                        onDoubleClick={() => handleIconDoubleClick(app.id)}
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
                apps={apps}
                onStartApp={handleIconDoubleClick}
            />
        </div>
    );
};

export default Desktop;
