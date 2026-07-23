👽 Rodrigo Facilidades kk (Macro Master)
Uma extensão leve e poderosa para o Google Chrome desenvolvida para automatizar e agilizar o fluxo de atendimento ao cliente. Ela permite cadastrar gatilhos rápidos (macros), pesquisar respostas e preencher dados dinâmicos através de um formulário inteligente flutuante diretamente no chat.

🚀 Funcionalidades Principais
Atalho / (Busca de Gatilho): Digite / seguido do nome da macro na caixa de mensagem para ver sugestões instantâneas.

Atalho // (Busca por Conteúdo): Digite // para pesquisar no texto completo de todas as suas macros cadastradas.

Variáveis Dinâmicas ({Coringas}): Ao acionar uma macro que contém {campos}, a extensão abre um popup flutuante na tela para você preencher os dados (como datas e valores) sem risco de enviar informações genéricas.

Interface Simples no Popup: Painel para criar, editar, pesquisar, importar e exportar macros em lote via texto ou JSON.

Atalhos de Navegação: Escolha as sugestões usando as setas do teclado e confirme com Enter ou Tab.

📥 Como Instalar a Extensão no Chrome
Como a extensão foi desenvolvida sob medida, ela deve ser carregada no modo do desenvolvedor:

Baixe os arquivos deste repositório para o seu computador.

Abra o Google Chrome e acesse o endereço chrome://extensions.

No canto superior direito, ative a chave Modo do desenvolvedor.

Clique no botão Carregar sem compactação (no canto superior esquerdo).

Selecione a pasta onde estão os arquivos da extensão.

💡 Como Usar no Dia a Dia
1. Criando ou Importando Macros
Clique no ícone da extensão no navegador para abrir o painel:

Criar Manualmente: Acesse a aba Minhas Macros e clique em + Nova Macro.

Importar em Lote: Acesse a aba Importar e cole a lista de macros no formato:

Plaintext
/gatilho==>Texto da sua resposta padrão aqui
(Também é aceito formato JSON no campo de importação).

2. Disparando Macros no Chat
Clique no campo de texto de qualquer chat ou sistema de atendimento.

Digite / mais o gatilho da macro desejada (exemplo: /sauda).

Uma lista de sugestões flutuante aparecerá logo acima do cursor.

Pressione Enter ou Tab para colar a mensagem.

3. Usando Macros com Campos Dinâmicos ({Coringas})
Para evitar mensagens com XXX ou campos em branco, use marcadores entre chaves {} na criação da macro.

Exemplo de Cadastro:
Gatilho: /explica2

Texto:

Identifiquei aqui no sistema as contratações do Crédito Fácil realizadas nos dias {dia 1} e {dia 2}, nos valores de R$ {valor 1} e R$ {valor 2}, respectivamente.

Como Funciona na Prática:
Digite /explica2 no chat e aperte Enter.

Um pequeno formulário aparecerá centralizado na tela solicitando:

dia 1

dia 2

valor 1

valor 2

Preencha os campos usando Tab para navegar e aperte Enter.

O texto completo e formatado será colado automaticamente no campo de digitação!

🛠️ Tecnologias Utilizadas
JavaScript (Vanilla): Injeção de scripts no DOM (content.js).

Chrome Storage API: Sincronização e armazenamento local das macros.

HTML5 & CSS3: Interface do painel popup e modais flutuantes.
