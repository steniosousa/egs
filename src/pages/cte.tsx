export default function CTEView({ ctes, buscarCteEscolhida }: { ctes: any[], buscarCteEscolhida: (cte: string) => void }) {
    console.log(ctes)
    return (
        <div>
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex flex-row justify-between">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Selecione um CT-e</h2>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {ctes.length > 0 ? (
                        ctes.map((cte) => (
                            <div
                                key={cte.IDCTE}
                                onClick={() => buscarCteEscolhida(String(cte.IDCTE))}
                                className="bg-gray-50 hover:bg-gray-100 p-4 rounded-lg cursor-pointer transition duration-200 border border-gray-200 hover:border-blue-300"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-800">CT-e: {cte.IDCTE}</p>
                                        <p className="text-sm text-gray-600">Remetente: {cte.REM_NOME}</p>
                                        <p className="text-sm text-gray-600">Origem: {cte.NOMECIDADEEMISSAO} - {cte.UFINISERV}</p>
                                        <p className="text-sm text-gray-600">Destino: {cte.NOMECIDADEFIMSERV} - {cte.DEST_UF}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">
                                            {new Date(cte.DATACREATE).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <div className="flex items-center justify-center flex-col">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <p>Carregando...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}