# Definition of Done - Tarefa 112

Cada item de contagem se prova com o comando correspondente de contexto.md devolvendo 0,
ou devolvendo so os casos cobertos por excecao escrita em docs/padroes-codigo.md.

## Geral
- [ ] Inventario recontado no inicio (os numeros da especificacao sao de 2026-10-12)
- [ ] Decisoes pendentes da especificacao resolvidas em docs/padroes-codigo.md, em PR
      proprio, antes de adequar o codigo que depende delas
- [ ] Frase de conformidade em docs/padroes-codigo.md atualizada ou removida quando nao
      houver mais desvio
- [ ] Tarefa marcada como .finalizada no PR que fecha a ultima camada

## Extensao VS Code (TypeScript)
- [ ] `src/` sem operador ternario
- [ ] `src/` sem `private`
- [ ] `src/` sem `throw`: erro atravessa como valor via Result pattern
- [ ] `src/` sem tipos anulaveis, `??` e `?.` fora da fronteira com a API do VS Code, e
      esses pontos documentados na chamada
- [ ] Tipo explicito nas declaracoes de `src/`
- [ ] Construtores de `src/` trocados por static factory, ou cobertos por excecao escrita
- [ ] Um tipo por arquivo em `coreBridge.ts` e `autoTranslateManager.ts`
- [ ] `test/` adequado conforme a decisao sobre regras em codigo de teste
- [ ] Degradacao preservada: Core quebrado mostra o original e nunca corrompe o arquivo
      em disco (DT-003)
- [ ] `npx vitest run`, `npm run lint` e `npm run build` passam

## Core C#
- [ ] Producao sem operador ternario
- [ ] Testes sem operador ternario, inclusive `OptimizationResearchTests.cs`
- [ ] Producao sem tipos anulaveis, `??` e `!` de supressao de nulo
- [ ] Sobrecargas de `OperationResult.Ok`, `OperationResult.Fail` e
      `TextScanTranslator.Translate` trocadas por nomes distintos
- [ ] Todo `try/catch` de producao em boundary de I/O, com comentario de justificativa
- [ ] Construtor `protected` de `OperationResult` removido ou coberto por excecao escrita
- [ ] Testes do Core passam (`dotnet test --filter "Category!=Research"`)
- [ ] `dotnet format --verify-no-changes` limpo

## Plugin IntelliJ (Kotlin)
- [ ] Kotlin sem `private` e sem `internal` no codigo de producao
- [ ] Kotlin sem `throw`: erro atravessa como valor via Result pattern
- [ ] Degradacao das bordas preservada: Core quebrado mostra o original e nunca corrompe o
      arquivo em disco (DT-003)
- [ ] Kotlin sem tipos anulaveis fora dos boundaries com APIs Java, e esses documentados
      no ponto da chamada
- [ ] Tipo explicito nas declaracoes Kotlin (`val timeoutMs: Long = 10_000`)
- [ ] Sem logica em bloco `init`: inicializacao em static factory no `companion object`
- [ ] Uma classe por arquivo nos 5 arquivos listados na especificacao
- [ ] Testes do plugin passam (`./gradlew test`)

## Tokenizer Python e scripts de build
- [x] tokenizer_service.py com anotacoes de tipo nas assinaturas
      (2026-10-12: `grep -cE "def .*->"` devolve 2, de 2 funcoes no arquivo)
- [x] Tokenizacao Python validada de ponta a ponta (os testes com [RequiresPythonFact])
      (2026-10-12: `dotnet test --filter "FullyQualifiedName~Python"`, 96 de 96, com
      Python 3.14 instalado e nenhum teste pulado)
- [x] Scripts de build reindentados para 2 espacos conforme .editorconfig
      (2026-10-12: regra `indent` do ESLint sem saida nos dois scripts; antes, 40 erros.
      `git diff -w` vazio: a mudanca e so de espacos)
