import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import {
  CreateCharacterSchema,
  CharacterSummarySchema,
  DEFAULT_COSMETICS,
  cosmeticsOf,
  type Cosmetics,
  type SessionResponse,
} from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';
import {
  createCharacter,
  resumeSession,
  newLocalIdentity,
  request,
} from '../../game/networking/api';
import { WorldConnection } from '../../game/networking/world-connection';
import { WorldPreview } from '../components/world-preview';
import { GameHud } from '../components/game-hud';
import {
  CharacterCustomizer,
  CharacterPortrait,
} from '../components/character-customizer';
export function App() {
  const snapshot = useSyncExternalStore(
    gameBridge.subscribe,
    gameBridge.getSnapshot,
  );
  const [session, setSession] = useState<SessionResponse | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [ready, setReady] = useState<boolean | null>(null),
    [name, setName] = useState(''),
    [look, setLook] = useState<Cosmetics>(DEFAULT_COSMETICS),
    [editing, setEditing] = useState(false),
    [connection, setConnection] = useState<WorldConnection | null>(null);
  useEffect(() => {
    let active = true;
    void fetch('/health/ready')
      .then((r) => {
        if (active) setReady(r.ok);
      })
      .catch(() => {
        if (active) setReady(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => () => connection?.dispose(), [connection]);
  const load = async (fresh = false) => {
    setBusy(true);
    setError(null);
    try {
      const s = await (fresh ? newLocalIdentity() : resumeSession());
      setSession(s);
      setLook(cosmeticsOf(s.character ?? DEFAULT_COSMETICS));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Servidor indisponível.');
    } finally {
      setBusy(false);
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      if (session.character) {
        const c = CharacterSummarySchema.parse(
          await request('/api/character/appearance', session.token, look),
        );
        setSession({ ...session, character: c });
        setEditing(false);
      } else {
        const parsed = CreateCharacterSchema.safeParse({
          name,
          appearance: 'sage',
          ...look,
        });
        if (!parsed.success)
          throw new Error(
            'Use um nome de 3 a 20 caracteres: letras, números, espaços, _ ou -.',
          );
        setSession({
          ...session,
          character: await createCharacter(session.token, parsed.data),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  };
  const enter = () => {
    if (!session) return;
    connection?.dispose();
    const next = new WorldConnection();
    setConnection(next);
    void next.connect(session.token);
  };
  const playing =
    !!session?.character &&
    (snapshot.status === 'connected' || snapshot.status === 'connecting');
  return (
    <main className={`app-shell ${playing ? 'playing' : 'lobby'}`}>
      <div className="layout">
        <section className="world-panel">
          <div className="world-frame">
            <WorldPreview />
            {playing ? (
              <GameHud
                connection={connection}
                name={session!.character!.name}
                ready={ready}
                onExit={() => {
                  connection?.dispose();
                  setConnection(null);
                }}
              />
            ) : (
              <div className="lobby-overlay">
                <header className="lobby-brand">
                  <span>✦</span> AETHERIA <small>ONLINE · BRUMAVALE</small>
                </header>
                <section className="lobby-card">
                  <div className="lobby-heading">
                    <span>UM MUNDO PARA CULTIVAR</span>
                    <h1>
                      {session && !session.character
                        ? 'Sua jornada começa aqui.'
                        : editing
                          ? 'Um novo visual. A mesma história.'
                          : 'Encontre seu lugar em Aetheria.'}
                    </h1>
                    <p>
                      Explore, cultive e construa sua história com outros
                      jogadores.
                    </p>
                  </div>
                  {!session && (
                    <div className="lobby-welcome">
                      <div className="welcome-emblem">✦</div>
                      <h2>Bem-vindo a Brumavale</h2>
                      <p>
                        Seu personagem e progresso são salvos neste computador.
                      </p>
                      <button
                        className="primary-button"
                        onClick={() => void load()}
                        disabled={busy}
                      >
                        {busy ? 'Preparando…' : 'Começar jornada'}{' '}
                        <span>→</span>
                      </button>
                      {error && (
                        <button
                          className="text-button"
                          onClick={() => void load(true)}
                        >
                          Criar nova identidade local
                        </button>
                      )}
                    </div>
                  )}
                  {session && (!session.character || editing) && (
                    <form onSubmit={(e) => void submit(e)}>
                      <fieldset disabled={busy} className="creator-fields">
                        {!session.character && (
                          <label className="name-field">
                            Nome do personagem
                            <input
                              id="character-name"
                              aria-label="Nome do personagem"
                              autoComplete="off"
                              minLength={3}
                              maxLength={20}
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Como devemos chamar você?"
                              required
                              autoFocus
                            />
                          </label>
                        )}
                        <CharacterCustomizer look={look} onChange={setLook} />
                        <div className="creator-actions">
                          {editing && (
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => {
                                setLook(cosmeticsOf(session.character!));
                                setEditing(false);
                              }}
                            >
                              Cancelar
                            </button>
                          )}
                          <button type="submit" className="primary-button">
                            {busy
                              ? 'Salvando…'
                              : editing
                                ? 'Salvar aparência'
                                : 'Criar personagem'}{' '}
                            <span>→</span>
                          </button>
                        </div>
                      </fieldset>
                    </form>
                  )}
                  {session?.character && !editing && (
                    <div className="returning-player">
                      <div className="portrait-stage">
                        <CharacterPortrait look={session.character} />
                      </div>
                      <h2>Bem-vindo, {session.character.name}</h2>
                      <p>Seu mundo está à sua espera.</p>
                      <button
                        className="primary-button"
                        onClick={enter}
                        disabled={busy}
                      >
                        Entrar na vila <span>→</span>
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          setLook(cosmeticsOf(session.character!));
                          setEditing(true);
                        }}
                      >
                        Personalizar personagem
                      </button>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => void load(true)}
                      >
                        Usar outra identidade local
                      </button>
                    </div>
                  )}
                  {(error || snapshot.error) && (
                    <p className="error-message" role="alert">
                      {error ?? snapshot.error}
                    </p>
                  )}
                  <footer className="lobby-status">
                    <span data-testid="database-status">
                      {ready === null
                        ? 'Verificando…'
                        : ready
                          ? 'Disponível'
                          : 'Indisponível'}
                    </span>
                    <span data-testid="connection-status">Desconectado</span>
                    <span data-testid="player-count">00 / 16</span>
                    <span data-testid="world-position">
                      {snapshot.position?.x ?? 1040},{' '}
                      {snapshot.position?.y ?? 1040} · Parado
                    </span>
                  </footer>
                </section>
                <p className="lobby-hint">
                  WASD · explorar &nbsp; E · interagir &nbsp; B · mochila
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
