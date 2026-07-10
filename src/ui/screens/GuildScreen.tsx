import { useMemo, useState } from "react";
import { CLASSES } from "../../content/classes";
import { useGameStore } from "../../state/gameStore";
import { getGearScore } from "../../systems/itemSystem";
import { getGuildTierMinLevel, getPlayerGuildPendingApplications } from "../../systems/guildRuntimeSystem";
import { guildFocusLabel } from "../../systems/guildIdentitySystem";
import { getActivityCurrencyAmount } from "../../systems/activityCurrencySystem";
import { formatGuildBossCooldown, getActiveGuildSummonedBoss, getGuildBossCooldownLeft, getGuildBossSummonCost } from "../../systems/guildBossSystem";
import { GuildWarPanel, ServerGuildWarList } from "../components/GuildWarPanel";
import { CastlePanel } from "../components/CastlePanel";
import type { Guild, GuildFocus, GuildTier } from "../../types/game";

type MainGuildTab = "guilds" | "wars" | "castles";
type GuildTab = "profile" | "roster" | "applications" | "relations" | "events" | "summons" | "castles";
type PlayerGuildTier = GuildTier;


const getNpcName = (server: ReturnType<typeof useGameStore.getState>["server"], id?: string) => {
  if (!id) return "нет";
  if (id === server.player.id) return server.player.name;
  return server.npcs.find((npc) => npc.id === id)?.name ?? id;
};

const getClassName = (classId: string) => CLASSES.find((entry) => entry.id === classId)?.name ?? classId;
const guildPower = (guild: Guild) => (guild.reputation ?? 0) + (guild.pvpRating ?? 0);
const relationPercent = (value: number) => `${Math.max(0, Math.min(100, value + 100) / 2)}%`;
const relationTone = (value: number) => value <= -40 ? "danger-line" : value >= 40 ? "ready-line" : "";
const tierLabel: Record<string, string> = { all: "Все", max: "Max", high: "High", mid: "Mid", low: "Low" };
const guildTierMinLevel: Record<PlayerGuildTier, number> = { low: getGuildTierMinLevel("low"), mid: getGuildTierMinLevel("mid"), high: getGuildTierMinLevel("high"), max: getGuildTierMinLevel("max") };
const guildTierOptions: { id: PlayerGuildTier; label: string; minLevel: number }[] = [
  { id: "low", label: "Low", minLevel: 1 },
  { id: "mid", label: "Mid", minLevel: 21 },
  { id: "high", label: "High", minLevel: 41 },
  { id: "max", label: "Max", minLevel: 60 },
];


const guildRole = (guild: Guild, id: string) => {
  if (guild.leaderId === id) return "ГМ";
  if (guild.deputyId === id) return "Зам";
  if ((guild.officerIds ?? []).includes(id)) return "Офицер";
  return "Участник";
};

