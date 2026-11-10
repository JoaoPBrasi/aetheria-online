import { describe, expect, it } from 'vitest';
import { QuestManager } from './quest-manager.js';

describe('QuestManager (Servidor)', () => {
  it('gerencia missões de um personagem isoladamente', () => {
    const qm = new QuestManager();
    const charId = 'test-player-1';

    expect(qm.getQuests(charId)).toEqual([]);

    const quest = qm.acceptQuest(charId, 'tutorial_first_steps');
    expect(quest.status).toBe('in_progress');
    expect(quest.progress.gather_wood).toBe(0);

    // Tentativa de aceitar novamente não reinicia o progresso
    const repeat = qm.acceptQuest(charId, 'tutorial_first_steps');
    expect(repeat).toBe(quest);
  });

  it('avança objetivos de coleta, craft e combate no servidor', () => {
    const qm = new QuestManager();
    const charId = 'test-player-2';
    qm.acceptQuest(charId, 'tutorial_first_steps');

    // Coleta madeira
    const gRes = qm.advanceObjective(charId, 'gather', 'wood', 5);
    expect(gRes.length).toBe(1);
    expect(gRes[0].updated.progress.gather_wood).toBe(5);

    // Fabricação de tábuas
    const cRes = qm.advanceObjective(charId, 'craft', 'plank', 2);
    expect(cRes[0].updated.progress.craft_planks).toBe(2);

    // Abate de slimes
    const dRes = qm.advanceObjective(charId, 'defeat', 'slime', 2);
    expect(dRes[0].updated.progress.defeat_slimes).toBe(2);
    expect(dRes[0].updated.status).toBe('ready_to_turn_in');

    // Entrega da missão
    const turnIn = qm.turnInQuest(charId, 'tutorial_first_steps');
    expect(turnIn.success).toBe(true);
    expect(turnIn.rewards?.xp.profession).toBe('warrior');
    expect(turnIn.rewards?.xp.amount).toBe(50);
    expect(turnIn.rewards?.items.length).toBeGreaterThan(0);

    // Verificar que o status mudou para completed
    expect(qm.getQuest(charId, 'tutorial_first_steps')?.status).toBe(
      'completed',
    );
  });

  it('rejeita entrega de missão não concluída', () => {
    const qm = new QuestManager();
    const charId = 'test-player-3';
    qm.acceptQuest(charId, 'tutorial_first_steps');

    const result = qm.turnInQuest(charId, 'tutorial_first_steps');
    expect(result.success).toBe(false);
    expect(result.error).toContain('ainda não cumpriu todos os objetivos');
  });
});
