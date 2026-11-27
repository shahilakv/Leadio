// Re-mounts on every tab change, so each screen fades in softly (see .page-in in globals.css).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
