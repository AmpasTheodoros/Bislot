'use client';

import dynamic from 'next/dynamic';

const ChessSlotShooter = dynamic(() => import('./Chessboard'), {
  ssr: false,
});

export default function ClientChessWrapper() {
  return <ChessSlotShooter />;
}
