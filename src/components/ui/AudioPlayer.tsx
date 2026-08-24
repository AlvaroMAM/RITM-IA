import { useEffect, useState } from "react";
import { Icon } from "./Icon";

interface AudioPlayerProps {
  textToSpeak: string;
  title?: string;
  audioUrl?: string;
}

export function AudioPlayer({ textToSpeak, title = "Píldora de Audio DUA", audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setHasSpeechSupport(false);
    }

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleTogglePlay = () => {
    if (audioUrl) {
      return;
    }

    if (!hasSpeechSupport) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel();

      const cleanText = textToSpeak
        .replace(/#+\s*/g, "")
        .replace(/\*+/g, "")
        .replace(/_+/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "es-ES";
      utterance.rate = rate;

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 my-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={Boolean(audioUrl)}
            className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow-md transition-transform active:scale-95 ${
              isPlaying ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-primary/90"
            }`}
            title={audioUrl ? "Usa el reproductor de audio" : isPlaying ? "Pausar audio" : "Escuchar audio"}
          >
            <Icon name={isPlaying ? "pause" : "play"} className="h-5 w-5" />
          </button>
          <div>
            <h4 className="font-semibold text-text text-base flex items-center gap-2">
              <span>🎧</span> {title}
            </h4>
            <p className="text-xs text-text-muted">
              {isPlaying ? "Reproduciendo locución adaptada..." : "Generado con IA y adaptado a principios DUA"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-text-muted font-medium mr-1">Velocidad:</span>
          {[0.75, 1.0, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => handleRateChange(speed)}
              className={`px-2 py-1 rounded font-semibold transition-colors ${
                rate === speed
                  ? "bg-primary text-white"
                  : "bg-surface hover:bg-surface-hover text-text-muted"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {audioUrl ? (
        <audio className="w-full" controls preload="metadata" src={audioUrl}>
          Tu navegador no puede reproducir este audio. Puedes consultar la transcripciÃ³n completa.
        </audio>
      ) : null}

      <div className="pt-2 border-t border-primary/10">
        <button
          type="button"
          onClick={() => setShowTranscript(!showTranscript)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <Icon name="chevron" className={`h-3.5 w-3.5 transition-transform ${showTranscript ? "rotate-90" : ""}`} />
          {showTranscript ? "Ocultar transcripción en texto" : "Ver transcripción completa (DUA)"}
        </button>

        {showTranscript && (
          <div className="mt-2 p-3 bg-surface rounded-lg text-sm text-text border border-border max-h-60 overflow-y-auto whitespace-pre-wrap">
            {textToSpeak}
          </div>
        )}
      </div>
    </div>
  );
}
