import {
  Box,
  Boxes,
  Camera,
  FileText,
  Image as ImageIcon,
  Layers,
  Palette,
  Route,
  ScanLine,
  StickyNote,
  Zap,
  type LucideIcon
} from 'lucide-react';
import type { ChecklistCategory } from '@/lib/validations/checklists';
import { cn } from '@/lib/utils';

const map: Record<ChecklistCategory, LucideIcon> = {
  stl: Box,
  obj: Boxes,
  dicom_tomography: ScanLine,
  intraoral_photo: Camera,
  extraoral_photo: ImageIcon,
  xray: Zap,
  planning: Route,
  material_spec: Layers,
  shade: Palette,
  notes: StickyNote,
  bite_registration: FileText,
  other: FileText
};

export function CategoryIcon({
  category,
  className
}: {
  category: ChecklistCategory;
  className?: string;
}) {
  const Icon = map[category] ?? FileText;
  return (
    <Icon
      className={cn('h-4 w-4', className)}
      strokeWidth={1.5}
    />
  );
}
