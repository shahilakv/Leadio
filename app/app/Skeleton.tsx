// Placeholder shown instantly while a tab's data loads (used by the loading.tsx files).
export default function Skeleton({ title, tiles = false, cards = 3 }: { title: string; tiles?: boolean; cards?: number }) {
  return (
    <div aria-busy="true" aria-label={`Loading ${title}`}>
      <div className="hd"><div className="grow h1">{title}</div></div>
      {tiles && <div className="tiles">{[0, 1, 2].map(i => <div key={i} className="tile sk" />)}</div>}
      <div className="list" style={{ marginTop: 14 }}>
        {Array.from({ length: cards }, (_, i) => <div key={i} className="lc sk" style={{ height: 210 }} />)}
      </div>
    </div>
  );
}
