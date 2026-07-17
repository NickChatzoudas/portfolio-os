import React from 'react';

const MAZE_ROWS = [
    '###############',
    '#.............#',
    '#.##.#####.##.#',
    '#.............#',
    '#.##.#.#.#.##.#',
    '#....#...#....#',
    '####.#####.####',
    '#.............#',
    '####.#####.####',
    '#....#...#....#',
    '#.##.#.#.#.##.#',
    '#.............#',
    '#.##.#####.##.#',
    '#.............#',
    '###############'
];

const CELL = 24;

interface Vector {
    r: number;
    c: number;
}

interface Position {
    row: number;
    col: number;
}

interface GhostState {
    row: number;
    col: number;
    color: string;
    dir: Vector;
}

const ARROW_DIRECTIONS: Record<string, Vector> = {
    ArrowUp: { r: -1, c: 0 },
    ArrowDown: { r: 1, c: 0 },
    ArrowLeft: { r: 0, c: -1 },
    ArrowRight: { r: 0, c: 1 }
};

function buildGrid(): string[][] {
    const grid = MAZE_ROWS.map(row => row.split(''));
    grid[1][1] = 'o';
    grid[1][13] = 'o';
    grid[13][1] = 'o';
    grid[13][13] = 'o';
    return grid;
}

function countDots(grid: string[][]): number {
    return grid.reduce((total, row) => total + row.filter(cell => cell === '.' || cell === 'o').length, 0);
}

function isWall(grid: string[][], row: number, col: number): boolean {
    if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return true;
    return grid[row][col] === '#';
}

