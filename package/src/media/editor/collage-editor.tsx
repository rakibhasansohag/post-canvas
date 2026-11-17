'use client';
// The collage, to arrange. Loaded only when arranging starts, so @use-gesture stays out of every other bundle.
import type { Editor } from '@tiptap/core';
import { useDrag, useGesture } from '@use-gesture/react';
import {
  BringToFront,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  SendToBack,
  Trash2,
  Undo2,
  Wallpaper,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import type { CollagePlace, GalleryPhoto, Translator } from '../../core/types';
import {
  clampPlace,
  collageFrameBox,
  collageItemBox,
  collageMaxWidth,
  collageMinWidth,
  collageStart,
  placeOf,
} from '../rules';

/** Arrow keys move the selected photo this share of the frame (Shift: five times as far). */
const nudgeStep = 0.01;
const turnStep = 5;

type Live = { key: string; place: CollagePlace } | null;

/** Props of `CollageEditor`. */
export interface CollageEditorProps {
  editor: Editor;
  photos: GalleryPhoto[];
  t: Translator;
  /** Sets the photos at once: moves, layers and removals. Each call is one undo step. */
  onChange: (photos: GalleryPhoto[]) => void;
  /** Opens the photo manager, where any photo can be made the background. */
  onChangeBackground: () => void;
}

/**
 * The collage as it will look: the first photo is the background, and every later photo sits on it. Drag a photo to
 * move it; pinch it with two fingers to resize and turn it; or select it and use its corner handle (resize), its top
 * handle (turn), and the bar under the frame. Selected, the arrow keys nudge it, + and - resize it, [ and ] turn it,
 * Page Up and Page Down change its layer, and Delete removes it. Undo takes back the last change, a removal included.
 */
export default function CollageEditor({ editor, photos, t, onChange, onChangeBackground }: CollageEditorProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [live, setLive] = useState<Live>(null);
  const [announce, setAnnounce] = useState('');
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  });

  const [base, ...overlays] = photos;
  const selectedIndex = photos.findIndex((photo, i) => i > 0 && photo.key === selectedKey);
  const selected = selectedIndex > 0 ? photos[selectedIndex] : undefined;

  const placeAt = (key: string) => {
    const index = latest.current.findIndex((photo) => photo.key === key);
    const photo = latest.current[index];
    return index > 0 && photo ? placeOf(photo, index) : null;
  };

  function setPlace(key: string, place: CollagePlace) {
    setLive(null);
    onChange(latest.current.map((photo) => (photo.key === key ? { ...photo, place: clampPlace(place) } : photo)));
  }

  /** Brings a photo one layer forward (+1) or back (-1), never below the background. */
  function layer(key: string, by: 1 | -1) {
    const list = [...latest.current];
    const from = list.findIndex((photo) => photo.key === key);
    const to = from + by;
    const a = list[from];
    const b = list[to];
    if (from < 1 || to < 1 || !a || !b) return;
    list[from] = b;
    list[to] = a;
    onChange(list);
    setAnnounce(by > 0 ? t('media.collage.broughtForward') : t('media.collage.sentBack'));
  }

  function remove(key: string) {
    setSelectedKey(null);
    onChange(latest.current.filter((photo) => photo.key !== key));
    setAnnounce(t('media.collage.removed'));
  }

  function reset() {
    onChange(latest.current.map((photo, index) => (index > 0 ? { ...photo, place: collageStart(index - 1) } : photo)));
    setAnnounce(t('media.collage.resetDone'));
  }

  const undo = () => {
    if (editor.commands.undo()) setAnnounce(t('media.collage.undone'));
  };

  const nudge = (key: string, change: (place: CollagePlace) => CollagePlace) => {
    const place = placeAt(key);
    if (place) setPlace(key, change(place));
  };
  const resize = (key: string, factor: number) =>
    nudge(key, (p) => ({ ...p, w: Math.min(collageMaxWidth, Math.max(collageMinWidth, p.w * factor)) }));
  const turn = (key: string, by: number) => nudge(key, (p) => ({ ...p, r: p.r + by }));

  function onFrameKey(event: KeyboardEvent<HTMLDivElement>) {
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (mod && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) editor.commands.redo();
      else undo();
    } else if (mod && key === 'y') {
      event.preventDefault();
      editor.commands.redo();
    }
  }

  function onPhotoKey(event: KeyboardEvent<HTMLElement>, key: string) {
    const step = event.shiftKey ? nudgeStep * 5 : nudgeStep;
    const moves: Record<string, (p: CollagePlace) => CollagePlace> = {
      ArrowLeft: (p) => ({ ...p, x: p.x - step }),
      ArrowRight: (p) => ({ ...p, x: p.x + step }),
      ArrowUp: (p) => ({ ...p, y: p.y - step }),
      ArrowDown: (p) => ({ ...p, y: p.y + step }),
    };
    const move = moves[event.key];
    if (move) nudge(key, move);
    else if (event.key === '+' || event.key === '=') resize(key, 1.05);
    else if (event.key === '-' || event.key === '_') resize(key, 1 / 1.05);
    else if (event.key === ']' || event.key === '}') turn(key, event.shiftKey ? 15 : turnStep);
    else if (event.key === '[' || event.key === '{') turn(key, event.shiftKey ? -15 : -turnStep);
    else if (event.key === 'PageUp') layer(key, 1);
    else if (event.key === 'PageDown') layer(key, -1);
    else if (event.key === 'Delete' || event.key === 'Backspace') remove(key);
    else if (event.key === 'Escape') {
      setSelectedKey(null);
      event.currentTarget.blur();
    } else return;
    event.preventDefault();
    event.stopPropagation();
  }

  if (!base) return null;

  return (
    <div className="pc-collage-editor" data-pc-stop="" onKeyDown={onFrameKey}>
      <div className="pc-collage-editor__stage">
        <div
          ref={frame}
          className="pc-collage-editor__frame"
          style={collageFrameBox(base)}
          onPointerDown={(event) => {
            // A press on the background lets go of the selected photo.
            const target = event.target as HTMLElement;
            if (target === event.currentTarget || target.dataset.base !== undefined) setSelectedKey(null);
          }}
        >
          <img data-base="" src={base.src} alt={base.alt} draggable={false} className="pc-collage-editor__base" />
          {overlays.map((photo, i) => {
            const index = i + 1;
            const place = live?.key === photo.key ? live.place : placeOf(photo, index);
            return (
              <Overlay
                key={photo.key}
                photo={photo}
                number={index}
                total={overlays.length}
                place={place}
                frame={frame}
                t={t}
                selected={photo.key === selectedKey}
                onSelect={() => setSelectedKey(photo.key)}
                onLive={(next) => setLive({ key: photo.key, place: clampPlace(next) })}
                onCommit={(next) => setPlace(photo.key, next)}
                onKeyDown={(event) => onPhotoKey(event, photo.key)}
              />
            );
          })}
        </div>
      </div>

      <div role="toolbar" aria-label={t('media.collage.tools')} className="pc-collage-editor__bar">
        {selected ? (
          <>
            <Tool
              icon={BringToFront}
              label={t('media.collage.forward')}
              disabled={selectedIndex >= photos.length - 1}
              onClick={() => layer(selected.key, 1)}
            />
            <Tool
              icon={SendToBack}
              label={t('media.collage.back')}
              disabled={selectedIndex <= 1}
              onClick={() => layer(selected.key, -1)}
            />
            <Tool icon={RotateCcw} label={t('media.collage.turnLeft')} onClick={() => turn(selected.key, -15)} />
            <Tool icon={RotateCw} label={t('media.collage.turnRight')} onClick={() => turn(selected.key, 15)} />
            <Tool icon={Minimize2} label={t('media.collage.smaller')} onClick={() => resize(selected.key, 1 / 1.15)} />
            <Tool icon={Maximize2} label={t('media.collage.bigger')} onClick={() => resize(selected.key, 1.15)} />
            <Tool icon={Trash2} label={t('media.collage.remove')} onClick={() => remove(selected.key)} />
          </>
        ) : (
          <>
            <span className="pc-collage-editor__hint">{t('media.collage.hint')}</span>
            <Tool icon={Wallpaper} label={t('media.collage.changeBackground')} onClick={onChangeBackground} />
            <Tool icon={RotateCcw} label={t('media.collage.reset')} onClick={reset} />
          </>
        )}
        <span className="pc-collage-editor__spacer" />
        <Tool icon={Undo2} label={t('media.collage.undo')} disabled={!editor.can().undo()} onClick={undo} />
      </div>
      <span role="status" className="pc-sr-only">
        {announce}
      </span>
    </div>
  );
}

