# Estudo de integracao da campanha MIR4 no mundo WoC

## Decisao de produto

O mapa original do World of ClaudeCraft e a autoridade fisica permanente do
perfil `mir4-gameplay-port`. O projeto nao gera outro continente em paralelo.
Atualizacoes da equipe WoC em terreno, estradas, pontos de NPC, ecologia,
construcoes, colisores, portais e entradas de dungeon devem chegar ao MIR4 pelo
`BUILTIN_WORLD`.

O MIR4 continua autoridade sobre historia, nomes, dialogos, objetivos, nivel,
atributos, agressividade, experiencia, drops, equipamentos e progressao. Nenhum
asset do jogo 2D participa dessa integracao.

## Regra de encaixe

O transplante tem tres camadas:

1. `MIR4_WOC_CHAPTER_LAYOUTS` associa cada capitulo a uma regiao fisica WoC e a
   pontos narrativos revisados.
2. `seatMir4NpcsOnWocWorld` coloca as identidades MIR4 primeiro nos assentos de
   NPC autorais do WoC. Quando varios capitulos compartilham uma regiao, vertices
   das estradas WoC fornecem assentos adicionais sem criar uma cidade generica.
3. `buildMir4GrindPopulation` usa os acampamentos autorais WoC como malha
   ecologica, substituindo somente a identidade de combate pelo monstro MIR4
   adequado ao capitulo mais proximo.

Essa composicao permite que o mapa continue evoluindo no repositorio WoC sem
perder o roteiro MIR4 nem congelar uma copia do continente.

## Distribuicao narrativa

| Capitulo | Regiao WoC | Uso narrativo e ecologico |
|---|---|---|
| M01 Vila do Vau | Eastbrook Vale | Vila inicial, trilhas seguras curtas, lobos, javalis e salteadores nas bordas. |
| M02 Trilha dos Juncos | Willowfen | Travessia alagada, batedores, criaturas de brejo e primeiros desvios perigosos. |
| M03 Bosque do Vale | Evergarden | Bosque cultivado em conflito com feras, guardioes vegetais e ruinas. |
| M04 Ruinas da Encosta | Thornpeak Heights | Encosta vertical, criptas e ruinas, com concentracao de mortos vivos. |
| M05 Clareira da Fenda | Veiled Hollow | Clareiras sobrenaturais, corrupcao crescente e isolamento pelo portal fisico. |
| M06 Criptas de Pedra-Vela | Wraithwood | Floresta funeraria, trilhas estreitas e acessos a criptas. |
| M07 Galerias do Ossario | Nightbloom | Tumulos, galerias e patrulhas noturnas em terreno aberto e subterraneo. |
| M08 Fortaleza de Brumapedra | Galecrest | Fortaleza e estrada militar cercadas por saqueadores e mortos vivos. |
| M09 Pantano das Lanternas | Mirefen Marsh | Pantano hostil, luzes enganosas, mortos afogados e monstros de lodo. |
| M10 Charcos do Rei Bog | Willowfen | Setor profundo do brejo, inimigos mais fortes e pouca seguranca fora dos NPCs. |
| M11 Mangue das Sanguessugas | Palmreach | Mangue costeiro, feras, insetos e passagens entre mata e agua. |
| M12 Porto dos Juncos | Farshore Isle | Porto isolado, rotas maritimas, invasores e ameacas vindas da fenda. |
| M13 Dunas de Vidro | Amberfall | Campo dourado e mineral, criaturas endurecidas e ruinas expostas. |
| M14 Necropole de Akhet | Wraithwood | Setor profundo da floresta morta, necropole e elites funerarias. |
| M15 Caldeira de Cinerita | Drakelands | Caldeira, cinzas, feras draconicas e acampamentos de guerra. |
| M16 Forja do Sol Partido | Drakelands | Forja e fortificacao no setor mais perigoso da regiao vulcanica. |
| M17 Tundra dos Uivos | Frostveil | Tundra aberta, alcateias, espectros e exposicao a ataques em grupo. |
| M18 Passo do Jarl | Frostveil | Passo montanhoso, gargalos, patrulhas e confronto de alta dificuldade. |
| M19 Veu da Noite | Nightbloom | Retorno ao bioma noturno em um setor mais hostil e ritualistico. |
| M20 Bastilha do Eclipse | Veiled Hollow | Bastilha final, corrupcao maxima e concentracao de elites e chefes. |

