"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

type Position = {
  row: number;
  col: number;
};

type Piece = {
  type: string;
  color: 'white' | 'black';
  hasMoved?: boolean;  // For castling and pawn first move
  enPassantVulnerable?: boolean;  // For en passant
};

type Board = (Piece | null)[][];

type GameState = {
  board: Board;
  isWhiteTurn: boolean;
  moveHistory: string[];
  whiteKingPosition: Position;
  blackKingPosition: Position;
  isCheck: boolean;
  isCheckmate: boolean;
  lastMove?: {
    from: Position;
    to: Position;
    piece: Piece;
  };
  remainingMoves: { [key: string]: number };
};

const INITIAL_BOARD: Board = [
  [
    { type: 'r', color: 'black' }, { type: 'n', color: 'black' }, { type: 'b', color: 'black' }, 
    { type: 'q', color: 'black' }, { type: 'k', color: 'black' }, { type: 'b', color: 'black' }, 
    { type: 'n', color: 'black' }, { type: 'r', color: 'black' }
  ],
  Array(8).fill(null).map(() => ({ type: 'p', color: 'black' })),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null).map(() => ({ type: 'P', color: 'white' })),
  [
    { type: 'R', color: 'white' }, { type: 'N', color: 'white' }, { type: 'B', color: 'white' }, 
    { type: 'Q', color: 'white' }, { type: 'K', color: 'white' }, { type: 'B', color: 'white' }, 
    { type: 'N', color: 'white' }, { type: 'R', color: 'white' }
  ]
];