interface OverlayProps {
  photo: GalleryPhoto;
  number: number;
  total: number;
  place: CollagePlace;
  frame: RefObject<HTMLDivElement | null>;
  t: Translator;
  selected: boolean;
  onSelect: () => void;
  onLive: (place: CollagePlace) => void;
  onCommit: (place: CollagePlace) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/** One photo over the background: dragged, pinched, or, selected, resized and turned by its handles. */
function Overlay({
  photo,
  number,
  total,
  place,
  frame,
  t,
  selected,
  onSelect,
  onLive,
  onCommit,
  onKeyDown,
}: OverlayProps) {
  /** The place as the gesture under way left it, committed when it ends. */
  const moved = useRef<CollagePlace | null>(null);
  const size = () => frame.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 1, 1);
  const show = (next: CollagePlace) => {
    moved.current = next;
    onLive(next);
  };
  const end = () => {
    if (moved.current) onCommit(moved.current);
    moved.current = null;
  };

  const bind = useGesture(
    {
      onDragStart: () => onSelect(),
      onDrag: ({ movement: [mx, my], pinching, cancel, memo }) => {
        if (pinching) {
          cancel();
          return memo as CollagePlace | undefined;
        }
        const start = (memo as CollagePlace | undefined) ?? place;
        const rect = size();
        show({ ...start, x: start.x + mx / Math.max(1, rect.width), y: start.y + my / Math.max(1, rect.height) });
        return start;
      },
      onDragEnd: end,
      onPinchStart: () => onSelect(),
      // movement is [scale, turn] since the pinch began, for fingers, Safari's gesture events and trackpads alike.
      onPinch: ({ movement: [scale, turn], memo }) => {
        const start = (memo as CollagePlace | undefined) ?? place;
        show({
          ...start,
          w: start.w * (Number.isFinite(scale) && scale > 0 ? scale : 1),
          r: start.r + (Number.isFinite(turn) ? turn : 0),
        });
        return start;
      },
      onPinchEnd: end,
    },
    { drag: { filterTaps: true, pointer: { keys: false } } },
  );

