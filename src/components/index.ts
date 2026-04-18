/**
 * components/ui/index.ts
 * ─────────────────────────────────────────────────────────
 * Central export barrel — import anything from '@/components/ui'
 *
 * Example:
 *   import { AppButton, AppCard, AppInput, AppMapView } from '@/components/ui';
 */

// ── Buttons & Actions ──
export { default as AppButton } from './AppButton';

// ── Inputs ──
export { default as AppInput } from './AppInput';

// ── Cards ──
export { default as AppCard } from './AppCard';

// ── Micro components ──
export { AppBadge, AppAvatar, AppDivider, AppChip } from './AppBadgeAvatarChip';

// ── Overlays ──
export { AppModal, AppBottomSheet, AppAlert } from './AppOverlays';

// ── List & Search ──
export { AppSearchBar, AppListItem, AppEmptyState, AppLoader } from './AppListSearch';

// ── Navigation ──
export { AppHeader, AppTabBar, AppStepper, AppProgressBar } from './AppNavigation';

// ── Data Display ──
export { AppTable, AppStats, AppTimeline } from './AppDataDisplay';
export type { TableColumn, TimelineEvent } from './AppDataDisplay';

// ── Form Controls ──
export { AppSwitch, AppCheckbox, AppRadioGroup, AppSelect } from './AppFormControls';

// ── Map ──
export { default as AppMapView } from './AppMapView';
export type { MapMarker, MapRoute, MapGeofence, MarkerType } from './AppMapView';
