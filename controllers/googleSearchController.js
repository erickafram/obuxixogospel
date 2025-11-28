const axios = require('axios');
const cheerio = require('cheerio');
const AIService = require('../services/AIService');
const { Category, Article } = require('../models');
const slugify = require('slugify');

/**
 * Renderiza a página de pesquisa Google
 */
exports.renderPage = async (req, res) => {
    try {
        // Buscar categorias do banco
        const categorias = await Category.findAll({
            order: [['ordem', 'ASC'], ['nome', 'ASC']]
        });

        res.render('dashboard/ia/google-search', {
            user: {
                nome: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            categorias
        });
    } catch (error) {
        console.error('Erro ao carregar página:', error);
        res.status(500).send('Erro ao carregar página');
    }
};

/**
 * Plataformas disponíveis para pesquisa
 */
const PLATAFORMAS = {
    // Redes Sociais
    instagram: 'site:instagram.com',
    twitter: 'site:twitter.com OR site:x.com',
    youtube: 'site:youtube.com',
    facebook: 'site:facebook.com',
    tiktok: 'site:tiktok.com',
    threads: 'site:threads.net',
    linkedin: 'site:linkedin.com',
    
    // Portais de Notícias
    g1: 'site:g1.globo.com',
    uol: 'site:uol.com.br',
    folha: 'site:folha.uol.com.br',
    estadao: 'site:estadao.com.br',
    r7: 'site:r7.com',
    terra: 'site:terra.com.br',
    ig: 'site:ig.com.br',
    metropoles: 'site:metropoles.com',
    cnn: 'site:cnnbrasil.com.br',
    band: 'site:band.uol.com.br',
    sbt: 'site:sbt.com.br',
    record: 'site:r7.com OR site:recordtv.r7.com',
    
    // Sites Gospel
    gospelprime: 'site:gospelprime.com.br',
    gospelmais: 'site:gospelmais.com.br',
    pleno: 'site:pleno.news',
    guiame: 'site:guiame.com.br',
    conexao: 'site:conexaojornalismo.com.br',
    verdadegospel: 'site:verdadegospel.com',
    ofuxicogospel: 'site:fuxicogospel.com.br OR site:ofuxicogospel.com.br',
    
    // Blogs e Opinião
    blogs: 'site:blogspot.com OR site:wordpress.com OR site:medium.com',
    
    todas: ''
};

/**
 * Períodos de tempo para filtro
 */
const PERIODOS = {
    'ultima-hora': 'qdr:h',
    'ultimas-24h': 'qdr:d',
    'ultima-semana': 'qdr:w',
    'ultimo-mes': 'qdr:m',
    'ultimo-ano': 'qdr:y',
    'qualquer': ''
};

/**
 * Realiza pesquisa usando ScraperAPI ou APIs gratuitas
 */
exports.pesquisar = async (req, res) => {
    try {
        const { termo, plataforma, periodo, pagina = 1 } = req.body;

        if (!termo) {
            return res.status(400).json({
                success: false,
                error: 'Termo de pesquisa é obrigatório'
            });
        }

        console.log(`🔍 Pesquisando: "${termo}" em ${plataforma || 'todas'} (${periodo || 'qualquer tempo'})`);

        // Montar query de pesquisa
        let query = termo;
        if (plataforma && plataforma !== 'todas' && PLATAFORMAS[plataforma]) {
            query += ' ' + PLATAFORMAS[plataforma];
        }

        let resultados = [];
        
        // 1. Tentar Google via proxy gratuito (webscraping.ai)
        console.log('🌐 Tentando Google via proxy...');
        resultados = await pesquisarGoogleProxy(query, periodo);
        
        // 2. Se falhar, tentar DuckDuckGo Instant API
        if (resultados.length === 0) {
            console.log('🦆 Tentando DuckDuckGo API...');
            resultados = await pesquisarDuckDuckGoAPI(query);
        }

        // 3. Se ainda falhar, tentar Google News RSS
        if (resultados.length === 0) {
            console.log('📰 Tentando Google News RSS...');
            resultados = await pesquisarGoogleNewsRSS(query);
        }

        console.log(`✅ ${resultados.length} resultados encontrados`);

        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR${periodo && PERIODOS[periodo] ? '&tbs=' + PERIODOS[periodo] : ''}`;

        if (resultados.length === 0) {
            return res.json({
                success: true,
                resultados: [],
                total: 0,
                query,
                googleUrl,
                abrirManualmente: true
            });
        }

        res.json({
            success: true,
            resultados: resultados.slice(0, 20),
            total: resultados.length,
            query,
            googleUrl
        });

    } catch (error) {
        console.error('❌ Erro na pesquisa:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao realizar pesquisa. Tente novamente.'
        });
    }
};

/**
 * Pesquisar Google via proxy gratuito
 */
async function pesquisarGoogleProxy(query, periodo) {
    try {
        // Usar o Google via diferentes proxies/métodos
        const filtrosTempo = {
            'ultima-hora': '&tbs=qdr:h',
            'ultimas-24h': '&tbs=qdr:d',
            'ultima-semana': '&tbs=qdr:w',
            'ultimo-mes': '&tbs=qdr:m',
            'ultimo-ano': '&tbs=qdr:y'
        };
        
        const filtro = filtrosTempo[periodo] || '';
        
        // Método 1: Tentar via startpage (usa Google por trás)
        const startpageUrl = `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}&language=portugues`;
        
        console.log('📡 Tentando Startpage...');
        
        const response = await axios.get(startpageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const resultados = [];

        // Seletores do Startpage
        $('.w-gl__result, .result').each((i, element) => {
            const $el = $(element);
            
            const linkEl = $el.find('a.w-gl__result-url, a.result-link').first();
            const link = linkEl.attr('href');
            
            const tituloEl = $el.find('h3, .w-gl__result-title').first();
            const titulo = tituloEl.text().trim();
            
            const descEl = $el.find('.w-gl__description, p.result-description').first();
            const descricao = descEl.text().trim();

            if (titulo && link && link.startsWith('http') && !link.includes('startpage.com')) {
                resultados.push({
                    id: resultados.length + 1,
                    titulo: titulo.substring(0, 200),
                    link,
                    descricao: descricao.substring(0, 300),
                    data: '',
                    plataforma: detectarPlataforma(link)
                });
            }
        });

        if (resultados.length > 0) {
            console.log(`✅ Startpage: ${resultados.length} resultados`);
            return resultados;
        }

        // Método 2: Tentar Ecosia (também usa Bing/Google)
        console.log('🌿 Tentando Ecosia...');
        const ecosiaUrl = `https://www.ecosia.org/search?method=index&q=${encodeURIComponent(query)}`;
        
        const ecosiaResponse = await axios.get(ecosiaUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            },
            timeout: 15000
        });

        const $ecosia = cheerio.load(ecosiaResponse.data);
        
        $ecosia('.result, article[data-test-id="mainline-result-web"]').each((i, element) => {
            const $el = $ecosia(element);
            
            const linkEl = $el.find('a[href^="http"]').first();
            const link = linkEl.attr('href');
            
            const titulo = $el.find('h2, .result-title').first().text().trim();
            const descricao = $el.find('p, .result-snippet').first().text().trim();

            if (titulo && link && !link.includes('ecosia.org')) {
                resultados.push({
                    id: resultados.length + 1,
                    titulo: titulo.substring(0, 200),
                    link,
                    descricao: descricao.substring(0, 300),
                    data: '',
                    plataforma: detectarPlataforma(link)
                });
            }
        });

        return resultados;
    } catch (error) {
        console.error('❌ Erro proxy:', error.message);
        return [];
    }
}

