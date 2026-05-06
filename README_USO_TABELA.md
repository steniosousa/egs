# Como usar a tabela Excel para calcular fretes

## ✅ Implementação concluída!

O sistema agora está integrado com sua tabela `TABELA MATRIZ.xlsx` e busca automaticamente os valores de frete.

## 📋 Estrutura da tabela

Sua tabela Excel tem as seguintes colunas:
- **Coluna B**: Destino (nome da cidade)
- **Coluna C**: UF (estado)
- **Coluna D**: Truck 14 TON
- **Coluna E**: Bitruck 19 TON ← **USANDO ESTA**
- **Coluna F**: 5 Eixos 27/30 TON
- **Coluna G**: 6 Eixos 32/35 TON
- **Coluna H**: 7 Eixos 38/40 TON
- **Coluna I**: 9 Eixos 50 TON

## 🚛️ Como o sistema funciona

1. **Leitura automática**: Ao iniciar, a aplicação lê o arquivo `TABELA MATRIZ.xlsx`
2. **Busca inteligente**: Quando você informa a cidade/UF de destino, o sistema busca na tabela
3. **Cálculo automático**: Usa o valor da coluna E (Bitruck 19 TON) ou fallback para cálculo padrão

## 🧪 Como testar

### 1. No console do navegador
Abra o console (F12) e digite:

```javascript
// Teste completo com cidades de Alagoas
testarBuscaTabela()

// Busca manual específica
buscarValor19Ton('CANAPI', 'AL')
buscarValor19Ton('PALMEIRA DOS INDIOS', 'AL')
buscarValor19Ton('MACEIÓ', 'AL')
```

### 2. Teste na aplicação
1. Preencha os dados do XML ou manualmente
2. Informe a cidade de destino (ex: "CANAPI")
3. Informe a UF (ex: "AL")
4. O sistema buscará automaticamente o valor na tabela

## 📊 Exemplos de busca

Para a sua tabela, os resultados seriam:

| Cidade | UF | Valor (19 TON) |
|---------|-----|----------------|
| CANAPI | AL | 307.31 |
| PALMEIRA DOS INDIOS | AL | 286.82 |
| MACEIÓ | AL | [valor da tabela] |

## 🔧 Funções disponíveis

```javascript
// Importar no seu componente
import { 
  buscarValor14Ton,      // Coluna D
  buscarValor19Ton,      // Coluna E ← USANDO
  buscarValor27_30Ton,   // Coluna F
  buscarValor32_35Ton,   // Coluna G
  buscarValor38_40Ton,   // Coluna H
  buscarValor50Ton       // Coluna I
} from "./tabelaMatrix";

// Usar na função calcularFrete
const valorTabela = buscarValor19Ton(destino.city, destino.uf);
```

## 📁 Arquivos modificados

- ✅ `src/tabelaMatrix.js` - Módulo de manipulação da tabela
- ✅ `src/App.tsx` - Integrado com cálculo de frete
- ✅ `public/TABELA MATRIZ.xlsx` - Planilha movida para public

## 🐛 Solução de problemas

### Se não encontrar valores
1. **Verifique nomes**: Os nomes das cidades devem ser EXATAMENTE como na planilha
2. **Verifique UF**: Use siglas corretas (AL, SP, RJ, etc.)
3. **Console debug**: Use `testarBuscaTabela()` para ver estrutura

### Se der erro de carregamento
1. Verifique se o arquivo está em `public/TABELA MATRIZ.xlsx`
2. Verifique o console para erros
3. Recarregue a página

## 🎯 Próximos melhorias

- [ ] Ignorar case e acentos na busca
- [ ] Adicionar autocomplete para cidades
- [ ] Interface para selecionar tipo de caminhão
- [ ] Validação de dados em tempo real

## 📝️ Notas importantes

- **Case sensitive**: A busca diferencia maiúsculas/minúsculas
- **Nomes exatos**: Use exatamente os nomes da planilha
- **Fallback**: Se não encontrar, usa cálculo: `238 * cargaEmKg`
- **Coluna E**: Sistema configurado para usar "Bitruck 19 TON"

---

**Pronto! Seu sistema agora busca automaticamente na tabela Excel os valores de frete! 🚀**
