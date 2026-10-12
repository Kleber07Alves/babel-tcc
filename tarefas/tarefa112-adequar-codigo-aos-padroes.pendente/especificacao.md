# Tarefa 112 - Adequar codigo existente aos padroes unificados

## Fase
6 - Polimento e Deploy

## Objetivo
Trazer o codigo que ja existia para as regras de docs/padroes-codigo.md, depois que as
proibicoes absolutas passaram a valer para todas as linguagens e nao so para C#.

## Contexto
O projeto tinha duas fontes de regra: docs/padroes-codigo.md, com a tabela completa de
proibicoes, e um resumo de 6 linhas no CONTRIBUTING.md. As duas divergiam. A unificacao
deixou docs/padroes-codigo.md como fonte unica e declarou que as proibicoes valem para as
quatro linguagens do projeto.

O codigo escrito antes disso nao e conforme. As regras valem para codigo novo desde ja;
esta tarefa e a adequacao do que ficou para tras, feita de proposito em separado para nao
inflar PRs que tocam esses arquivos por outro motivo.

O primeiro inventario (2026-08-16) cobria so o plugin IntelliJ, o tokenizer Python e os
scripts de build. Uma varredura da `main` em 2026-10-12 mostrou que ele estava incompleto:
a extensao VS Code e o Core C# tambem tem desvios, e nenhum dos dois estava rastreado. O
inventario abaixo substitui o anterior.

Os dois casos novos tem naturezas diferentes:

- **Extensao VS Code (TypeScript): legado.** Todo desvio e anterior a 2026-08-16, data em
  que as proibicoes passaram a valer para TypeScript.
- **Core C#: regressao.** O operador ternario foi removido e banido em 2026-02-25 (commit
  `9d40362`). Os ternarios que existem hoje entraram depois dessa data, entre 2026-03-01 e
  2026-04-05. Nao ha verificacao por maquina das proibicoes, entao nada os barrou.

## Inventario (retrato de 2026-10-12)

Producao e teste contados em separado. Os numeros envelhecem a cada commit: recontar com os
comandos de contexto.md antes de comecar.

### Extensao VS Code (packages/ide-adapters/vscode)

| Desvio | src/ | test/ |
|---|---|---|
| Operador ternario | 33 | 6 |
| Tipo anulavel (`\| undefined`, `\| null`) | 49 | 7 |
| Declaracao sem tipo explicito | 31 | 249 |
| `private` | 15 | 4 |
| Literal `null` | 13 | 7 |
| Construtor | 10 | 9 |
| `??` | 4 | 7 |
| `?.` | 2 | 4 |
| `throw` | 1 | 0 |
| `try/catch` (exige justificativa) | 20 | 0 |

- 19 dos 33 ternarios de `src/` sao a mesma expressao repetida,
  `error instanceof Error ? error.message : String(error)`. Uma funcao unica elimina os 19.
- 11 dos 15 `private` e o unico `throw` estao em `src/services/coreBridge.ts`.
- Dois arquivos declaram mais de um tipo: `src/services/coreBridge.ts` (`CoreResponse`,
  `ValidationResult`, `DiagnosticEntry`, `CoreBridge`) e
  `src/providers/autoTranslateManager.ts` (`AutoTranslateManager`, `TabInfo`).

### Core C# (packages/core)

| Desvio | Producao | Testes |
|---|---|---|
| Operador ternario | 10 | 29 |
| `!` de supressao de nulo | 10 | 38 |
| Tipo anulavel | 4 | 4 |
| `??` | 2 | 1 |
| Construtor de instancia | 2 | 10 |
| `try/catch` sem comentario de justificativa | 9 de 12 | nao contado |

- Ternarios de producao: `Services/TranslationOrchestrator.cs` (4),
  `LanguageAdapters/Python/PythonTokenizerService.cs` (3) e `Core.Host/Program.cs` (3).
- 23 dos 29 ternarios de teste estao em `Integration/OptimizationResearchTests.cs`.
- Sobrecarga de metodo: `OperationResult.Ok`, `OperationResult.Fail` e
  `TextScanTranslator.Translate`, duas versoes cada.
- Os 2 construtores de producao sao `protected`, em `Models/OperationResult.cs` e
  `Models/OperationResultGeneric.cs`. A regra proibe construtor e pede tudo `public`, e nao
  ha excecao escrita para o tipo que implementa o Result pattern.