/**
 * Pesquisar usando DuckDuckGo Instant Answer API
 */
async function pesquisarDuckDuckGoAPI(query) {
    try {
        // DuckDuckGo HTML version (mais confiável)
        const ddgUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=br-pt`;
        
        console.log('📡 DuckDuckGo Lite:', ddgUrl);

        const response = await axios.get(ddgUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const resultados = [];

        // DuckDuckGo Lite usa tabelas
        $('table tr').each((i, element) => {
            const $el = $(element);
            
            // Procurar links de resultado
            const linkEl = $el.find('a.result-link, a[href^="http"]').first();
            let link = linkEl.attr('href');
            
            if (!link) return;
            
            // Extrair URL real do redirecionamento DDG
            if (link.includes('duckduckgo.com/l/?')) {
                const match = link.match(/uddg=([^&]+)/);
                if (match) {
                    link = decodeURIComponent(match[1]);
                }
            }
            
            const titulo = linkEl.text().trim();
            
            // Próxima linha geralmente tem a descrição
            const descricao = $el.next('tr').find('td.result-snippet').text().trim();

            if (titulo && link && link.startsWith('http') && !link.includes('duckduckgo.com')) {
                resultados.push({
                    id: resultados.length + 1,
                    titulo: titulo.substring(0, 200),
                    link,
                    descricao: descricao.substring(0, 300),
                    data: '',
                    plataforma: detectarPlataforma(link)
                });
            }
        });

        // Fallback: pegar todos os links válidos
        if (resultados.length === 0) {
            $('a[href^="http"]').each((i, element) => {
                const $el = $(element);
                let link = $el.attr('href');
                const titulo = $el.text().trim();
                
                // Extrair URL real
                if (link && link.includes('uddg=')) {
                    const match = link.match(/uddg=([^&]+)/);
                    if (match) {
                        link = decodeURIComponent(match[1]);
                    }
                }

                if (titulo && titulo.length > 10 && link && link.startsWith('http') && 
                    !link.includes('duckduckgo.com') && !link.includes('duck.co')) {
                    if (!resultados.find(r => r.link === link)) {
                        resultados.push({
                            id: resultados.length + 1,
                            titulo: titulo.substring(0, 200),
                            link,
                            descricao: '',
                            data: '',
                            plataforma: detectarPlataforma(link)
                        });
                    }
                }
            });
        }

        return resultados;
    } catch (error) {
        console.error('❌ Erro DuckDuckGo:', error.message);
        return [];
    }
}

/**
 * Pesquisar no Google News RSS (não bloqueia)
 */
async function pesquisarGoogleNewsRSS(query) {
    try {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
        
        console.log('📡 Google News RSS:', rssUrl);

        const response = await axios.get(rssUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'application/rss+xml, application/xml, text/xml'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data, { xmlMode: true });
        const resultados = [];

        $('item').each((i, element) => {
            const $el = $(element);
            
            const titulo = $el.find('title').text().trim();
            const link = $el.find('link').text().trim();
            const descricao = $el.find('description').text().replace(/<[^>]*>/g, '').trim();
            const pubDate = $el.find('pubDate').text().trim();

            if (titulo && link) {
                resultados.push({
                    id: resultados.length + 1,
                    titulo: titulo.substring(0, 200),
                    link,
                    descricao: descricao.substring(0, 300),
                    data: pubDate ? new Date(pubDate).toLocaleDateString('pt-BR') : '',
                    plataforma: detectarPlataforma(link)
                });
            }
        });

        return resultados;
    } catch (error) {
        console.error('❌ Erro Google News RSS:', error.message);
        return [];
    }
}

/**
 * Busca palavras-chave em alta relacionadas a um tema
 */
exports.buscarPalavrasChave = async (req, res) => {
    try {
        const { tema = 'gospel' } = req.body;
        
        console.log(`🔑 Buscando palavras-chave em alta para: ${tema}`);
        
        let palavrasChave = [];
        
        // Termos base para buscar sugestões relacionadas
        const termosBase = [
            'pastor', 'igreja', 'gospel', 'evangélico', 'cantor gospel',
            'pregador', 'louvor', 'adoração', 'cristão', 'bíblia'
        ];
        
        // Método 1: Google Suggest (autocomplete) - funciona bem!
        try {
            for (const termo of termosBase.slice(0, 5)) {
                const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(termo)}&hl=pt-BR`;
                
                const response = await axios.get(suggestUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json'
                    },
                    timeout: 5000
                });
                
                if (response.data && Array.isArray(response.data[1])) {
                    response.data[1].forEach(sugestao => {
                        if (sugestao && sugestao.length > 3 && !palavrasChave.includes(sugestao)) {
                            palavrasChave.push(sugestao);
                        }
                    });
                }
            }
            
            console.log(`✅ Google Suggest: ${palavrasChave.length} sugestões`);
        } catch (e) {
            console.error('❌ Erro Google Suggest:', e.message);
        }
        
        // Método 2: Buscar trends relacionados a gospel/evangélico
        if (palavrasChave.length < 10) {
            try {
                const trendsUrl = `https://trends.google.com/trends/api/dailytrends?hl=pt-BR&tz=-180&geo=BR&ns=15`;
                
                const response = await axios.get(trendsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                });
                
                let jsonData = response.data;
                if (typeof jsonData === 'string' && jsonData.startsWith(')]}')) {
                    jsonData = JSON.parse(jsonData.substring(5));
                }
                
                if (jsonData?.default?.trendingSearchesDays) {
                    jsonData.default.trendingSearchesDays.forEach(day => {
                        day.trendingSearches?.forEach(trend => {
                            const titulo = trend.title?.query;
                            if (titulo && !palavrasChave.includes(titulo)) {
                                // Filtrar por termos relacionados a religião/gospel
                                const termoLower = titulo.toLowerCase();
                                const relacionado = ['pastor', 'igreja', 'gospel', 'evangél', 'cristã', 'bíblia', 
                                    'deus', 'jesus', 'oração', 'louvor', 'cantora', 'cantor', 'pregador',
                                    'assembleia', 'batista', 'universal', 'mundial', 'renascer'].some(t => 
                                    termoLower.includes(t)
                                );
                                if (relacionado) {
                                    palavrasChave.push(titulo);
                                }
                            }
                        });
                    });
                }
                
                console.log(`✅ Daily Trends filtrado: ${palavrasChave.length} palavras`);
            } catch (e) {
                console.error('❌ Erro Daily Trends:', e.message);
            }
        }
        
        // Método 3: Buscar notícias gospel recentes para extrair termos
        if (palavrasChave.length < 15) {
            try {
                const newsUrl = `https://news.google.com/rss/search?q=gospel+OR+evangélico+OR+pastor&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
                
                const response = await axios.get(newsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
                        'Accept': 'application/rss+xml, application/xml, text/xml'
                    },
                    timeout: 10000
                });
                
                const $ = cheerio.load(response.data, { xmlMode: true });
                
                $('item').slice(0, 15).each((i, element) => {
                    const titulo = $(element).find('title').text().trim();
                    if (titulo) {
                        // Extrair nomes próprios e termos relevantes
                        const palavras = titulo.split(/[\s,\-:]+/);
                        palavras.forEach(palavra => {
                            // Palavras com mais de 4 letras e que começam com maiúscula (nomes)
                            if (palavra.length > 4 && /^[A-ZÀ-Ú]/.test(palavra) && !palavrasChave.includes(palavra)) {
                                palavrasChave.push(palavra);
                            }
                        });
                        
                        // Também adicionar frases curtas relevantes
                        const frasesCurtas = titulo.match(/[A-ZÀ-Ú][a-zà-ú]+ [A-ZÀ-Ú][a-zà-ú]+/g);
                        if (frasesCurtas) {
                            frasesCurtas.forEach(frase => {
                                if (!palavrasChave.includes(frase) && frase.length > 5) {
                                    palavrasChave.push(frase);
                                }
                            });
                        }
                    }
                });
                
                console.log(`✅ Google News: ${palavrasChave.length} termos extraídos`);
            } catch (e) {
                console.error('❌ Erro Google News:', e.message);
            }
        }
        
        // Remover duplicatas e limitar
        palavrasChave = [...new Set(palavrasChave)]
            .filter(p => p.length > 2 && p.length < 50)
            .slice(0, 30);
        
        if (palavrasChave.length === 0) {
            return res.json({
                success: false,
                error: 'Não foi possível buscar palavras-chave. Tente novamente.',
                palavrasChave: []
            });
        }
        
        res.json({
            success: true,
            palavrasChave,
            total: palavrasChave.length,
            fonte: 'Google Suggest + Trends + News'
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar palavras-chave:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar palavras-chave'
        });
    }
};

/**
 * Busca Trends específicos do nicho Gospel
 */
exports.buscarTrendsGospel = async (req, res) => {
    try {
        console.log(`⛪ Buscando Trends Gospel...`);
        
        let trends = [];
        
        // Termos de busca para o nicho gospel
        const termosGospel = [
            'pastor evangélico',
            'igreja evangélica',
            'cantor gospel',
            'música gospel',
            'pregador',
            'assembleia de deus',
            'igreja universal',
            'batista',
            'pentecostal'
        ];
        
        // Método 1: Buscar notícias gospel no Google News
        try {
            const queries = [
                'gospel OR evangélico OR pastor',
                'igreja evangélica OR pentecostal',
                'cantor gospel OR louvor'
            ];
            
            for (const query of queries) {
                const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
                
                const response = await axios.get(newsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
                        'Accept': 'application/rss+xml, application/xml, text/xml'
                    },
                    timeout: 10000
                });
                
                const $ = cheerio.load(response.data, { xmlMode: true });
                
                $('item').slice(0, 10).each((i, element) => {
                    const tituloCompleto = $(element).find('title').text().trim();
                    const link = $(element).find('link').text().trim();
                    const pubDate = $(element).find('pubDate').text().trim();
                    
                    // Separar título e fonte
                    const partes = tituloCompleto.split(' - ');
                    const titulo = partes.slice(0, -1).join(' - ') || tituloCompleto;
                    const fonte = partes.length > 1 ? partes[partes.length - 1] : '';
                    
                    // Evitar duplicatas
                    if (titulo && !trends.find(t => t.titulo === titulo)) {
                        trends.push({
                            id: trends.length + 1,
                            titulo,
                            fonte,
                            link,
                            data: pubDate ? new Date(pubDate).toLocaleDateString('pt-BR') : ''
                        });
                    }
                });
                
                if (trends.length >= 25) break;
            }
            
            console.log(`✅ Google News Gospel: ${trends.length} notícias`);
        } catch (e) {
            console.error('❌ Erro Google News Gospel:', e.message);
        }
        
        // Método 2: Buscar em sites gospel específicos
        if (trends.length < 15) {
            try {
                const sitesGospel = [
                    'site:gospelprime.com.br',
                    'site:gospelmais.com.br',
                    'site:guiame.com.br'
                ];
                
                for (const site of sitesGospel) {
                    const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(site)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
                    
                    const response = await axios.get(newsUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
                            'Accept': 'application/rss+xml, application/xml, text/xml'
                        },
                        timeout: 8000
                    });
                    
                    const $ = cheerio.load(response.data, { xmlMode: true });
                    
                    $('item').slice(0, 5).each((i, element) => {
                        const tituloCompleto = $(element).find('title').text().trim();
                        const link = $(element).find('link').text().trim();
                        const pubDate = $(element).find('pubDate').text().trim();
                        
                        const partes = tituloCompleto.split(' - ');
                        const titulo = partes.slice(0, -1).join(' - ') || tituloCompleto;
                        const fonte = partes.length > 1 ? partes[partes.length - 1] : '';
                        
                        if (titulo && !trends.find(t => t.titulo === titulo)) {
                            trends.push({
                                id: trends.length + 1,
                                titulo,
                                fonte,
                                link,
                                data: pubDate ? new Date(pubDate).toLocaleDateString('pt-BR') : ''
                            });
                        }
                    });
                }
                
                console.log(`✅ Sites Gospel: ${trends.length} notícias total`);
            } catch (e) {
                console.error('❌ Erro Sites Gospel:', e.message);
            }
        }
        
        // Ordenar por data (mais recentes primeiro) e limitar
        trends = trends.slice(0, 30);
        
        if (trends.length === 0) {
            return res.json({
                success: false,
                error: 'Não foi possível carregar notícias gospel.',
                trends: []
            });
        }
        
        res.json({
            success: true,
            trends,
            total: trends.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar trends gospel:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar trends gospel'
        });
    }
};

/**
 * Busca Google Trends
 */
exports.buscarTrends = async (req, res) => {
    try {
        const { regiao = 'BR' } = req.body;

        console.log(`📈 Buscando Google Trends para região: ${regiao}`);

        let trends = [];

        // Método 1: Google Trends RSS
        try {
            const trendsUrl = `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${regiao}`;
            console.log('📡 Tentando Google Trends RSS:', trendsUrl);

            const response = await axios.get(trendsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data, { xmlMode: true });

            $('item').each((i, element) => {
                const $el = $(element);
                const titulo = $el.find('title').text().trim();
                
                if (titulo) {
                    trends.push({
                        id: i + 1,
                        titulo,
                        trafego: $el.find('ht\\:approx_traffic, approx_traffic').text().trim() || 
                                 $el.find('*[name="ht:approx_traffic"]').text().trim(),
                        descricao: $el.find('ht\\:news_item_title, news_item_title').first().text().trim() ||
                                   $el.find('description').text().replace(/<[^>]*>/g, '').trim().substring(0, 200),
                        link: $el.find('ht\\:news_item_url, news_item_url').first().text().trim() ||
                              $el.find('link').text().trim(),
                        imagem: $el.find('ht\\:picture, picture').text().trim()
                    });
                }
            });

            console.log(`✅ Google Trends RSS: ${trends.length} trends`);
        } catch (rssError) {
            console.error('❌ Erro RSS:', rssError.message);
        }

        // Método 2: Se RSS falhar, tentar API alternativa
        if (trends.length === 0) {
            try {
                console.log('📡 Tentando API alternativa...');
                
                // Mapear região para idioma
                const langMap = {
                    'BR': 'pt-BR', 'PT': 'pt-PT', 'US': 'en-US', 'GB': 'en-GB',
                    'ES': 'es-ES', 'MX': 'es-MX', 'AR': 'es-AR', 'FR': 'fr-FR',
                    'DE': 'de-DE', 'IT': 'it-IT'
                };
                const hl = langMap[regiao] || 'pt-BR';
                
                // Usar Google Trends realtime com região dinâmica
                const realtimeUrl = `https://trends.google.com/trends/api/realtimetrends?hl=${hl}&tz=-180&cat=all&fi=0&fs=0&geo=${regiao}&ri=300&rs=20&sort=0`;
                
                const response = await axios.get(realtimeUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json, text/plain, */*'
                    },
                    timeout: 15000
                });

                // Google retorna com prefixo )]}',
                let jsonData = response.data;
                if (typeof jsonData === 'string' && jsonData.startsWith(')]}')) {
                    jsonData = JSON.parse(jsonData.substring(5));
                }

                if (jsonData && jsonData.storySummaries && jsonData.storySummaries.trendingStories) {
                    jsonData.storySummaries.trendingStories.forEach((story, i) => {
                        trends.push({
                            id: i + 1,
                            titulo: story.title || story.entityNames?.[0] || '',
                            trafego: '',
                            descricao: story.articles?.[0]?.articleTitle || '',
                            link: story.articles?.[0]?.url || '',
                            imagem: story.image?.imgUrl || ''
                        });
                    });
                }

                console.log(`✅ API alternativa: ${trends.length} trends`);
            } catch (apiError) {
                console.error('❌ Erro API:', apiError.message);
            }
        }

        // Método 3: Buscar notícias populares como fallback (usando região)
        if (trends.length === 0) {
            try {
                console.log(`📰 Tentando Google News para região ${regiao}...`);
                
                // Mapear região para configuração do Google News
                const newsConfig = {
                    'BR': { hl: 'pt-BR', gl: 'BR', ceid: 'BR:pt-419' },
                    'PT': { hl: 'pt-PT', gl: 'PT', ceid: 'PT:pt-150' },
                    'US': { hl: 'en-US', gl: 'US', ceid: 'US:en' },
                    'GB': { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
                    'ES': { hl: 'es-ES', gl: 'ES', ceid: 'ES:es' },
                    'MX': { hl: 'es-MX', gl: 'MX', ceid: 'MX:es-419' },
                    'AR': { hl: 'es-AR', gl: 'AR', ceid: 'AR:es-419' },
                    'FR': { hl: 'fr-FR', gl: 'FR', ceid: 'FR:fr' },
                    'DE': { hl: 'de-DE', gl: 'DE', ceid: 'DE:de' },
                    'IT': { hl: 'it-IT', gl: 'IT', ceid: 'IT:it' }
                };
                const config = newsConfig[regiao] || newsConfig['BR'];
                
                const newsUrl = `https://news.google.com/rss?hl=${config.hl}&gl=${config.gl}&ceid=${config.ceid}`;
                
                const response = await axios.get(newsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
                        'Accept': 'application/rss+xml, application/xml, text/xml'
                    },
                    timeout: 15000
                });

                const $ = cheerio.load(response.data, { xmlMode: true });

                $('item').slice(0, 20).each((i, element) => {
                    const $el = $(element);
                    const titulo = $el.find('title').text().trim();
                    
                    if (titulo) {
                        trends.push({
                            id: i + 1,
                            titulo: titulo.split(' - ')[0], // Remover fonte
                            trafego: 'Em alta',
                            descricao: '',
                            link: $el.find('link').text().trim(),
                            imagem: ''
                        });
                    }
                });

                console.log(`✅ Google News: ${trends.length} notícias em alta`);
            } catch (newsError) {
                console.error('❌ Erro News:', newsError.message);
            }
        }

        if (trends.length === 0) {
            return res.json({
                success: false,
                error: 'Não foi possível carregar os trends. Tente novamente.',
                trends: []
            });
        }

        res.json({
            success: true,
            trends: trends.slice(0, 20),
            total: trends.length
        });

    } catch (error) {
        console.error('❌ Erro ao buscar trends:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar Google Trends'
        });
    }
};

/**
 * Extrai conteúdo de uma URL para gerar matéria
 */
exports.extrairConteudo = async (req, res) => {
    try {
        const { url, titulo } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL é obrigatória'
            });
        }

        console.log(`📄 Extraindo conteúdo de: ${url}`);

        // Headers mais completos para evitar bloqueio 403
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        let response;
        let tentativas = 0;
        const maxTentativas = 3;
        
        while (tentativas < maxTentativas) {
            try {
                response = await axios.get(url, {
                    headers: {
                        'User-Agent': randomUA,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                        'Sec-Ch-Ua-Mobile': '?0',
                        'Sec-Ch-Ua-Platform': '"Windows"',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1',
                        'Referer': 'https://www.google.com/'
                    },
                    timeout: 20000,
                    maxRedirects: 5,
                    validateStatus: (status) => status < 500
                });
                
                if (response.status === 200) break;
                
                console.log(`⚠️ Tentativa ${tentativas + 1}: Status ${response.status}`);
                tentativas++;
                await new Promise(r => setTimeout(r, 1000)); // Esperar 1s entre tentativas
                
            } catch (err) {
                console.log(`⚠️ Tentativa ${tentativas + 1} falhou: ${err.message}`);
                tentativas++;
                if (tentativas >= maxTentativas) throw err;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        
        if (!response || response.status !== 200) {
            throw new Error(`Não foi possível acessar a página (Status: ${response?.status || 'timeout'})`);
        }

        const $ = cheerio.load(response.data);

        // Remover elementos não relevantes
        $('script, style, nav, footer, header, aside, .ads, .advertisement, .social-share, .comments, .related, .sidebar, noscript, iframe').remove();

        // Tentar extrair o conteúdo principal
        let conteudo = '';
        let imagem = '';

        // Seletores específicos para sites de notícias brasileiros
        const seletoresConteudo = [
            // UOL (específico)
            '.news-content-wrapper',
            '.text-content',
            '.article-text',
            '.materia-texto',
            '[data-qa="article-body"]',
            // CNN Brasil
            '.post__content',
            '.single-content',
            // G1, Globo
            '.content-text__container',
            '.mc-article-body',
            // UOL genérico
            '.text',
            // Folha
            '.c-news__body',
            // Estadão
            '.n--noticia__content',
            // Poder360
            '.entry-content',
            '.post-content',
            // R7
            '.article-text',
            // Terra
            '.text-story',
            // Genéricos
            'article .content',
            'article',
            '.article-content',
            '.article-body',
            '.content-text',
            '.materia-conteudo',
            '.news-content',
            '.story-body',
            '[itemprop="articleBody"]',
            'main article',
            'main'
        ];

        for (const seletor of seletoresConteudo) {
            const el = $(seletor);
            if (el.length) {
                // Pegar apenas os parágrafos dentro do elemento
                let textoEl = '';
                el.find('p').each((i, p) => {
                    const texto = $(p).text().trim();
                    if (texto.length > 30) {
                        textoEl += texto + '\n\n';
                    }
                });
                
                if (textoEl.length > 200) {
                    conteudo = textoEl.trim();
                    console.log(`✅ Conteúdo encontrado com seletor: ${seletor}`);
                    break;
                }
            }
        }

        // Fallback: pegar todos os parágrafos da página
        if (!conteudo || conteudo.length < 200) {
            console.log('⚠️ Usando fallback: todos os parágrafos');
            $('p').each((i, el) => {
                const texto = $(el).text().trim();
                if (texto.length > 40 && !texto.includes('©') && !texto.includes('Cookie')) {
                    conteudo += texto + '\n\n';
                }
            });
        }

        // Extrair imagem principal
        const seletoresImagem = [
            'meta[property="og:image"]',
            'meta[name="twitter:image"]',
            'article img',
            '.post-content img',
            '.featured-image img'
        ];

        for (const seletor of seletoresImagem) {
            const el = $(seletor);
            if (el.length) {
                imagem = el.attr('content') || el.attr('src');
                if (imagem) break;
            }
        }

        // Extrair título se não fornecido
        let tituloExtraido = titulo;
        if (!tituloExtraido) {
            tituloExtraido = $('meta[property="og:title"]').attr('content') ||
                            $('title').text().trim() ||
                            $('h1').first().text().trim();
        }

        console.log(`✅ Conteúdo extraído: ${conteudo.length} caracteres`);

        res.json({
            success: true,
            titulo: tituloExtraido,
            conteudo: conteudo.substring(0, 5000), // Limitar tamanho
            imagem,
            url
        });

    } catch (error) {
        console.error('❌ Erro ao extrair conteúdo:', error.message);
        
        // Mensagem de erro mais específica
        let mensagemErro = 'Erro ao extrair conteúdo da página';
        
        if (error.message.includes('403')) {
            mensagemErro = 'Site bloqueou o acesso (403). Tente outra fonte.';
        } else if (error.message.includes('404')) {
            mensagemErro = 'Página não encontrada (404).';
        } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
            mensagemErro = 'Tempo esgotado ao acessar a página. Tente novamente.';
        } else if (error.message.includes('ENOTFOUND')) {
            mensagemErro = 'Site não encontrado. Verifique a URL.';
        }
        
        res.status(500).json({
            success: false,
            error: mensagemErro
        });
    }
};

/**
 * Gera matéria a partir do conteúdo extraído
 */
exports.gerarMateria = async (req, res) => {
    try {
        const { titulo, conteudo, url, imagem, categoria } = req.body;

        if (!titulo || !conteudo) {
            return res.status(400).json({
                success: false,
                error: 'Título e conteúdo são obrigatórios'
            });
        }

        console.log(`🤖 Gerando matéria: "${titulo}"`);

        // Limitar conteúdo para evitar timeout (máximo 2500 caracteres)
        const conteudoLimitado = conteudo.substring(0, 2500);

        console.log(`📄 Conteúdo extraído (${conteudoLimitado.length} chars): ${conteudoLimitado.substring(0, 100)}...`);

        // SEMPRE usar o título original da notícia (limpo)
        let tituloFinal = titulo
            .replace(/\.\.\.$/, '')  // Remover reticências
            .replace(/ - [^-]+$/, '') // Remover " - Nome do Site"
            .trim();
        
        // Se título muito curto, usar os primeiros 80 chars do conteúdo
        if (tituloFinal.length < 20) {
            tituloFinal = conteudoLimitado.split('\n')[0].substring(0, 80).trim();
        }

        // Usar o AIService para reescrever no estilo G1 (mesmo método do dashboard)
        let conteudoReescrito;
        let descricaoFinal = '';

        try {
            // Usar reescreverMateriaG1 - mesmo método do "Reescrever Matéria (Estilo G1)"
            conteudoReescrito = await AIService.reescreverMateriaG1(
                `<p>${conteudoLimitado.replace(/\n\n/g, '</p><p>')}</p>`
            );
            
            // Extrair descrição do primeiro parágrafo
            const descMatch = conteudoReescrito.match(/<p[^>]*>([^<]+)<\/p>/i);
            if (descMatch) {
                descricaoFinal = descMatch[1].substring(0, 160).trim();
            } else {
                descricaoFinal = conteudoLimitado.substring(0, 160).trim();
            }
            
            console.log(`✅ Conteúdo reescrito com sucesso`);
            console.log(`📰 Título final: ${tituloFinal}`);
            
        } catch (iaError) {
            console.error('❌ Erro na IA:', iaError.message);
            
            // Se erro, usar conteúdo original formatado
            conteudoReescrito = `<p>${conteudoLimitado.replace(/\n\n/g, '</p><p>')}</p>`;
            descricaoFinal = conteudoLimitado.substring(0, 160);
            console.log('⚠️ Usando conteúdo original devido ao erro');
        }

        // Criar objeto resultado
        const resultado = {
            titulo: tituloFinal,
            descricao: descricaoFinal,
            conteudo: conteudoReescrito
        };

        if (!resultado.conteudo) {
            throw new Error('Não foi possível gerar o conteúdo');
        }

        // Gerar URL amigável
        let urlAmigavel = slugify(resultado.titulo, { lower: true, strict: true });
        
        // Verificar se já existe
        const existente = await Article.findOne({ where: { urlAmigavel } });
        if (existente) {
            urlAmigavel = urlAmigavel + '-' + Date.now();
        }

        // Usar imagem extraída ou placeholder
        let imagemFinal = imagem || '/images/placeholder.jpg';

        // Criar o artigo como RASCUNHO (data futura para não ser publicado automaticamente)
        // Usar data 1 ano no futuro para rascunhos - scheduler só publica datas passadas
        const dataRascunho = new Date();
        dataRascunho.setFullYear(dataRascunho.getFullYear() + 1);
        
        const novoArtigo = await Article.create({
            titulo: resultado.titulo,
            descricao: resultado.descricao || '',
            conteudo: resultado.conteudo,
            imagem: imagemFinal,
            categoria: categoria || 'noticias',
            urlAmigavel,
            publicado: false,
            dataPublicacao: dataRascunho, // Data futura = rascunho, não será publicado pelo scheduler
            autor: req.session.userName || 'Sistema',
            visualizacoes: 0
        });

        // Pegar ID do artigo criado
        const artigoId = novoArtigo.dataValues?.id || novoArtigo.id || novoArtigo.get('id');
        console.log(`✅ Matéria criada: ID ${artigoId}, Título: ${resultado.titulo}`);

        // Se não conseguiu o ID, buscar pelo urlAmigavel
        let idFinal = artigoId;
        if (!idFinal) {
            const artigoBuscado = await Article.findOne({ 
                where: { urlAmigavel },
                attributes: ['id']
            });
            idFinal = artigoBuscado?.id;
            console.log(`🔍 ID encontrado via busca: ${idFinal}`);
        }

        res.json({
            success: true,
            materia: {
                id: idFinal,
                titulo: resultado.titulo,
                urlAmigavel: urlAmigavel
            }
        });

    } catch (error) {
        console.error('❌ Erro ao gerar matéria:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao gerar matéria com IA'
        });
    }
};

/**
 * Detecta a plataforma a partir da URL
 */
function detectarPlataforma(url) {
    if (!url) return 'web';
    
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('g1.globo.com')) return 'g1';
    if (url.includes('uol.com.br')) return 'uol';
    if (url.includes('gospelprime')) return 'gospelprime';
    if (url.includes('gospelmais')) return 'gospelmais';
    if (url.includes('pleno.news')) return 'pleno';
    
    return 'web';
}

module.exports = exports;
