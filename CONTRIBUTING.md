# Guia de Contribuição — Aetheria Online

Bem-vindo ao desenvolvimento do **Aetheria Online**!

Para manter a consistência, integridade e estabilidade do projeto tanto para desenvolvedores quanto para assistentes de IA (Codex, Antigravity, etc.), consulte o guia completo de regras, fluxo de branches e arquitetura:

👉 **[Consulte as Diretrizes Oficiais em AGENTS.md](./AGENTS.md)**

### Resumo das Regras:
1. **Branch de Trabalho:** Todas as novas funcionalidades devem ser desenvolvidas na branch `release`.
2. **Homologação:** Apenas após testes e validação com o usuário as mudanças são promovidas para a branch `beta`.
3. **Qualidade:** Nenhum commit deve ser realizado com falhas em `pnpm test` ou erros de TypeScript (`tsc --noEmit`).
4. **Base de Conhecimento:** Consulte e mantenha sincronizadas as notas no **Obsidian** em `C:\Dev\Projeto RPG\projeto RPG`.
