const { Article, Category } = require('../models');
const { Op } = require('sequelize');

exports.generateFeed = async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';

        // Buscar últimos 30 artigos
        const articles = await Article.findAll({
            where: {
                publicado: true,
                data_publicacao: {
                    [Op.lte]: new Date()
                }
            },
            order: [['data_publicacao', 'DESC']],
            limit: 30
        });

        // Função auxiliar para escapar caracteres XML
        const escapeXml = (unsafe) => {
            return unsafe.replace(/[<>&'"]/g, (c) => {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '&quot;';
                }
            });
        };

        // Montar o cabeçalho do RSS
        let rss = '<?xml version="1.0" encoding="UTF-8" ?>\n';
        rss += '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:sy="http://purl.org/rss/1.0/modules/syndication/" xmlns:slash="http://purl.org/rss/1.0/modules/slash/">\n';
        rss += '  <channel>\n';
        rss += '    <title>O Buxixo Gospel</title>\n';
        rss += '    <atom:link href="' + baseUrl + '/feed" rel="self" type="application/rss+xml" />\n';
        rss += '    <link>' + baseUrl + '</link>\n';
        rss += '    <description>Notícias Gospel e Evangélicas</description>\n';
        rss += '    <lastBuildDate>' + (articles.length > 0 ? new Date(articles[0].dataPublicacao).toUTCString() : new Date().toUTCString()) + '</lastBuildDate>\n';
        rss += '    <language>pt-BR</language>\n';
        rss += '    <sy:updatePeriod>hourly</sy:updatePeriod>\n';
        rss += '    <sy:updateFrequency>1</sy:updateFrequency>\n';
        rss += '    <generator>O Buxixo Gospel System</generator>\n';

        // Adicionar itens (artigos)
        for (const article of articles) {
            const url = `${baseUrl}/${article.categoria}/${article.urlAmigavel}`;
            // Usar metaDescrição ou descrição curta
            const description = article.metaDescricao || article.descricao || '';
            // Se tiver imagem, adicionar tag enclosure
            const imageUrl = article.imagem.startsWith('http') ? article.imagem : `${baseUrl}${article.imagem.startsWith('/') ? '' : '/'}${article.imagem}`;

            rss += '    <item>\n';
            rss += `      <title>${escapeXml(article.titulo)}</title>\n`;
            rss += `      <link>${url}</link>\n`;
            rss += `      <dc:creator><![CDATA[${article.autor || 'Redação'}]]></dc:creator>\n`;
            rss += `      <pubDate>${new Date(article.dataPublicacao).toUTCString()}</pubDate>\n`;
            rss += `      <category><![CDATA[${article.categoria}]]></category>\n`;
            rss += `      <guid isPermaLink="true">${url}</guid>\n`;
            rss += `      <description><![CDATA[${description}]]></description>\n`;
            if (article.imagem) {
                rss += `      <enclosure url="${imageUrl}" length="0" type="image/jpeg" />\n`;
            }
            rss += '    </item>\n';
        }

        rss += '  </channel>\n';
        rss += '</rss>';

        res.header('Content-Type', 'application/xml');
        res.send(rss);

    } catch (error) {
        console.error('Erro ao gerar feed RSS:', error);
        res.status(500).send('Erro ao gerar feed');
    }
};
