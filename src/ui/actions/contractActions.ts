import type { ContractDefinition } from '../../types/game';
import type { UiAction } from './types';

export type ContractActionId = 'accept' | 'cancel' | 'claim';

export interface ContractUiAction extends UiAction {
  id: ContractActionId;
}

export const getContractActions = (contract: ContractDefinition): ContractUiAction[] => {
  if (contract.status === 'available') {
    return [
      { id: 'accept', label: 'Принять', disabled: false, kind: 'primary' },
      { id: 'cancel', label: 'Отменить', disabled: false, kind: 'secondary' },
    ];
  }

  if (contract.status === 'active') {
    return [
      { id: 'cancel', label: 'Отказаться', disabled: false, kind: 'secondary' },
    ];
  }

  if (contract.status === 'readyToClaim') {
    return [
      { id: 'claim', label: 'Забрать награду', disabled: false, kind: 'primary' },
    ];
  }

  return [];
};
