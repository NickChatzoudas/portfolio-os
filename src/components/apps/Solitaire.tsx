import React from 'react';

type Suit = '♠' | '♥' | '♦' | '♣';

interface Card {
    suit: Suit;
    rank: number;
    faceUp: boolean;
}

interface DragSource {
    type: 'waste' | 'tableau';
    pileIndex?: number;
    cardIndex?: number;
}

interface DropTarget {
    type: 'foundation' | 'tableau';
    suit?: Suit;
    pileIndex?: number;
}

interface BoardState {
    stock: Card[];
    waste: Card[];
    foundations: Record<Suit, Card[]>;
    tableau: Card[][];
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];

function suitColor(suit: Suit): 'red' | 'black' {
    return suit === '♥' || suit === '♦' ? 'red' : 'black';
}

function rankLabel(rank: number): string {
    if (rank === 1) return 'A';
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    return String(rank);
}

function withFaceUp(card: Card, faceUp: boolean): Card {
    return { ...card, faceUp };
}

function buildShuffledDeck(): Card[] {
    const deck: Card[] = [];
    SUITS.forEach(suit => {
        for (let rank = 1; rank <= 13; rank += 1) {
            deck.push({ suit, rank, faceUp: false });
        }
    });
    for (let index = deck.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
    }
    return deck;
}

function deal(): BoardState {
    const deck = buildShuffledDeck();
    const tableau: Card[][] = [[], [], [], [], [], [], []];

    for (let column = 0; column < 7; column += 1) {
        for (let depth = 0; depth <= column; depth += 1) {
            const card = deck.pop();
            if (!card) continue;
            tableau[column].push(withFaceUp(card, depth === column));
        }
    }

    const foundations: Record<Suit, Card[]> = { '♠': [], '♥': [], '♦': [], '♣': [] };

    return { stock: deck, waste: [], foundations, tableau };
}

function getTotalFoundationCards(foundations: Record<Suit, Card[]>): number {
    return SUITS.reduce((total, suit) => total + foundations[suit].length, 0);
}

