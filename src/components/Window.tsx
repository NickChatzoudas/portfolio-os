import React, { useState, useRef, useEffect } from 'react';

interface WindowProps {
    id: string;
    title: string;
    icon?: string;
    isActive: boolean;
    x: number;
    y: number;
    width?: number;
    height?: number;
    focusSignal?: number;
    onFocus: () => void;
    onClose: () => void;
    type?: string; // Add this prop
    children: React.ReactNode;
}

const Window: React.FC<WindowProps> = ({
    title,
    icon,
    isActive,
    x: initialX,
    y: initialY,
    width,
    height,
    focusSignal,
    onFocus,
    onClose,
    type,
    children
}) => {
    const window_width = width ?? 600;
    const window_height = height ?? 500;
    const TASKBAR_HEIGHT = 32;
    const MIN_WIDTH = 240;
    const MIN_HEIGHT = 160;

    // Allow windows to be sized normally. If on mobile, scale them down significantly so they act like distinct apps.
    const getMobileWidth = () => Math.min(window_width, window.innerWidth * 0.85);
    const getMobileHeight = () => Math.min(window_height, window.innerHeight * 0.6);

    const [isDragging, setIsDragging] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false); // Do not force maximize on mobile or they can't be dragged
    const [isMinimized, setIsMinimized] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    // Initialize state properly respecting device bounds at mount time
    const [size, setSize] = useState(() => {
        const isMobile = window.innerWidth <= 600;
        return {
            width: isMobile ? getMobileWidth() : window_width,
            height: isMobile ? getMobileHeight() : window_height
        };
    });

    const [position, setPosition] = useState(() => {
        const isMobile = window.innerWidth <= 600;
        return {
            x: isMobile ? Math.max(0, (window.innerWidth - getMobileWidth()) / 2) : Math.max(0, initialX),
            y: isMobile ? Math.max(0, (window.innerHeight - TASKBAR_HEIGHT - getMobileHeight()) / 2) : Math.max(0, initialY)
        };
    });

    const [prevSize, setPrevSize] = useState({ width: size.width, height: size.height, x: position.x, y: position.y });

    // Restore minimized window if it gets clicked/activated via the taskbar
    useEffect(() => {
        if (isMinimized) {
            setIsMinimized(false);
        }
    }, [focusSignal]);

    // Enforce viewport boundaries only upon window resizing 
    useEffect(() => {
        const handleBrowserResize = () => {
            if (!isMaximized) {
                setPosition(prevPosition => {
                    return clampWindowToViewport({
                        x: prevPosition.x,
                        y: prevPosition.y,
                        width: size.width,
                        height: size.height
                    });
                });
            }
        };

        window.addEventListener('resize', handleBrowserResize);
        return () => window.removeEventListener('resize', handleBrowserResize);
    }, [isMaximized, size]);

    const windowRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef({ x: 0, y: 0 });

    type ResizeDirection =
        | 'top'
        | 'right'
        | 'bottom'
        | 'left'
        | 'top-left'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-right';

    const resizeStartRef = useRef({
        mouseX: 0,
        mouseY: 0,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        dir: 'right' as ResizeDirection
    });

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isMaximized) {
            setIsDragging(true);
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

            dragStartRef.current = {
                x: clientX - position.x,
                y: clientY - position.y
            };
        }
    };

    const handleDrag = (e: MouseEvent | TouchEvent) => {
        if (isDragging) {
            if (e.type === 'touchmove' && e.cancelable) {
                e.preventDefault(); // Prevent scrolling while dragging
            }
            const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

            setPosition({
                x: clientX - dragStartRef.current.x,
                y: clientY - dragStartRef.current.y
            });
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDrag, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDrag);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging]);

    const clampWindowToViewport = (next: { x: number; y: number; width: number; height: number }) => {
        const maxWidth = Math.max(MIN_WIDTH, window.innerWidth);
        const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - TASKBAR_HEIGHT);

        let width = Math.max(MIN_WIDTH, Math.min(next.width, maxWidth));
        let height = Math.max(MIN_HEIGHT, Math.min(next.height, maxHeight));

        // Let windows be dragged off-screen horizontally, but keep an edge visible
        let x = Math.min(next.x, window.innerWidth - 30);
        x = Math.max(x, -width + 30);

        // Keep the title bar reachable on the Y axis
        let y = Math.max(0, next.y);
        y = Math.min(y, window.innerHeight - TASKBAR_HEIGHT - 30);

        return { x, y, width, height };
    };

    const handleResizeStart = (dir: ResizeDirection) => (e: React.MouseEvent | React.TouchEvent) => {
        if (isMaximized) return;

        e.preventDefault();
        e.stopPropagation();
        onFocus();

        setIsResizing(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        resizeStartRef.current = {
            mouseX: clientX,
            mouseY: clientY,
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
            dir
        };
    };

    const handleResize = (e: MouseEvent | TouchEvent) => {
        if (!isResizing) return;

        const start = resizeStartRef.current;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        const dx = clientX - start.mouseX;
        const dy = clientY - start.mouseY;

        let nextX = start.x;
        let nextY = start.y;
        let nextWidth = start.width;
        let nextHeight = start.height;

        const dir = start.dir;

        const resizingLeft = dir.includes('left');
        const resizingRight = dir.includes('right');
        const resizingTop = dir.includes('top');
        const resizingBottom = dir.includes('bottom');

        if (resizingRight) {
            nextWidth = start.width + dx;
        }

        if (resizingBottom) {
            nextHeight = start.height + dy;
        }

        if (resizingLeft) {
            nextWidth = start.width - dx;
            nextX = start.x + dx;
        }

        if (resizingTop) {
            nextHeight = start.height - dy;
            nextY = start.y + dy;
        }

        // Enforce min size while keeping the opposite edge anchored
        if (nextWidth < MIN_WIDTH) {
            const diff = MIN_WIDTH - nextWidth;
            nextWidth = MIN_WIDTH;
            if (resizingLeft) nextX -= diff;
        }

        if (nextHeight < MIN_HEIGHT) {
            const diff = MIN_HEIGHT - nextHeight;
            nextHeight = MIN_HEIGHT;
            if (resizingTop) nextY -= diff;
        }

        // Clamp to viewport; for left/top resizing this may adjust both x/y and size.
        // To better mimic OS behavior, manually handle left/top clamping to 0 so size shrinks.
        if (resizingLeft && nextX < 0) {
            nextWidth = nextWidth + nextX;
            nextX = 0;
        }
        if (resizingTop && nextY < 0) {
            nextHeight = nextHeight + nextY;
            nextY = 0;
        }

        // Right/bottom boundaries
        const maxRight = window.innerWidth;
        const maxBottom = window.innerHeight - TASKBAR_HEIGHT;
        if (resizingRight && nextX + nextWidth > maxRight) {
            nextWidth = maxRight - nextX;
        }
        if (resizingBottom && nextY + nextHeight > maxBottom) {
            nextHeight = maxBottom - nextY;
        }

        const clamped = clampWindowToViewport({ x: nextX, y: nextY, width: nextWidth, height: nextHeight });
        setPosition({ x: clamped.x, y: clamped.y });
        setSize({ width: clamped.width, height: clamped.height });
    };

    const handleResizeEnd = () => {
        setIsResizing(false);
    };

    const handleMaximize = () => {
        if (!isMaximized) {
            setPrevSize({
                width: size.width,
                height: size.height,
                x: position.x,
                y: position.y
            });
            setPosition({ x: 0, y: 0 });
            // Adjust height to account for taskbar
            setSize({
                width: window.innerWidth,
                height: window.innerHeight - TASKBAR_HEIGHT
            });
        } else {
            setPosition({ x: prevSize.x, y: prevSize.y });
            setSize({ width: prevSize.width, height: prevSize.height });
        }
        setIsMaximized(!isMaximized);
    };

    const handleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    const handleClose = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation(); // Prevent event bubbling
        onClose();
    };

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleResize);
            window.addEventListener('mouseup', handleResizeEnd);
            window.addEventListener('touchmove', handleResize as any, { passive: false });
            window.addEventListener('touchend', handleResizeEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleResize);
            window.removeEventListener('mouseup', handleResizeEnd);
            window.removeEventListener('touchmove', handleResize as any);
            window.removeEventListener('touchend', handleResizeEnd);
        };
    }, [isResizing]);



    return (
        <div
            ref={windowRef}
            className={`window ${isActive ? 'active' : ''}`}
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                zIndex: isActive ? 10 : 1,
                display: isMinimized ? 'none' : 'flex',
                flexDirection: 'column'
            }}
            onClick={onFocus}
        >
            <div
                className="title-bar"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                style={{ touchAction: 'none' }}
            >
                <div className="title-bar-text">
                    {icon && <img src={icon} alt="" style={{ width: '16px', height: '16px', marginRight: '6px', verticalAlign: 'middle' }} />}
                    {title}
                </div>
                <div className="title-bar-controls">
                    <button aria-label="Minimize" onClick={handleMinimize}></button>
                    <button aria-label="Maximize" onClick={handleMaximize}></button>
                    <button aria-label="Close" onClick={handleClose}></button>
                </div>
            </div>
            <div className={`window-body ${type === 'DosBox' ? 'dosbox' : ''}`}>
                {children}
            </div>
            {!isMaximized && (
                <>
                    <div className="resize-handle top" onMouseDown={handleResizeStart('top')} onTouchStart={handleResizeStart('top')} />
                    <div className="resize-handle right" onMouseDown={handleResizeStart('right')} onTouchStart={handleResizeStart('right')} />
                    <div className="resize-handle bottom" onMouseDown={handleResizeStart('bottom')} onTouchStart={handleResizeStart('bottom')} />
                    <div className="resize-handle left" onMouseDown={handleResizeStart('left')} onTouchStart={handleResizeStart('left')} />

                    <div className="resize-handle top-left" onMouseDown={handleResizeStart('top-left')} onTouchStart={handleResizeStart('top-left')} />
                    <div className="resize-handle top-right" onMouseDown={handleResizeStart('top-right')} onTouchStart={handleResizeStart('top-right')} />
                    <div className="resize-handle bottom-left" onMouseDown={handleResizeStart('bottom-left')} onTouchStart={handleResizeStart('bottom-left')} />
                    <div className="resize-handle bottom-right" onMouseDown={handleResizeStart('bottom-right')} onTouchStart={handleResizeStart('bottom-right')} />
                </>
            )}
        </div>
    );
};

export default Window;