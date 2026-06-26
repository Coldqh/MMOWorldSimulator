import { useMemo, useState } from "react";
import { CLASSES } from "../../content/classes";
import { useGameStore } from "../../state/gameStore";
import { getGearScore } from "../../systems/itemSystem";
import { getPlayerGuildPendingApplications } from "../../systems/guildRuntimeSystem";
import { guildFocusLabel } from "../../systems/guildIdentitySystem";
import { GuildWarPanel, ServerGuildWarList } from "../components/GuildWarPanel";
import type { Guild, GuildFocus } from "../../types/game";

type GuildTab = "profile" | "roster" | "applications" | "relations" | "wars" | "events";

const getNpcName = (server: ReturnType<typeof useGameStore.getState>["server"], id?: string) => {
  if (!id) return "нет";
  if (id === server.player.id) return server.player.name;
  return server.npcs.find((npc) => npc.id === id)?.name ?? id;
};

const getClassName = (classId: string) => CLASSES.find((entry) => entry.id === classId)?.name ?? classId;

const guildRole = (guild: Guild, id: string) => {
  if (guild.leaderId === id) return "ГМ";
  if (guild.deputyId === id) return "Зам";
  if ((guild.officerIds ?? []).includes(id)) return "Офицер";
  return "Участник";
};

const guildRoleIcon = (guild: Guild, id: string) => {
  if (guild.leaderId === id) return "👑";
  if (guild.deputyId === id) return "🛡️";
  if ((guild.officerIds ?? []).includes(id)) return "⚔️";
  return "";
};

const tierLabel: Record<string, string> = { all: "Все", high: "High", mid: "Mid", low: "Low" };
const guildPower = (guild: Guild) => (guild.reputation ?? 0) + (guild.pvpRating ?? 0);
const relationPercent = (value: number) => `${Math.max(0, Math.min(100, value + 100) / 2)}%`;
const relationTone = (value: number) => value <= -40 ? "danger-line" : value >= 40 ? "ready-line" : "";

