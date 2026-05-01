import axios from "axios";
import { useEffect, useState } from "react";
import { sendObj } from "./send";





function App() {
  const token = localStorage.getItem('token');
  const [loading, setLoading] = useState<boolean>(() => !token);
  const [cpfCnpjDestinatario, setCpfCnpjDestinatario] = useState<string>('');
  const [cpfCnpjRemetente, setCpfCnpjRemetente] = useState<string>('');

  //   async function buscarCnpj(cnpj) {
  //     try {
  //         // Remove caracteres não numéricos do CNPJ
  //         const cnpjLimpo = cnpj.replace(/\D/g, '');

  //         if (cnpjLimpo.length !== 14) {
  //             console.log('CNPJ incompleto, aguardando...');
  //             return;
  //         }

  //         showNotification('🔍 Buscando dados do CNPJ...', 'info');

  //         // API BrasilAPI (gratuita e confiável)
  //         const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);

  //         if (!response.ok) {
  //             throw new Error('CNPJ não encontrado na base de dados');
  //         }

  //         const data = await response.json();

  //         document.getElementById('dest_razao_social').value = data.razao_social || '';
  //         document.getElementById('dest_cep').value = data.cep || '';
  //         document.getElementById('dest_rua').value = data.logradouro || '';
  //         document.getElementById('dest_numero').value = data.numero || '';
  //         document.getElementById('dest_bairro').value = data.bairro || '';
  //         document.getElementById('dest_cidade').value = data.municipio || '';
  //         document.getElementById('dest_insc_estadual').focus();

  //         showNotification('✅ Dados do CNPJ preenchidos com sucesso!', 'success');

  //     } catch (error) {
  //         console.error('Erro ao buscar CNPJ:', error);
  //         showNotification('❌ CNPJ não encontrado. Preencha os dados manualmente.', 'error');
  //     }
  // }

  function formatarCpfCnpj(input: string, path: string) {
    let value = input.replace(/\D/g, '');

    if (value.length > 14) {
      value = value.substring(0, 14);
    }

    let formattedValue = '';

    if (value.length <= 11) {
      // Formato CPF: XXX.XXX.XXX-XX
      if (value.length <= 3) {
        formattedValue = value;
      } else if (value.length <= 6) {
        formattedValue = value.replace(/(\d{3})(\d{0,3})/, '$1.$2');
      } else if (value.length <= 9) {
        formattedValue = value.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
      } else {
        formattedValue = value.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
      }
    } else {
      // Formato CNPJ: XX.XXX.XXX/XXXX-XX
      if (value.length <= 2) {
        formattedValue = value;
      } else if (value.length <= 5) {
        formattedValue = value.replace(/(\d{2})(\d{0,3})/, '$1.$2');
      } else if (value.length <= 8) {
        formattedValue = value.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
      } else if (value.length <= 12) {
        formattedValue = value.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
      } else {
        formattedValue = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
      }
    }

    if (path === 'destinatario') {
      setCpfCnpjDestinatario(formattedValue);
    } else if (path === 'Remetente') {
      setCpfCnpjRemetente(formattedValue);
    }

    // Se for CNPJ completo (18 caracteres formatados), busca automático
    if (formattedValue.length === 18) {
      // buscarCnpj(formattedValue);
    }
  }
  // 07.332.190/0007-89
  const loadingData = async () => {
    const [destinatario, Remetente] = await Promise.all([
      axios.post("https://api.egssistemas.com.br/EGSCTE//api/ComboBox/GCADASTRO", {
        "search": cpfCnpjDestinatario,
        "id": null,
        "propertyList": []
      },
        {
          headers: {
            'Authorization': 'Bearer ' + token,
          }
        }),
      axios.post("https://api.egssistemas.com.br/EGSCTE//api/ComboBox/GCADASTRO", {
        "search": cpfCnpjRemetente,
        "id": null,
        "propertyList": []
      },
        {
          headers: {
            'Authorization': 'Bearer ' + token,
          }
        })
    ]);
    sendObj.IDDESTINATARIO = destinatario.data[0].IDCADASTRO;
    sendObj.IDCONTRATANTE = Remetente.data[0].IDCADASTRO;
    console.log(sendObj);
  }
  const getToken = async () => {
    try {
      const { data }: { data: { AUXTOKEN: string, URLAPI: string } } = await axios.get("https://api.egssistemas.com.br/EGSWEB/api/Sistema/GetServerUrlByChaveAcessoV1?CHAVEACESSO=50201&EGSERP=true");
      console.log(data);
      setTimeout(async () => {
        const params = new URLSearchParams();
        params.append('auxtoken', data.AUXTOKEN);
        params.append('captcha', '');
        params.append('codigo2fa', '');
        params.append('grant_type', 'password');
        params.append('username', 'FINANCEIRO');
        params.append('password', 'inter2026');

        const tokenData: { data: { access_token: string, token_type: string, expires_in: string } } = await axios.post("https://api.egssistemas.com.br/EGSCTE/token", params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic NTAyMDE6ZWckeXN0ZW0='
          }
        });

        localStorage.setItem('token', tokenData.data.access_token);
        setLoading(false);
        console.log(tokenData.data.access_token);
      }, 1000);
    } catch (error) {
      console.error(error);
    }

  }


  useEffect(() => {
    // getToken()
    localStorage.setItem('token', 'YJW8JXfYhOv_bPrD5ffmnVi--D70CmLDVrdWMsH7drpfBV76BsBsz5IKg1JLVx0RMFNSBMvEfeS7Zq866LXfHhsiwSgQRSSKW6GAhwT1tZ_kNRFhYJoyAVqG51QzjEuqkjuBgVolzUA2a7PpkMCX3hYyJi1ks83Aqic59BHOQYAUVNaWtPBuzMrkUo0Sy2uTT1ScHGZ7iDfRmaPJbAsg9MJwaypG7YuJe80aQoCysKzyeKFTGeUgFr5GQcAxyMfCP_R2MHrjK-aMy8FP_8CBKUn5cIVpLMecsyMsICEI9Auk7YRI1q8-XHSEW0qJi-t_3MBPKzh5ME_QLfDQ1Pnc6dwz232FAvvH9oepq1J38DWEg3hjWzwmLHqexGAWxWOemc_Rixywk6ggaSkpQqCvmn6V_ac_j2sRoDGNYni2BEEbb9E3RDb7byqWjY77JxSuMHtRpxSTugQBltjAC2AD7Y3UaoWcg5ka1jwYV7BAe7rdXuGppWBZ5qs4i7DAGdz3idz1W8cNg3KJiMpBGPkdzdOlxlj26i4xFOYys6dmEiY');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  //IDRemetente,VALORRECEBER,VALORSERVICO,VALORCARGA,DESCCARGA,TIPOCARGA,
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <h1 className="text-3xl font-bold text-white text-center">Sistema ESG</h1>
              <p className="text-blue-100 text-center mt-2">Preencha os dados para gerar o CTe</p>
            </div>

            <form className="p-8 space-y-6">

              <div className="space-y-8">
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    Dados das Partes
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="Remetente" className="block text-sm font-semibold text-gray-700 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                        </svg>
                        Remetente CPF/CNPJ
                      </label>
                      <input
                        type="text"
                        value={cpfCnpjRemetente}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          formatarCpfCnpj(e.target.value, 'Remetente');
                        }}
                        id="Remetente"
                        name="Remetente"
                        className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="destinatario" className="block text-sm font-semibold text-gray-700 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                        </svg>
                        Destinatário CPF/CNPJ
                      </label>
                      <input
                        type="text"
                        value={cpfCnpjDestinatario}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          formatarCpfCnpj(e.target.value, 'destinatario');
                        }}
                        id="destinatario"
                        name="destinatario"
                        className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                    </svg>
                    Dados da Carga
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                        Produto predominante
                      </label>
                      <input type="text" className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out" placeholder="Ex: Fio, Tecido, etc." />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                        </svg>
                        Valor da carga
                      </label>
                      <input type="text" className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out" placeholder="R$ 0,00" />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                        </svg>
                        Unidade carga
                      </label>
                      <input type="text" className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out" placeholder="Ex: KG, TON, etc." />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                        </svg>
                        Quantidade carga
                      </label>
                      <input type="text" className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out" placeholder="0,00" />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        Valor serviço
                      </label>
                      <input type="text" className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out" placeholder="R$ 0,00" />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                        </svg>
                        Valor a receber
                      </label>
                      <input type="text" className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out" placeholder="R$ 0,00" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-6">
                <button
                  type="button"
                  onClick={() => loadingData()}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition duration-150 ease-in-out hover:scale-105"
                >
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Gerar CTe
                  </span>
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
