import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import timeline from '../timeline.json';

// One timeline (timeline.json) drives everything: tools/demo.cjs acts on its bars while recording,
// tools/demo_music.py writes the music to its bars, and this composition puts captions on them.
export const FPS = 30;
export const BAR = 240 / timeline.bpm; // seconds per 4/4 bar
const at = (bar: number) => Math.round(bar * BAR * FPS); // bar → frame
const BG = '#090b10', FG = '#f3f4f6', MUTED = '#9aa3b2';
const FONT = 'Inter, ui-rounded, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

type Cap = { bar: number; len: number; text: string; sub?: string; foot?: string; url?: string; accent?: string; center?: boolean; outro?: boolean };

const Words: React.FC<{ text: string; frame: number; delay?: number }> = ({ text, frame, delay = 0 }) => (
  <>
    {text.split(' ').map((w, i) => { // each word rises in, a couple of frames after the last
      const s = spring({ frame: frame - delay - i * 2, fps: FPS, config: { damping: 200 }, durationInFrames: 16 });
      return (
        <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: s, transform: `translateY(${(1 - s) * 18}px)`, filter: `blur(${(1 - s) * 6}px)` }}>
          {w + ' '}
        </span>
      );
    })}
  </>
);

const fadeIn = (frame: number, delay: number) => interpolate(frame - delay, [0, 10], [0, 1], clamp);

const Caption: React.FC<{ c: Cap; dur: number }> = ({ c, dur }) => {
  const frame = useCurrentFrame();
  const out = c.outro ? 1 : interpolate(frame, [dur - 9, dur - 1], [1, 0], clamp); // gone just before the next downbeat
  const words = c.text.split(' ').length;
  const block: React.CSSProperties = { opacity: out, transform: `translateY(${(1 - out) * -12}px)`, fontFamily: FONT, color: FG };
  if (c.center) {
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...block, fontSize: 60, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', maxWidth: 980, lineHeight: 1.1 }}>
          <Words text={c.text} frame={frame} />
        </div>
      </AbsoluteFill>
    );
  }
  if (c.outro) {
    const ring = (r: number, color: string, dash: number, delay: number) => {
      const s = spring({ frame: frame - delay, fps: FPS, config: { damping: 18, mass: 0.8 } });
      return <circle cx="16" cy="16" r={r} fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeDasharray={`${dash * s} 100`} transform="rotate(90 16 16)" />;
    };
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', fontFamily: FONT, textAlign: 'center' }}>
        <svg viewBox="0 0 32 32" width="110" height="110">{ring(13, '#8b5cf6', 58, 0)}{ring(8.5, '#22d3ee', 36, 4)}{ring(4, '#ff3b30', 16, 8)}</svg>
        <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: '-0.02em', color: FG, marginTop: 18 }}><Words text={c.text} frame={frame} delay={6} /></div>
        <div style={{ fontSize: 32, fontWeight: 600, color: FG, marginTop: 6, opacity: fadeIn(frame, 18) }}>{c.sub}</div>
        <div style={{ fontSize: 20, fontWeight: 500, color: MUTED, marginTop: 30, opacity: fadeIn(frame, 30) }}>{c.foot}</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#2dd4bf', marginTop: 10, opacity: fadeIn(frame, 38) }}>{c.url}</div>
      </AbsoluteFill>
    );
  }
  const bar = spring({ frame, fps: FPS, config: { damping: 200 }, durationInFrames: 14 });
  return ( // the left column, beside the dial
    <div style={{ position: 'absolute', left: 64, top: 190, width: 262, height: 360, display: 'flex', flexDirection: 'column', justifyContent: 'center', ...block }}>
      <div style={{ width: 34 * bar, height: 5, borderRadius: 3, background: c.accent || FG, marginBottom: 18 }} />
      <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.13 }}><Words text={c.text} frame={frame} /></div>
      {c.sub && <div style={{ fontSize: 19, fontWeight: 500, color: MUTED, marginTop: 14, opacity: fadeIn(frame, words * 2 + 4) }}>{c.sub}</div>}
    </div>
  );
};

export const Demo: React.FC<{ pipStart: number | null; pipEnd: number | null }> = ({ pipStart, pipEnd }) => {
  const frame = useCurrentFrame();
  const foot = at(timeline.footageAt);
  const outro = at(timeline.captions.find((c) => (c as Cap).outro)!.bar);
  // the app fades in on its first downbeat; in the outro it blurs and dims behind the title
  const show = interpolate(frame - foot, [0, 12], [0, 1], clamp);
  const o = interpolate(frame - outro, [0, 18], [0, 1], clamp);
  const look: React.CSSProperties = { opacity: show, transform: `scale(${1.03 - 0.03 * show})`, filter: `blur(${o * 9}px) brightness(${1 - o * 0.6})` };
  const pipIn = pipStart == null ? 0 : spring({ frame: frame - foot - Math.round(pipStart * FPS), fps: FPS, config: { damping: 16, mass: 0.7 } });
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile('music.wav')} />
      <Sequence from={foot} name="App">
        <AbsoluteFill style={look}>
          <OffthreadVideo src={staticFile('screen.mp4')} muted />
        </AbsoluteFill>
      </Sequence>
      {pipStart != null && (
        <Sequence from={foot + Math.round(pipStart * FPS)} durationInFrames={pipEnd == null ? undefined : Math.round((pipEnd - pipStart) * FPS)} name="Pop-out">
          <AbsoluteFill style={look}>
            <div style={{ position: 'absolute', right: 40, top: 96, width: 300, height: 300, borderRadius: 12, overflow: 'hidden', boxShadow: '0 22px 60px rgba(0,0,0,.6)', outline: '1px solid rgba(255,255,255,.14)',
              opacity: pipIn, transform: `translateY(${(1 - pipIn) * 24}px) scale(${0.92 + 0.08 * pipIn})` }}>
              <OffthreadVideo src={staticFile('pip.mp4')} muted style={{ width: '100%', height: '100%' }} />
            </div>
          </AbsoluteFill>
        </Sequence>
      )}
      {(timeline.captions as Cap[]).map((c, i) => (
        <Sequence key={i} from={at(c.bar)} durationInFrames={at(c.bar + c.len) - at(c.bar)} name={c.text}>
          <Caption c={c} dur={at(c.bar + c.len) - at(c.bar)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