const Pacman: React.FC = () => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const wrapRef = React.useRef<HTMLDivElement>(null);
    const gridRef = React.useRef<string[][]>(buildGrid());
    const pacRef = React.useRef<Position>({ row: 7, col: 7 });
    const dirRef = React.useRef<Vector>({ r: 0, c: 0 });
    const nextDirRef = React.useRef<Vector>({ r: 0, c: 0 });
    const ghostsRef = React.useRef<GhostState[]>([]);
    const scaredTimerRef = React.useRef(0);
    const dotsLeftRef = React.useRef(0);
    const gameOverRef = React.useRef(false);
    const intervalRef = React.useRef<number | null>(null);

    const [score, setScore] = React.useState(0);
    const [lives, setLives] = React.useState(3);
    const [message, setMessage] = React.useState('');

    const draw = React.useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const grid = gridRef.current;
        for (let row = 0; row < grid.length; row += 1) {
            for (let col = 0; col < grid[0].length; col += 1) {
                const cell = grid[row][col];
                const x = col * CELL;
                const y = row * CELL;

                if (cell === '#') {
                    ctx.fillStyle = '#1030a0';
                    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
                } else if (cell === '.') {
                    ctx.fillStyle = '#ffd870';
                    ctx.beginPath();
                    ctx.arc(x + CELL / 2, y + CELL / 2, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (cell === 'o') {
                    ctx.fillStyle = '#ffd870';
                    ctx.beginPath();
                    ctx.arc(x + CELL / 2, y + CELL / 2, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        const pac = pacRef.current;
        ctx.fillStyle = '#ffe600';
        ctx.beginPath();
        ctx.arc(pac.col * CELL + CELL / 2, pac.row * CELL + CELL / 2, CELL / 2 - 2, 0.25 * Math.PI, 1.75 * Math.PI);
        ctx.lineTo(pac.col * CELL + CELL / 2, pac.row * CELL + CELL / 2);
        ctx.fill();

        ghostsRef.current.forEach(ghost => {
            ctx.fillStyle = scaredTimerRef.current > 0 ? '#3050ff' : ghost.color;
            const gx = ghost.col * CELL + CELL / 2;
            const gy = ghost.row * CELL + CELL / 2;
            ctx.beginPath();
            ctx.arc(gx, gy - 2, CELL / 2 - 3, Math.PI, 0);
            ctx.lineTo(gx + CELL / 2 - 3, gy + CELL / 2 - 4);
            ctx.lineTo(gx + CELL / 6, gy + CELL / 2 - 6);
            ctx.lineTo(gx, gy + CELL / 2 - 4);
            ctx.lineTo(gx - CELL / 6, gy + CELL / 2 - 6);
            ctx.lineTo(gx - CELL / 2 + 3, gy + CELL / 2 - 4);
            ctx.closePath();
            ctx.fill();
        });
    }, []);

    const tick = React.useCallback(() => {
        if (gameOverRef.current) return;

        const grid = gridRef.current;
        const pac = pacRef.current;

        if (!isWall(grid, pac.row + nextDirRef.current.r, pac.col + nextDirRef.current.c)) {
            dirRef.current = nextDirRef.current;
        }
        if (!isWall(grid, pac.row + dirRef.current.r, pac.col + dirRef.current.c)) {
            pac.row += dirRef.current.r;
            pac.col += dirRef.current.c;
        }

        const cell = grid[pac.row][pac.col];
        let scoreDelta = 0;

        if (cell === '.') {
            grid[pac.row][pac.col] = ' ';
            scoreDelta += 10;
            dotsLeftRef.current -= 1;
        } else if (cell === 'o') {
            grid[pac.row][pac.col] = ' ';
            scoreDelta += 50;
            dotsLeftRef.current -= 1;
            scaredTimerRef.current = 50;
        }

        if (scaredTimerRef.current > 0) scaredTimerRef.current -= 1;

        ghostsRef.current.forEach(ghost => {
            const options: Vector[] = [
                { r: -1, c: 0 },
                { r: 1, c: 0 },
                { r: 0, c: -1 },
                { r: 0, c: 1 }
            ].filter(direction => {
                if (isWall(grid, ghost.row + direction.r, ghost.col + direction.c)) return false;
                if (direction.r === -ghost.dir.r && direction.c === -ghost.dir.c) return false;
                return true;
            });

            const choices = options.length ? options : [{ r: -ghost.dir.r, c: -ghost.dir.c }];
            let best: Vector;

            if (Math.random() < 0.75) {
                choices.sort((a, b) => {
                    const distanceA = Math.hypot((ghost.row + a.r) - pac.row, (ghost.col + a.c) - pac.col);
                    const distanceB = Math.hypot((ghost.row + b.r) - pac.row, (ghost.col + b.c) - pac.col);
                    return scaredTimerRef.current > 0 ? distanceB - distanceA : distanceA - distanceB;
                });
                best = choices[0];
            } else {
                best = choices[Math.floor(Math.random() * choices.length)];
            }

            ghost.dir = best;
            ghost.row += best.r;
            ghost.col += best.c;
        });

        let livesDelta = 0;
        let caught = false;

        ghostsRef.current.forEach(ghost => {
            if (ghost.row === pac.row && ghost.col === pac.col) {
                if (scaredTimerRef.current > 0) {
                    scoreDelta += 200;
                    ghost.row = 7;
                    ghost.col = 7;
                } else if (!caught) {
                    caught = true;
                    livesDelta = -1;
                    pac.row = 7;
                    pac.col = 7;
                    dirRef.current = { r: 0, c: 0 };
                    nextDirRef.current = { r: 0, c: 0 };
                }
            }
        });

        if (scoreDelta !== 0) {
            setScore(previous => previous + scoreDelta);
        }

        if (livesDelta !== 0) {
            setLives(previous => {
                const next = previous + livesDelta;
                if (next <= 0) {
                    gameOverRef.current = true;
                    setMessage('Game Over');
                }
                return next;
            });
        }

        if (!gameOverRef.current && dotsLeftRef.current <= 0) {
            gameOverRef.current = true;
            setMessage('You cleared the maze!');
        }

        draw();
    }, [draw]);

    const startGame = React.useCallback(() => {
        gridRef.current = buildGrid();
        pacRef.current = { row: 7, col: 7 };
        dirRef.current = { r: 0, c: 0 };
        nextDirRef.current = { r: 0, c: 0 };
        ghostsRef.current = [
            { row: 5, col: 7, color: '#ff0000', dir: { r: 0, c: 1 } },
            { row: 9, col: 7, color: '#ffb8ff', dir: { r: 0, c: -1 } }
        ];
        scaredTimerRef.current = 0;
        gameOverRef.current = false;
        dotsLeftRef.current = countDots(gridRef.current);

        setScore(0);
        setLives(3);
        setMessage('');

        if (intervalRef.current) window.clearInterval(intervalRef.current);
        intervalRef.current = window.setInterval(tick, 160);
        draw();
    }, [draw, tick]);

    React.useEffect(() => {
        startGame();
        wrapRef.current?.focus();
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
        };
    }, [startGame]);

    const handleKeyDown = (event: React.KeyboardEvent) => {
        const direction = ARROW_DIRECTIONS[event.key];
        if (!direction) return;
        nextDirRef.current = direction;
        event.preventDefault();
    };

    return (
        <div className="pac98-wrap" ref={wrapRef} tabIndex={0} onKeyDown={handleKeyDown}>
            <div className="pac98-hud">
                <span>Score: {score}</span>
                <span>Lives: {lives}</span>
            </div>
            <canvas ref={canvasRef} width={360} height={360} className="pac98-canvas" />
            {message && <div className="pac98-message">{message}</div>}
            <button onClick={startGame}>Restart</button>
        </div>
    );
};

export default Pacman;