const Solitaire: React.FC = () => {
    const [board, setBoard] = React.useState<BoardState>(() => deal());
    const [status, setStatus] = React.useState('');
    const [selectedSource, setSelectedSource] = React.useState<DragSource | null>(null);

    const newGame = () => {
        setBoard(deal());
        setStatus('');
        setSelectedSource(null);
    };

    const drawStock = () => {
        setSelectedSource(null);
        setBoard(previous => {
            if (previous.stock.length === 0) {
                if (previous.waste.length === 0) return previous;
                const stock = [...previous.waste].reverse().map(card => withFaceUp(card, false));
                return { ...previous, stock, waste: [] };
            }

            const stock = [...previous.stock];
            const raw = stock.pop();
            if (!raw) return previous;
            const card = withFaceUp(raw, true);
            return { ...previous, stock, waste: [...previous.waste, card] };
        });
    };

    const isSelected = (source: DragSource) => {
        if (!selectedSource) return false;
        if (selectedSource.type !== source.type) return false;
        if (source.type === 'waste') return true;
        return selectedSource.pileIndex === source.pileIndex && selectedSource.cardIndex === source.cardIndex;
    };

    const handleCardTap = (source: DragSource, event?: React.MouseEvent) => {
        if (event) event.stopPropagation();
        if (!selectedSource) {
            setSelectedSource(source);
            return;
        }

        if (isSelected(source)) {
            setSelectedSource(null);
            return;
        }

        if (source.type === 'tableau' && source.pileIndex !== undefined) {
            handleDrop(selectedSource, { type: 'tableau', pileIndex: source.pileIndex });
            setSelectedSource(null);
        } else {
            setSelectedSource(source);
        }
    };

    const handlePileTap = (destination: DropTarget) => {
        if (selectedSource) {
            handleDrop(selectedSource, destination);
            setSelectedSource(null);
        }
    };

    const tryAutoFoundation = (source: DragSource) => {
        setSelectedSource(null);
        setBoard(previous => {
            let card: Card | undefined;

            if (source.type === 'waste') {
                card = previous.waste[previous.waste.length - 1];
            } else if (source.type === 'tableau' && source.pileIndex !== undefined && source.cardIndex !== undefined) {
                const column = previous.tableau[source.pileIndex];
                if (source.cardIndex !== column.length - 1) return previous;
                card = column[column.length - 1];
            }

            if (!card) return previous;

            const foundationPile = previous.foundations[card.suit];
            const topRank = foundationPile.length ? foundationPile[foundationPile.length - 1].rank : 0;
            if (card.rank !== topRank + 1) return previous;

            const foundations = { ...previous.foundations, [card.suit]: [...foundationPile, card] };

            if (source.type === 'waste') {
                return { ...previous, waste: previous.waste.slice(0, -1), foundations };
            }

            const pileIndex = source.pileIndex as number;
            const column = previous.tableau[pileIndex].slice(0, -1);
            if (column.length && !column[column.length - 1].faceUp) {
                column[column.length - 1] = withFaceUp(column[column.length - 1], true);
            }
            const tableau = previous.tableau.map((existing, index) => (index === pileIndex ? column : existing));

            return { ...previous, tableau, foundations };
        });
    };

    const handleDrop = (source: DragSource, destination: DropTarget) => {
        setBoard(previous => {
            let movingCards: Card[];
            let waste = previous.waste;
            let tableau = previous.tableau;

            if (source.type === 'waste') {
                if (!previous.waste.length) return previous;
                movingCards = [previous.waste[previous.waste.length - 1]];
            } else {
                const pileIndex = source.pileIndex as number;
                const cardIndex = source.cardIndex as number;
                const column = previous.tableau[pileIndex];
                movingCards = column.slice(cardIndex);
                if (!movingCards.length || !movingCards[0].faceUp) return previous;
            }

            const firstCard = movingCards[0];

            if (destination.type === 'foundation') {
                if (movingCards.length !== 1 || firstCard.suit !== destination.suit) return previous;
                const foundationPile = previous.foundations[destination.suit as Suit];
                const topRank = foundationPile.length ? foundationPile[foundationPile.length - 1].rank : 0;
                if (firstCard.rank !== topRank + 1) return previous;

                if (source.type === 'waste') {
                    waste = previous.waste.slice(0, -1);
                } else {
                    const pileIndex = source.pileIndex as number;
                    tableau = previous.tableau.map((existing, index) =>
                        index === pileIndex ? existing.slice(0, (source.cardIndex as number)) : existing
                    );
                }

                const foundations = {
                    ...previous.foundations,
                    [destination.suit as Suit]: [...foundationPile, firstCard]
                };

                if (source.type === 'tableau') {
                    const pileIndex = source.pileIndex as number;
                    const column = [...tableau[pileIndex]];
                    if (column.length && !column[column.length - 1].faceUp) {
                        column[column.length - 1] = withFaceUp(column[column.length - 1], true);
                    }
                    tableau = tableau.map((existing, index) => (index === pileIndex ? column : existing));
                }

                return { ...previous, waste, tableau, foundations };
            }

            if (destination.type === 'tableau' && destination.pileIndex !== undefined) {
                const destColumn = previous.tableau[destination.pileIndex];

                if (destColumn.length === 0) {
                    if (firstCard.rank !== 13) return previous;
                } else {
                    const top = destColumn[destColumn.length - 1];
                    if (suitColor(top.suit) === suitColor(firstCard.suit)) return previous;
                    if (top.rank !== firstCard.rank + 1) return previous;
                }

                if (source.type === 'waste') {
                    waste = previous.waste.slice(0, -1);
                } else {
                    const pileIndex = source.pileIndex as number;
                    tableau = previous.tableau.map((existing, index) =>
                        index === pileIndex ? existing.slice(0, (source.cardIndex as number)) : existing
                    );
                }

                tableau = tableau.map((existing, index) =>
                    index === destination.pileIndex ? [...existing, ...movingCards] : existing
                );

                if (source.type === 'tableau') {
                    const pileIndex = source.pileIndex as number;
                    const column = [...tableau[pileIndex]];
                    if (column.length && !column[column.length - 1].faceUp) {
                        column[column.length - 1] = withFaceUp(column[column.length - 1], true);
                    }
                    tableau = tableau.map((existing, index) => (index === pileIndex ? column : existing));
                }

                return { ...previous, waste, tableau };
            }

            return previous;
        });
    };

    React.useEffect(() => {
        if (getTotalFoundationCards(board.foundations) === 52) {
            const timer = setTimeout(() => setStatus('You win!'), 0);
            return () => clearTimeout(timer);
        }
    }, [board.foundations]);

    const onDragStart = (event: React.DragEvent, source: DragSource) => {
        event.dataTransfer.setData('text/plain', JSON.stringify(source));
    };

    const onDropTo = (event: React.DragEvent, destination: DropTarget) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData('text/plain');
        if (!raw) return;
        handleDrop(JSON.parse(raw) as DragSource, destination);
    };

    return (
        <div className="sol98-shell">
            <div className="sol98-toolbar">
                <button onClick={newGame}>New Game</button>
                <span className="sol98-status">{status}</span>
            </div>

            <div className="sol98-board">
                <div className="sol98-row">
                    <div className="sol98-pile" onClick={drawStock}>
                        {board.stock.length ? (
                            <div className="sol98-card sol98-card-back" />
                        ) : (
                            <div className="sol98-placeholder">↺</div>
                        )}
                    </div>

                    <div className="sol98-pile" onDragOver={event => event.preventDefault()}>
                        {board.waste.length > 0 && (() => {
                            const card = board.waste[board.waste.length - 1];
                            const wasteSource: DragSource = { type: 'waste' };
                            const active = isSelected(wasteSource);
                            return (
                                <div
                                    className={`sol98-card sol98-card-${suitColor(card.suit)} ${active ? 'sol98-card-selected' : ''}`}
                                    draggable
                                    onDragStart={event => onDragStart(event, wasteSource)}
                                    onClick={e => handleCardTap(wasteSource, e)}
                                    onDoubleClick={() => tryAutoFoundation(wasteSource)}
                                >
                                    <div className="sol98-corner">{rankLabel(card.rank)}{card.suit}</div>
                                    <div className="sol98-center">{card.suit}</div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="sol98-spacer" />

                    {SUITS.map(suit => {
                        const pile = board.foundations[suit];
                        const topCard = pile[pile.length - 1];
                        return (
                            <div
                                key={suit}
                                className="sol98-pile"
                                onDragOver={event => event.preventDefault()}
                                onDrop={event => onDropTo(event, { type: 'foundation', suit })}
                                onClick={() => handlePileTap({ type: 'foundation', suit })}
                            >
                                {topCard ? (
                                    <div className={`sol98-card sol98-card-${suitColor(topCard.suit)}`}>
                                        <div className="sol98-corner">{rankLabel(topCard.rank)}{topCard.suit}</div>
                                        <div className="sol98-center">{topCard.suit}</div>
                                    </div>
                                ) : (
                                    <div className="sol98-placeholder">{suit}</div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="sol98-row">
                    {board.tableau.map((column, columnIndex) => (
                        <div
                            key={`column-${columnIndex}`}
                            className="sol98-pile sol98-pile-tableau"
                            onDragOver={event => event.preventDefault()}
                            onDrop={event => onDropTo(event, { type: 'tableau', pileIndex: columnIndex })}
                            onClick={() => {
                                if (column.length === 0) {
                                    handlePileTap({ type: 'tableau', pileIndex: columnIndex });
                                }
                            }}
                        >
                            {column.map((card, cardIndex) => {
                                const cardSource: DragSource = { type: 'tableau', pileIndex: columnIndex, cardIndex };
                                const active = card.faceUp && isSelected(cardSource);
                                return (
                                    <div
                                        key={`${card.suit}-${card.rank}`}
                                        className={`sol98-card ${card.faceUp ? `sol98-card-${suitColor(card.suit)}` : 'sol98-card-back'} ${active ? 'sol98-card-selected' : ''}`}
                                        style={{ top: `${cardIndex * 20}px`, zIndex: cardIndex }}
                                        draggable={card.faceUp}
                                        onDragStart={event => onDragStart(event, cardSource)}
                                        onClick={e => card.faceUp && handleCardTap(cardSource, e)}
                                        onDoubleClick={() => card.faceUp && tryAutoFoundation(cardSource)}
                                    >
                                        {card.faceUp && (
                                            <>
                                                <div className="sol98-corner">{rankLabel(card.rank)}{card.suit}</div>
                                                <div className="sol98-center">{card.suit}</div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Solitaire;
