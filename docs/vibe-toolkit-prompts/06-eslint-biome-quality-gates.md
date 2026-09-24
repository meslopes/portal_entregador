# Quality Gates de Lint: ESLint + Biome

Dois linters, dois papéis — de propósito, sem sobreposição. Um roda um
conjunto pequeno e cuidadosamente escolhido de regras, mirando um punhado de
anti-padrões bem específicos. O outro carrega o grosso da cobertura: regras
que precisam da informação completa de tipos do TypeScript, mais as regras
específicas do framework que o projeto usa. Rodar os dois ao mesmo tempo não
é redundância — é deixar cada ferramenta cobrir a parte em que ela é rápida
e precisa, em vez de escolher uma só e pedir pra ela fazer o trabalho
inteiro sozinho.

Esse guia primeiro explica o raciocínio por trás dessa divisão — por que
duas ferramentas, por que um conjunto curado de regras em vez do pacote
"recomendado" inteiro, por que um aviso de lint pode ser uma ferramenta de
migração e não só um estado passageiro. Depois, um tutorial passo a passo
mostra como montar esse esquema do zero, num projeto novo. Por fim, cinco
exemplos de código mostram as pegadinhas mais surpreendentes desse esquema
na prática — o tipo de coisa que só aparece depois que você já bateu de
cara com ela uma vez.

**Fonte:** https://raw.githubusercontent.com/soumatheusgomes/vibe-coding-toolkit/main/docs/tools/06-eslint-biome-quality-gates.md
