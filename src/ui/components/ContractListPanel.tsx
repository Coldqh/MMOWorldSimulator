import type { ContractCategory, ContractDefinition } from '../../types/game';
import { useGameStore } from '../../state/gameStore';
import { getContractGoalText, getContractRewardText, getContractTimeLeft } from '../../systems/contractSystem';

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

const visibleContract = (contract: ContractDefinition) =>
  contract.status === 'available' || contract.status === 'active' || contract.status === 'readyToClaim';

export const ContractListPanel = ({ category }: { category: ContractCategory }) => {
  const server = useGameStore((state) => state.server);
  const acceptContract = useGameStore((state) => state.acceptContract);
  const cancelContract = useGameStore((state) => state.cancelContract);
  const claimContract = useGameStore((state) => state.claimContract);

  const contracts = (server.contracts ?? [])
    .filter((contract) => contract.category === category)
    .filter(visibleContract)
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <section className="panel">
      <div className="section-title">{categoryTitle[category]}</div>
      {contracts.length === 0 && <p className="muted">Контрактов нет.</p>}
      <div className="list-lines">
        {contracts.map((contract) => (
          <div key={contract.id} className={`list-line quest-log-line ${contract.status === 'readyToClaim' ? 'ready-line' : ''}`}>
            <span>
              <strong>{contract.title}</strong>
              <small>{getContractGoalText(contract)}</small>
              <small>Прогресс: {contract.objective.current}/{contract.objective.required}</small>
              <small>Награда: {getContractRewardText(contract)}</small>
              <small>Осталось: {getContractTimeLeft(server, contract)} · {statusText[contract.status]}</small>
            </span>
            {contract.status === 'available' && (
              <span className="action-grid compact-actions">
                <button className="primary-button" onClick={() => acceptContract(contract.id)}>Принять</button>
                <button onClick={() => cancelContract(contract.id)}>Отменить</button>
              </span>
            )}
            {contract.status === 'active' && (
              <button onClick={() => cancelContract(contract.id)}>Отказаться</button>
            )}
            {contract.status === 'readyToClaim' && (
              <button className="primary-button" onClick={() => claimContract(contract.id)}>Забрать награду</button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
