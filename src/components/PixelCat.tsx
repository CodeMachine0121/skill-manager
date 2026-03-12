export function PixelCat({ text = "Processing..." }: { text?: string }) {
  return (
    <div className="loading-container">
      <div className="pixel-cat-track">
        <div className="pixel-cat">
          <div className="pixel-cat-frame pixel-cat-frame1">
            {/* Frame 1 - cat running pose 1 */}
            <div className="pixel" style={{ left: 4, top: 0 }} />
            <div className="pixel" style={{ left: 8, top: 0 }} />
            <div className="pixel" style={{ left: 0, top: 4 }} />
            <div className="pixel" style={{ left: 4, top: 4 }} />
            <div className="pixel" style={{ left: 8, top: 4 }} />
            <div className="pixel" style={{ left: 12, top: 4 }} />
            <div className="pixel" style={{ left: 4, top: 8 }} />
            <div className="pixel" style={{ left: 8, top: 8 }} />
            <div className="pixel" style={{ left: 0, top: 12 }} />
            <div className="pixel" style={{ left: 12, top: 12 }} />
          </div>
          <div className="pixel-cat-frame pixel-cat-frame2">
            {/* Frame 2 - cat running pose 2 */}
            <div className="pixel" style={{ left: 4, top: 0 }} />
            <div className="pixel" style={{ left: 8, top: 0 }} />
            <div className="pixel" style={{ left: 0, top: 4 }} />
            <div className="pixel" style={{ left: 4, top: 4 }} />
            <div className="pixel" style={{ left: 8, top: 4 }} />
            <div className="pixel" style={{ left: 12, top: 4 }} />
            <div className="pixel" style={{ left: 4, top: 8 }} />
            <div className="pixel" style={{ left: 8, top: 8 }} />
            <div className="pixel" style={{ left: 4, top: 12 }} />
            <div className="pixel" style={{ left: 8, top: 12 }} />
          </div>
        </div>
      </div>
      <span className="loading-text">{text}</span>
    </div>
  );
}
