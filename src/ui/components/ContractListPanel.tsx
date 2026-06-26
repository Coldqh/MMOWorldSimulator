import type { ContractCategory, ContractDefinition } from '../../types/game';
import { useGameStore } from '../../state/gameStore';
import { getContractGoalText, getContractRewardText, getContractTimeLeft, isContractVisible } from '../../systems/contractSystem';
import { getContractActions, type ContractActionId } from '../actions/contractActions';

const categoryTitle: Record<ContractCategory, string> = {
  daily: 'Ежедневные',
  weekly: 'Еженедельные',
};

const statusText: Record<string, string> = {
  available: 'доступен',
  active: 'активен',
  readyToClaim: 'готово',
  claimed: 'получено',
  expired: 'истёк',
  cancelled: 'отменён',
};

const visibleContract = (contract: ContractDefinition) => isContractVisible(contract);

export const ContractListPanel = ({ category }: { category: ContractCategory }) => {
  const server = useGameStore((state) => state.server);
  const acceptContract = useGameStore((state) => state.acceptContract);
  const cancelContract = useGameStore((state) => state.cancelContract);
  const claimContract = useGameStore((state) => state.claimContract);

  const contracts = (server.contracts ?? [])
    .filter((contract) => contract.category === category)
    .filter(visibleContract)
    .sort((a, b) => a.id.localeCompare(b.id));

  const runAction = (contract: ContractDefinition, actionId: ContractActionId) => {
    if (actionId === 'accept') acceptContract(contract.id);
    if (actionId === 'cancel') cancelContract(contract.id);
    if (actionId === 'claim') claimContract(contract.id);
  };

  return (
    <section className="panel">
      <div className="section-title">{categoryTitle[category]}</div>
      {contracts.length === 0 && <p className="muted">Контрактов нет до следующего обновления.</p>}
      <div className="list-lines">
        {contracts.map((contract) => {
          const actions = getContractActions(contract);
          return (
            <div key={contract.id} className={`list-line quest-log-line ${contract.status === 'readyToClaim' ? 'ready-line' : ''}`}>
              <span>
                <strong>{contract.title}</strong>
                <small>{getContractGoalText(contract)}</small>
                <small>Прогресс: {contract.objective.current}/{contract.objective.required}</small>
                <small>Награда: {getContractRewardText(contract)}</small>
                <small>Осталось: {getContractTimeLeft(server, contract)} · {statusText[contract.status]}</small>
              </span>
              {actions.length > 0 && (
                <span className="action-grid compact-actions">
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      className={action.kind === 'primary' ? 'primary-button' : undefined}
                      disabled={action.disabled}
                      title={action.reason}
                      onClick={() => runAction(contract, action.id)}
                    >
                      {action.label}
                    </button>
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
