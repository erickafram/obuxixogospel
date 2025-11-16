'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    
    await queryInterface.bulkInsert('pages', [
      {
        titulo: 'Termos de Uso',
        slug: 'termos-de-uso',
        descricao: 'Termos e condições de uso do portal Obuxixo Gospel',
        conteudo: `
          <h1>Termos de Uso</h1>
          
          <p>Bem-vindo ao Obuxixo Gospel. Ao acessar e usar este site, você concorda com os seguintes termos e condições:</p>
          
          <h2>1. Aceitação dos Termos</h2>
          <p>Ao acessar este site, você aceita estar vinculado a estes termos de uso, todas as leis e regulamentos aplicáveis, e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis.</p>
          
          <h2>2. Uso do Conteúdo</h2>
          <p>O conteúdo deste site é fornecido apenas para fins informativos e educacionais. Você não pode modificar, copiar, distribuir, transmitir, exibir, executar, reproduzir, publicar, licenciar, criar trabalhos derivados, transferir ou vender qualquer informação, software, produtos ou serviços obtidos deste site sem autorização prévia por escrito.</p>
          
          <h2>3. Propriedade Intelectual</h2>
          <p>Todo o conteúdo incluído neste site, como texto, gráficos, logotipos, imagens, clipes de áudio, downloads digitais e compilações de dados, é propriedade do Obuxixo Gospel ou de seus fornecedores de conteúdo e protegido por leis de direitos autorais.</p>
          
          <h2>4. Limitação de Responsabilidade</h2>
          <p>Em nenhuma circunstância o Obuxixo Gospel será responsável por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro, ou devido à interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais neste site.</p>
          
          <h2>5. Modificações</h2>
          <p>O Obuxixo Gospel pode revisar estes termos de uso a qualquer momento sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual destes termos de uso.</p>
          
          <h2>6. Contato</h2>
          <p>Se você tiver alguma dúvida sobre estes Termos de Uso, entre em contato conosco através do nosso formulário de contato.</p>
          
          <p><em>Última atualização: Novembro de 2024</em></p>
        `,
        ativo: true,
        ordem: 1,
        exibir_footer: true,
        exibir_menu: false,
        created_at: now,
        updated_at: now
      },
      {
        titulo: 'Política de Privacidade',
        slug: 'politica-de-privacidade',
        descricao: 'Como coletamos, usamos e protegemos suas informações pessoais',
        conteudo: `
          <h1>Política de Privacidade</h1>
          
          <p>No Obuxixo Gospel, privacidade e segurança são prioridades e nos comprometemos com a transparência do tratamento de dados pessoais dos nossos usuários.</p>
          
          <h2>1. Informações que Coletamos</h2>
          <p>Coletamos informações que você nos fornece diretamente, como:</p>
          <ul>
            <li>Nome e endereço de e-mail quando você se inscreve em nossa newsletter</li>
            <li>Comentários e interações em nossos artigos</li>
            <li>Informações de navegação através de cookies</li>
          </ul>
          
          <h2>2. Como Usamos Suas Informações</h2>
          <p>Usamos as informações coletadas para:</p>
          <ul>
            <li>Fornecer, operar e manter nosso site</li>
            <li>Melhorar, personalizar e expandir nosso site</li>
            <li>Entender e analisar como você usa nosso site</li>
            <li>Desenvolver novos produtos, serviços, recursos e funcionalidades</li>
            <li>Comunicar com você, diretamente ou através de nossos parceiros</li>
          </ul>
          
          <h2>3. Cookies</h2>
          <p>Utilizamos cookies para melhorar sua experiência em nosso site. Você pode optar por desativar os cookies através das configurações do seu navegador.</p>
          
          <h2>4. Compartilhamento de Dados</h2>
          <p>Não vendemos, trocamos ou transferimos suas informações pessoais para terceiros sem o seu consentimento, exceto quando necessário para fornecer nossos serviços ou quando exigido por lei.</p>
          
          <h2>5. Segurança</h2>
          <p>Implementamos medidas de segurança para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição.</p>
          
          <h2>6. Seus Direitos</h2>
          <p>Você tem o direito de:</p>
          <ul>
            <li>Acessar suas informações pessoais</li>
            <li>Corrigir informações imprecisas</li>
            <li>Solicitar a exclusão de suas informações</li>
            <li>Opor-se ao processamento de suas informações</li>
          </ul>
          
          <h2>7. Alterações nesta Política</h2>
          <p>Podemos atualizar nossa Política de Privacidade periodicamente. Notificaremos você sobre quaisquer alterações publicando a nova Política de Privacidade nesta página.</p>
          
          <h2>8. Contato</h2>
          <p>Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco.</p>
          
          <p><em>Última atualização: Novembro de 2024</em></p>
        `,
        ativo: true,
        ordem: 2,
        exibir_footer: true,
        exibir_menu: false,
        created_at: now,
        updated_at: now
      },
      {
        titulo: 'Anuncie Conosco',
        slug: 'anuncie-conosco',
        descricao: 'Oportunidades de publicidade e parceria no Obuxixo Gospel',
        conteudo: `
          <h1>Anuncie Conosco</h1>
          
          <p>O Obuxixo Gospel é um dos principais portais de conteúdo gospel do Brasil, alcançando milhares de pessoas diariamente com notícias, música, eventos e conteúdo edificante.</p>
          
          <h2>Por que Anunciar no Obuxixo Gospel?</h2>
          
          <h3>📊 Alcance Qualificado</h3>
          <p>Nosso público é composto por cristãos engajados, líderes de ministérios, músicos, pastores e pessoas interessadas em conteúdo gospel de qualidade.</p>
          
          <h3>🎯 Segmentação Precisa</h3>
          <p>Oferecemos opções de segmentação por categoria, região e perfil de audiência para garantir que sua mensagem chegue ao público certo.</p>
          
          <h3>📈 Resultados Mensuráveis</h3>
          <p>Fornecemos relatórios detalhados sobre o desempenho de suas campanhas, incluindo impressões, cliques e conversões.</p>
          
          <h2>Formatos de Publicidade</h2>
          
          <h3>Banner Display</h3>
          <p>Banners em posições estratégicas do site com alta visibilidade.</p>
          
          <h3>Conteúdo Patrocinado</h3>
          <p>Artigos e matérias especiais sobre sua marca, produto ou evento.</p>
          
          <h3>Newsletter</h3>
          <p>Destaque na nossa newsletter semanal enviada para milhares de assinantes.</p>
          
          <h3>Redes Sociais</h3>
          <p>Divulgação nas nossas redes sociais com grande engajamento.</p>
          
          <h2>Pacotes e Valores</h2>
          <p>Oferecemos pacotes personalizados de acordo com suas necessidades e objetivos. Entre em contato conosco para receber uma proposta comercial.</p>
          
          <h2>Entre em Contato</h2>
          <p>Para mais informações sobre publicidade e parcerias:</p>
          <ul>
            <li><strong>E-mail:</strong> comercial@obuxixogospel.com</li>
            <li><strong>WhatsApp:</strong> (11) 99999-9999</li>
            <li><strong>Horário:</strong> Segunda a Sexta, 9h às 18h</li>
          </ul>
          
          <p>Aguardamos seu contato para construirmos juntos uma parceria de sucesso!</p>
        `,
        ativo: true,
        ordem: 3,
        exibir_footer: true,
        exibir_menu: false,
        created_at: now,
        updated_at: now
      },
      {
        titulo: 'Trabalhe Conosco',
        slug: 'trabalhe-conosco',
        descricao: 'Faça parte da equipe Obuxixo Gospel',
        conteudo: `
          <h1>Trabalhe Conosco</h1>
          
          <p>O Obuxixo Gospel está sempre em busca de talentos apaixonados por comunicação gospel e dispostos a fazer a diferença no Reino de Deus através da mídia.</p>
          
          <h2>Por que Trabalhar Conosco?</h2>
          
          <h3>🙏 Propósito</h3>
          <p>Trabalhamos com um propósito maior: levar a mensagem do evangelho através de conteúdo de qualidade.</p>
          
          <h3>🚀 Crescimento</h3>
          <p>Oferecemos oportunidades de desenvolvimento profissional e espiritual.</p>
          
          <h3>👥 Equipe</h3>
          <p>Faça parte de uma equipe comprometida, criativa e apaixonada pelo que faz.</p>
          
          <h3>💡 Inovação</h3>
          <p>Estamos sempre buscando novas formas de comunicar o evangelho usando tecnologia e criatividade.</p>
          
          <h2>Áreas de Atuação</h2>
          
          <h3>Jornalismo</h3>
          <p>Repórteres, redatores e editores para produção de conteúdo gospel.</p>
          
          <h3>Tecnologia</h3>
          <p>Desenvolvedores, designers e analistas para manter e evoluir nossa plataforma.</p>
          
          <h3>Marketing</h3>
          <p>Profissionais de marketing digital, redes sociais e SEO.</p>
          
          <h3>Audiovisual</h3>
          <p>Fotógrafos, videomakers e editores de vídeo.</p>
          
          <h3>Comercial</h3>
          <p>Executivos de vendas e atendimento ao cliente.</p>
          
          <h2>O que Buscamos</h2>
          <ul>
            <li>Compromisso com valores cristãos</li>
            <li>Excelência profissional</li>
            <li>Criatividade e proatividade</li>
            <li>Trabalho em equipe</li>
            <li>Paixão por comunicação</li>
          </ul>
          
          <h2>Como se Candidatar</h2>
          <p>Envie seu currículo e portfólio (se aplicável) para:</p>
          <ul>
            <li><strong>E-mail:</strong> rh@obuxixogospel.com</li>
            <li><strong>Assunto:</strong> Candidatura - [Área de Interesse]</li>
          </ul>
          
          <p>Inclua uma breve carta de apresentação contando sobre você, sua experiência e por que deseja fazer parte da nossa equipe.</p>
          
          <h2>Processo Seletivo</h2>
          <ol>
            <li>Análise de currículo</li>
            <li>Entrevista inicial</li>
            <li>Teste prático (quando aplicável)</li>
            <li>Entrevista final</li>
            <li>Proposta</li>
          </ol>
          
          <p>Venha fazer parte dessa missão! 🙌</p>
        `,
        ativo: true,
        ordem: 4,
        exibir_footer: true,
        exibir_menu: false,
        created_at: now,
        updated_at: now
      },
      {
        titulo: 'Sobre Nós',
        slug: 'sobre-nos',
        descricao: 'Conheça a história e missão do Obuxixo Gospel',
        conteudo: `
          <h1>Sobre o Obuxixo Gospel</h1>
          
          <p>O Obuxixo Gospel nasceu com o propósito de ser uma plataforma de comunicação gospel de excelência, levando informação, edificação e entretenimento cristão para todo o Brasil.</p>
          
          <h2>Nossa Missão</h2>
          <p>Comunicar o evangelho de Jesus Cristo através de conteúdo relevante, atual e de qualidade, alcançando pessoas de todas as idades e contextos sociais.</p>
          
          <h2>Nossa Visão</h2>
          <p>Ser referência em comunicação gospel no Brasil, reconhecidos pela excelência, credibilidade e impacto transformador do nosso conteúdo.</p>
          
          <h2>Nossos Valores</h2>
          <ul>
            <li><strong>Fé:</strong> Fundamentados na Palavra de Deus</li>
            <li><strong>Excelência:</strong> Compromisso com qualidade em tudo que fazemos</li>
            <li><strong>Integridade:</strong> Transparência e ética em todas as relações</li>
            <li><strong>Inovação:</strong> Sempre buscando novas formas de comunicar</li>
            <li><strong>Comunidade:</strong> Valorizamos relacionamentos e parcerias</li>
          </ul>
          
          <h2>O que Fazemos</h2>
          
          <h3>📰 Notícias</h3>
          <p>Cobertura completa dos principais acontecimentos do mundo gospel.</p>
          
          <h3>🎵 Música</h3>
          <p>Novidades, lançamentos e entrevistas com artistas gospel.</p>
          
          <h3>🎉 Eventos</h3>
          <p>Agenda completa de conferências, shows e encontros cristãos.</p>
          
          <h3>⛪ Ministérios</h3>
          <p>Conteúdo para líderes e ministérios de todas as áreas.</p>
          
          <h3>📖 Estudos</h3>
          <p>Estudos bíblicos, devocionais e conteúdo teológico.</p>
          
          <h2>Nossa Equipe</h2>
          <p>Contamos com uma equipe multidisciplinar de jornalistas, designers, desenvolvedores e profissionais de comunicação comprometidos com a excelência e a missão de comunicar o evangelho.</p>
          
          <h2>Contato</h2>
          <p>Estamos sempre abertos para sugestões, parcerias e feedbacks:</p>
          <ul>
            <li><strong>E-mail:</strong> contato@obuxixogospel.com</li>
            <li><strong>Redes Sociais:</strong> @obuxixogospel</li>
          </ul>
          
          <p>Que Deus abençoe sua visita ao nosso portal! 🙏</p>
        `,
        ativo: true,
        ordem: 5,
        exibir_footer: false,
        exibir_menu: true,
        created_at: now,
        updated_at: now
      },
      {
        titulo: 'Contato',
        slug: 'contato',
        descricao: 'Entre em contato com a equipe Obuxixo Gospel',
        conteudo: `
          <h1>Contato</h1>
          
          <p>Estamos aqui para ouvir você! Entre em contato conosco através dos canais abaixo:</p>
          
          <h2>📧 E-mail</h2>
          <ul>
            <li><strong>Geral:</strong> contato@obuxixogospel.com</li>
            <li><strong>Redação:</strong> redacao@obuxixogospel.com</li>
            <li><strong>Comercial:</strong> comercial@obuxixogospel.com</li>
            <li><strong>RH:</strong> rh@obuxixogospel.com</li>
          </ul>
          
          <h2>📱 Redes Sociais</h2>
          <ul>
            <li><strong>Facebook:</strong> /obuxixogospel</li>
            <li><strong>Instagram:</strong> @obuxixogospel</li>
            <li><strong>YouTube:</strong> /obuxixogospel</li>
            <li><strong>Twitter:</strong> @obuxixogospel</li>
            <li><strong>TikTok:</strong> @obuxixogospel</li>
          </ul>
          
          <h2>💬 WhatsApp</h2>
          <p><strong>Atendimento:</strong> (11) 99999-9999</p>
          <p><em>Horário: Segunda a Sexta, 9h às 18h</em></p>
          
          <h2>📍 Endereço</h2>
          <p>
            Obuxixo Gospel<br>
            Rua Exemplo, 123 - Centro<br>
            São Paulo - SP<br>
            CEP: 01000-000
          </p>
          
          <h2>Sugestões de Pauta</h2>
          <p>Tem uma sugestão de matéria ou quer divulgar um evento? Envie para <strong>redacao@obuxixogospel.com</strong> com o assunto "Sugestão de Pauta".</p>
          
          <h2>Parcerias e Colaborações</h2>
          <p>Interessado em parceria ou colaboração? Entre em contato através de <strong>comercial@obuxixogospel.com</strong>.</p>
          
          <p>Respondemos todas as mensagens em até 48 horas úteis.</p>
        `,
        ativo: true,
        ordem: 6,
        exibir_footer: false,
        exibir_menu: true,
        created_at: now,
        updated_at: now
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('pages', null, {});
  }
};
