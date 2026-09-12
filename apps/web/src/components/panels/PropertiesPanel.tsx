import React from 'react';
import { Sliders, Ban } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';

const COLOR_PALETTE = [
  { label: 'Slate', value: '#0f172a' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Sky', value: '#0284c7' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'White', value: '#ffffff' },
];

const STROKE_WIDTHS = [
  { label: '1px', value: 1 },
  { label: '2px', value: 2 },
  { label: '4px', value: 4 },
  { label: '8px', value: 8 },
];

export const PropertiesPanel: React.FC = () => {
  const {
    activeTool,
    selectedShapeIds,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    strokeWidth,
    setStrokeWidth,
    opacity,
    setOpacity,
  } = useCanvasStore();

  // Show if a shape tool is active or shapes are selected
  const isApplicable =
    ['rectangle', 'circle', 'line', 'arrow', 'freehand', 'text'].includes(activeTool) ||
    selectedShapeIds.length > 0;

  if (!isApplicable) return null;

  return (
    <div className="fixed top-20 left-6 z-20 w-60 p-3 rounded-2xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] shadow-[var(--shadow-lg)] backdrop-blur-md select-none text-xs animate-in fade-in slide-in-from-left-2 duration-150">
      <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-[var(--surface-panel-border)] text-[var(--text-secondary)] font-medium">
        <Sliders className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        <span>Style Properties</span>
      </div>

      {/* Stroke Color */}
      <div className="mb-3">
        <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5 flex justify-between">
          <span>Stroke Color</span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">{strokeColor}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.value}
              onClick={() => setStrokeColor(c.value)}
              title={c.label}
              className={`w-5 h-5 rounded-full border transition-all ${
                strokeColor === c.value
                  ? 'ring-2 ring-[var(--accent-primary)] ring-offset-1 scale-110 border-white'
                  : 'border-black/10 hover:scale-105'
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>

      {/* Fill Color */}
      {activeTool !== 'line' && activeTool !== 'arrow' && (
        <div className="mb-3">
          <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5 flex justify-between">
            <span>Fill Color</span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              {fillColor === 'transparent' ? 'None' : fillColor}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Transparent Button */}
            <button
              onClick={() => setFillColor('transparent')}
              title="Transparent"
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all bg-white ${
                fillColor === 'transparent'
                  ? 'ring-2 ring-[var(--accent-primary)] ring-offset-1 scale-110 border-white'
                  : 'border-black/10 hover:scale-105'
              }`}
            >
              <Ban className="w-3 h-3 text-red-500" />
            </button>

            {COLOR_PALETTE.map((c) => (
              <button
                key={c.value}
                onClick={() => setFillColor(c.value)}
                title={c.label}
                className={`w-5 h-5 rounded-full border transition-all ${
                  fillColor === c.value
                    ? 'ring-2 ring-[var(--accent-primary)] ring-offset-1 scale-110 border-white'
                    : 'border-black/10 hover:scale-105'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stroke Width */}
      <div className="mb-3">
        <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
          Stroke Width
        </div>
        <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--surface-panel-border)]">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w.value}
              onClick={() => setStrokeWidth(w.value)}
              className={`py-1 text-center font-mono rounded-md transition-colors ${
                strokeWidth === w.value
                  ? 'bg-[var(--surface-panel)] text-[var(--text-primary)] font-semibold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity Slider */}
      <div>
        <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5 flex justify-between">
          <span>Opacity</span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {Math.round(opacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-[var(--surface-hover)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
        />
      </div>
    </div>
  );
};
