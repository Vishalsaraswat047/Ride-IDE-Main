import { useEffect, useState } from "react";
import { Download, AlertCircle, X, Loader2, RotateCcw, Radio, Shield, Zap, Settings } from "lucide-react";

export function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<{ version: string; channel?: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<"stable" | "beta" | "alpha">("stable");
  const [showChannelSelector, setShowChannelSelector] = useState(false);

  useEffect(() => {
    const handleAvailable = (_: any, info: { version: string; channel?: string }) => setUpdateInfo(info);
    const handleProgress = (_: any, p: { percent: number }) => setProgress(p.percent);
    const handleChecking = () => setChecking(true);
    const handleNotAvailable = () => { setChecking(false); setProgress(null); };
    const handleError = () => { setChecking(false); };

    window.addEventListener("update:available", handleAvailable as EventListener);
    window.addEventListener("update:progress", handleProgress as EventListener);
    window.addEventListener("update:checking", handleChecking);
    window.addEventListener("update:not-available", handleNotAvailable);
    window.addEventListener("update:error", handleError);

    // Load current channel
    window.ride.app.getReleaseChannel().then(setCurrentChannel).catch(() => {});

    return () => {
      window.removeEventListener("update:available", handleAvailable as EventListener);
      window.removeEventListener("update:progress", handleProgress as EventListener);
      window.removeEventListener("update:checking", handleChecking);
      window.removeEventListener("update:not-available", handleNotAvailable);
      window.removeEventListener("update:error", handleError);
    };
  }, []);

  const handleCheckUpdates = async () => {
    setChecking(true);
    try {
      const result = await window.ride.app.checkForUpdates();
      if (!result.available) {
        setTimeout(() => setChecking(false), 2000);
      }
    } catch {
      setChecking(false);
    }
  };

  const handleChangeChannel = async (channel: "stable" | "beta" | "alpha") => {
    try {
      await window.ride.app.setReleaseChannel(channel);
      setCurrentChannel(channel);
      setShowChannelSelector(false);
      setTimeout(() => window.ride.app.checkForUpdates(), 500);
    } catch (e) {
      console.error("Failed to change channel:", e);
    }
  };

  if (!updateInfo && !checking && !showChannelSelector) return null;

  // Channel selector dropdown
  if (showChannelSelector) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="rounded-lg border border-hairline bg-canvas p-2 shadow-xl min-w-[200px]">
          <div className="flex items-center gap-2 px-2 py-2 border-b border-hairline">
            <Settings className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-body">Update Channel</span>
          </div>
          <div className="py-1">
            {(["stable", "beta", "alpha"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => handleChangeChannel(ch)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-canvas-soft ${currentChannel === ch ? "bg-primary/10 text-primary" : "text-body"}`}
              >
                <Radio className={`h-4 w-4 ${currentChannel === ch ? "text-primary" : "text-mute"}`} />
                <span className="capitalize">{ch}</span>
                {ch === "stable" && <span title="Recommended for production"><Shield className="h-3 w-3 text-success ml-auto" /></span>}
                {ch === "beta" && <span title="Early access features"><Zap className="h-3 w-3 text-warning ml-auto" /></span>}
                {ch === "alpha" && <span className="text-xs px-1.5 py-0.5 rounded bg-error/10 text-error ml-auto">Experimental</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main update banner
  if (updateInfo || checking) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-primary/50 bg-primary/10 p-3 shadow-xl animate-in slide-in-from-bottom-4 max-w-md">
        <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {checking && !updateInfo ? (
            <div className="flex items-center gap-2 text-sm text-body">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Checking for updates...</span>
            </div>
          ) : updateInfo ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-body">
                Update to v{updateInfo.version} {updateInfo.channel && <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary ml-2">{updateInfo.channel}</span>}
              </span>
              {progress !== null && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 rounded-full bg-canvas overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  <span className="text-xs text-mute w-10 text-right">{Math.round(progress)}%</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {progress === 100 && (
            <button className="h-7 rounded bg-primary px-3 text-xs font-medium text-on-primary" onClick={() => window.ride.app.quitAndInstall()}>
              Restart Now
            </button>
          )}
          <button 
            className="h-7 w-7 rounded hover:bg-canvas-soft flex items-center justify-center text-mute hover:text-body transition-colors"
            onClick={() => { setShowChannelSelector(true); }}
            title="Change update channel"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button className="h-7 w-7 rounded hover:bg-canvas-soft flex items-center justify-center text-mute hover:text-body transition-colors" onClick={() => setUpdateInfo(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}