  /** The photo's centre on the page, for the handles. */
  const centre = () => {
    const rect = size();
    return { x: rect.left + place.x * rect.width, y: rect.top + place.y * rect.height };
  };
  type HandleStart = { place: CollagePlace; c: { x: number; y: number } };
  const resizeDrag = useDrag(
    ({ xy: [x, y], initial: [x0, y0], memo, last }) => {
      const start = (memo as HandleStart | undefined) ?? { place, c: centre() };
      const from = Math.hypot(x0 - start.c.x, y0 - start.c.y) || 1;
      show({ ...start.place, w: start.place.w * (Math.hypot(x - start.c.x, y - start.c.y) / from) });
      if (last) end();
      return start;
    },
    { pointer: { keys: false } },
  );
  const turnDrag = useDrag(
    ({ xy: [x, y], initial: [x0, y0], memo, last, shiftKey }) => {
      const start = (memo as HandleStart | undefined) ?? { place, c: centre() };
      const degrees =
        (Math.atan2(y - start.c.y, x - start.c.x) - Math.atan2(y0 - start.c.y, x0 - start.c.x)) * (180 / Math.PI);
      let r = start.place.r + degrees;
      // Shift turns in 15° steps; otherwise it settles on straight when it's close.
      r = shiftKey ? Math.round(r / 15) * 15 : Math.abs(((r % 90) + 90) % 90) < 3 ? Math.round(r / 90) * 90 : r;
      show({ ...start.place, r });
      if (last) end();
      return start;
    },
    { pointer: { keys: false } },
  );

  // A handle's press is its own: it mustn't also start dragging the photo it sits on.
  const handle = (props: { onPointerDown?: (event: PointerEvent<HTMLElement>) => void }) => ({
    ...props,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      event.stopPropagation();
      props.onPointerDown?.(event);
    },
  });

  return (
    <div
      {...bind()}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={t('media.collage.photo', {
        number,
        total,
        x: Math.round(place.x * 100),
        y: Math.round(place.y * 100),
        size: Math.round(place.w * 100),
        turn: Math.round(place.r),
      })}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - [ ] PageUp PageDown Delete"
      onFocus={onSelect}
      onKeyDown={onKeyDown}
      className="pc-collage-editor__layer"
      data-selected={selected || undefined}
      style={collageItemBox(place, photo)}
    >
      <span className="pc-collage-editor__print">
        <img src={photo.src} alt={photo.alt} draggable={false} />
      </span>
      {selected && (
        <>
          <span aria-hidden="true" className="pc-collage-editor__stem" />
          <span
            {...handle(turnDrag())}
            aria-hidden="true"
            title={t('media.collage.turnHandle')}
            className="pc-collage-editor__turn"
          >
            <RotateCw size={14} strokeWidth={2.6} />
          </span>
          <span
            {...handle(resizeDrag())}
            aria-hidden="true"
            title={t('media.collage.resizeHandle')}
            className="pc-collage-editor__resize"
          />
        </>
      )}
    </div>
  );
}

function Tool({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="pc-tool-button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
    </button>
  );
}