const ChessSlotShooter: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: INITIAL_BOARD,
    isWhiteTurn: true,
    moveHistory: [],
    whiteKingPosition: { row: 7, col: 4 },
    blackKingPosition: { row: 0, col: 4 },
    isCheck: false,
    isCheckmate: false,
    remainingMoves: {}
  });
  const [slotPieces, setSlotPieces] = useState<(string | null)[]>([null, null, null]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [hasSpunOnce, setHasSpunOnce] = useState(false);

  // Function to check if a piece can attack a square
  const canPieceAttackSquare = (from: Position, to: Position, board: Board): boolean => {
    return isValidMove(from, to, board);
  };

  // Check if a king is in check
  const isKingInCheck = (board: Board, color: 'white' | 'black', kingPos?: Position): boolean => {
    const pos = kingPos || (color === 'white' ? gameState.whiteKingPosition : gameState.blackKingPosition);
    
    // Check all opponent pieces to see if they can attack the king
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color !== color) {
          if (canPieceAttackSquare({ row, col }, pos, board)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const isCheckmate = (color: 'white' | 'black', board: Board = gameState.board): boolean => {
    // First check if the king is in check
    if (!isKingInCheck(board, color)) {
      return false;
    }

    // Try all possible moves for all pieces of the given color
    for (let fromRow = 0; fromRow < 8; fromRow++) {
      for (let fromCol = 0; fromCol < 8; fromCol++) {
        const piece = board[fromRow][fromCol];
        if (piece && piece.color === color) {
          // Try all possible destination squares
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              const from = { row: fromRow, col: fromCol };
              const to = { row: toRow, col: toCol };
              
              // Check if this is a valid move that gets us out of check
              if (isValidMove(from, to) && !wouldBeInCheck(from, to)) {
                return false;
              }
            }
          }
        }
      }
    }
    
    // If we haven't found any valid moves, it's checkmate
    return true;
  };

  const isValidMove = (from: Position, to: Position, boardToCheck: Board = gameState.board): boolean => {
    const piece = boardToCheck[from.row][from.col];
    const targetPiece = boardToCheck[to.row][to.col];

    console.log('Checking move validity:', {
      from,
      to,
      piece,
      targetPiece,
      pieceType: piece?.type?.toLowerCase(),
      dx: Math.abs(to.col - from.col),
      dy: Math.abs(to.row - from.row)
    });

    if (!piece) {
      console.log('Move invalid: No piece at source position');
      return false;
    }
    
    // Check if target square has a piece of the same color
    if (targetPiece && targetPiece.color === piece.color) {
      console.log('Move invalid: Cannot capture piece of same color');
      return false;
    }

    // Determine move direction based on piece color
    const direction = piece.color === 'white' ? -1 : 1;

    switch (piece.type.toLowerCase()) {
      case 'p': // Pawn
        const pawnMove = checkPawnMove({
          regularMove: to.col === from.col && to.row === from.row + direction && !targetPiece,
          initialTwoSquareMove: !piece.hasMoved && to.col === from.col && 
            to.row === from.row + 2 * direction && 
            !targetPiece && 
            !boardToCheck[from.row + direction][from.col],
          capture: Math.abs(to.col - from.col) === 1 && to.row === from.row + direction && !!targetPiece,
          enPassant: !!gameState.lastMove && 
            gameState.lastMove.piece.type.toLowerCase() === 'p' &&
            gameState.lastMove.piece.color !== piece.color &&
            gameState.lastMove.from.row === (piece.color === 'white' ? 1 : 6) &&
            gameState.lastMove.to.row === from.row &&
            gameState.lastMove.to.col === to.col
        });
        console.log('Pawn move check:', {
          regularMove: to.col === from.col && to.row === from.row + direction && !targetPiece,
          initialTwoSquareMove: !piece.hasMoved && to.col === from.col && 
            to.row === from.row + 2 * direction && 
            !targetPiece && 
            !boardToCheck[from.row + direction][from.col],
          capture: Math.abs(to.col - from.col) === 1 && to.row === from.row + direction && !!targetPiece,
          enPassant: !!gameState.lastMove && 
            gameState.lastMove.piece.type.toLowerCase() === 'p' &&
            gameState.lastMove.piece.color !== piece.color &&
            gameState.lastMove.from.row === (piece.color === 'white' ? 1 : 6) &&
            gameState.lastMove.to.row === from.row &&
            gameState.lastMove.to.col === to.col,
          result: pawnMove
        });
        return pawnMove;

      case 'n': // Knight
        const knightMove = (Math.abs(to.col - from.col) === 2 && Math.abs(to.row - from.row) === 1) || 
               (Math.abs(to.col - from.col) === 1 && Math.abs(to.row - from.row) === 2);
        console.log('Knight move check:', {
          dx: Math.abs(to.col - from.col),
          dy: Math.abs(to.row - from.row),
          isValid: knightMove
        });
        return knightMove;

      case 'b': // Bishop
        const bishopMove = Math.abs(to.col - from.col) === Math.abs(to.row - from.row) && !hasObstaclesBetween(from, to, boardToCheck);
        console.log('Bishop move check:', {
          dx: Math.abs(to.col - from.col),
          dy: Math.abs(to.row - from.row),
          hasObstacles: hasObstaclesBetween(from, to, boardToCheck),
          isValid: bishopMove
        });
        return bishopMove;

      case 'r': // Rook
        const rookMove = (from.row === to.row || from.col === to.col) && !hasObstaclesBetween(from, to, boardToCheck);
        console.log('Rook move check:', {
          sameRow: from.row === to.row,
          sameCol: from.col === to.col,
          hasObstacles: hasObstaclesBetween(from, to, boardToCheck),
          isValid: rookMove
        });
        return rookMove;

      case 'q': // Queen
        const queenMove = ((from.row === to.row || from.col === to.col) || 
                Math.abs(to.col - from.col) === Math.abs(to.row - from.row)) && 
                !hasObstaclesBetween(from, to, boardToCheck);
        console.log('Queen move check:', {
          straightLine: from.row === to.row || from.col === to.col,
          diagonal: Math.abs(to.col - from.col) === Math.abs(to.row - from.row),
          hasObstacles: hasObstaclesBetween(from, to, boardToCheck),
          isValid: queenMove
        });
        return queenMove;

      case 'k': // King
        console.log('King move check:', {
          dx: Math.abs(to.col - from.col),
          dy: Math.abs(to.row - from.row),
          hasMoved: piece.hasMoved
        });
        // Normal king move
        if (Math.abs(to.col - from.col) <= 1 && Math.abs(to.row - from.row) <= 1) {
          return true;
        }
        
        // Castling
        if (!piece.hasMoved && Math.abs(to.col - from.col) === 2 && from.row === to.row) {
          const isKingSide = to.col > from.col;
          const rookFromCol = isKingSide ? 7 : 0;
          const rookRow = from.row;
          const rook = boardToCheck[rookRow][rookFromCol];
          
          if (rook && rook.type.toLowerCase() === 'r' && !rook.hasMoved) {
            // Check if path is clear
            const pathStart = Math.min(from.col, rookFromCol) + 1;
            const pathEnd = Math.max(from.col, rookFromCol);
            
            for (let col = pathStart; col < pathEnd; col++) {
              if (boardToCheck[rookRow][col]) return false;
              // Check if any square in the king's path is under attack
              if (isKingInCheck(boardToCheck, piece.color, { row: rookRow, col })) return false;
            }
            
            return true;
          }
        }
        return false;

      default:
        console.log('Unknown piece type:', piece.type);
        return false;
    }
  };

  interface PawnMoveParams {
    regularMove: boolean;
    initialTwoSquareMove: boolean;
    capture: boolean;
    enPassant: boolean;
  }

  const checkPawnMove = ({ regularMove, initialTwoSquareMove, capture, enPassant }: PawnMoveParams): boolean => {
    if (regularMove) return true;
    if (initialTwoSquareMove) return true;
    if (capture) return true;
    if (enPassant) return true;
    return false;
  };

  // Check if a move would put or leave own king in check
  const wouldBeInCheck = (from: Position, to: Position): boolean => {
    const newBoard = gameState.board.map(row => [...row]);
    const movingPiece = newBoard[from.row][from.col];
    if (!movingPiece) return true;

    // Make temporary move
    newBoard[to.row][to.col] = movingPiece;
    newBoard[from.row][from.col] = null;

    // If moving the king, check the destination square
    if (movingPiece.type.toLowerCase() === 'k') {
      return isKingInCheck(newBoard, movingPiece.color, to);
    } else {
      // For other pieces, only check if the move exposes the king to check
      return isKingInCheck(
        newBoard, 
        movingPiece.color, 
        movingPiece.color === 'white' ? gameState.whiteKingPosition : gameState.blackKingPosition
      );
    }
  };

  const hasObstaclesBetween = (from: Position, to: Position, board: Board): boolean => {
    const dx = to.col - from.col;
    const dy = to.row - from.row;
    const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
    
    let currentRow = from.row + stepY;
    let currentCol = from.col + stepX;
    
    const obstacles: Position[] = [];
    
    // Check if we're still within board boundaries and haven't reached the target
    while (
      currentRow >= 0 && currentRow < 8 && 
      currentCol >= 0 && currentCol < 8 && 
      (currentRow !== to.row || currentCol !== to.col)
    ) {
      if (board[currentRow][currentCol] !== null) {
        obstacles.push({ row: currentRow, col: currentCol });
      }
      currentRow += stepY;
      currentCol += stepX;
    }
    
    if (obstacles.length > 0) {
      return true;
    }
    return false;
  };

  const getValidMoves = (pos: Position): Position[] => {
    const moves: Position[] = [];
    const piece = gameState.board[pos.row][pos.col];
    
    console.log('Getting valid moves for:', {
      position: pos,
      piece: piece?.type,
      color: piece?.color,
      isWhiteTurn: gameState.isWhiteTurn,
      hasSpunOnce: hasSpunOnce,
      remainingMoves: gameState.remainingMoves
    });

    if (!piece || (piece.color === 'white' && !gameState.isWhiteTurn) || 
        (piece.color === 'black' && gameState.isWhiteTurn)) {
      console.log('No valid moves: Wrong turn or no piece');
      return moves;
    }

    // Before first spin, only pawns can move
    if (!hasSpunOnce && gameState.isWhiteTurn && piece.type.toLowerCase() !== 'p') {
      console.log('No valid moves: Must move pawn before first spin');
      return moves;
    }

    // After spinning, check if piece type has remaining moves
    if (hasSpunOnce) {
      const pieceType = piece.type.toUpperCase();
      if (!gameState.remainingMoves[pieceType] || gameState.remainingMoves[pieceType] <= 0) {
        console.log('No valid moves: No remaining moves for this piece type');
        return moves;
      }
    }

    // Check all possible squares on the board
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (isValidMove(pos, { row, col })) {
          moves.push({ row, col });
        }
      }
    }

    console.log('Found valid moves:', moves);
    return moves;
  };

  const handleSquareClick = (row: number, col: number) => {
    const piece = gameState.board[row][col];
    console.log('Square clicked:', {
      row,
      col,
      piece,
      selectedPosition,
      validMoves,
      isWhiteTurn: gameState.isWhiteTurn
    });

    if (selectedPosition) {
      const move = validMoves.find(m => m.row === row && m.col === col);
      console.log('Attempting move:', { move, validMoves });
      
      if (move) {
        handleMove(selectedPosition, move);
        setSelectedPosition(null);
        setValidMoves([]);
      } else {
        // Select new piece if it's the current player's turn
        if (piece && ((piece.color === 'white' && gameState.isWhiteTurn) || 
            (piece.color === 'black' && !gameState.isWhiteTurn))) {
          console.log('Selecting new piece');
          setSelectedPosition({ row, col });
          const newValidMoves = getValidMoves({ row, col });
          console.log('New valid moves:', newValidMoves);
          setValidMoves(newValidMoves);
        } else {
          console.log('Deselecting piece');
          setSelectedPosition(null);
          setValidMoves([]);
        }
      }
    } else {
      if (piece && ((piece.color === 'white' && gameState.isWhiteTurn) || 
          (piece.color === 'black' && !gameState.isWhiteTurn))) {
        console.log('Initial piece selection');
        setSelectedPosition({ row, col });
        const newValidMoves = getValidMoves({ row, col });
        console.log('Initial valid moves:', newValidMoves);
        setValidMoves(newValidMoves);
      }
    }
  };

  const handleMove = (from: Position, to: Position) => {
    console.log('Handling move:', { from, to });
    const piece = gameState.board[from.row][from.col];
    if (!piece) {
      console.log('No piece at source position');
      return;
    }

    const validMoves = getValidMoves(from);
    const isValidMove = validMoves.some(move => move.row === to.row && move.col === to.col);
    console.log('Move validation:', { validMoves, isValidMove });
    
    if (!isValidMove) {
      console.log('Invalid move');
      return;
    }

    // Create new board state
    const newBoard = gameState.board.map(row => [...row]);
    const capturedPiece = newBoard[to.row][to.col];
    console.log('Move details:', {
      piece,
      capturedPiece,
      from,
      to
    });

    newBoard[to.row][to.col] = { ...piece, hasMoved: true };
    newBoard[from.row][from.col] = null;

    // Update king positions if king moved
    let newWhiteKingPos = gameState.whiteKingPosition;
    let newBlackKingPos = gameState.blackKingPosition;
    if (piece.type.toLowerCase() === 'k') {
      if (piece.color === 'white') {
        newWhiteKingPos = { ...to };
      } else {
        newBlackKingPos = { ...to };
      }
    }

    // Handle castling
    if (piece.type.toLowerCase() === 'k' && Math.abs(from.col - to.col) === 2) {
      const isKingSide = to.col > from.col;
      const rookFromCol = isKingSide ? 7 : 0;
      const rookToCol = isKingSide ? 5 : 3;
      const rookRow = from.row;
      
      const rook = newBoard[rookRow][rookFromCol];
      if (rook && rook.type.toLowerCase() === 'r') {
        newBoard[rookRow][rookToCol] = { ...rook, hasMoved: true };
        newBoard[rookRow][rookFromCol] = null;
      }
    }

    // Update remaining moves
    const newRemainingMoves = { ...gameState.remainingMoves };
    if (hasSpunOnce) {
      const pieceType = piece.type.toUpperCase();
      if (newRemainingMoves[pieceType]) {
        newRemainingMoves[pieceType]--;
      }
    }

    // Check if we should change turns
    let shouldChangeTurn = false;
    
    if (!hasSpunOnce) {
      // Before first spin: change turn after any move
      shouldChangeTurn = true;
    } else {
      // After spin: check if all moves are used
      const hasRemainingMoves = Object.values(newRemainingMoves).some(moves => moves > 0);
      shouldChangeTurn = !hasRemainingMoves;
    }

    // Update game state
    setGameState(prev => ({
      ...prev,
      board: newBoard,
      isWhiteTurn: shouldChangeTurn ? !prev.isWhiteTurn : prev.isWhiteTurn,
      whiteKingPosition: newWhiteKingPos,
      blackKingPosition: newBlackKingPos,
      lastMove: {
        from,
        to,
        piece
      },
      remainingMoves: newRemainingMoves
    }));

    // Reset selection
    setSelectedPosition(null);
    setValidMoves([]);

    // Reset spin state and clear slots if turn changes
    if (shouldChangeTurn) {
      setHasSpunOnce(false);
      setSlotPieces([null, null, null]);
    }

    console.log('Move completed:', {
      shouldChangeTurn,
      hasRemainingMoves: Object.values(newRemainingMoves).some(moves => moves > 0),
      newRemainingMoves
    });
  };

  const handleEndTurn = () => {
    setGameState(prev => ({
      ...prev,
      isWhiteTurn: !prev.isWhiteTurn,
      remainingMoves: {}
    }));
    setHasSpunOnce(false); // Reset spin state for next turn
    setSlotPieces([null, null, null]); // Clear slot pieces
  };

  const getAlivePieces = (color: 'white' | 'black'): string[] => {
    const pieces = new Set<string>();
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = gameState.board[row][col];
        if (piece && piece.color === color && piece.type.toLowerCase() !== 'k') {
          pieces.add(piece.type.toUpperCase());
        }
      }
    }
    
    return Array.from(pieces);
  };

  const handleSpin = () => {
    if (isSpinning || hasSpunOnce) return;
    
    setIsSpinning(true);
    const spinDuration = 2000;
    
    // Get available pieces based on current player
    const availablePieces = getAlivePieces(gameState.isWhiteTurn ? 'white' : 'black');
    
    // If no pieces available (other than king), end turn
    if (availablePieces.length === 0) {
      setIsSpinning(false);
      handleEndTurn();
      return;
    }
    
    const spinInterval = setInterval(() => {
      setSlotPieces(prev => prev.map(() => availablePieces[Math.floor(Math.random() * availablePieces.length)]));
    }, 100);

    setTimeout(() => {
      clearInterval(spinInterval);
      setIsSpinning(false);
      setHasSpunOnce(true);
      
      // Generate final slot pieces from available pieces
      const finalPieces = Array(3).fill(null).map(() => 
        availablePieces[Math.floor(Math.random() * availablePieces.length)]
      );
      setSlotPieces(finalPieces);

      // Count remaining moves for each piece type
      const remainingMoves = finalPieces.reduce((acc, piece) => {
        acc[piece] = (acc[piece] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      setGameState(prev => ({
        ...prev,
        remainingMoves
      }));
    }, spinDuration);
  };

  const canMakeAnyMove = (): boolean => {
    // Before spin, check if any pawn can move for white's turn
    if (!hasSpunOnce && gameState.isWhiteTurn) {
      for (let col = 0; col < 8; col++) {
        for (let row = 0; row < 8; row++) {
          const piece = gameState.board[row][col];
          if (piece && piece.color === 'white' && piece.type.toLowerCase() === 'p') {
            if (getValidMoves({ row, col }).length > 0) {
              return true;
            }
          }
        }
      }
      return false;
    }

    // After spin for either player, check if any piece with remaining moves can move
    if (hasSpunOnce) {
      for (let col = 0; col < 8; col++) {
        for (let row = 0; row < 8; row++) {
          const piece = gameState.board[row][col];
          if (piece && 
              ((gameState.isWhiteTurn && piece.color === 'white') || 
               (!gameState.isWhiteTurn && piece.color === 'black'))) {
            const pieceType = piece.type.toUpperCase();
            if (gameState.remainingMoves[pieceType] && gameState.remainingMoves[pieceType] > 0) {
              if (getValidMoves({ row, col }).length > 0) {
                return true;
              }
            }
          }
        }
      }
      return false;
    }

    // Before spin for black's turn, all pieces can move
    if (!hasSpunOnce && !gameState.isWhiteTurn) {
      for (let col = 0; col < 8; col++) {
        for (let row = 0; row < 8; row++) {
          const piece = gameState.board[row][col];
          if (piece && piece.color === 'black') {
            if (getValidMoves({ row, col }).length > 0) {
              return true;
            }
          }
        }
      }
    }

    return false;
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="grid grid-rows-8 w-[560px] h-[560px] border-2 border-[#8b4513]">
        {gameState.board.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-8">
            {row.map((piece, colIndex) => {
              const isLight = (rowIndex + colIndex) % 2 === 0;
              const isSelected = selectedPosition?.row === rowIndex && selectedPosition?.col === colIndex;
              const isValidMove = validMoves.some(move => move.row === rowIndex && move.col === colIndex);
              const isMoveable = piece && (
                (gameState.isWhiteTurn && piece.color === 'white' && (
                  (!hasSpunOnce && piece.type.toLowerCase() === 'p') ||
                  (hasSpunOnce && gameState.remainingMoves[piece.type.toUpperCase()] && gameState.remainingMoves[piece.type.toUpperCase()] > 0)
                )) ||
                (!gameState.isWhiteTurn && piece.color === 'black')
              );

              return (
                <button
                  key={colIndex}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  className={`
                    w-[70px] h-[70px] flex items-center justify-center text-4xl
                    ${isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
                    ${isSelected ? 'ring-4 ring-blue-400' : ''}
                    ${isValidMove ? 'ring-4 ring-green-400' : ''}
                    ${isMoveable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                  `}
                >
                  {piece && (
                    <span className={piece.color === 'white' ? 'text-white' : 'text-black'}>
                      {piece.type}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 mt-8">
        <div className="flex gap-4 items-center">
          <div className="grid grid-cols-3 gap-4">
            {slotPieces.map((piece, index) => (
              <div
                key={index}
                className="w-16 h-16 bg-gray-200 flex items-center justify-center text-2xl border-2 border-gray-400 rounded"
              >
                {piece && (
                  <div className="relative">
                    <span>{piece}</span>
                    {hasSpunOnce && (
                      <span className="absolute -top-3 -right-3 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        {gameState.remainingMoves[piece] || 0}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {!hasSpunOnce ? (
            <Button 
              onClick={handleSpin}
              disabled={isSpinning}
              className={`px-8 py-2 text-xl ${isSpinning ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#7b61ff] hover:bg-[#6346ff]'}`}
            >
              Spin
            </Button>
          ) : (
            <Button
              onClick={handleEndTurn}
              className="px-8 py-2 text-xl bg-[#ff6b6b] hover:bg-[#ff5252]"
            >
              End Turn
            </Button>
          )}
          {!canMakeAnyMove() && (
            <div className="text-red-500 font-bold">
              No valid moves available. {hasSpunOnce ? 'End your turn' : 'Spin or end your turn'}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-2xl font-bold">
        <div className={`
          px-4 py-2 rounded
          ${gameState.isWhiteTurn 
            ? 'bg-white text-black border-2 border-black' 
            : 'bg-black text-white border-2 border-white'}
        `}>
          {gameState.isWhiteTurn ? "White's Turn" : "Black's Turn"}
        </div>
      </div>
      {gameState.isCheck && <div className="text-2xl font-bold text-red-500">Check!</div>}
      {gameState.isCheckmate && <div className="text-2xl font-bold text-red-500">Checkmate!</div>}
    </div>
  );
};

export default ChessSlotShooter;