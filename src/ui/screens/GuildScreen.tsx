import { useMemo, useState } from "react";
import { CLASSES } from "../../content/classes";
import { useGameStore } from "../../state/gameStore";
import { getGearScore } from "../../systems/itemSystem";
import type { Guild } from "../../types/game";
import { GuildWarPanel, ServerGuildWarList } from "../components/GuildWarPanel";

const getNpcName = (
  server: ReturnType<typeof useGameStore.getState>["server"],
  id?: string,
) => {
  if (!id) return "нет";
  if (id === server.player.id) return server.player.name;
  return server.npcs.find((npc) => npc.id === id)?.name ?? id;
};

const getClassName = (classId: string) =>
  CLASSES.find((entry) => entry.id === classId)?.name ?? classId;

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

const tierLabel: Record<string, string> = {
  all: "Все",
  high: "High",
  mid: "Mid",
  low: "Low",
};

const guildPower = (guild: Guild) => (guild.reputation ?? 0) + (guild.pvpRating ?? 0);

export const GuildScreen = () => {
  const server = useGameStore((state) => state.server);
  const applyToGuild = useGameStore((state) => state.applyToGuild);
  const leaveGuild = useGameStore((state) => state.leaveGuild);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const openGuildProfile = useGameStore((state) => state.openGuildProfile);
  const [showAllGuilds, setShowAllGuilds] = useState(false);
  const [tierFilter, setTierFilter] = useState<"all" | "high" | "mid" | "low">("all");

  const playerGuild = server.guilds.find(
    (entry) => entry.id === server.player.guildId,
  );
  const pendingByGuild = new Map(
    server.guildApplications
      .filter((app) => app.status === "pending")
      .map((app) => [app.guildId, app]),
  );
  const guilds = useMemo(
    () => server.guilds
      .filter((guild) => tierFilter === "all" || guild.tier === tierFilter)
      .sort((a, b) => guildPower(b) - guildPower(a) || (b.level ?? 1) - (a.level ?? 1) || b.memberIds.length - a.memberIds.length),
    [server.guilds, tierFilter],
  );

  if (playerGuild && !showAllGuilds) {
    const roleWeight = (id: string) => {
      if (playerGuild.leaderId === id) return 0;
      if (playerGuild.deputyId === id) return 1;
      if ((playerGuild.officerIds ?? []).includes(id)) return 2;
      return 3;
    };
    const gearOf = (member: any) => member.id === server.player.id ? getGearScore(server.player.equipment) : (member.gearScore ?? getGearScore(member.equipment ?? {}));
    const roster = playerGuild.memberIds
      .map((id) =>
        id === server.player.id
          ? server.player
          : server.npcs.find((npc) => npc.id === id),
      )
      .filter(Boolean)
      .sort((a: any, b: any) =>
        roleWeight(a.id) - roleWeight(b.id)
        || b.level - a.level
        || gearOf(b) - gearOf(a)
      )
      .slice(0, 100);

    const guildNews = server.worldNews
      .filter((entry) => entry.text.includes(playerGuild.name))
      .slice(0, 8);

    return (
      <div className="screen-stack">
        <section className="panel hero-panel">
          <div className="section-title">Твоя гильдия</div>
          <div className="title-row">
            <h1>{playerGuild.name}</h1>
            <button onClick={() => setShowAllGuilds(true)}>Гильдии</button>
          </div>
          <p className="muted">
            {playerGuild.type} · {playerGuild.tier ?? "low"} · Lv. {playerGuild.level} · сила {guildPower(playerGuild)}
          </p>
          <div className="stat-grid">
            <span>
              👑 ГМ: {" "}
              {playerGuild.leaderId &&
              playerGuild.leaderId !== server.player.id ? (
                <button
                  className="text-button inline-button"
                  onClick={() => openNpcProfile(playerGuild.leaderId!)}
                >
                  {getNpcName(server, playerGuild.leaderId)}
                </button>
              ) : (
                getNpcName(server, playerGuild.leaderId)
              )}
            </span>
            <span>
              🛡️ Зам: {playerGuild.deputyId && playerGuild.deputyId !== server.player.id ? (
                <button className="text-button inline-button" onClick={() => openNpcProfile(playerGuild.deputyId!)}>{getNpcName(server, playerGuild.deputyId)}</button>
              ) : getNpcName(server, playerGuild.deputyId)}
            </span>
            <span>Твоя роль: {guildRoleIcon(playerGuild, server.player.id)} {guildRole(playerGuild, server.player.id)}</span>
            <span>Участников: {playerGuild.memberIds.length}</span>
            <span>Репутация: {playerGuild.reputation}</span>
            <span>PvP: {playerGuild.pvpRating}</span>
            <span>Стабильность: {playerGuild.stability}</span>
            <span>Рейд: {playerGuild.raidProgress}%</span>
          </div>
        </section>

        <GuildWarPanel />

        <section className="panel">
          <div className="section-title">Ростер</div>
          <div className="list-lines">
            {roster.map(
              (member) =>
                member && (
                  <div key={member.id} className="list-line">
                    {member.id === server.player.id ? (
                      <span>{guildRoleIcon(playerGuild, member.id)} {member.name} · ты</span>
                    ) : (
                      <button
                        className="text-button"
                        onClick={() => openNpcProfile(member.id)}
                      >
                        {guildRoleIcon(playerGuild, member.id)} {member.name}
                      </button>
                    )}
                    <strong>
                      {guildRole(playerGuild, member.id)} · Lv. {member.level} · Gear {gearOf(member)} · {getClassName(member.classId)}
                    </strong>
                  </div>
                ),
            )}
          </div>
          {playerGuild.memberIds.length > roster.length && (
            <p className="muted">
              Показано: {roster.length}/{playerGuild.memberIds.length}
            </p>
          )}
        </section>

        <section className="panel">
          <div className="section-title">Управление</div>
          <button className="danger-button wide-button" onClick={leaveGuild}>
            Покинуть гильдию
          </button>
        </section>

        <section className="panel">
          <div className="section-title">События</div>
          {guildNews.length === 0 ? (
            <p className="muted">Нет событий.</p>
          ) : (
            <div className="list-lines">
              {guildNews.map((entry) => (
                <div key={entry.id} className="list-line">
                  <span>{entry.text}</span>
                  <strong>День {entry.day}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }


  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">Гильдии</div>
        <div className="title-row">
          <h1>Список гильдий</h1>
          {playerGuild && <button onClick={() => setShowAllGuilds(false)}>Назад</button>}
        </div>
        <div className="chip-row">
          {(["all", "high", "mid", "low"] as const).map((tier) => (
            <button key={tier} className={tierFilter === tier ? "active" : ""} onClick={() => setTierFilter(tier)}>
              {tierLabel[tier]}
            </button>
          ))}
        </div>
      </section>

      <ServerGuildWarList />

      <section className="panel">
        <div className="section-title">Топ по общей силе</div>
        <div className="card-grid">
          {guilds.map((guild) => {
            const pending = pendingByGuild.get(guild.id);
            return (
              <article key={guild.id} className="content-card guild-card">
                <button className="text-button guild-title-button" onClick={() => openGuildProfile(guild.id)}><strong>{guild.name}</strong></button>
                <span>
                  {guild.type} · {guild.tier ?? "low"} · Lv. {guild.level} · вход {guild.minLevel ?? 1}+
                </span>
                <span>
                  👑 ГМ: {" "}
                  {guild.leaderId && guild.leaderId !== server.player.id ? (
                    <button
                      className="text-button inline-button"
                      onClick={() => openNpcProfile(guild.leaderId!)}
                    >
                      {getNpcName(server, guild.leaderId)}
                    </button>
                  ) : (
                    getNpcName(server, guild.leaderId)
                  )}
                </span>
                <span>Участников: {guild.memberIds.length}</span>
                <span>Сила: {guildPower(guild)}</span>
                <span>Gear: {guild.reputation} · PvP: {guild.pvpRating}</span>
                {server.player.guildId ? (
                  <button onClick={() => openGuildProfile(guild.id)}>Профиль</button>
                ) : pending ? (
                  <button disabled>Заявка отправлена</button>
                ) : (
                  <button disabled={server.player.level < (guild.minLevel ?? 1)} onClick={() => applyToGuild(guild.id)}>
                    {server.player.level < (guild.minLevel ?? 1) ? `Нужен ${guild.minLevel ?? 1} ур.` : "Подать заявку"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
