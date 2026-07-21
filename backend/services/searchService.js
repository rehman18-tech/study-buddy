function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Perform a live web search using DuckDuckGo's HTML interface
 * @param {string} query - The search query
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
async function searchWeb(query, limit = 3) {
  if (!query || !query.trim()) return [];
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  try {
    console.log(`🔍 [SearchService] Searching web for: "${query}" (limit: ${limit})`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned status ${response.status}`);
    }

    const html = await response.text();
    const results = [];
    const resultBlockRegex = /<div class="result results_links results_links_deep web-result[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
    
    let match;
    while ((match = resultBlockRegex.exec(html)) !== null && results.length < limit) {
      const block = match[0];
      
      const titleMatch = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(block);
      const snippetMatch = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(block);
      
      if (titleMatch && snippetMatch) {
        let targetUrl = titleMatch[1];
        if (targetUrl.includes('uddg=')) {
          const parts = targetUrl.split('uddg=');
          if (parts[1]) {
            targetUrl = decodeURIComponent(parts[1].split('&')[0]);
          }
        }
        
        const title = decodeEntities(titleMatch[2].replace(/<[^>]*>/g, '').trim());
        const snippet = decodeEntities(snippetMatch[1].replace(/<[^>]*>/g, '').trim());
        
        results.push({ title, url: targetUrl, snippet });
      }
    }
    
    console.log(`🔍 [SearchService] Found ${results.length} web search results.`);
    return results;
  } catch (err) {
    console.error('⚠️ [SearchService] Web search failed:', err.message);
    return [];
  }
}

module.exports = {
  searchWeb
};
