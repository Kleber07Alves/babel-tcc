# Contexto - Tarefa 112

## Dependencias
Depende do PR que unificou as regras em docs/padroes-codigo.md e estendeu as proibicoes
absolutas as demais linguagens.

## Bloqueia
Nenhuma.

## Arquivos relevantes
- docs/padroes-codigo.md (as regras que este trabalho aplica)
- packages/ide-adapters/vscode/src/ (toda a extensao; `services/coreBridge.ts` concentra
  `private`, `throw` e tipos por arquivo)
- packages/ide-adapters/vscode/test/
- packages/core/MultiLingualCode.Core/Services/TranslationOrchestrator.cs
- packages/core/MultiLingualCode.Core/LanguageAdapters/Python/PythonTokenizerService.cs
- packages/core/MultiLingualCode.Core.Host/Program.cs
- packages/core/MultiLingualCode.Core/Models/OperationResult.cs e OperationResultGeneric.cs
- packages/core/MultiLingualCode.Core/Services/TextScanTranslator.cs
- packages/core/MultiLingualCode.Core.Tests/Integration/OptimizationResearchTests.cs
- packages/ide-adapters/intellij/src/main/kotlin/ (todo o plugin)
- packages/core/MultiLingualCode.Core/LanguageAdapters/Python/tokenizer_service.py
- scripts/copy-readme.js
- scripts/copy-translations.js
- .editorconfig (define 2 espacos para .js)

## Notas
- O inventario da especificacao e um retrato de 2026-10-12 e envelhece a cada commit.
  Recontar antes de comecar, com os comandos abaixo.
- O grosso do trabalho e a extensao VS Code e o plugin IntelliJ. O Core C# tem poucos
  pontos em producao. Python e os scripts sao pequenos.
- Remover `private` na extensao e no plugin muda a superficie publica de classes. As
  suites devem continuar passando: `npx vitest run` na extensao e `./gradlew test` no
  plugin (exige JDK 17).
- Trocar `throw` por Result no CoreBridge do plugin afeta TranslationService, SaveHandler
  e AutoTranslateManager, que hoje capturam a excecao para degradar. O mesmo vale para o
  `throw` de `coreBridge.ts` na extensao. A degradacao precisa ser preservada: um Core
  quebrado nunca pode corromper o arquivo em disco (DT-003).
- `OptimizationResearchTests.cs` e da categoria `Research`, que o filtro padrao de teste
  exclui. Ele continua sendo codigo do repositorio e entra na contagem.
- As proibicoes nao sao verificadas por maquina: o ESLint da extensao so cobra `no-var`,
  `prefer-const`, tipo de retorno, aspas e ponto e virgula, e ignora `test/`; o Core nao
  tem analisador. Foi assim que os ternarios voltaram ao C# depois do banimento.

## Comandos para recontar

Todos rodam a partir da raiz de um clone.

### TypeScript

Contagem exata, pela arvore sintatica. Usa o ESLint ja instalado na extensao, com uma
regra passada na linha de comando, sem alterar `.eslintrc.json`. Exige `npm install` em
`packages/ide-adapters/vscode`.

```bash
cd packages/ide-adapters/vscode

# count_ts <pasta> <seletor>
count_ts() {
  npx eslint "$1" --ext .ts --no-eslintrc --no-ignore --parser @typescript-eslint/parser \
    --rule "{\"no-restricted-syntax\":[\"error\",\"$2\"]}" -f unix | grep -c no-restricted-syntax
}

count_ts src "ConditionalExpression"                                   # ternario
count_ts src "TSUnionType > :matches(TSNullKeyword,TSUndefinedKeyword)" # tipo anulavel
count_ts src ":not(ForOfStatement, ForInStatement) > VariableDeclaration > VariableDeclarator[id.typeAnnotation=undefined]" # sem tipo explicito
count_ts src ":matches(PropertyDefinition,MethodDefinition)[accessibility='private']" # private
count_ts src "Literal[raw='null']"                                     # literal null
count_ts src "MethodDefinition[kind='constructor']"                    # construtor
count_ts src "LogicalExpression[operator='??']"                        # ??
count_ts src "ChainExpression"                                         # ?.
count_ts src "ThrowStatement"                                          # throw
count_ts src "TryStatement"                                            # try/catch
```

Trocar `src` por `test` para a coluna de testes.

### C#

Aproximacao por `grep` (GNU grep). No codigo de producao de hoje bate com a contagem pela
arvore sintatica, que e a do inventario. Nos testes conta um falso positivo em tres linhas:
30 contra 29 ternarios, 5 contra 4 tipos anulaveis e 39 contra 38 `try`. Conferir os casos
listados.

```bash
PROD="packages/core/MultiLingualCode.Core packages/core/MultiLingualCode.Core.Host"
TESTS="packages/core/MultiLingualCode.Core.Tests"

# count_cs <regex> <pastas...>   (ignora obj/, bin/ e linhas de comentario)
count_cs() {
  grep -rnE --include=*.cs --exclude-dir=obj --exclude-dir=bin "$1" "${@:2}" \
    | grep -vcE '^\S+:[0-9]+:\s*//'
}

count_cs '(^|[^?])\s\?\s[^?:]' $PROD                                   # ternario
count_cs '[]A-Za-z_)]!(\.|;|\)|,)' $PROD                               # ! de supressao de nulo
count_cs '\b[]A-Za-z_>]+\?\s+[a-zA-Z_]+\s*[=;,)]' $PROD                # tipo anulavel
count_cs '\?\?' $PROD                                                  # ??
count_cs '^\s*(public|protected|private|internal)\s+[A-Z][A-Za-z]*\(' $PROD # construtor
count_cs '^\s*try\s*$' $PROD                                           # try/catch
```

Trocar `$PROD` por `$TESTS` para a coluna de testes. Sobrecarga de metodo e comentario de
justificativa em `try/catch` nao tem contagem por `grep`: conferir lendo os arquivos
citados no inventario.

### Kotlin, Python e JavaScript

```bash
# Kotlin: private, throw, tipos anulaveis, blocos init
grep -rho "private " packages/ide-adapters/intellij/src/main --include=*.kt | wc -l
grep -rhoE "^\s*throw " packages/ide-adapters/intellij/src/main --include=*.kt | wc -l
grep -rhoE ": [A-Z][A-Za-z<>]*\?" packages/ide-adapters/intellij/src/main --include=*.kt | wc -l
grep -rhoE "^\s*init \{" packages/ide-adapters/intellij/src/main --include=*.kt | wc -l

# Kotlin: arquivos com mais de uma classe
grep -rcE "^(data |open |abstract |sealed |enum )?(class|interface|object) " \
  packages/ide-adapters/intellij/src/main --include=*.kt | grep -v ":[01]$"

# Python: anotacoes de tipo na assinatura
grep -cE "def .*->" packages/core/MultiLingualCode.Core/LanguageAdapters/Python/tokenizer_service.py

# JS: indentacao fora dos 2 espacos do .editorconfig (usa o ESLint da extensao; exige
# `npm install` em packages/ide-adapters/vscode). Sem saida e exit 0 = conforme.
(cd packages/ide-adapters/vscode && npx eslint --no-eslintrc --no-ignore \
  --parser-options ecmaVersion:2020 --env node --rule '{"indent":["error",2]}' ../../../scripts/*.js)
```
