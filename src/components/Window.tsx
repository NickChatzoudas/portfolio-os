import React, { useState, useRef, useEffect } from 'react';

interface WindowProps {
    id: string;
    title: string;
    icon?: string;
    isActive: boolean;
    x: number;
    y: number;
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
    onFocus,
    onClose,
    type,
    children
}) => {
    const window_width = 600;
    const window_height = 500;
    const TASKBAR_HEIGHT = 32;
    const MIN_WIDTH = 240;
    const MIN_HEIGHT = 160;

    const [isDragging, setIsDragging] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [position, setPosition] = useState({ x: initialX, y: initialY });
    const [size, setSize] = useState({ width: window_width, height: window_height });
    const [prevSize, setPrevSize] = useState({ width: window_width, height: window_height, x: initialX, y: initialY });

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

    const handleDragStart = (e: React.MouseEvent) => {
        if (!isMaximized) {
            setIsDragging(true);
            dragStartRef.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
            };
        }
    };

    const handleDrag = (e: MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            });
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const clampWindowToViewport = (next: { x: number; y: number; width: number; height: number }) => {
        const maxWidth = Math.max(MIN_WIDTH, window.innerWidth);
        const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - TASKBAR_HEIGHT);

        let x = next.x;
        let y = next.y;
        let width = next.width;
        let height = next.height;

        width = Math.max(MIN_WIDTH, Math.min(width, maxWidth));
        height = Math.max(MIN_HEIGHT, Math.min(height, maxHeight));

        // Keep window within the usable viewport
        const maxX = Math.max(0, window.innerWidth - width);
        const maxY = Math.max(0, window.innerHeight - TASKBAR_HEIGHT - height);
        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));

        return { x, y, width, height };
    };

    const handleResizeStart = (dir: ResizeDirection) => (e: React.MouseEvent) => {
        if (isMaximized) return;

        e.preventDefault();
        e.stopPropagation();
        onFocus();

        setIsResizing(true);
        resizeStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
            dir
        };
    };

    const handleResize = (e: MouseEvent) => {
        if (!isResizing) return;

        const start = resizeStartRef.current;
        const dx = e.clientX - start.mouseX;
        const dy = e.clientY - start.mouseY;

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
            // Adjust height to account for taskbar (28px)
            setSize({
                width: window.innerWidth,
                height: window.innerHeight - 40 // increased from 28 to 40 for padding
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

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event bubbling
        onClose();
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleResize);
            window.addEventListener('mouseup', handleResizeEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleResize);
            window.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [isResizing]);

    if (isMinimized) return null;

    return (
        <div
            ref={windowRef}
            className={`window ${isActive ? 'active' : ''}`}
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                zIndex: isActive ? 10 : 1,
                display: 'flex',
                flexDirection: 'column'
            }}
            onClick={onFocus}
        >
            <div className="title-bar" onMouseDown={handleDragStart}>
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
                    <div className="resize-handle top" onMouseDown={handleResizeStart('top')} />
                    <div className="resize-handle right" onMouseDown={handleResizeStart('right')} />
                    <div className="resize-handle bottom" onMouseDown={handleResizeStart('bottom')} />
                    <div className="resize-handle left" onMouseDown={handleResizeStart('left')} />

                    <div className="resize-handle top-left" onMouseDown={handleResizeStart('top-left')} />
                    <div className="resize-handle top-right" onMouseDown={handleResizeStart('top-right')} />
                    <div className="resize-handle bottom-left" onMouseDown={handleResizeStart('bottom-left')} />
                    <div className="resize-handle bottom-right" onMouseDown={handleResizeStart('bottom-right')} />
                </>
            )}
        </div>
    );
};

export default Window;