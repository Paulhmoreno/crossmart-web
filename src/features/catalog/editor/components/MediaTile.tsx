import { type DraggableAttributes, type DraggableSyntheticListeners } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ODOO_COPY } from '@/features/odoo/odoo.constants';
import { AltTextPopover } from './AltTextPopover';

interface MediaTileProps {
  url: string;
  altText: string;
  /** 1-based; the first image is the one channels show first. */
  position: number;
  sourceManaged?: boolean;
  onAltTextChange: (altText: string) => void;
  /** Absent on the main image. */
  onMakeMain?: () => void;
  /** Absent when the photo is managed by an authoritative ERP source. */
  onRemove?: () => void;
}

/** One image. Drag it, or move it with the keyboard from its handle. */
export function MediaTile({
  url,
  altText,
  position,
  sourceManaged = false,
  ...actions
}: MediaTileProps) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: url,
  });
  const isMain = position === 1;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-muted',
        isMain ? 'col-span-2 row-span-2' : 'aspect-square',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      <img src={url} alt={altText} className="size-full object-cover" />
      <div className="absolute bottom-2 left-2 flex items-center gap-1">
        {isMain && (
          <span className="rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium">
            Main image
          </span>
        )}
        {sourceManaged && (
          <span
            className="inline-flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium"
            title={ODOO_COPY.managedFieldNote}
          >
            <Lock className="size-3" aria-hidden="true" />
            Odoo
          </span>
        )}
      </div>
      <TileActions
        name={altText || `image ${position}`}
        altText={altText}
        dragHandle={{ attributes, listeners }}
        {...actions}
      />
    </div>
  );
}

interface TileActionsProps extends Pick<
  MediaTileProps,
  'onAltTextChange' | 'onMakeMain' | 'onRemove'
> {
  /** How the image is named in button labels. */
  name: string;
  altText: string;
  dragHandle: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners };
}

/** Shown on hover and focus, and always on touch screens, where there is no hover. */
function TileActions({
  name,
  altText,
  dragHandle,
  onAltTextChange,
  onMakeMain,
  onRemove,
}: TileActionsProps) {
  return (
    <div className="absolute inset-x-2 top-2 flex justify-between gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        className="cursor-grab touch-none active:cursor-grabbing"
        aria-label={`Reorder ${name}`}
        {...dragHandle.attributes}
        {...dragHandle.listeners}
      >
        <GripVertical />
      </Button>
      <div className="flex gap-1">
        {onMakeMain && (
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            onClick={onMakeMain}
            aria-label={`Make ${name} the main image`}
          >
            <Star />
          </Button>
        )}
        <AltTextPopover altText={altText} imageName={name} onChange={onAltTextChange} />
        {onRemove && (
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            onClick={onRemove}
            aria-label={`Remove ${name}`}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  );
}
