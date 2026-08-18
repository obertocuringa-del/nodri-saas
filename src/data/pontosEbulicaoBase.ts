// Conteudo base dos Pontos de Ebulicao (documento da recepcao do Rouge).
//
// ARQUIVO DE CARGA UNICA: nao e default de salao nenhum. So entra no banco
// quando a rota /api/salon/semear-ebulicao e chamada de proposito, e so em
// salao que ainda esta com a pagina vazia. Depois da carga, pode sair do repo.

export interface PontoEbulicao { id: string; titulo: string; passos: string[] }
export interface BlocoEbulicao { id: string; nome: string; pontos: PontoEbulicao[] }

export const PONTOS_EBULICAO_BASE: { blocos: BlocoEbulicao[] } = {
 "blocos": [
  {
   "id": "pe1",
   "nome": "PROFISSIONAIS",
   "pontos": [
    {
     "id": "pe2",
     "titulo": "ROUPAS ERRADAS COR OU FORA DO PERMITIDO",
     "passos": [
      "Ao verificar que a roupa está fora do padrão, sendo de cores branca, preta, cinza, ou saias curtas, fendas acima do joelho, barriga de fora, blusa regata, a coordenadora chama o profissional em particular, informa sobre o que está incorreto e dá a oportunidade ao profissional de trocar. Se não houver outra opção disponível, é informado que terá que voltar para casa e a agenda é fechada naquele momento.",
      "A recepção entra em contato com os clientes informando que o profissional teve um pequeno imprevisto e não conseguirá ficar no salão nesse dia. Eles perguntam se gostariam de remarcar para outro dia. Por exemplo: \"Boa Tarde, Ana. Meu nome é Maria, coordenadora do Salão Rouge Hair. Estou entrando em contato com a senhora pois a profissional Lúcia acabou de ter um imprevisto aqui no salão e teve que se ausentar. Verificamos que a senhora tem um horário com ela às 15:00. Gostaria de verificar se podemos remarcar com outra profissional no mesmo horário ou se podemos remarcá-la para amanhã com a Lúcia às 15:00.\""
     ]
    },
    {
     "id": "pe3",
     "titulo": "ROUPAS ERRADAS COR OU FORA DO PERMITIDO - PROFISSIONAL SE RECUSOU IR EMBORA",
     "passos": [
      "Ao profissional recusar-se a sair, a coordenadora fecha a agenda do profissional.",
      "A equipe entra em contato com os clientes para informar que o profissional teve um pequeno imprevisto e não poderá estar no salão naquele dia, oferecendo a opção de remarcar para outro dia. Por exemplo: \"Boa tarde, Ana. Meu nome é Maria, coordenadora do Salão Rouge Hair. Estou entrando em contato com a senhora pois a profissional Lúcia acabou de ter um imprevisto aqui no salão e teve que se ausentar. Verificamos que a senhora tem um horário com ela às 15:00. Gostaria de verificar se podemos remarcar com outra profissional no mesmo horário ou se podemos remarcar para amanhã com a Lúcia às 15:00.\"",
      "A situação é informada para o gerente, ou para Bruna e Vera, quem estiver disponível no momento."
     ]
    },
    {
     "id": "pe4",
     "titulo": "BRIGA - PROFISSIONAL ENTRE PROFISSIONAIS",
     "passos": [
      "A coordenadora chama individualmente cada um dos profissionais envolvidos para entender o ocorrido e informa a ambos que irá solucionar a situação.",
      "Após obter as duas versões, verifica quem teve razão.",
      "A coordenadora passa para o gerente um resumo simplificado do ocorrido e define a forma como será dado o feedback para o profissional que estava errado.",
      "A coordenadora chama o profissional que estava errado e dá o feedback, informando imediatamente que não será permitido algo semelhante volte a acontecer.",
      "Em seguida, chama o outro profissional envolvido e dá um retorno,"
     ]
    },
    {
     "id": "pe5",
     "titulo": "BRIGA - CLIENTE E PROFISSIONAL",
     "passos": [
      "O coordenador chama o profissional em particular, verifica o que aconteceu e solicita o encerramento do procedimento.",
      "Dirige-se ao cliente, verifica e identifica o problema, conversa com ele e encaminha para um outro profissional atendê-lo.",
      "Chama o melhor profissional disponível, preferencialmente aquele com bom carisma e qualidade técnica.",
      "Informa ao profissional que irá atender o cliente sobre o perfil deste, com base na conversa prévia, para deixá-lo preparado para o atendimento.",
      "Chama o profissional envolvido na discussão, não necessariamente no mesmo dia, dependendo do problema, pois o profissional pode não estar bem psicologicamente. No dia seguinte, passa o feedback conforme a avaliação do ocorrido, mas sempre enfatizando que, independente do problema, não será aceito esse tipo de comportamento de discussão com o cliente."
     ]
    },
    {
     "id": "pe6",
     "titulo": "BRIGA - PROFISSIONAIS E RECEPÇÃO",
     "passos": [
      "O coordenador chama o profissional em particular, verifica o que aconteceu e informa que irá verificar com a recepção, dando um retorno em seguida.",
      "Dirige-se ao recepcionista, verifica o que aconteceu e informa que irá verificar com a gerência, dando um retorno em seguida.",
      "Informa ao gerente sobre o ocorrido para que juntos analisem a situação e alinhem as ações a serem tomadas com os envolvidos de forma individual.",
      "Chama o profissional, informa o que foi definido e dá o feedback, enfatizando que qualquer tipo de problema com a recepção deve ser comunicado ao coordenador ou à gerência, nunca diretamente com o recepcionista.",
      "Chama o recepcionista, informa o que foi definido e dá o feedback, enfatizando que qualquer tipo de problema com os profissionais deve ser comunicado ao coordenador ou à gerência, nunca diretamente com o profissional."
     ]
    },
    {
     "id": "pe7",
     "titulo": "ATENDIMENTO DE CLIENTE ERRADO",
     "passos": [
      "Recepção: Verifica se o cliente tem preferência por um outro profissional para o atendimento.",
      "Sem preferência: Mantém o atendimento como está e redistribui os clientes para não prejudicar o outro profissional.",
      "Com preferência: Chama o profissional que errou em particular com uma desculpa, por exemplo: \"Ana, poderia me ajudar no computador rapidinho com base em um atendimento?\" Quando o profissional estiver fora do alcance do cliente, informa sobre o ocorrido e pede para ele mesmo falar com a cliente sobre o pequeno equívoco. Por exemplo",
      "Oi Ana, tudo bem? Desculpa pelo transtorno, eu acabei me confundindo com a cliente que iria atender e acabei te atendendo. Já ajustamos e a profissional correta, Maria, já está vindo te atender. Mais uma vez, peço desculpas.",
      "Após resolver a situação: O coordenador chama o profissional que errou e passa o feedback, enfatizando a necessidade de prestar mais atenção e, em caso de dúvida, perguntar para a recepção."
     ]
    },
    {
     "id": "pe8",
     "titulo": "SERVIÇOS INTERNOS -MAIS DE UM PROFISSIONAL FAZENDO JUNTOS",
     "passos": [
      "A coordenadora verifica quem está com a razão no atendimento e pede para o outro profissional pausar até que o atendimento seja finalizado. Caso o profissional não aceite pausar, solicita que o profissional que está executando o atendimento pare imediatamente."
     ]
    },
    {
     "id": "pe9",
     "titulo": "IR EMBORA - COM CLIENTE NA AGENDA",
     "passos": [
      "A primeira recepção deve estar sempre atenta para quem chega e quem sai dos profissionais.",
      "A segunda recepção, independentemente do horário, ao ver o profissional saindo, verifica se o mesmo tem cliente na agenda. Se tiver, informa ao profissional.",
      "Se o profissional se recusar a atender o cliente, a recepção ajusta as agendas para que o cliente não seja prejudicado, fazendo encaixe ou solicitando outros profissionais presentes para atender o cliente que está chegando.",
      "Informa o ocorrido para o coordenador.",
      "O coordenador, no dia seguinte, conversa com o profissional para identificar o que aconteceu.",
      "Deixa claro que esse tipo de comportamento e postura não serão tolerados no salão e",
      "pergunta se o profissional deseja continuar lá."
     ]
    },
    {
     "id": "pe10",
     "titulo": "IR EMBORA - MAIS CEDO SEM AUTORIZAÇÃO",
     "passos": [
      "A primeira recepção informa ao coordenador sobre o ocorrido.",
      "No dia seguinte, o coordenador chama o profissional para tentar identificar o que aconteceu, alinhar e ajustar, na medida do possível, os compromissos combinados. Ao final da conversa, deixe claro e objetivo que esse tipo de comportamento e postura não serão tolerados no salão, e pergunte se o profissional deseja continuar trabalhando lá."
     ]
    },
    {
     "id": "pe11",
     "titulo": "EQUIPAMENTOS DE EPI - NÃO ESTÁ USANDO",
     "passos": [
      "A coordenadora verifica se há algum problema com a vestimenta ou calçado do profissional e solicita a troca, se necessário. Se o profissional se recusar, ele é dispensado no mesmo dia.",
      "Se houver problemas com máscaras ou luvas, a coordenadora solicita discretamente ao profissional para fazer os ajustes necessários.",
      "Se o profissional demorar para fazer os ajustes, a coordenadora vai até o local de trabalho, pega a máscara e luvas e leva ao profissional para que ele coloque imediatamente.",
      "Após o profissional terminar os procedimentos, o coordenador chama o profissional em particular e informa que o comportamento apresentado não será tolerado, especialmente no que diz respeito ao descaso com os materiais de EPI."
     ]
    },
    {
     "id": "pe12",
     "titulo": "ATRASO DE PROFISSIONAL NO SALÃO",
     "passos": [
      "Todos os dias, a recepção envia uma mensagem para o profissional no horário de chegada, dizendo \"João, está chegando\", para que ele tenha parâmetro e tempo para ajustar qualquer coisa necessária.",
      "A recepção repassa essa informação para o coordenador.",
      "Se os atrasos forem recorrentes, o coordenador chama o profissional para uma conversa. Durante essa conversa, o coordenador busca entender o motivo dos atrasos e trabalha junto com o profissional para encontrar uma solução que seja satisfatória para ambas as partes, podendo incluir ajustes nos horários, se necessário."
     ]
    },
    {
     "id": "pe13",
     "titulo": "AGENDA - PROFISSIONAL INFORMOU QUE ESTÁ TENDO AGENDAMENTO ERRADO",
     "passos": [
      "A primeira recepcionista repassa o questionamento para o coordenador.",
      "O coordenador faz uma análise para verificar se realmente existe esse problema, com base nos agendamentos anteriores e no feedback da recepção.",
      "Caso seja identificado algum erro, o coordenador chama a recepcionista responsável pelo erro, verifica se ela está enfrentando alguma dificuldade, ensina a maneira correta e monitora para garantir que o erro não se repita, dando feedback à recepcionista para evitar recorrências.",
      "O coordenador dá um retorno ao profissional informando que o problema foi identificado e solucionado. Se o problema persistir, instrua o profissional a reportar imediatamente ao coordenador.",
      "Se nenhum erro for identificado, o coordenador chama o profissional para uma conversa no escritório, informando que chegou até ele esse questionamento e solicitando ao profissional que demonstre o suposto erro."
     ]
    },
    {
     "id": "pe14",
     "titulo": "AGENDA - PROFISSIONAL INFORMOU QUE AS DISTRIBUIÇÃO ESTÁ INCORRETA",
     "passos": [
      "A primeira recepcionista repassa o questionamento para o coordenador.",
      "O coordenador realiza uma análise detalhada para verificar se realmente existe esse problema, com base nos agendamentos anteriores e no feedback da recepção.",
      "Se algum erro for identificado, o coordenador chama a recepcionista responsável pelo erro, verifica se ela está enfrentando alguma dificuldade, ensina a maneira correta e monitora para garantir que o erro não se repita, dando feedback à recepcionista para evitar recorrências.",
      "O coordenador dá um retorno ao profissional informando que o problema foi identificado e solucionado. Instrua o profissional a reportar imediatamente caso o problema volte a ocorrer.",
      "Se nenhum erro for identificado após a análise, o coordenador chama o profissional para uma conversa no escritório, explicando que chegou até ele esse questionamento e solicitando ao profissional que demonstre o suposto erro, se houver."
     ]
    },
    {
     "id": "pe15",
     "titulo": "PROFISSIONAL FALTOU",
     "passos": [
      "A primeira recepcionista deve entrar imediatamente em contato com os clientes por telefone.",
      "Se não conseguir por telefone, pode ser por mensagem. Exemplo de mensagem",
      "Boa tarde, Ana. Meu nome é Maria, coordenadora (ou recepcionista) do Salão Rouge Hair. Estou entrando em contato com a senhora porque a profissional Lúcia acabou de nos informar que teve um imprevisto e não conseguirá vir hoje. Verificamos que a senhora tem um horário marcado com ela às 15:00. Gostaria de verificar se podemos remarcar a senhora com outra profissional no mesmo horário ou se preferiria remarcar com a Lúcia para amanhã às 15:00."
     ]
    },
    {
     "id": "pe16",
     "titulo": "PROFISSIONAL NEGAR CLIENTE",
     "passos": [
      "A primeira recepcionista deve primeiramente verificar o motivo pelo qual o profissional não quer atender o cliente. Pode ser por questões técnicas, comportamento inadequado do cliente, algum atrito anterior, falta de tempo devido a compromissos subsequentes, ou simplesmente por não querer atender.",
      "Identificando o motivo, com exceção de simplesmente não querer atender, a recepcionista deve tentar encaminhar o cliente para outro profissional, sempre que possível.",
      "A recepcionista deve informar imediatamente ao coordenador, à Vera, à Bruna ou à agência sobre a situação.",
      "O coordenador deve chamar imediatamente o profissional para entender por que não quer atender o cliente, enfatizando que é inadmissível recusar atendimento enquanto estiver no salão. O profissional será deixado sem clientes preferenciais por 30 dias como consequência dessa recusa."
     ]
    },
    {
     "id": "pe17",
     "titulo": "ATRASO - PROFISSIONAL ATRASOU POIS ESTÁ NA COPA OU FORA DO SALÃO ENROLANDO",
     "passos": [
      "A recepção entra em contato com o profissional por telefone, pessoalmente ou mensagens para verificar a situação.",
      "Pergunta ao profissional quanto tempo irá demorar para retornar ao salão.",
      "Informa ao cliente que o profissional está a caminho e estima o tempo de chegada.",
      "Se o atraso persistir, a recepção tenta novamente entrar em contato com o profissional e atualiza o cliente sobre a nova previsão de chegada.",
      "Se o profissional continuar indisponível, a recepção verifica a disponibilidade de outro profissional e oferece essa opção ao cliente com a seguinte abordagem",
      "Olá Ana, tudo bem? Como a senhora tem um horário marcado para as 15:00 e o profissional ainda não chegou, gostaria de ser atendida pelo profissional X, que possui a mesma qualidade de serviço? Entendemos que você pode ter outros compromissos e não queremos atrapalhar.",
      "Informa o coordenador sobre a situação e o coordenador alinha com o profissional. Pode haver penalização do profissional com uma semana sem clientes preferenciais, conforme necessário."
     ]
    },
    {
     "id": "pe18",
     "titulo": "ATRASO - PROFISSIONAL ATRASOU POIS NÃO CHEGOU AINDA NO SALÃO",
     "passos": [
      "A recepção entra em contato com o profissional por telefone, pessoalmente ou mensagens para verificar o motivo do atraso.",
      "Pergunta ao profissional quanto tempo irá demorar para chegar ao salão.",
      "Informa ao cliente que o profissional está a caminho e estima o tempo de chegada.",
      "Se o atraso persistir, a recepção tenta novamente entrar em contato com o profissional para obter uma atualização e informa o cliente sobre o novo tempo estimado de chegada.",
      "Se o profissional continuar indisponível ou o atraso for significativo, a recepção verifica a disponibilidade de outro profissional e oferece essa opção ao cliente com a seguinte abordagem",
      "Olá Ana, tudo bem? Como a senhora tem um horário marcado para as 15:00 e o profissional ainda não chegou, gostaria de ser atendida pelo profissional X, que possui a mesma qualidade de serviço? Entendemos que você pode ter outros compromissos e não queremos atrapalhar.",
      "Informa o coordenador sobre a situação e o coordenador alinha com o profissional. Pode haver penalização do profissional com uma semana sem clientes preferenciais, conforme necessário."
     ]
    },
    {
     "id": "pe19",
     "titulo": "ATRASO - PROFISSIONAL ATRASOU NO ATENDIMENTO POIS ESTÁ EM OUTRO ATENDIMENTO",
     "passos": [
      "A recepção verifica com o profissional o tempo que ainda irá demorar para finalizar o atendimento atual.",
      "A recepção informa ao cliente que o profissional está em outro atendimento e já está a caminho, fornecendo uma estimativa de tempo.",
      "Se o atraso persistir, a recepção entra em contato novamente com o profissional para obter uma atualização e passa o retorno para o cliente.",
      "Se o atraso continuar significativo, a recepção pede ao profissional para ir até o cliente e conversar pessoalmente sobre a situação.",
      "Caso o profissional não possa ir ao cliente, a recepção verifica a disponibilidade de outro profissional e oferece essa opção ao cliente da seguinte maneira",
      "Olá Ana, tudo bem? Como a senhora tem um horário marcado para as 15:00 e o profissional ainda está ocupado, gostaria de ser atendida pelo profissional X, que possui a mesma qualidade de serviço? Entendemos que você pode ter outros compromissos e não queremos atrapalhar.",
      "Informa o coordenador sobre a situação e o coordenador alinha com o profissional. Pode haver penalização do profissional com uma semana sem clientes preferenciais, conforme necessário"
     ]
    },
    {
     "id": "pe20",
     "titulo": "FALTA DE CADEIRA - PROFISSIONAL NÃO QUER AJUSTAR PARA PODER SOLUCIONAR UM PROBLEMA",
     "passos": [
      "A recepcionista identifica o problema ao tentar acomodar os clientes e percebe que é necessário trocar de cliente para resolver a falta de cadeira.",
      "Solicita ao profissional responsável pela cadeira que faça o ajuste necessário. Se o profissional se recusar",
      "Chama a coordenação para lidar com a situação.",
      "A coordenação conversa com o profissional e explica a situação. Se o profissional ainda se recusar a cooperar",
      "A coordenação pede desculpas ao cliente afetado e aborda a situação diretamente com o cliente de forma cortês, por exemplo",
      "Olá Ana, tudo bem? Primeiramente, peço desculpas pelo inconveniente. Devido à alta demanda no salão hoje, precisamos acomodá-la em outro lugar para conseguirmos atender um cliente com um procedimento específico nesta cadeira. Isso nos permitirá atendê-la de maneira confortável, assim como o outro cliente. Você poderia me acompanhar?",
      "Após resolver a situação com o cliente afetado, a coordenação busca uma solução alternativa para a falta de cadeira, como utilizar outra cadeira disponível ou ajustar os agendamentos conforme necessário."
     ]
    }
   ]
  },
  {
   "id": "pe21",
   "nome": "ÁREAS COMUNS DO SALÃO",
   "pontos": [
    {
     "id": "pe22",
     "titulo": "AR CONDICIONADO NÃO LIGA",
     "passos": [
      "A recepção verifica se os controles do ar condicionado estão corretamente configurados e se há alguma falha evidente nas configurações. Caso identifique alguma desconfiguração aparente nos controles, tenta reconfigurá-los para ligar o ar condicionado.",
      "Se não for possível resolver a questão diretamente pela recepção, o problema é comunicado à coordenação, que é responsável por gerenciar questões operacionais mais complexas.",
      "A coordenação, ao receber a informação sobre o problema, repassa imediatamente para a gerência do salão.",
      "A gerência entra em contato com o responsável pela manutenção do ar condicionado, no caso, o Braz, para reportar o problema e solicitar os ajustes necessários.",
      "O responsável pela manutenção do ar condicionado, Braz, é acionado para realizar os devidos reparos e garantir o funcionamento adequado do equipamento."
     ]
    },
    {
     "id": "pe23",
     "titulo": "FALTA DE ENERGIA NO SALÃO",
     "passos": [
      "Verifique se na sala da Vera os dois disjuntores estão ligados corretamente. Lembrando que existem duas caixas de energia na sala da Vera, sendo uma atrás do espelho. Certifique-se de que ambos os disjuntores estão na posição ligada.",
      "Caso a falta de energia não seja resolvida localmente na sala da Vera, a recepção deve contatar o guarda do shopping para verificar a sala de energia localizada na garagem do shopping. Solicite ao guarda para verificar se algum disjuntor foi desligado ou se há algum problema na alimentação de energia.",
      "Se o problema persistir e não for resolvido pelo guarda do shopping, a recepção deve perguntar ao segurança do shopping se houve uma queda de energia geral e se o shopping já acionou a concessionária de energia (Neo energia, no caso).",
      "Caso a falta de energia seja um problema interno específico do salão, entre em contato com o Diogo, o arquiteto responsável, para avaliar a situação e identificar a causa da falta de energia.",
      "Enquanto o problema de energia estiver sendo resolvido, a recepção deve ir a todos os profissionais do salão para coletar informações sobre os procedimentos executados e os clientes atendidos. Isso é importante para preparar uma comanda manual e evitar a falta de registros no sistema devido à queda de energia."
     ]
    },
    {
     "id": "pe24",
     "titulo": "FALTA DE ÁGUA NO SALÃO",
     "passos": [
      "Verifique inicialmente com o guarda do shopping se há algum problema com o abastecimento de água no shopping ou se ocorreu uma interrupção no fornecimento de água para o salão.",
      "Solicite ao guarda para verificar as caixas d'água do shopping e informar se há algum problema identificado.",
      "Se não for identificado nenhum problema com o abastecimento de água no shopping, entre em contato imediatamente com o Diogo, o arquiteto responsável pelo salão. Solicite que o Diogo vá até o salão para avaliar a situação e identificar a causa da falta de água. É importante resolver o problema o mais rápido possível para minimizar o impacto nos serviços prestados aos clientes."
     ]
    },
    {
     "id": "pe25",
     "titulo": "MÁQUINA DE CAFÉ - ESTRAGOU",
     "passos": [
      "Entre em contato com a Grancoffe via WhatsApp ou por telefone para solicitar assistência técnica ou manutenção da máquina de café.",
      "Forneça detalhes específicos sobre a situação da máquina e o problema enfrentado, para que a Grancoffe possa entender melhor a natureza da manutenção necessária.",
      "Agende uma visita técnica ou peça orientações sobre como proceder para resolver o problema. Certifique-se de que a solicitação de manutenção seja registrada adequadamente e que haja um acompanhamento para garantir que a máquina seja reparada o mais rápido possível."
     ]
    },
    {
     "id": "pe26",
     "titulo": "JARDIM - MORRENDO",
     "passos": [
      "A coordenadora verifica o estado do jardim e avalia a necessidade de intervenção urgente.",
      "Caso seja identificada a necessidade de manutenção, a coordenadora entra em contato com a responsável pelo jardim para discutir a situação.",
      "Durante a comunicação com a responsável pelo jardim, a coordenadora detalha a condição atual das plantas, os problemas observados e a urgência da intervenção.",
      "Solicite à responsável pelo jardim que proponha soluções e ações corretivas para revitalizar o jardim, incluindo cuidados específicos, irrigação adequada, fertilização ou substituição de plantas danificadas.",
      "Acompanhe de perto o progresso da manutenção do jardim e assegure-se de que as medidas corretivas estejam sendo implementadas conforme discutido."
     ]
    },
    {
     "id": "pe27",
     "titulo": "ÁGUA DO FILTRO - SAINDO POUCA ÁGUA",
     "passos": [
      "A coordenadora entra em contato com a empresa responsável pelo filtro e solicita a substituição da vela do filtro de água devido ao problema de baixa pressão.",
      "Durante a comunicação com a empresa, pergunte o valor da vela do filtro e verifique a disponibilidade para agendar a troca.",
      "Após obter as informações sobre o valor da vela do filtro, a coordenadora solicita ao gerente a autorização para o pagamento no dia da troca.",
      "Agende o serviço de troca da vela do filtro de acordo com a disponibilidade da empresa e com a autorização do gerente para o pagamento.",
      "Certifique-se de acompanhar o processo de troca da vela do filtro e verifique se o problema da baixa pressão de água foi resolvido após a substituição."
     ]
    },
    {
     "id": "pe28",
     "titulo": "CADEIRA - FALTA DE CADEIRA",
     "passos": [
      "A recepção deve informar aos profissionais sobre a possibilidade de gerenciamento de clientes entre os atendimentos, garantindo que eles estejam cientes da necessidade de flexibilidade na acomodação dos clientes.",
      "Acomodação na Área de Espera Externa",
      "Ao receber clientes com atendimento pendente, a recepção os acomoda na área de espera externa do salão.",
      "Aborde o cliente de maneira acolhedora e explicativa, por exemplo",
      "Oi Ana, tudo bem? Como o salão está cheio hoje e o profissional que irá atendê-la ainda está ocupado, vou acomodá-la nesta área de espera externa. Assim que o profissional terminar, a senhora será a próxima atendida aqui dentro, está bom? :)",
      "Posso oferecer uma água ou um café enquanto águarda?",
      "Durante a espera, ofereça cortesias como água ou café para garantir o conforto do cliente.",
      "Monitoramento e Acompanhamento",
      "Mantenha o monitoramento constante do andamento dos atendimentos para garantir uma transição suave entre os clientes.",
      "Assim que o profissional estiver disponível, mova o cliente da área de espera para a cadeira de atendimento."
     ]
    },
    {
     "id": "pe29",
     "titulo": "CAFÉ DA DILLETO - ACABOU DE FORMA INESPERADA",
     "passos": [
      "solicitar a gerencia ou a a Bruna para comprar o grão avulso em atacadão 2° Enquanto águarda o novo suprimento de café, informe os clientes sobre a situação e ofereça alternativas disponíveis, como chá ou outras bebidas quentes, dependendo da disponibilidade."
     ]
    }
   ]
  },
  {
   "id": "pe30",
   "nome": "REUNIÕES / TREINAMENTOS / EVENTOS",
   "pontos": [
    {
     "id": "pe31",
     "titulo": "DESCARTÁVEIS - NÃO TINHA",
     "passos": [
      "Coordenadora pega um valor no fundo de caixa compra no big Box e traz a NF e informa para o Gerente"
     ]
    },
    {
     "id": "pe32",
     "titulo": "COFFEE BREAK ( TREINAMENTOS ) - ESQUECEU DE COMPRAR",
     "passos": [
      "Enquanto o treinamento acontece o coordenador pega o valor no fundo de caixa compra no big box e traz a NF e informa para o gerente."
     ]
    }
   ]
  },
  {
   "id": "pe33",
   "nome": "RECEPÇÃO / DOSAGEM",
   "pontos": [
    {
     "id": "pe34",
     "titulo": "FECHAMENTO DE CAIXA - VALORES NÃO BATE COM O RELATÓRIO",
     "passos": [
      "Fechar Todos os Caixas em Aberto",
      "Certifique-se de que todos os caixas que estavam em aberto foram fechados corretamente.",
      "Isso inclui garantir que todas as transações tenham sido registradas e reconciliadas.",
      "Conferir Comanda por Comanda",
      "Analise cada comanda individualmente para garantir que todos os itens vendidos tenham sido registrados corretamente no sistema. Verifique se os valores cobrados correspondem aos itens vendidos.",
      "Verificar se Não Está Faltando Comanda",
      "Certifique-se de que todas as comandas emitidas foram registradas no sistema. Verifique se não há comandas em aberto ou perdidas que não foram incluídas no relatório de fechamento de caixa.",
      "Analisar Comandas em Aberto e Fechadas",
      "Verifique tanto as comandas em aberto quanto as comandas que foram fechadas durante o período. Compare os valores registrados com os valores esperados.",
      "Verificar por Valores Cobrados no Sistema",
      "Compare os valores cobrados no sistema com os valores esperados. Certifique-se de que todos os pagamentos realizados estejam corretamente registrados e correspondam aos produtos ou serviços vendidos.",
      "Verificar se o Número da Comanda Está Correto",
      "Verifique se os números das comandas registrados no sistema correspondem aos números das comandas físicas. Certifique-se de que não haja erros de digitação ou comandas duplicadas.",
      "Tirar um Relatório da Máquina de Cartão",
      "Se houver um sistema de pagamento com máquina de cartão, tire um relatório detalhado das transações realizadas. Compare esses dados com os registros no sistema interno para identificar discrepâncias.",
      "Comunicar Resultados à Recepção",
      "se não achar vale para a recepção"
     ]
    },
    {
     "id": "pe35",
     "titulo": "COBRANÇA CAIXA - O PROFISSIONAL LANÇOU E NÃO FOI COBRADO",
     "passos": [
      "Verificação da Auditoria da Comanda",
      "Inicialmente, o responsável deve acessar o relatório de auditoria de uma comanda para verificar os detalhes do lançamento e cobrança. Isso inclui comparar o horário do lançamento do serviço com o horário da cobrança para identificar discrepâncias.",
      "Identificação do Problema",
      "Se for identificado que o serviço foi lançado corretamente, mas não foi cobrado ou foi cobrado de forma incorreta, registre a discrepância e prepare-se para corrigir o erro.",
      "Ajuste da Cobrança",
      "Se necessário, realize um vale no sistema para o operador do caixa responsável pelo lançamento incorreto.",
      "Caso o problema seja recorrente ou haja necessidade de esclarecimento, comunique-se com o profissional responsável pelo serviço lançado para garantir que futuros lançamentos sejam feitos corretamente.",
      "Registro da Correção",
      "Registre todas as correções realizadas no sistema de registro interno para manter um histórico claro de auditoria e procedimentos."
     ]
    },
    {
     "id": "pe36",
     "titulo": "COBRANÇA CAIXA - O PROFISSIONAL NÃO LANÇOU E NÃO FOI COBRADO",
     "passos": [
      "O caixa deve realizar uma auditoria na comanda para verificar se o serviço foi registrado corretamente. Utilize o relatório de auditoria da comanda para comparar o horário em que o serviço foi realizado com o horário em que foi cobrado.",
      "Identificação do Erro na Cobrança",
      "Se identificado que o serviço foi prestado, mas não foi cobrado, o caixa deve corrigir o valor da comanda. Isso pode ser feito emitindo um vale para o operador do caixa corrigir a transação.",
      "Comunicação com o Cliente",
      "Durante a revisão final da comanda com o cliente, o caixa deve perguntar se todos os serviços prestados foram incluídos na conta. Caso o cliente mencione que um serviço específico não foi cobrado, o caixa deve resolver a discrepância imediatamente.",
      "Ajuste da Cobrança",
      "Se o serviço foi realizado e não cobrado devido a um erro do profissional ou do caixa, o valor deve ser corrigido antes que o cliente efetue o pagamento. Emita um vale ou ajuste a conta para refletir corretamente os serviços prestados.",
      "Registro da Correção",
      "É importante documentar qualquer ajuste feito na cobrança para fins de auditoria e registro interno.",
      "Feedback ao Profissional",
      "Caso seja identificado um erro recorrente na cobrança de serviços, o caixa deve fornecer feedback ao profissional responsável para evitar futuros problemas semelhantes."
     ]
    },
    {
     "id": "pe37",
     "titulo": "LANÇAMENTO DE SERVIÇOS - PROFISSIONAL LANÇOU ERRADO E FOI COBRADO ERRADO",
     "passos": [
      "Avaliação Inicial",
      "A recepção é responsável por revisar o lançamento dos serviços e a cobrança associada. Se houver discrepância ou algo fora do padrão, a recepção deve discutir com o profissional para esclarecer o que foi realizado e qual valor deve ser cobrado.",
      "Confirmação com o Cliente",
      "Após a revisão inicial, confirme os serviços e os valores com o cliente no momento do pagamento. Certifique-se de que o cliente concorda com os serviços realizados e os valores cobrados.",
      "Comunicação com o Profissional",
      "Se o profissional contestar o valor cobrado após a confirmação com o cliente, a recepção deve explicar que o valor final foi acordado e confirmado durante o atendimento. Explique que a responsabilidade pela precisão na cobrança recai sobre o profissional durante o serviço prestado.",
      "Registro da Discrepância",
      "Para evitar situações semelhantes no futuro, é importante fornecer orientação adicional ao profissional sobre como registrar corretamente os serviços e cobrar os valores adequados."
     ]
    }
   ]
  },
  {
   "id": "pe38",
   "nome": "CLIENTE",
   "pontos": [
    {
     "id": "pe39",
     "titulo": "FEEDBACK DE CLIENTE - ESCRITO",
     "passos": [
      "Leia atentamente o feedback para entender exatamente quais foram as preocupações ou problemas levantados pelo cliente.",
      "passa o feedback para o profissional que errou e verifica o que ouve",
      "Resposta Rápida para o cliente de preferencia ligar para ele",
      "Responda ao cliente prontamente para mostrar que você valoriza a opinião dele e está disposto a resolver o problema , contato por ligação se não conseguir envia uma mensagem .",
      "Empatia e Profissionalismo",
      "Demonstre empatia e profissionalismo em sua resposta, reconhecendo os sentimentos do cliente e mostrando que você está comprometido em resolver a situação da melhor maneira possível.",
      "Resolução do Problema",
      "[Nome do Cliente],",
      "Agradecemos por compartilhar seu feedback conosco. Lamentamos sinceramente pela experiência negativa que você teve em nosso salão. Sua satisfação é nossa prioridade, e gostaríamos de resolver essa questão da melhor maneira possível.",
      "Após receber o feedback, repassamos para o profissional envolvido para entender melhor o ocorrido e evitar recorrências no futuro. Caso deseje, podemos agendar uma nova visita com o mesmo profissional ou com outro membro da nossa equipe, garantindo assim uma experiência satisfatória. a senhora gostaria de reagendar ?",
      "Indique um outro profissional que tenha uma qualidade técnica muito melhor ,",
      "depois avisa para o profissional que irá atender o cliente para ele esta ciente do ocorrido e cometer o mesmo erro",
      "Passa para a gerencia o ocorrido para poder fazer os ajustes de comissão"
     ]
    },
    {
     "id": "pe40",
     "titulo": "CLIENTE NÃO GOSTOU DO PROCEDIMENTO",
     "passos": [
      "Atenção à Expressão Facial",
      "A recepção deve sempre estar atenta à expressão facial do cliente para identificar qualquer sinal de insatisfação.",
      "Verificação da Satisfação",
      "Como precaução, pergunte ao cliente diretamente, por exemplo: \"Ana, a senhora gostou dos procedimentos?",
      "Resposta Negativa da Cliente",
      "Se a cliente disser que não gostou, pergunte imediatamente se ela deseja que seja feita uma correção imediata e se prefere ser atendida por outro profissional.",
      "Ajustes com o Mesmo Profissional",
      "Se ela preferir o mesmo profissional, reacomode-a na cadeira e informe ao profissional sobre a insatisfação do cliente para que as correções necessárias sejam feitas.",
      "Mudança para Outro Profissional",
      "Se a cliente preferir outro profissional, reacomode-a em um local mais discreto, como uma salinha ou ao fundo do salão, onde não haja muitos clientes ao redor.",
      "Atendimento por Outro Profissional",
      "Chame um profissional com habilidades técnicas superiores ao anterior, explique a situação e peça para que ele atenda o cliente.",
      "Verificação Final da Satisfação",
      "No final do procedimento, pergunte novamente ao cliente se ele está satisfeito.",
      "Feedback à Gerência",
      "Após o atendimento, repasse à gerência para que as comissões possam ser ajustadas conforme necessário."
     ]
    },
    {
     "id": "pe41",
     "titulo": "CLIENTE NÃO QUER PAGAR O VALOR LANÇADO NO SISTEMA ( ACHOU CARO )",
     "passos": [
      "Comunicação com o Profissional",
      "A recepção deve informar o profissional sobre a situação e pedir que ele vá conversar com o cliente para chegarem a um acordo sobre o valor.",
      "Intervenção do Coordenador",
      "Se o profissional não estiver disponível para falar com o cliente, a recepção deve informar ao coordenador.",
      "Avaliação dos Valores Médios",
      "O coordenador verifica os valores médios de cada procedimento que o salão cobra e ajusta o valor para o cliente, se possível.",
      "Relato ao Gerente",
      "Informe ao gerente sobre o ocorrido, explicando que o cliente se recusou a pagar e o profissional não colaborou para resolver o problema."
     ]
    },
    {
     "id": "pe42",
     "titulo": "TROCA DE PRODUTO",
     "passos": [
      "Repetição do Processo de Solução por Escrito",
      "Inicie repetindo o processo de solução de feedback por escrito com o cliente.",
      "Verificação da Elegibilidade da Troca",
      "Verifique se o produto foi adquirido nos últimos 7 dias e se ainda está em condições de ser revendido (não foi usado ou danificado).",
      "Encaminhamento para o Coordenador",
      "Encaminhe o problema para o coordenador para revisão e autorização da troca.",
      "Análise da Possibilidade de Troca",
      "Se o produto não foi usado e está dentro do prazo de troca, proceda com a troca do produto, cobrando a diferença de preço, se necessário. Se o novo produto for mais barato, ofereça um crédito ao cliente.",
      "Reabertura do Caixa e Comanda",
      "No sistema, reabra o caixa do dia em que a compra foi feita e também reabra a comanda correspondente.",
      "Efetivação da Troca no Sistema",
      "Realize a troca dos produtos na comanda, ajustando o valor para incluir o pagamento da diferença ou concedendo um crédito, conforme necessário."
     ]
    },
    {
     "id": "pe43",
     "titulo": "CLIENTE QUER O DINHEIRO DE VOLTA",
     "passos": [
      "Repetição do Processo de Solução por Escrito",
      "Inicie repetindo o processo de solução de feedback por escrito com o cliente.",
      "Encaminhamento para o Coordenador",
      "Se o cliente solicitar um reembolso, encaminhe o problema para o coordenador.",
      "Análise das Possíveis Correções",
      "O reembolso só deve ser considerado como última opção. Primeiramente, verifique se há possíveis correções ou ofereça um crédito ao cliente.",
      "Solicitação de Dados Bancários para PIX",
      "Se o cliente preferir o reembolso, solicite os dados bancários (como nome completo e chave PIX) para processar o reembolso.",
      "Encaminhamento à Gerência",
      "Passe os dados bancários para a gerência para que o reembolso seja efetuado. Se necessário, a gerência pode envolver a Bruna no processo."
     ]
    },
    {
     "id": "pe44",
     "titulo": "CLIENTE NÃO AGENDADA",
     "passos": [
      "Recepção Discreta",
      "A recepção deve ser sempre discreta e nunca dar a entender que a cliente não está agendada.",
      "Verificação do Agendamento",
      "Se a cliente afirmar que está agendada, procure pelo nome dela no sistema. Se não encontrar, peça o telefone para buscar o agendamento. Se ainda assim não encontrar, pergunte se o agendamento foi feito em outro nome.",
      "Acolhimento na Cadeira e Oferta de Bebidas",
      "Se não localizar o agendamento, acomode a cliente na cadeira e ofereça água ou café discretamente. Enquanto serve a bebida, pergunte educadamente: \"A senhora poderia confirmar os procedimentos que irá realizar para que eu possa dar entrada no sistema? Também possui preferência por algum profissional?",
      "Confirmação da Preferência por Profissional",
      "Após obter essas informações, se a cliente tiver preferência por um profissional específico, verifique se ela agendou diretamente com esse profissional. Também verifique as mensagens do WhatsApp para mais informações.",
      "Agendamento na Agenda Disponível",
      "Caso a cliente não tenha preferência ou haja um profissional disponível, agende na agenda e informe aos profissionais.",
      "Comunicação em Caso de Indisponibilidade",
      "Se for constatado que a cliente não agendou e não há profissionais disponíveis, informe educadamente: \"Ana, verificamos que como a senhora não confirmou o agendamento, neste momento não temos disponibilidade de profissional, mas temos disponibilidade no horário X. A senhora consegue águardar?"
     ]
    },
    {
     "id": "pe45",
     "titulo": "CLIENTE SE ATRASOU",
     "passos": [
      "Quando o cliente chegar, sempre deixe-o ciente de que irá verificar com o profissional se ainda dará tempo, pois a tolerância é de 15 minutos. 2. Caso não seja possível, a recepção poderá falar dessa forma: 'Olá, como teve esse pequeno atraso e como o profissional está com a agenda um pouco cheia, não conseguiremos te atender agora. Mas ele tem disponibilidade tal horário. Mas se também preferir, tenho disponibilidade com outro profissional X agora ou daqui a X minutos.'"
     ]
    },
    {
     "id": "pe46",
     "titulo": "ESTORNO PARA O CLIENTE - COBRANÇA ERRADA",
     "passos": [
      "Nas máquinas, só é possível fazer o estorno se a última compra na máquina for desse cliente.",
      "Caso já tenha sido feita outra compra após a errada, não é possível realizar o estorno.",
      "Para fazer o estorno, abra a máquina que processou a compra errada. Vá para a opção 'Cancelamento' e insira a senha da máquina. As senhas estão na planilha central, na aba 'Salão' e depois 'Senhas Salão'.",
      "Após inserir a senha da máquina, aparecerá uma mensagem para cancelar a última compra ('Sim'). Siga as instruções e peça para o cliente inserir novamente o cartão e a senha.",
      "Após isso, será emitido um comprovante de cancelamento, com uma via para o cliente e outra para o salão.",
      "Em seguida, passe a compra novamente com o valor correto.",
      "Se não for possível realizar o estorno na máquina, informe ao cliente que iremos encaminhar a solicitação para nosso setor financeiro para realizar o estorno no mesmo dia.",
      "Solicite os dados completos e informações para transferência via PIX ao cliente."
     ]
    }
   ]
  },
  {
   "id": "pe47",
   "nome": "SISTEMA / INTERNET / ELETRÔNICOS",
   "pontos": [
    {
     "id": "pe48",
     "titulo": "CÂMERAS - PROCURAR ALGO QUE SUMIU",
     "passos": [
      "( verificar o dia e aproximadamente e solicitar para o gerente olhar )"
     ]
    },
    {
     "id": "pe49",
     "titulo": "CÂMERAS - SALVAR ALGUM PONTO DE GRAVAÇÃO",
     "passos": [
      "( entra em contato com o Luan do TI e pede suporte."
     ]
    },
    {
     "id": "pe50",
     "titulo": "COMPUTADOR - LENTO",
     "passos": [
      "( entra em contato com o Luan do TI e pede suporte."
     ]
    },
    {
     "id": "pe51",
     "titulo": "COMPUTADOR - NÃO LIGA",
     "passos": [
      "( entra em contato com o Luan do TI e pede suporte."
     ]
    },
    {
     "id": "pe52",
     "titulo": "INTERNET / WIFI - PAROU DE FUNCIONAR",
     "passos": [
      "Primeiro, reinicie o modem da internet. Se não funcionar,",
      "Pegue o celular do salão, ative os dados móveis e conecte-o ao primeiro computador onde está ligado o som do salão para compartilhar a conexão.",
      "Se ainda não resolver, entre em contato com o Luan do TI e peça suporte."
     ]
    },
    {
     "id": "pe53",
     "titulo": "MOUSE - NÃO FUNCIONA",
     "passos": [
      "( entra em contato com o Luan do TI e pede suporte."
     ]
    },
    {
     "id": "pe54",
     "titulo": "MOUSE - PILHAS FRACAS",
     "passos": [
      "( Pede para a Gerencia comprar novas )"
     ]
    },
    {
     "id": "pe55",
     "titulo": "NOTA FISCAL - NÃO ESTÁ SENDO EMITIDA",
     "passos": [
      "Verifique a mensagem de erro ou aviso que está aparecendo no sistema e siga as instruções que o sistema oferece para resolver o problema.",
      "Se as instruções do sistema não funcionarem, entre em contato com o Luan da TI para obter suporte e resolver a emissão da nota fiscal."
     ]
    },
    {
     "id": "pe56",
     "titulo": "NOTA FISCAL - NÃO ESTÁ SENDO EMITIDA E O CLIENTE DESEJA A NOTA",
     "passos": [
      "Verifique a mensagem de erro ou aviso que está aparecendo no sistema e siga as instruções que o sistema oferece para tentar resolver o problema.",
      "Se as tentativas não funcionarem, informe ao cliente: 'Sra., estamos enfrentando um problema com o envio da nota fiscal devido a uma instabilidade entre os sistemas do salão e da Receita Federal. Assim que o sistema normalizar, emitiremos a nota fiscal para a senhora e a enviaremos via WhatsApp. Enquanto isso, podemos fornecer um comprovante de compra detalhado com todos os itens. Está tudo bem para a senhora?'",
      "Após essa interação com o cliente, entre em contato com o Luan da TI para resolver o problema de emissão da nota fiscal.",
      "Assim que a nota fiscal for emitida com sucesso, envie-a para a cliente conforme solicitado."
     ]
    },
    {
     "id": "pe57",
     "titulo": "NOTA FISCAL - NÃO ESTÁ IMPRIMINDO E O CLIENTE DESEJA IMPRESSO",
     "passos": [
      "Primeiro, verifique se a opção de imprimir está selecionada corretamente no sistema, ou se está configurado para salvar o documento como um arquivo digital.",
      "Se estiver configurado para imprimir e mesmo assim não estiver imprimindo, vá até o escritório e imprima a nota fiscal na impressora em uma folha A4.",
      "Se ainda assim não conseguir imprimir, entre em contato com o Luan do TI e solicite suporte para resolver o problema de impressão."
     ]
    },
    {
     "id": "pe58",
     "titulo": "RELATÓRIO DE FECHAMENTO DE CAIXA - NÃO IMPRIME",
     "passos": [
      "Primeiro, verifique se a opção de imprimir está selecionada corretamente no sistema, ou se está configurado para salvar o documento como um arquivo digital.",
      "Se estiver configurado para imprimir e mesmo assim não estiver imprimindo, vá até o escritório e imprima a nota fiscal na impressora em uma folha A4.",
      "Se ainda assim não conseguir imprimir, entre em contato com o Luan do TI e solicite suporte para resolver o problema de impressão."
     ]
    },
    {
     "id": "pe59",
     "titulo": "SISTEMA - PAROU DE FUNCIONAR",
     "passos": [
      "A recepção deve ir até todos os profissionais para obter informações sobre cada procedimento executado e o nome do cliente, a fim de preparar uma comanda manual. Isso ajudará a evitar que o cliente chegue à recepção sem esses dados pré-preparados.",
      "Se o sistema continuar sem funcionar, entre em contato com o Luan do TI e solicite suporte."
     ]
    },
    {
     "id": "pe60",
     "titulo": "SOM DO SALÃO - ESTÁ DESREGULADO",
     "passos": [
      "( entra em contato com o Luan do TI e pede suporte."
     ]
    },
    {
     "id": "pe61",
     "titulo": "SOM DO SALÃO - PAROU DE FUNCIONAR",
     "passos": [
      "( entra em contato com o Luan do TI e pede suporte."
     ]
    },
    {
     "id": "pe62",
     "titulo": "TECLADOS - NÃO FUNCIONA",
     "passos": [
      "(entra em contato com o Luan do TI e pede suporte."
     ]
    },
    {
     "id": "pe63",
     "titulo": "TECLADOS - PILHAS FRACAS",
     "passos": [
      "( Pede para a Gerencia comprar novas )"
     ]
    },
    {
     "id": "pe64",
     "titulo": "WHATSAPP - NÃO RECEBE E ENVIA MENSAGENS",
     "passos": [
      "Verificar se houve uma pane geral no WhatsApp",
      "Primeiramente, pesquise na internet por relatos de uma interrupção geral no WhatsApp. Você pode verificar em sites como o Downdetector ou nas redes sociais para ver se outros usuários estão enfrentando o mesmo problema.",
      "Contatar Luan do TI para suporte",
      "Se não houver indicação de uma falha geral, entre em contato com Luan do departamento de Tecnologia da Informação (TI) da sua empresa. Explique o problema detalhadamente e peça suporte técnico específico para resolver o problema no seu dispositivo ou na rede.",
      "Solicitar publicação do Marketing",
      "Peça ao departamento de Marketing para fazer uma publicação nas redes sociais ou em outros canais de comunicação da empresa informando sobre o problema com o WhatsApp. Nessa publicação, direcione os clientes ou usuários para outro número de contato ou para uma plataforma alternativa de comunicação que esteja funcionando corretamente."
     ]
    },
    {
     "id": "pe65",
     "titulo": "CELULAR - TRAVOU",
     "passos": [
      "Verificar se alguém tem um celular igual para assistência",
      "Se possível, procure alguém que tenha o mesmo modelo de celular para ajudar a entender como resolver o travamento. Eles podem fornecer insights sobre como reiniciar ou solucionar problemas comuns para esse dispositivo específico.",
      "Contatar Luan do TI para suporte técnico",
      "Se não conseguir resolver o problema com a ajuda de alguém com o mesmo modelo de celular, entre em contato com Luan do departamento de Tecnologia da Informação (TI). Explique a situação detalhadamente e solicite suporte técnico para resolver o travamento do seu celular.",
      "Solicitar publicação do Marketing",
      "Peça ao departamento de Marketing para fazer uma publicação nas redes sociais ou em outros canais de comunicação da empresa informando sobre o problema com o seu celular. Na publicação, direcione os contatos para outro número de comunicação ou plataforma alternativa, caso seja necessário manter a comunicação enquanto o problema do celular é resolvido."
     ]
    }
   ]
  }
 ]
}
