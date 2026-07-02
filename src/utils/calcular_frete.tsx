import { toast } from "react-toastify";
import { buscarValor14Ton, buscarValor19Ton, buscarValor27_30Ton, buscarValor32_35Ton, buscarValor38_40Ton, buscarValor50Ton } from "../tabelaMatrix";

export default function calcularFrete(saida: { city: string, uf: string }, destino: { city: string, uf: string }, quantidadeCarga: number): { valorDoServiço: number } | void {
  const cargaEmKg = quantidadeCarga / 1000

  let valorTabela = 0;
  let tipoCaminhao = '50';


  if (quantidadeCarga >= 13980 && quantidadeCarga < 19000) {
    tipoCaminhao = '14';
  } else if (quantidadeCarga >= 19000 && quantidadeCarga < 27000) {
    tipoCaminhao = '19';
  } else if (quantidadeCarga >= 27000 && quantidadeCarga < 31900) {
    tipoCaminhao = '27_30';
  } else if (quantidadeCarga >= 31900 && quantidadeCarga < 38000) {
    tipoCaminhao = '32_35';
  } else if (quantidadeCarga >= 38000 && quantidadeCarga < 50000) {
    tipoCaminhao = '38_40';
  }

  switch (tipoCaminhao) {
    case '14':
      valorTabela = buscarValor14Ton(destino.city, destino.uf);
      break;
    case '19':
      valorTabela = buscarValor19Ton(destino.city, destino.uf);
      break;
    case '27_30':
      valorTabela = buscarValor27_30Ton(destino.city, destino.uf);
      break;
    case '32_35':
      valorTabela = buscarValor32_35Ton(destino.city, destino.uf);
      break;
    case '38_40':
      valorTabela = buscarValor38_40Ton(destino.city, destino.uf);
      break;
    case '50':
      valorTabela = buscarValor50Ton(destino.city, destino.uf);
      break;
    default:
      valorTabela = buscarValor14Ton(destino.city, destino.uf);
  }

  if (!valorTabela || valorTabela === 0) {
    console.log(`Valor do frete não encontrado para ${destino.city}/${destino.uf} com caminhão de ${tipoCaminhao} toneladas`)
    toast.error(`Valor do frete não encontrado para ${destino.city}/${destino.uf} com caminhão de ${tipoCaminhao} toneladas`)
    return
  }

  const valorTabelaArredondado = Number(valorTabela.toFixed(2));
  return {
    valorDoServiço: parseFloat((valorTabelaArredondado * cargaEmKg).toFixed(2)),
  }
}