export const GuildScreen = () => {
  const server = useGameStore((state) => state.server);
  const applyToGuild = useGameStore((state) => state.applyToGuild);
  const leaveGuild = useGameStore((state) => state.leaveGuild);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const openGuildProfile = useGameStore((state) => state.openGuildProfile);
  const createPlayerGuild = useGameStore((state) => state.createPlayerGuild);
  const acceptGuildApplicant = useGameStore((state) => state.acceptGuildApplicant);
  const rejectGuildApplicant = useGameStore((state) => state.rejectGuildApplicant);
  const summonGuildWorldBoss = useGameStore((state) => state.summonGuildWorldBoss);

  const [mainTab, setMainTab] = useState<MainGuildTab>("guilds");
  const [showAllGuilds, setShowAllGuilds] = useState(false);
  const [tierFilter, setTierFilter] = useState<"all" | GuildTier>("all");
  const [tab, setTab] = useState<GuildTab>("profile");
  const [guildName, setGuildName] = useState("");
  const [guildFocus, setGuildFocus] = useState<GuildFocus>("pvp");
  const [guildTier, setGuildTier] = useState<PlayerGuildTier>("low");

  const playerGuild = server.guilds.find((entry) => entry.id === server.player.guildId);
  const applications = getPlayerGuildPendingApplications(server);
  const pendingByGuild = new Map(server.guildApplications.filter((app) => app.status === "pending").map((app) => [app.guildId, app]));
  const canCreateSelectedTier = server.player.level >= guildTierMinLevel[guildTier];

  const guilds = useMemo(
    () => server.guilds
      .filter((guild) => tierFilter === "all" || guild.tier === tierFilter)
      .sort((a, b) => guildPower(b) - guildPower(a) || b.memberIds.length - a.memberIds.length),
    [server.guilds, tierFilter],
  );

  const renderNpcLink = (id?: string, fallback = "нет") => {
    if (!id) return <span>{fallback}</span>;
    if (id === server.player.id) return <strong>{server.player.name} · ты</strong>;
    return <button className="text-button inline-button" onClick={() => openNpcProfile(id)}>{getNpcName(server, id)}</button>;
  };

  if (mainTab === "castles") {
    return <CastlePanel onBack={() => setMainTab("guilds")} />;
  }

  if (mainTab === "wars") {
    const showServerWars = !playerGuild || showAllGuilds;
    return (
      <div className="screen-stack guild-screen">
        <section className="panel hero-panel guild-hero">
          <div className="section-title">Гильдии</div>
          <div className="title-row">
            <h1>{showServerWars ? "Войны сервера" : "Войны твоей гильдии"}</h1>
            {playerGuild && <button onClick={() => setShowAllGuilds(!showAllGuilds)}>{showAllGuilds ? "Твоя гильдия" : "Все гильдии"}</button>}
          </div>
          <div className="tab-row">
            <button onClick={() => setMainTab("guilds")}>Гильдии</button>
            <button className="active" onClick={() => setMainTab("wars")}>Войны</button>
            <button onClick={() => setMainTab("castles")}>Замки</button>
          </div>
          <p className="muted">
            {showServerWars
              ? "Активные и завершённые войны всех гильдий."
              : "Показываются только войны твоей гильдии."}
          </p>
        </section>
        {showServerWars ? <ServerGuildWarList /> : <GuildWarPanel />}
      </div>
    );
  }

  if (playerGuild && !showAllGuilds) {
    const roleWeight = (id: string) => playerGuild.leaderId === id ? 0 : playerGuild.deputyId === id ? 1 : (playerGuild.officerIds ?? []).includes(id) ? 2 : 3;
    const gearOf = (member: any) => member.id === server.player.id ? getGearScore(server.player.equipment) : (member.gearScore ?? getGearScore(member.equipment ?? {}));
    const roster = playerGuild.memberIds
      .map((id) => id === server.player.id ? server.player : server.npcs.find((npc) => npc.id === id))
      .filter(Boolean)
      .sort((a: any, b: any) => roleWeight(a.id) - roleWeight(b.id) || b.level - a.level || gearOf(b) - gearOf(a))
      .slice(0, 160);

    const relationRows = server.guilds
      .filter((guild) => guild.id !== playerGuild.id)
      .map((guild) => ({
        guild,
        outgoing: server.guildRelations.find((rel) => rel.fromGuildId === playerGuild.id && rel.toGuildId === guild.id)?.value ?? 0,
        incoming: server.guildRelations.find((rel) => rel.fromGuildId === guild.id && rel.toGuildId === playerGuild.id)?.value ?? 0,
      }))
      .sort((a, b) => a.outgoing - b.outgoing || a.guild.name.localeCompare(b.guild.name));

    const guildNews = server.worldNews.filter((entry) => entry.text.includes(playerGuild.name)).slice(0, 8);
    const activeWars = server.guildWars.filter((war) => war.status === "active" && (war.attackerGuildId === playerGuild.id || war.defenderGuildId === playerGuild.id));
    const officerText = (playerGuild.officerIds ?? []).length === 0 ? <span>нет</span> : (playerGuild.officerIds ?? []).slice(0, 4).map((id) => <span key={id}> {renderNpcLink(id)}</span>);
    const summonCost = getGuildBossSummonCost(playerGuild.tier ?? "low");
    const summonCooldownLeft = getGuildBossCooldownLeft(server, playerGuild);
    const activeSummonedBoss = getActiveGuildSummonedBoss(server, playerGuild.id);
    const isGuildMaster = playerGuild.leaderId === server.player.id;

    return (
      <div className="screen-stack guild-screen">
        <section className="panel hero-panel guild-hero">
          <div className="section-title">Твоя гильдия</div>
          <div className="title-row">
            <h1>{playerGuild.name}</h1>
            <button onClick={() => setShowAllGuilds(true)}>Все гильдии</button>
          </div>
          <div className="tab-row">
            <button className="active" onClick={() => setMainTab("guilds")}>Гильдии</button>
            <button onClick={() => setMainTab("wars")}>Войны</button>
            <button onClick={() => setMainTab("castles")}>Замки</button>
          </div>
          <p className="muted">{guildFocusLabel(playerGuild.guildFocus)} · {playerGuild.tier ?? "low"} · сила {guildPower(playerGuild)}</p>
          <div className="tab-row guild-tab-strip">
            <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>Профиль</button>
            <button className={tab === "roster" ? "active" : ""} onClick={() => setTab("roster")}>Ростер</button>
            {isGuildMaster && <button className={tab === "applications" ? "active" : ""} onClick={() => setTab("applications")}>Заявки {applications.length}</button>}
            <button className={tab === "relations" ? "active" : ""} onClick={() => setTab("relations")}>Отношения</button>
            <button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>События</button>
            {isGuildMaster && <button className={tab === "summons" ? "active" : ""} onClick={() => setTab("summons")}>Призыв</button>}
            <button className={tab === "castles" ? "active" : ""} onClick={() => setTab("castles")}>Замки</button>
          </div>
        </section>

        {tab === "profile" && (
          <section className="panel guild-content-panel">
            <div className="section-title">Профиль</div>
            <div className="profile-grid-modal">
              <div className="profile-cell"><span>Тип</span><strong>{guildFocusLabel(playerGuild.guildFocus)}</strong></div>
              <div className="profile-cell"><span>Требование</span><strong>{playerGuild.minLevel ?? 1}+ уровень</strong></div>
              <div className="profile-cell"><span>Участников</span><strong>{playerGuild.memberIds.length}</strong></div>
              <div className="profile-cell"><span>Репутация</span><strong>{playerGuild.reputation}</strong></div>
              <div className="profile-cell"><span>PvP рейтинг</span><strong>{playerGuild.pvpRating}</strong></div>
              <div className="profile-cell"><span>Активные войны</span><strong>{activeWars.length}</strong></div>
              <div className="profile-cell"><span>Твоя роль</span><strong>{guildRole(playerGuild, server.player.id)}</strong></div>
              <div className="profile-cell"><span>ГМ</span><strong>{renderNpcLink(playerGuild.leaderId)}</strong></div>
              <div className="profile-cell"><span>Зам</span><strong>{renderNpcLink(playerGuild.deputyId)}</strong></div>
              <div className="profile-cell wide-cell"><span>Офицеры</span><strong>{officerText}</strong></div>
            </div>
          </section>
        )}

        {tab === "applications" && playerGuild.leaderId === server.player.id && (
          <section className="panel guild-content-panel">
            <div className="section-title">Заявки одиночек</div>
            <p className="muted">Новая заявка приходит раз в 12 игровых часов.</p>
            <div className="list-lines">
              {applications.length === 0 && <span className="muted">Заявок нет.</span>}
              {applications.map((app) => (
                <div key={app.id} className="list-line">
                  <button className="text-button" onClick={() => openNpcProfile(app.npc.id)}>{app.npc.name}</button>
                  <strong>Lv. {app.npc.level} · Gear {app.npc.gearScore} · Skill {app.npc.skill ?? 5}/10</strong>
                  <span className="action-grid compact-actions">
                    <button onClick={() => acceptGuildApplicant(app.id)}>Принять</button>
                    <button onClick={() => rejectGuildApplicant(app.id)}>Отказать</button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "roster" && (
          <section className="panel guild-content-panel">
            <div className="section-title">Ростер</div>
            <div className="list-lines scroll-list">
              {roster.map((member: any) => (
                <div key={member.id} className="list-line">
                  {member.id === server.player.id ? <span>{member.name} · ты</span> : <button className="text-button" onClick={() => openNpcProfile(member.id)}>{member.name}</button>}
                  <strong>{guildRole(playerGuild, member.id)} · Lv. {member.level} · Gear {gearOf(member)} · {getClassName(member.classId)}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "relations" && (
          <section className="panel guild-content-panel">
            <div className="section-title">Отношения</div>
            <div className="list-lines scroll-list">
              {relationRows.map(({ guild, outgoing, incoming }) => (
                <div key={guild.id} className={`list-line relation-line ${relationTone(outgoing)}`}>
                  <span>
                    <button className="text-button" onClick={() => openGuildProfile(guild.id)}>{guild.name}</button>
                    <small>мы → они: {outgoing} · они → мы: {incoming}</small>
                    <span className="relation-bars">
                      <span className="relation-track"><span className="relation-fill" style={{ width: relationPercent(outgoing) }} /></span>
                      <span className="relation-track"><span className="relation-fill" style={{ width: relationPercent(incoming) }} /></span>
                    </span>
                  </span>
                  <strong>{outgoing}/{incoming}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "castles" && <CastlePanel onBack={() => setTab("profile")} />}

        {tab === "summons" && isGuildMaster && (
          <section className="panel premium-panel guild-summon-panel guild-content-panel">
            <div className="panel-heading compact">
              <div>
                <div className="section-title">Гильдейский призыв</div>
                <h2>Мировой босс гильдии</h2>
              </div>
              <span className="panel-kicker">только ГМ</span>
            </div>
            <div className="profile-grid-modal guild-summon-grid">
              <div className="profile-cell"><span>Откат</span><strong>{formatGuildBossCooldown(summonCooldownLeft)}</strong></div>
              <div className="profile-cell"><span>Активный босс</span><strong>{activeSummonedBoss ? activeSummonedBoss.name : "нет"}</strong></div>
              <div className="profile-cell"><span>Цена</span><strong>{summonCost.gold} Gold</strong></div>
              <div className="profile-cell"><span>Raid Seals</span><strong>{getActivityCurrencyAmount(server.player, "raidSeals")}/{summonCost.raidSeals}</strong></div>
              <div className="profile-cell"><span>War Crests</span><strong>{getActivityCurrencyAmount(server.player, "warCrests")}/{summonCost.warCrests}</strong></div>
            </div>
            <p className="muted guild-summon-help">Вызов доступен вне города. Босс появляется в текущей зоне, открывает рейд и даёт гильдейский бонус к наградам.</p>
            <button
              className="wide-button"
              disabled={summonCooldownLeft > 0 || Boolean(activeSummonedBoss)}
              onClick={summonGuildWorldBoss}
            >
              {activeSummonedBoss
                ? "Сначала закрой активный призыв"
                : summonCooldownLeft > 0
                  ? `Откат: ${formatGuildBossCooldown(summonCooldownLeft)}`
                  : "Призвать мирового босса"}
            </button>
          </section>
        )}

        {tab === "events" && (
          <section className="panel guild-content-panel">
            <div className="section-title">События</div>
            {guildNews.length === 0 ? <p className="muted">Нет событий.</p> : <div className="list-lines">{guildNews.map((entry) => <div key={entry.id} className="list-line"><span>{entry.text}</span><strong>День {entry.day}</strong></div>)}</div>}
          </section>
        )}

        {tab === "profile" && (
          <section className="panel guild-management-panel">
            <div className="section-title">Управление</div>
            <button className="danger-button wide-button" onClick={leaveGuild}>Покинуть гильдию</button>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">Гильдии</div>
        <div className="tab-row">
          <button className="active" onClick={() => setMainTab("guilds")}>Гильдии</button>
          <button onClick={() => setMainTab("wars")}>Войны</button>
            <button onClick={() => setMainTab("castles")}>Замки</button>
        </div>
        <div className="title-row">
          <h1>Список гильдий</h1>
          {playerGuild && <button onClick={() => setShowAllGuilds(false)}>Твоя гильдия</button>}
        </div>
        <div className="chip-row">{(["all", "max", "high", "mid", "low"] as const).map((tier) => <button key={tier} className={tierFilter === tier ? "active" : ""} onClick={() => setTierFilter(tier)}>{tierLabel[tier]}</button>)}</div>
      </section>

      {!server.player.guildId && (
        <section className="panel">
          <div className="section-title">Создать гильдию</div>
          <p className="muted">Цена: 50 000 золота.</p>
          <div className="form-grid">
            <input value={guildName} onChange={(event) => setGuildName(event.target.value)} placeholder="Название гильдии" />
            <select value={guildFocus} onChange={(event) => setGuildFocus(event.target.value as GuildFocus)}>
              <option value="pvp">PvP</option>
              <option value="pve">PvE</option>
              <option value="hybrid">Смешанная</option>
            </select>
            <div className="chip-row">
              {guildTierOptions.map((option) => {
                const locked = server.player.level < option.minLevel;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={guildTier === option.id ? "active" : ""}
                    disabled={locked}
                    onClick={() => setGuildTier(option.id)}
                    title={locked ? `Нужен ${option.minLevel} уровень` : undefined}
                  >
                    {option.label}{locked ? ` · Lv. ${option.minLevel}` : ""}
                  </button>
                );
              })}
            </div>
            <p className="muted">Low доступна всегда. Mid с 21 уровня. High с 41 уровня. Max только на 60 уровне.</p>
            <button disabled={server.player.gold < 50000 || !guildName.trim() || !canCreateSelectedTier} onClick={() => createPlayerGuild(guildName, guildFocus, guildTier)}>
              {canCreateSelectedTier ? "Создать за 50 000" : `Нужен ${guildTierMinLevel[guildTier]} уровень`}
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-title">Топ по общей силе</div>
        <div className="card-grid">
          {guilds.map((guild) => {
            const pending = pendingByGuild.get(guild.id);
            const requiredLevel = getGuildTierMinLevel(guild.tier ?? "low");
            return (
              <article key={guild.id} className="content-card guild-card">
                <button className="text-button guild-title-button" onClick={() => openGuildProfile(guild.id)}><strong>{guild.name}</strong></button>
                <span>{guildFocusLabel(guild.guildFocus)} · {guild.tier ?? "low"} · требование {requiredLevel}+</span>
                <span>ГМ: {renderNpcLink(guild.leaderId)}</span>
                <span>Участников: {guild.memberIds.length}</span>
                <span>Сила: {guildPower(guild)}</span>
                <span>Репутация: {guild.reputation} · PvP: {guild.pvpRating}</span>
                {server.player.guildId ? <button onClick={() => openGuildProfile(guild.id)}>Профиль</button> : pending ? <button disabled>Заявка отправлена</button> : <button disabled={server.player.level < requiredLevel} onClick={() => applyToGuild(guild.id)}>{server.player.level < requiredLevel ? `Нужен ${requiredLevel} ур.` : "Подать заявку"}</button>}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