- Nao ha ocorrencia de `var`, `private`, `internal`, `partial`, `throw` nem classe aninhada
  no codigo de producao.

### Plugin IntelliJ (packages/ide-adapters/intellij, src/main)

| Desvio | Quantidade |
|---|---|
| `private` | 68 |
| Tipos anulaveis em assinatura | 24 |
| `throw` | 4 |
| Bloco `init` | 3 |
| Arquivos com mais de uma classe | 5 |

Arquivos com mais de uma classe: `statusbar/actions/BabelControlActions.kt` (7),
`services/CoreBridge.kt` (5), `providers/TranslatedView.kt` (2),
`services/AutoTranslateManager.kt` (2) e `statusbar/BabelStatusBarWidget.kt` (2).

### Tokenizer Python e scripts de build

| Camada | Desvio | Quantidade |
|---|---|---|
| Tokenizer Python | Anotacoes de tipo ausentes | arquivo inteiro |
| Scripts de build | Indentacao de 4 espacos contra os 2 do .editorconfig | 2 arquivos |

Nenhum dos dois tem ternario, `throw` ou operador de nulo.

## Escopo
- TypeScript: trocar ternario por `if/else`, comecando pela funcao unica de mensagem de
  erro; remover `private`; trocar o `throw` de `coreBridge.ts` por Result; tipo explicito
  nas declaracoes; static factory no lugar de construtor; um tipo por arquivo; eliminar
  tipos anulaveis e operadores de nulo fora da fronteira com a API do VS Code.
- C#: trocar ternario por `if/else`, em producao e em teste; eliminar tipos anulaveis, `??`
  e `!`; nomes distintos no lugar das sobrecargas; comentario de justificativa nos
  `try/catch` de boundary de I/O.
- Kotlin: remover `private` e `internal`; trocar `throw CoreBridgeException` por Result,
  preservando a degradacao das bordas; eliminar tipos anulaveis fora dos boundaries com
  APIs Java; tipo explicito nas declaracoes; logica de `init` para static factory; uma
  classe por arquivo nos 5 arquivos listados.
- Python: anotacoes de tipo nas assinaturas de tokenizer_service.py.
- JavaScript: reindentar os dois scripts para 2 espacos, conforme .editorconfig.

A tarefa pode ser entregue em mais de um PR, um por camada. A pasta so vira `.finalizada`
no PR que fecha a ultima.

## Decisoes que a adequacao vai exigir
Estes pontos nao tem resposta em docs/padroes-codigo.md hoje. Cada um se resolve
escrevendo a regra ou a excecao la, em PR proprio, antes de adequar o codigo afetado:

- **Fronteira com a API do VS Code.** A API devolve `undefined` por definicao
  (`window.activeTextEditor`, `Map.get`). A secao de Kotlin tem excecao de boundary escrita
  para APIs Java; a de TypeScript nao tem equivalente.
- **Construtor em classe TypeScript.** Com `strictPropertyInitialization`, uma classe com
  dependencias injetadas nao existe sem construtor. A secao de Kotlin tem excecao escrita
  para o construtor primario; a de TypeScript nao.
- **Construtor `protected` de `OperationResult`.** E o que obriga a criacao a passar pelas
  static factories.
- **Escopo das regras em codigo de teste.** O inventario conta os testes em separado
  porque docs/padroes-codigo.md nao diz se eles seguem as mesmas proibicoes.

## Fora de escopo
- Mudar as regras dentro desta tarefa. Se alguma se mostrar impraticavel na adequacao,
  discutir e alterar docs/padroes-codigo.md em PR proprio, nao contornar em silencio.
- Verificacao das proibicoes por maquina (regras de ESLint, analisador C#). E o que impede
  a regressao de voltar, mas ligar um gate sobre codigo ainda nao conforme e trabalho
  proprio, com baseline.
- `Record<string, string>` na extensao (51 ocorrencias em `src/`) e `Dictionary<string,
  string>` no Core (24). Sao "praticas a evitar, com justificativa", nao proibicao
  absoluta, e precisam de avaliacao caso a caso.
- Classificacao de niveis de log no plugin (error/warn/debug) - trabalho proprio.
- Reescrever o CONTRIBUTING.md, ja unificado.
