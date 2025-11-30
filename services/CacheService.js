const NodeCache = require('node-cache');

// Cache padrão de 5 minutos (300 segundos)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

class CacheService {
    constructor() {
        this.cache = cache;
    }

    /**
     * Obtém um valor do cache
     * @param {string} key Chave do cache
     * @returns {any} Valor armazenado ou undefined
     */
    get(key) {
        return this.cache.get(key);
    }

    /**
     * Define um valor no cache
     * @param {string} key Chave do cache
     * @param {any} value Valor a ser armazenado
     * @param {number} ttl Tempo de vida em segundos (opcional)
     */
    set(key, value, ttl) {
        if (ttl) {
            this.cache.set(key, value, ttl);
        } else {
            this.cache.set(key, value);
        }
    }

    /**
     * Remove um item do cache
     * @param {string} key Chave do cache
     */
    del(key) {
        this.cache.del(key);
    }

    /**
     * Limpa todo o cache
     */
    flush() {
        this.cache.flushAll();
        console.log('🧹 Cache limpo com sucesso!');
    }

    /**
     * Middleware para cachear rotas GET
     * @param {number} duration Duração em segundos
     */
    middleware(duration) {
        return (req, res, next) => {
            // Não cachear se usuário estiver logado (admin/editor)
            if (req.session && req.session.userId) {
                return next();
            }

            // Não cachear requisições que não sejam GET
            if (req.method !== 'GET') {
                return next();
            }

            const key = '__express__' + req.originalUrl || req.url;
            const cachedBody = this.cache.get(key);

            if (cachedBody) {
                // console.log(`⚡ Cache hit: ${key}`);
                res.send(cachedBody);
                return;
            } else {
                // console.log(`🐢 Cache miss: ${key}`);
                res.sendResponse = res.send;
                res.send = (body) => {
                    this.cache.set(key, body, duration);
                    res.sendResponse(body);
                };
                next();
            }
        };
    }
}

module.exports = new CacheService();
