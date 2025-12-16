<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  
  <xsl:template match="/">
    <html>
      <head>
        <title>XML Sitemap - Obuxixo Gospel</title>
        <meta name="robots" content="noindex, follow"/>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
          }
          h1 {
            color: #FF6B00;
            border-bottom: 3px solid #FF6B00;
            padding-bottom: 10px;
          }
          .info {
            background: #fff;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .info p {
            margin: 5px 0;
            color: #666;
          }
          .info a {
            color: #FF6B00;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          th {
            background: #FF6B00;
            color: #fff;
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 10px 15px;
            border-bottom: 1px solid #eee;
          }
          tr:hover td {
            background: #fff8f5;
          }
          a {
            color: #0066cc;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .count {
            background: #FF6B00;
            color: #fff;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
          }
        </style>
      </head>
      <body>
        <h1>🗺️ XML Sitemap</h1>
        
        <div class="info">
          <p><strong>Obuxixo Gospel</strong> - Portal de Notícias Gospel</p>
          <p>Este é um XML Sitemap gerado para mecanismos de busca.</p>
          <p>Saiba mais em <a href="https://www.sitemaps.org/" target="_blank">sitemaps.org</a></p>
        </div>

        <xsl:choose>
          <xsl:when test="sitemap:sitemapindex">
            <p>Este índice contém <span class="count"><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></span> sitemaps.</p>
            <table>
              <tr>
                <th>Sitemap</th>
                <th>Última Modificação</th>
              </tr>
              <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                <tr>
                  <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                  <td><xsl:value-of select="sitemap:lastmod"/></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:when>
          <xsl:otherwise>
            <p>Este sitemap contém <span class="count"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></span> URLs.</p>
            <table>
              <tr>
                <th>URL</th>
                <th>Prioridade</th>
                <th>Frequência</th>
                <th>Última Modificação</th>
              </tr>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                  <td><xsl:value-of select="sitemap:priority"/></td>
                  <td><xsl:value-of select="sitemap:changefreq"/></td>
                  <td><xsl:value-of select="sitemap:lastmod"/></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:otherwise>
        </xsl:choose>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
