import useInstallPrompt from "./useInstallPrompt";
import useTheme from "./useTheme";

const icon = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const SunIcon = () => (
  <svg {...icon}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);

const MoonIcon = () => (
  <svg {...icon}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>
);

const DownloadIcon = () => (
  <svg {...icon} width={16} height={16}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
);

export function InstallButton() {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <button type="button" className="studio-button studio-button-sm" onClick={install}>
      <DownloadIcon />
      Install app
    </button>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="studio-icon-button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export default function AppControls() {
  return (
    <div className="studio-actions">
      <InstallButton />
      <ThemeToggle />
    </div>
  );
}