Os capitulos que reutilizam uma mesma regiao ocupam setores diferentes. O
capitulo inicial fica perto de um hub ou rota reconhecivel, enquanto o capitulo
tardio usa as partes mais profundas da mesma regiao.

## Densidade e seguranca

`MIR4_WOC_POPULATION_RULES` e a unica fonte para densidade minima, multiplicador
de populacao, raio dos acampamentos e afastamento de entradas. Cada acampamento
novo usa RNG privado por identidade, portanto aumentar ou remover uma populacao
nao altera a sequencia aleatoria global do mundo.

As regras de seguranca sao locais:

- O inventario atual preserva 107 NPCs unicos, pelo menos 158 acampamentos e
  1.258 monstros, com no minimo cinco grupos e 30 criaturas por regiao fisica.
- Centros WoC duplicados sao coalescidos antes do spawn para que dois grupos
  nunca produzam monstros exatamente sobrepostos.
- NPCs, noticeboards, graveyards e Spirit Healers recebem uma area segura que
  considera todo o raio do acampamento, nao apenas o seu centro.
- Entradas de dungeon recebem uma area maior, tambem calculada pelo raio total,
  para impedir combate no carregamento.
- Fora dessas areas, monstros MIR4 continuam agressivos e proximos o bastante
  para sustentar grind e exigir intervencao quando a forca for insuficiente.
- O raio de um grupo nunca volta ao valor comprimido usado no primeiro
  prototipo de projecao.
- Cada seed de terreno reposiciona os controles narrativos em trechos de estrada
  cujo conjunto completo de objetivos permanece pelo menos 0,2 unidade acima
  da agua; a mesma seed filtra os acampamentos headless.

## Duas familias de dungeon

### Dungeons originais WoC

As entradas de `DUNGEON_LIST` continuam objetos fisicos do mundo. O perfil MIR4
pode atravessa-las pelo mesmo `updateDoorTriggers` usado pelo WoC. Essas entradas
nao consultam nem consomem ticket MIR4. A porta interna da Cripta Abandonada
para `nythraxis_boss_arena` pertence a essa mesma familia fisica e permanece
aberta quando os requisitos nativos de raid e attunement forem cumpridos.

Continuam validas as demais regras nativas da dungeon, como tamanho sugerido de
grupo, dificuldade, attunement, bloqueio de raid, reset de instancia e lockout de
Heroic. A ausencia de ticket nao remove essas regras.

### Dungeons MIR4

`MIR4_TICKETED_DUNGEON_CATALOG` preserva os IDs 101 a 106 e os requisitos de
nivel, Combat Power e grupo recuperados do runtime original. A admissao usa
`MIR4_DUNGEON_TICKET_POLICY`: ticket tipo 3, custo por entrada, limite renovavel
e horario de reset do contrato original.

Para respeitar a regra de que a campanha principal nao trava por uma moeda
diaria, a primeira entrada exigida por uma Main Quest deve receber um ticket
vinculado a essa quest e consumi-lo na mesma transacao. Repeticoes, farm e
entradas fora da Main Quest usam a carteira limitada normal. O ticket vinculado
nao pode ser vendido, acumulado ou usado em outra dungeon.

## Contratos de manutencao

- Alterar o mapa WoC significa atualizar `BUILTIN_WORLD`, nunca copiar seus
  arrays para um modulo MIR4.
- Um novo assento WoC de NPC ou acampamento elegivel entra automaticamente na
  adaptacao, respeitando as exclusoes de seguranca.
- Uma nova dungeon WoC precisa aparecer fisicamente no `DUNGEON_LIST` e entrar
  explicitamente em `WOC_OPEN_DUNGEON_IDS`; ela nunca herda ticket MIR4 por nome.
- Uma nova dungeon MIR4 entra somente por registro explicito no catalogo
  ticketado, nunca por inferencia de nome ou modelo.
- `tests/mir4/woc_comparison_world.test.ts`,
  `tests/mir4/dungeon_access_policy.test.ts` e `tests/dungeons.test.ts` protegem
  esses limites.
