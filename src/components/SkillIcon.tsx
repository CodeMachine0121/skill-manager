const COLOR_THEMES = [
  { bg: "rgba(59, 130, 246, 0.12)", fg: "#60A5FA" },   // blue
  { bg: "rgba(168, 85, 247, 0.12)", fg: "#C084FC" },   // purple
  { bg: "rgba(236, 72, 153, 0.12)", fg: "#F472B6" },   // pink
  { bg: "rgba(245, 158, 11, 0.12)", fg: "#FBBF24" },   // amber
  { bg: "rgba(16, 185, 129, 0.12)", fg: "#34D399" },   // emerald
  { bg: "rgba(6, 182, 212, 0.12)", fg: "#22D3EE" },    // cyan
  { bg: "rgba(239, 68, 68, 0.12)", fg: "#F87171" },    // red
  { bg: "rgba(132, 204, 22, 0.12)", fg: "#A3E635" },   // lime
] as const;

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface SkillIconProps {
  name: string;
  size?: number;
}

export function SkillIcon({ name, size = 40 }: SkillIconProps) {
  const theme = COLOR_THEMES[hashName(name) % COLOR_THEMES.length];
  const letter = (name[0] ?? "?").toUpperCase();
  const fontSize = Math.round(size * 0.45);

  return (
    <div
      className="skill-icon"
      style={{
        width: size,
        height: size,
        background: theme.bg,
        color: theme.fg,
        fontSize,
        borderRadius: Math.round(size * 0.2),
      }}
      aria-hidden="true"
    >
      {letter}
    </div>
  );
}
