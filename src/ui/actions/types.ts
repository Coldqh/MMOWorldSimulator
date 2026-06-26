export type UiActionKind = 'primary' | 'secondary' | 'danger';

export interface UiAction {
  id: string;
  label: string;
  disabled: boolean;
  reason?: string;
  kind?: UiActionKind;
}