export const GuildScreen = () => {
  const server = useGameStore((state) => state.server);
  const applyToGuild = useGameStore((state) => state.applyToGuild);
  const leaveGuild = useGameStore((state) => state.leaveGuild);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const openGuildProfile = useGameStore((state) => state.openGuildProfile);
  const createPlayerGuild = useGameStore((state) => state.createPlayerGuild);
  const acceptGuildApplicant = useGameStore((state) => state.acceptGuildApplicant);
  const rejectGuildApplicant = useGameStore((state) => state.rejectGuildApplicant);

  const [showAllGuilds, setShowAllGuilds] = useState(false);
  const [tierFilter, setTierFilter] = useState<"all" | "high" | "mid" | "low">("all");
  const [tab, setTab] = useState<GuildTab>("profile");
  const [guildName, setGuildName] = useState("");
  const [guildFocus, setGuildFocus] = useState<GuildFocus>("pvp");
  const [guildLevel, setGuildLevel] = useState(1);

  const playerGuild = server.guilds.find((entry) => entry.id === server.player.guildId);
  const applications = getPlayerGuildPendingApplications(server);
  const pendingByGuild = new Map(server.guildApplications.filter((app) => app.status === "pending").map((app) => [app.guildId, app]));

  const guilds = useMemo(
    () => server.guilds
      .filter((guild) => tierFilter === "all" || guild.tier === tierFilter)
      .sort((a, b) => guildPower(b) - guildPower(a) || (b.level ?? 1) - (a.level ?? 1) || b.memberIds.length - a.memberIds.length),
    [server.guilds, tierFilter],
  );

  const renderNpcLink = (id?: string, fallback = "нет") => {
    if (!id) return <span>{fallback}</span>;
    if (id === server.player.id) return <strong>{server.player.name} · ты</strong>;
    return <button className="text-button inline-button" onClick={() => openNpcProfile(id)}>{getNpcName(server, id)}</button>;
  };

  if (playerGuild && !showAllGuilds) {
    const roleWeight = (id: string) => playerGuild.leaderId === id ? 0 : playerGuild.deputyId === id ? 1 : (playerGuild.officerIds ?? []).includes(id) ? 2 : 3;
    const gearOf = (member: any) => member.id === server.player.id ? getGearScore(server.player.equipment) : (member.gearScore ?? getGearScore(member.equipment ?? {}));
    const roster = playerGuild.memberIds
      .map((id) => id === server.player.id ? server.player : server.npcs.find((npc) => npc.id === id))
      .filter(Boolean)
      .sort((a: any, b: any) => roleWeight(a.id) - roleWeight(b.id) || b.level - a.level || gearOf(b) - gearOf(a))
      .slice(0, 160);
    const guildNews = server.worldNews.filter((entry) => entry.text.includes(playerGuild.name)).slice(0, 8);
    const activeWars = (server.guildWars ?? []).filter((war) => war.status === "active" && (war.attackerGuildId === playerGuild.id || war.defenderGuildId === playerGuild.id));
    const relationRows = server.guilds
      .filter((guild) => guild.id !== playerGuild.id)
      .map((guild) => ({
        guild,
        outgoing: server.guildRelations.find((rel) => rel.fromGuildId === playerGuild.id && rel.toGuildId === guild.id)?.value ?? 0,
        incoming: server.guildRelations.find((rel) => rel.fromGuildId === guild.id && rel.toGuildId === playerGuild.id)?.value ?? 0,
      }))
      .sort((a, b) => a.outgoing - b.outgoing || a.guild.name.localeCompare(b.guild.name));
    const officerText = (playerGuild.officerIds ?? []).length === 0 ? <span>нет</span> : (playerGuild.officerIds ?? []).slice(0, 4).map((id) => <span key={id}> {renderNpcLink(id)}</span>);

    return (
      <div className="screen-stack">
        <section className="panel hero-panel">
          <div className="section-title">Твоя гильдия</div>
          <div className="title-row">
            <h1>{playerGuild.name}</h1>
            <button onClick={() => setShowAllGuilds(true)}>Гильдии</button>
          </div>
          <p className="muted">{guildFocusLabel(playerGuild.guildFocus)} · {playerGuild.tier ?? "low"} · Lv. {playerGuild.level} · сила {guildPower(playerGuild)}</p>
          <div className="tab-row">
            <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>Профиль</button>
            <button className={tab === "roster" ? "active" : ""} onClick={() => setTab("roster")}>Ростер</button>
            {playerGuild.leaderId === server.player.id && <button className={tab === "applications" ? "active" : ""} onClick={() => setTab("applications")}>Заявки {applications.length}</button>}
            <button className={tab === "relations" ? "active" : ""} onClick={() => setTab("relations")}>Отношения</button>
            <button className={tab === "wars" ? "active" : ""} onClick={() => setTab("wars")}>Войны</button>
            <button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>События</button>
          </div>
        </section>

        {tab === "profile" && (
          <section className="panel">
            <div className="section-title">Профиль</div>
            <div className="profile-grid-modal">
              <div className="profile-cell"><span>Тип</span><strong>{guildFocusLabel(playerGuild.guildFocus)}</strong></div>
              <div className="profile-cell"><span>Уровень</span><strong>{playerGuild.level}</strong></div>
              <div className="profile-cell"><span>Требование</span><strong>{playerGuild.minLevel ?? 1}+ уровень</strong></div>
              <div className="profile-cell"><span>Участников</span><strong>{playerGuild.memberIds.length}</strong></div>
              <div className="profile-cell"><span>Репутация</span><strong>{playerGuild.reputation}</strong></div>
              <div className="profile-cell"><span>PvP рейтинг</span><strong>{playerGuild.pvpRating}</strong></div>
              <div className="profile-cell"><span>Активные войны</span><strong>{activeWars.length}</strong></div>
              <div className="profile-cell"><span>Твоя роль</span><strong>{guildRoleIcon(playerGuild, server.player.id)} {guildRole(playerGuild, server.player.id)}</strong></div>
              <div className="profile-cell"><span>ГМ</span><strong>{renderNpcLink(playerGuild.leaderId)}</strong></div>
              <div className="profile-cell"><span>Зам</span><strong>{renderNpcLink(playerGuild.deputyId)}</strong></div>
              <div className="profile-cell wide-cell"><span>Офицеры</span><strong>{officerText}</strong></div>
            </div>
          </section>
        )}

        {tab === "applications" && playerGuild.leaderId === server.player.id && (
          <section className="panel">
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
          <section className="panel">
            <div className="section-title">Ростер</div>
            <div className="list-lines scroll-list">
              {roster.map((member: any) => (
                <div key={member.id} className="list-line">
                  {member.id === server.player.id ? <span>{guildRoleIcon(playerGuild, member.id)} {member.name} · ты</span> : <button className="text-button" onClick={() => openNpcProfile(member.id)}>{guildRoleIcon(playerGuild, member.id)} {member.name}</button>}
                  <strong>{guildRole(playerGuild, member.id)} · Lv. {member.level} · Gear {gearOf(member)} · {getClassName(member.classId)}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "relations" && (
          <section className="panel">
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

        {tab === "wars" && <GuildWarPanel />}
        {tab === "events" && (
          <section className="panel">
            <div className="section-title">События</div>
            {guildNews.length === 0 ? <p className="muted">Нет событий.</p> : <div className="list-lines">{guildNews.map((entry) => <div key={entry.id} className="list-line"><span>{entry.text}</span><strong>День {entry.day}</strong></div>)}</div>}
          </section>
        )}

        <section className="panel">
          <div className="section-title">Управление</div>
          <button className="danger-button wide-button" onClick={leaveGuild}>Покинуть гильдию</button>
        </section>
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">Гильдии</div>
        <div className="title-row"><h1>Список гильдий</h1>{playerGuild && <button onClick={() => setShowAllGuilds(false)}>Назад</button>}</div>
        <div className="chip-row">{(["all", "high", "mid", "low"] as const).map((tier) => <button key={tier} className={tierFilter === tier ? "active" : ""} onClick={() => setTierFilter(tier)}>{tierLabel[tier]}</button>)}</div>
      </section>

      {!server.player.guildId && (
        <section className="panel">
          <div className="section-title">Создать гильдию</div>
          <p className="muted">Цена: 50 000 золота. Уровень гильдии нельзя поставить выше уровня персонажа.</p>
          <div className="form-grid">
            <input value={guildName} onChange={(event) => setGuildName(event.target.value)} placeholder="Название гильдии" />
            <select value={guildFocus} onChange={(event) => setGuildFocus(event.target.value as GuildFocus)}>
              <option value="pvp">PvP</option>
              <option value="pve">PvE</option>
              <option value="hybrid">Смешанная</option>
            </select>
            <input type="number" min={1} max={server.player.level} value={guildLevel} onChange={(event) => setGuildLevel(Math.max(1, Math.min(server.player.level, Number(event.target.value) || 1)))} />
            <button disabled={server.player.gold < 50000 || !guildName.trim()} onClick={() => createPlayerGuild(guildName, guildFocus, guildLevel)}>Создать за 50 000</button>
          </div>
        </section>
      )}

      <ServerGuildWarList />

      <section className="panel">
        <div className="section-title">Топ по общей силе</div>
        <div className="card-grid">
          {guilds.map((guild) => {
            const pending = pendingByGuild.get(guild.id);
            return (
              <article key={guild.id} className="content-card guild-card">
                <button className="text-button guild-title-button" onClick={() => openGuildProfile(guild.id)}><strong>{guild.name}</strong></button>
                <span>{guildFocusLabel(guild.guildFocus)} · {guild.tier ?? "low"} · Lv. {guild.level} · требование {guild.minLevel ?? 1}+</span>
                <span>ГМ: {renderNpcLink(guild.leaderId)}</span>
                <span>Участников: {guild.memberIds.length}</span>
                <span>Сила: {guildPower(guild)}</span>
                <span>Репутация: {guild.reputation} · PvP: {guild.pvpRating}</span>
                {server.player.guildId ? <button onClick={() => openGuildProfile(guild.id)}>Профиль</button> : pending ? <button disabled>Заявка отправлена</button> : <button disabled={server.player.level < (guild.minLevel ?? 1)} onClick={() => applyToGuild(guild.id)}>{server.player.level < (guild.minLevel ?? 1) ? `Нужен ${guild.minLevel ?? 1} ур.` : "Подать заявку"}</button>}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
