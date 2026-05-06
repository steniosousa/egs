# Como usar a tabela Excel para calcular fretes

## O que foi implementado

1. **Leitura da planilha Excel**: O sistema agora lê o arquivo `TABELA MATRIZ.xlsx` da pasta `public/`
2. **Busca automática**: A função `calcularFrete` busca automaticamente o valor na coluna E com base na cidade (coluna B) e UF (coluna C)
3. **Fallback**: Se não encontrar o valor na tabela, usa o cálculo padrão (238 * cargaEmKg)

## Como funciona

### Estrutura da tabela
- **Coluna B**: Nome da cidade
- **Coluna C**: UF (estado)
- **Coluna E**: Valor do frete

### Função principal
```javascript
const calcularFrete = (saida, destino) => {
  const cargaEmKg = quantidadeCarga / 1000
  
  // Buscar valor da tabela Excel (coluna E) usando cidade e UF do destino
  const valorTabela = buscarValorPorColuna(destino.city, destino.uf, 'E');
  
  // Se encontrou valor na tabela, usa ele. Senão, usa o cálculo padrão
  const valorDoServiço = valorTabela ? parseFloat(valorTabela) : (238 * cargaEmKg);
  
  // ... resto do cálculo
}
```

## Como testar

### 1. No console do navegador
Abra o console do navegador (F12) e digite:
```javascript
testarBuscaTabela()
```

Isso vai mostrar:
- A estrutura da tabela
- Resultados de busca para algumas cidades de exemplo

### 2. Teste manual
```javascript
// Buscar valor específico
buscarValorPorColuna('São Paulo', 'SP', 'E')

// Ver estrutura da tabela
debugTabela()
```

### 3. Teste na aplicação
1. Carregue um XML ou preencha os dados manualmente
2. Informe a cidade de destino
3. O sistema buscará automaticamente o valor na tabela
4. Verifique o console para ver os logs do cálculo

## Arquivos criados/modificados

- `src/tabelaMatrix.js`: Módulo para manipulação da tabela Excel
- `src/App.tsx`: Atualizado para usar a tabela no cálculo de frete
- `public/TABELA MATRIZ.xlsx`: Planilha movida para pasta public

## Dependências

- `xlsx`: Biblioteca para ler arquivos Excel

## Solução de problemas

### Se a tabela não carregar
1. Verifique se o arquivo `TABELA MATRIZ.xlsx` está na pasta `public/`
2. Verifique o console para erros de carregamento
3. Use `debugTabela()` para verificar a estrutura

### Se a busca não encontrar valores
1. Verifique se os nomes das cidades estão exatamente como na planilha
2. Verifique se as UF estão corretas
3. Use `debugTabela()` para ver os dados reais da tabela

### Exemplo de debug
```javascript
// Carregar tabela manualmente
carregarTabela().then(() => {
  // Ver estrutura
  debugTabela();
  
  // Testar busca
  console.log(buscarValorPorColuna('São Paulo', 'SP', 'E'));
});
```

## Próximos passos

- Melhorar a correspondência de nomes (ignorar case, acentos, etc.)
- Adicionar cache para evitar recarregar a tabela
- Criar interface para gerenciar múltiplas tabelas
- Adicionar validação de dados
